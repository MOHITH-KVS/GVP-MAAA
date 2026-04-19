"""
rag/graph_pipeline.py — LangGraph stateful multi-step RAG pipeline.

4 nodes, each with one responsibility:
  1. access_guard       — blocks unauthorised queries
  2. data_retriever     — fetches DB data + classifies query type
  3. answer_generator   — routes to LangChain chain → Gemini → fallback
  4. response_formatter — cleans / validates the final answer

State flows through all nodes via RAGState TypedDict.
"""

import traceback
from typing import TypedDict, Optional, List, Dict, Any

from langgraph.graph import StateGraph, END


# ── Shared state schema ──────────────────────────────────────────

class RAGState(TypedDict):
    # Inputs
    user_id:  int
    role:     str
    question: str
    history:  List[Dict]
    db:       Any
    # Node outputs
    access_granted:  bool
    denial_message:  str
    query_type:      str   # "simple" | "analytical"
    retrieved_data:  Dict
    answer:          str
    source:          str   # "langchain" | "gemini" | "fallback" | "error"


# ══════════════════════════════════════════════════════════════════
# NODE 1 — ACCESS GUARD
# ══════════════════════════════════════════════════════════════════

def node_access_guard(state: RAGState) -> RAGState:
    """Blocks queries that violate role-based access policies."""
    try:
        role     = state["role"].lower()
        question = state["question"].lower()

        blocked = {
            "student": [
                "all students", "other student",
                "everyone's marks", "class list",
                "admin data", "teacher salary",
            ],
            "teacher": [
                "admin settings", "other teacher salary",
                "student personal address",
            ],
            "faculty": ["admin settings"],
        }

        for pattern in blocked.get(role, []):
            if pattern in question:
                state["access_granted"] = False
                state["denial_message"] = (
                    f"You don't have access to that. "
                    f"As a {role}, you can only view your own academic data."
                )
                return state

        state["access_granted"] = True
        state["denial_message"] = ""
        return state

    except Exception:
        # Fail open — if guard crashes, allow the request
        state["access_granted"] = True
        state["denial_message"] = ""
        return state


# ══════════════════════════════════════════════════════════════════
# NODE 2 — DATA RETRIEVER
# ══════════════════════════════════════════════════════════════════

def node_data_retriever(state: RAGState) -> RAGState:
    """Fetches all DB data for the role and classifies the query type."""
    try:
        role    = state["role"].lower()
        user_id = state["user_id"]
        db      = state["db"]

        from rag.retriever import (
            retrieve_student_data,
            retrieve_teacher_data,
            retrieve_admin_data,
        )

        if role == "student":
            state["retrieved_data"] = retrieve_student_data(user_id, db)
        elif role in ("teacher", "faculty"):
            state["retrieved_data"] = retrieve_teacher_data(user_id, db)
        else:
            state["retrieved_data"] = retrieve_admin_data(db)

        print(
            f"[GRAPH] Retrieved {role} data: "
            f"{list(state['retrieved_data'].keys())}"
        )

        # Classify query type
        from rag.analytical_chain import is_analytical_query
        state["query_type"] = (
            "analytical" if is_analytical_query(state["question"])
            else "simple"
        )

        return state

    except Exception:
        traceback.print_exc()
        state["retrieved_data"] = {}
        state["query_type"] = "simple"
        return state


# ══════════════════════════════════════════════════════════════════
# NODE 3 — ANSWER GENERATOR
# ══════════════════════════════════════════════════════════════════

def node_answer_generator(state: RAGState) -> RAGState:
    """
    Tries three answer strategies in order:
      1. LangChain analytical chain   (for analytical queries)
      2. Direct Gemini via call_gemini (for simple queries or chain miss)
      3. Rule-based fallback           (if Gemini unavailable / fails)
    """
    try:
        role       = state["role"].lower()
        question   = state["question"]
        data       = state["retrieved_data"]
        history    = state["history"]
        query_type = state["query_type"]
        user_id    = state["user_id"]

        from rag.generator import (
            build_response_cache_key,
            get_response_cache,
            set_response_cache,
            should_skip_response_cache,
        )

        cache_key = build_response_cache_key(user_id, question)
        skip_cache = should_skip_response_cache(question)
        if cache_key and not skip_cache:
            cached = get_response_cache(cache_key)
            if cached:
                print("[CACHE] Hit -> instant response")
                state["answer"] = cached
                state["source"] = "cache"
                return state
            print("[CACHE] Miss -> calling Gemini")

        answer = None

        # ── Strategy 1: LangChain chain (analytical) ──────────────
        if query_type == "analytical":
            try:
                from rag.analytical_chain import run_analytical_chain
                answer = run_analytical_chain(role, data, question)
                if answer and len(answer) > 10:
                    state["source"] = "langchain"
                    if cache_key and not skip_cache:
                        set_response_cache(cache_key, answer)
                else:
                    answer = None  # fall through
            except Exception:
                traceback.print_exc()

        # ── Strategy 2: Direct Gemini ─────────────────────────────
        if not answer:
            try:
                from rag.generator import (
                    format_data_for_gemini,
                    call_gemini,
                    GEMINI_AVAILABLE,
                    GEMINI_CLIENT,
                )

                if GEMINI_AVAILABLE and GEMINI_CLIENT:
                    context = format_data_for_gemini(data, role)

                    personas = {
                        "student": "academic assistant for a student",
                        "teacher": "assistant for a faculty member",
                        "faculty": "assistant for a faculty member",
                        "admin":   "institutional assistant for admin",
                    }
                    access = {
                        "student": "Only discuss this student's own data.",
                        "teacher": (
                            "You have access to your class students' names and attendance. "
                            "When asked for student lists or at-risk students, list them from "
                            "CLASS STUDENTS section above. Do NOT provide marks or personal info beyond attendance."
                        ),
                        "faculty": "Class-level data only.",
                        "admin":   "Full institutional access.",
                    }

                    hist_text = "\n".join([
                        f"{'User' if h.get('role') == 'user' else 'AI'}: "
                        f"{h.get('content', '')}"
                        for h in history[-4:]
                    ])

                    # Pull attendance numbers for what-if calculations
                    att_block   = data.get("attendance", {})
                    att_present = att_block.get("present", 0)
                    att_total   = att_block.get("total_classes", 0)

                    prompt = f"""You are a {personas.get(role, 'assistant')} at GVP college.
{access.get(role, '')}

DATA FROM DATABASE:
{context}

CONVERSATION HISTORY:
{hist_text}

QUESTION: "{question}"

INSTRUCTIONS:
1. Answer ONLY using the data above — never invent numbers.
2. Be specific: use actual figures from the data.
3. 2-4 natural sentences maximum.
4. For "what if I miss N classes" questions:
   Current present = {att_present}, Current total = {att_total}
   New % = ({att_present} / ({att_total} + N)) × 100 — show the result.
5. If data is unavailable, say so and name the dashboard page.

ANSWER:"""

                    answer = call_gemini(prompt)
                    if answer and len(answer.strip()) > 5:
                        state["source"] = "gemini"
                        if cache_key and not skip_cache:
                            set_response_cache(cache_key, answer)
                    else:
                        answer = None

            except Exception:
                traceback.print_exc()

        # ── Strategy 3: Rule-based fallback ───────────────────────
        if not answer:
            try:
                from rag.generator import build_fallback
                answer = build_fallback(role, data, question)
                state["source"] = "fallback"
                if cache_key and not skip_cache:
                    set_response_cache(cache_key, answer)
            except Exception:
                answer = "Please check your dashboard for the latest information."
                state["source"] = "error"

        state["answer"] = answer or "Please check your dashboard."
        print(
            f"[GRAPH] Answer source={state.get('source', '?')}: "
            f"{state['answer']}"
        )
        return state

    except Exception:
        traceback.print_exc()
        state["answer"] = (
            "I had trouble processing that. Please check your dashboard."
        )
        state["source"] = "error"
        return state


# ══════════════════════════════════════════════════════════════════
# NODE 4 — RESPONSE FORMATTER
# ══════════════════════════════════════════════════════════════════

def node_response_formatter(state: RAGState) -> RAGState:
    """
    Final clean-up: ensures the answer is a proper string,
    not empty, and not a raw Python dict/object dump.
    If access was denied, injects the denial message here.
    """
    try:
        # Access denial takes priority
        if not state.get("access_granted", True):
            state["answer"] = state.get(
                "denial_message",
                "You don't have access to that information."
            )
            return state

        answer = state.get("answer", "")

        # Empty / too short
        if not answer or len(answer.strip()) < 3:
            state["answer"] = (
                "I couldn't find specific data for that. "
                "Please check your dashboard."
            )
            return state

        # Raw dict artifact (should not normally happen)
        if answer.strip().startswith("{") or answer.strip().startswith("["):
            state["answer"] = (
                "Please check your dashboard for that information."
            )
            return state

        state["answer"] = answer.strip()
        return state

    except Exception:
        return state


# ══════════════════════════════════════════════════════════════════
# ROUTING FUNCTION
# ══════════════════════════════════════════════════════════════════

def route_after_access(state: RAGState) -> str:
    """Skip retrieval + generation if access was denied."""
    if not state.get("access_granted", True):
        return "format"
    return "retrieve"


# ══════════════════════════════════════════════════════════════════
# GRAPH CONSTRUCTION
# ══════════════════════════════════════════════════════════════════

def build_rag_graph():
    workflow = StateGraph(RAGState)

    workflow.add_node("access_guard",        node_access_guard)
    workflow.add_node("data_retriever",      node_data_retriever)
    workflow.add_node("answer_generator",    node_answer_generator)
    workflow.add_node("response_formatter",  node_response_formatter)

    workflow.set_entry_point("access_guard")

    workflow.add_conditional_edges(
        "access_guard",
        route_after_access,
        {
            "retrieve": "data_retriever",
            "format":   "response_formatter",
        }
    )

    workflow.add_edge("data_retriever",     "answer_generator")
    workflow.add_edge("answer_generator",   "response_formatter")
    workflow.add_edge("response_formatter", END)

    compiled = workflow.compile()
    print("[GRAPH] LangGraph RAG pipeline compiled")
    return compiled


# Build once at import time
RAG_GRAPH = None
try:
    RAG_GRAPH = build_rag_graph()
except Exception as _ge:
    print(f"[GRAPH] Compile failed: {_ge}")
    traceback.print_exc()


# ══════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ══════════════════════════════════════════════════════════════════

def run_rag_pipeline(
    user_id:  int,
    role:     str,
    question: str,
    history:  list,
    db,
) -> str:
    """
    Main entry point called by chat_router.
    Falls back to the old generate_answer path if the graph failed to compile.
    """
    try:
        if RAG_GRAPH is None:
            # Graph compilation failed — use legacy path
            print("[GRAPH] Falling back to legacy generate_answer")
            from rag.retriever import (
                retrieve_student_data,
                retrieve_teacher_data,
                retrieve_admin_data,
            )
            from rag.generator import generate_answer
            r = role.lower()
            if r == "student":
                data = retrieve_student_data(user_id, db)
            elif r in ("teacher", "faculty"):
                data = retrieve_teacher_data(user_id, db)
            else:
                data = retrieve_admin_data(db)
            return generate_answer(r, data, question, history, user_id=user_id)

        initial_state: RAGState = {
            "user_id":        user_id,
            "role":           role,
            "question":       question,
            "history":        history,
            "db":             db,
            "access_granted": True,
            "denial_message": "",
            "query_type":     "simple",
            "retrieved_data": {},
            "answer":         "",
            "source":         "",
        }

        result = RAG_GRAPH.invoke(initial_state)
        return result.get("answer", "Please check your dashboard.")

    except Exception:
        traceback.print_exc()
        return "I had trouble processing that. Please try again."
