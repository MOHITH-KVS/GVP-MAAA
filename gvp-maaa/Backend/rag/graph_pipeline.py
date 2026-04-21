"""
rag/graph_pipeline.py — LangGraph stateful multi-step RAG pipeline.

6 nodes, each with one responsibility:
    1. access_guard            — blocks unauthorised queries
    2. data_retriever          — fetches DB data + classifies query type
    3. memory_manager          — loads/stores per-user conversation summaries
    4. answer_generator        — routes to LangChain chain → Gemini → fallback
    5. proactive_insight_gen   — adds one short follow-up insight
    6. response_formatter      — cleans / validates the final answer

State flows through all nodes via RAGState TypedDict.
Runtime-only dependencies, such as the SQLAlchemy session, are provided via
LangGraph runtime context so persistence can remain PostgreSQL-backed.
"""

import traceback
from datetime import datetime
from typing import TypedDict, Optional, List, Dict, Any

from langgraph.graph import StateGraph, END
from langgraph.runtime import Runtime

try:
        from langgraph.checkpoint.postgres import PostgresSaver
except Exception:
        PostgresSaver = None

try:
        from langgraph.checkpoint.memory import MemorySaver
except Exception:
        MemorySaver = None

from database import DATABASE_URL


# ── Shared state schema ──────────────────────────────────────────

class GraphContext(TypedDict):
    db: Any


class RAGState(TypedDict, total=False):
    # Inputs
    user_id:  int
    role:     str
    question: str
    history:  List[Dict]
    thread_id: str
    force_live_ai: bool
    # Node outputs
    access_granted:  bool
    denial_message:  str
    query_type:      str   # "simple" | "analytical"
    retrieved_data:  Dict
    memory_context:  str
    conversation_summaries: List[Dict[str, Any]]
    answer:          str
    source:          str   # "langchain" | "gemini" | "fallback" | "error"
    proactive_insight: str
    summary_entry: str


def _normalize_thread_id(role: str, user_id: int, thread_id: str | None = None) -> str:
    normalized = str(thread_id or "").strip()
    if normalized:
        return normalized
    return f"{str(role).lower()}_{user_id}"


def _normalize_conversation_summaries(raw_summaries: Any) -> List[Dict[str, Any]]:
    summaries: List[Dict[str, Any]] = []
    for item in raw_summaries or []:
        if isinstance(item, dict):
            summary = str(item.get("summary") or item.get("text") or "").strip()
            if not summary:
                continue
            summaries.append({
                "summary": summary,
                "question": str(item.get("question") or "").strip(),
                "answer": str(item.get("answer") or "").strip(),
                "source": str(item.get("source") or "").strip(),
                "insight": str(item.get("insight") or "").strip(),
                "created_at": str(item.get("created_at") or "").strip(),
            })
        elif isinstance(item, str) and item.strip():
            summaries.append({"summary": item.strip()})
    return summaries[-20:]


def _format_recent_summaries(summaries: List[Dict[str, Any]]) -> str:
    recent = summaries[-3:]
    if not recent:
        return "No prior conversation summaries."
    lines = ["Recent conversation summaries:"]
    for index, item in enumerate(recent, start=1):
        lines.append(f"{index}. {item.get('summary', '').strip()}")
    return "\n".join(lines)


def _condense_text(text: str, limit: int = 220) -> str:
    cleaned = " ".join(str(text or "").split()).strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[: limit - 3].rstrip() + "..."


def _build_turn_summary(
    question: str,
    answer: str,
    source: str,
    insight: str,
) -> str:
    parts: List[str] = []
    question_text = _condense_text(question, 120)
    answer_text = _condense_text(answer, 180)
    insight_text = _condense_text(insight, 120)
    if question_text:
        parts.append(f"Q: {question_text}")
    if answer_text:
        parts.append(f"A: {answer_text}")
    if insight_text:
        parts.append(f"Insight: {insight_text}")
    if source:
        parts.append(f"Source: {source}")
    return " | ".join(parts)


def _load_memory_records(db, thread_id: str, limit: int = 3) -> List[Dict[str, Any]]:
    try:
        from models import ConversationMemory

        rows = (
            db.query(ConversationMemory)
            .filter(ConversationMemory.thread_id == thread_id)
            .order_by(ConversationMemory.created_at.desc(), ConversationMemory.id.desc())
            .limit(limit)
            .all()
        )
        records: List[Dict[str, Any]] = []
        for row in reversed(rows):
            records.append({
                "summary": str(getattr(row, "summary", "") or "").strip(),
                "question": str(getattr(row, "question", "") or "").strip(),
                "answer": str(getattr(row, "answer", "") or "").strip(),
                "source": str(getattr(row, "source", "") or "").strip(),
                "insight": str(getattr(row, "insight", "") or "").strip(),
                "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else "",
            })
        return records
    except Exception:
        traceback.print_exc()
        return []


def _save_memory_record(
    db,
    *,
    thread_id: str,
    user_id: int,
    role: str,
    question: str,
    answer: str,
    source: str,
    insight: str,
    summary: str,
) -> None:
    try:
        from models import ConversationMemory

        record = ConversationMemory(
            thread_id=thread_id,
            user_id=user_id,
            role=role,
            question=question,
            answer=answer,
            source=source,
            insight=insight,
            summary=summary,
        )
        db.add(record)
        db.commit()
    except Exception:
        db.rollback()
        traceback.print_exc()


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

def node_data_retriever(state: RAGState, runtime: Runtime[GraphContext]) -> RAGState:
    """Fetches all DB data for the role and classifies the query type."""
    try:
        role    = state["role"].lower()
        user_id = state["user_id"]
        db      = runtime.context.get("db")

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


def node_memory_manager(state: RAGState, runtime: Runtime[GraphContext]) -> RAGState:
    """Loads the last three conversation summaries for the active thread."""
    try:
        db = runtime.context.get("db")
        thread_id = _normalize_thread_id(state["role"], state["user_id"], state.get("thread_id"))
        state["thread_id"] = thread_id

        summaries = _load_memory_records(db, thread_id, limit=3) if db else []
        state["conversation_summaries"] = summaries
        state["memory_context"] = _format_recent_summaries(summaries)
        print(f"[GRAPH] Memory loaded for {thread_id}: {len(summaries)} summary item(s)")
        return state
    except Exception:
        traceback.print_exc()
        state["conversation_summaries"] = []
        state["memory_context"] = "No prior conversation summaries."
        state["thread_id"] = _normalize_thread_id(state["role"], state["user_id"], state.get("thread_id"))
        return state


# ══════════════════════════════════════════════════════════════════
# NODE 3 — ANSWER GENERATOR
# ══════════════════════════════════════════════════════════════════

def node_answer_generator(state: RAGState, runtime: Runtime[GraphContext]) -> RAGState:
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
        force_live_ai = bool(state.get("force_live_ai", False))
        db_session = runtime.context.get("db")
        memory_context = state.get("memory_context", "No prior conversation summaries.")

        from rag.generator import (
            build_response_cache_key,
            get_response_cache,
            set_response_cache,
            should_skip_response_cache,
            is_response_incomplete,
            should_force_structured_fallback,
            build_fallback,
        )

        cache_key = build_response_cache_key(user_id, question)
        skip_cache = should_skip_response_cache(question)

        # Deterministic path for list-style queries to avoid partial AI responses.
        force_verified_data = (
            role in ("admin", "teacher", "faculty")
            and should_force_structured_fallback(question)
            and not force_live_ai
        )

        if force_verified_data:
            answer = build_fallback(role, data, question)
            state["answer"] = answer or "Please check your dashboard for the latest information."
            state["source"] = "verified_data"
            if cache_key and not skip_cache and state["answer"] and not is_response_incomplete(state["answer"]):
                set_response_cache(cache_key, state["answer"])
            print("[GRAPH] Forced verified-data route for list-style query")
            return state

        if cache_key and not skip_cache:
            cached = get_response_cache(cache_key)
            if cached:
                if is_response_incomplete(cached):
                    print("[CACHE] Ignored incomplete cached response")
                else:
                    print("[CACHE] Hit -> instant response")
                    state["answer"] = cached
                    cached_lower = str(cached).lower()
                    if "verified dashboard data" in cached_lower or "ai-generated wording is temporarily unavailable" in cached_lower:
                        state["source"] = "verified_data"
                    else:
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
                    if cache_key and not skip_cache and not is_response_incomplete(answer):
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
                    ensure_gemini_connection,
                )

                ensure_gemini_connection()
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

RECENT CONVERSATION MEMORY:
{memory_context}

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

                answer = call_gemini(prompt, db_session=db_session)
                if answer and len(answer.strip()) > 5 and not is_response_incomplete(answer):
                    state["source"] = "gemini"
                    if cache_key and not skip_cache:
                        set_response_cache(cache_key, answer)
                else:
                    if answer and should_force_structured_fallback(question):
                        print("[GRAPH] Incomplete Gemini list response — forcing fallback")
                    answer = None

            except Exception:
                traceback.print_exc()

        # ── Strategy 3: Rule-based fallback ───────────────────────
        if not answer:
            try:
                answer = build_fallback(role, data, question)
                state["source"] = "verified_data"
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

def node_response_formatter(state: RAGState, runtime: Runtime[GraphContext]) -> RAGState:
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

        proactive_insight = str(state.get("proactive_insight", "")).strip()
        if proactive_insight and state.get("source") != "fallback":
            if proactive_insight not in state["answer"]:
                state["answer"] = f"{state['answer']}\n\nProactive insight: {proactive_insight}"

        summaries = _normalize_conversation_summaries(state.get("conversation_summaries", []))
        summary_entry = _build_turn_summary(
            state.get("question", ""),
            state.get("answer", ""),
            state.get("source", ""),
            proactive_insight,
        )
        if summary_entry:
            summaries.append({
                "summary": summary_entry,
                "question": str(state.get("question", "")).strip(),
                "answer": _condense_text(state.get("answer", ""), 260),
                "source": str(state.get("source", "")).strip(),
                "insight": proactive_insight,
                "created_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            })
        state["conversation_summaries"] = summaries[-20:]
        state["summary_entry"] = summary_entry

        db = runtime.context.get("db")
        if db and summary_entry:
            _save_memory_record(
                db,
                thread_id=state.get("thread_id") or _normalize_thread_id(state["role"], state["user_id"], None),
                user_id=state["user_id"],
                role=state["role"],
                question=str(state.get("question", "")).strip(),
                answer=str(state.get("answer", "")).strip(),
                source=str(state.get("source", "")).strip(),
                insight=proactive_insight,
                summary=summary_entry,
            )
        return state

    except Exception:
        return state


def node_proactive_insight_generator(state: RAGState, runtime: Runtime[GraphContext]) -> RAGState:
    """Adds one short proactive insight after the main answer."""
    try:
        if state.get("source") == "fallback":
            state["proactive_insight"] = ""
            return state

        answer = str(state.get("answer", "")).strip()
        if not answer:
            state["proactive_insight"] = ""
            return state

        db_session = runtime.context.get("db")
        role = state["role"].lower()
        memory_context = state.get("memory_context", "No prior conversation summaries.")
        data_context = format_data_for_gemini(state.get("retrieved_data", {}), role)

        insight_prompt = f"""Return exactly one short proactive insight for this academic user.
Maximum 100 tokens. Do not repeat the answer. Keep it actionable.
If no useful follow-up exists, return an empty string.

QUESTION:
{state.get('question', '')}

ANSWER:
{answer}

RECENT MEMORY:
{memory_context}

DATA CONTEXT:
{data_context}

PROACTIVE INSIGHT:"""

        from rag.generator import call_gemini, format_data_for_gemini

        insight = call_gemini(
            insight_prompt,
            db_session=db_session,
            max_output_tokens=100,
            provider_sequence=["gemini"],
        )
        state["proactive_insight"] = _condense_text(insight or "", 220)
        return state

    except Exception:
        traceback.print_exc()
        state["proactive_insight"] = ""
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
    workflow = StateGraph(RAGState, context_schema=GraphContext)

    workflow.add_node("access_guard",        node_access_guard)
    workflow.add_node("data_retriever",      node_data_retriever)
    workflow.add_node("memory_manager",      node_memory_manager)
    workflow.add_node("answer_generator",    node_answer_generator)
    workflow.add_node("proactive_insight_generator", node_proactive_insight_generator)
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

    workflow.add_edge("data_retriever",     "memory_manager")
    workflow.add_edge("memory_manager",     "answer_generator")
    workflow.add_edge("answer_generator",   "proactive_insight_generator")
    workflow.add_edge("proactive_insight_generator", "response_formatter")
    workflow.add_edge("response_formatter", END)

    checkpointer = None
    if PostgresSaver is not None:
        try:
            checkpointer = PostgresSaver.from_conn_string(DATABASE_URL)
            print("[GRAPH] PostgreSQL checkpointer enabled")
        except Exception:
            traceback.print_exc()
            checkpointer = None
    elif MemorySaver is not None:
        checkpointer = MemorySaver()
        print("[GRAPH] Falling back to in-memory checkpointer")

    compiled = workflow.compile(checkpointer=checkpointer) if checkpointer else workflow.compile()
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
    include_meta: bool = False,
    force_live_ai: bool = False,
    thread_id: str | None = None,
):
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
            answer = generate_answer(r, data, question, history, user_id=user_id, db_session=db)
            if include_meta:
                return {"answer": answer, "source": "legacy"}
            return answer

        initial_state: RAGState = {
            "user_id":        user_id,
            "role":           role,
            "question":       question,
            "history":        history,
            "thread_id":      _normalize_thread_id(role, user_id, thread_id),
            "force_live_ai":  force_live_ai,
            "access_granted": True,
            "denial_message": "",
            "query_type":     "simple",
            "retrieved_data": {},
            "answer":         "",
            "source":         "",
            "memory_context": "",
            "conversation_summaries": [],
            "proactive_insight": "",
            "summary_entry": "",
        }

        result = RAG_GRAPH.invoke(
            initial_state,
            config={"configurable": {"thread_id": initial_state["thread_id"]}},
            context={"db": db},
        )
        answer = result.get("answer", "Please check your dashboard.")
        source = result.get("source", "unknown")
        if include_meta:
            return {"answer": answer, "source": source}
        return answer

    except Exception:
        traceback.print_exc()
        fallback = "I had trouble processing that. Please try again."
        if include_meta:
            return {"answer": fallback, "source": "error"}
        return fallback
