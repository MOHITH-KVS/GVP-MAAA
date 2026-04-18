import os
import sys
import traceback
from pathlib import Path

# ── Load .env first — search all possible locations ────────────
try:
    from dotenv import load_dotenv
    _this = Path(__file__).resolve()
    _found = False
    for _parent in [_this.parent, _this.parent.parent, _this.parent.parent.parent]:
        _env = _parent / ".env"
        if _env.exists():
            load_dotenv(dotenv_path=_env, override=True)
            print(f"[ENV] Loaded .env from: {_env}")
            _found = True
            break
    if not _found:
        for _alt in [Path("Backend/.env"), Path(".env")]:
            if _alt.exists():
                load_dotenv(dotenv_path=_alt, override=True)
                print(f"[ENV] Loaded .env from: {_alt.resolve()}")
                break
except Exception as _e:
    print(f"[ENV] dotenv error: {_e}")

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
print(f"[ENV] GEMINI_API_KEY present: {bool(GEMINI_API_KEY)}")
if GEMINI_API_KEY:
    print(f"[ENV] Key starts with: '{GEMINI_API_KEY[:12]}'")
else:
    print("[ENV] KEY IS EMPTY")

GEMINI_AVAILABLE = False
GEMINI_CLIENT = None  # google.genai Client instance

if GEMINI_API_KEY and GEMINI_API_KEY.startswith("AIzaSy"):
    try:
        # Use the NEW google.genai SDK (google.generativeai is deprecated)
        from google import genai as _genai_module
        _client = _genai_module.Client(api_key=GEMINI_API_KEY)
        # Try models in order — some may hit quota limits
        _STARTUP_MODELS = [
            "models/gemini-2.5-flash",
            "models/gemini-2.0-flash-lite",
            "models/gemini-2.0-flash",
        ]
        _test = None
        _working_model = None
        for _m in _STARTUP_MODELS:
            try:
                _test = _client.models.generate_content(
                    model=_m,
                    contents="Say OK"
                )
                _working_model = _m
                break
            except Exception as _me:
                print(f"[GEMINI] {_m} unavailable: {str(_me)[:60]}")
                continue
        if _test and _test.text and _working_model:
            GEMINI_CLIENT = _client
            GEMINI_AVAILABLE = True
            print(f"[GEMINI] LIVE AND WORKING ({_working_model}): {_test.text.strip()[:20]}")
        else:
            print("[GEMINI] All models failed quota/availability check")
    except Exception as _e:
        print(f"[GEMINI] FAILED: {_e}")
        traceback.print_exc()
elif GEMINI_API_KEY:
    print(f"[GEMINI] INVALID KEY — must start with 'AIzaSy'")
    print(f"[GEMINI] Current key: '{GEMINI_API_KEY[:20]}'")
    print("[GEMINI] Get a valid key at: https://aistudio.google.com/apikey")
else:
    print("[GEMINI] No API key set in .env")

# All other imports come AFTER this block
import traceback
from typing import TypedDict, Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END

class ChatPipelineState(TypedDict):
    # Input
    raw_message: str
    role: str
    user_id: int
    history: List[Dict]
    db: Any  # SQLAlchemy session

    # Agent 1 output — Intent + access check
    intent: str
    access_allowed: bool
    denial_reason: str
    normalized_message: str
    keywords: List[str]

    # Agent 2 output — Context retrieval
    context: Dict
    context_source: str  # "database" or "cache" or "empty"

    # Agent 3 output — Answer generation
    raw_answer: str
    answer_source: str  # "rules" or "gemini" or "fallback"
    data_found: bool

    # Agent 4 output — Final formatted response
    final_reply: str
    formatted: bool

INTENT_KEYWORDS = {
    "student": {
        "attendance": ["attendance", "present", "absent", "classes",
                      "bunk", "miss", "missed", "percentage", "attenden",
                      "how many classes", "my attendance"],
        "marks": ["mark", "marks", "score", "grade", "result", "exam",
                 "mid", "performance", "subject", "fail", "pass",
                 "test", "assessment", "scored"],
        "risk": ["risk", "failing", "fail", "danger", "at risk",
                "warning", "struggling", "backlog", "detention"],
        "tasks": ["task", "tasks", "today", "do", "focus", "study",
                 "what should", "priority", "plan", "complete",
                 "action", "schedule"],
        "alerts": ["alert", "alerts", "notification", "flagged",
                  "warning message", "notified"],
        "assignments": ["assignment", "submit", "submission", "pending",
                       "due", "deadline", "homework"],
        "placement": ["placement", "eligible", "drive", "job",
                     "company", "recruit", "interview", "criteria"],
        "marks_detail": ["which subject", "lowest subject", "best subject",
                        "focus on", "need to study", "weak in"],
        "greeting": ["hello", "hi", "hey", "help", "start",
                    "good morning", "good evening", "what can you"],
        "summary": ["summary", "overview", "overall", "everything",
                   "how am i", "my status", "update", "all data"],
        "events": [
            "event", "events", "current events", "upcoming events",
            "what events", "college events", "fest", "workshop",
            "seminar", "happening", "schedule", "registered",
            "event registration", "attend event"
        ],
        "resources": [
            "resource", "resources", "study material", "notes",
            "uploaded", "recent upload", "material", "pdf",
            "document", "files", "lecture notes", "reference"
        ],
        "timetable": [
            "timetable", "schedule", "class schedule", "today class",
            "tomorrow class", "when is", "time table", "periods"
        ]
    },
    "teacher": {
        "attendance": ["attendance", "class attendance", "average",
                      "who is absent", "low attendance", "present"],
        "risk": ["risk", "at risk", "struggling", "fail", "weak",
                "how many at risk", "alert students"],
        "marks": ["marks", "performance", "scores", "class average",
                 "average marks", "low marks", "weak students"],
        "assignments": ["assignment", "submission", "pending",
                       "submitted", "not submitted", "late"],
        "summary": ["summary", "overview", "focus", "what should",
                   "hello", "hi", "hey", "help", "report", "status",
                   "this week"]
    },
    "admin": {
        "risk": ["risk", "at risk", "high risk", "critical",
                "how many at risk", "students at risk"],
        "attendance": ["attendance", "overall", "department attendance",
                      "low attendance", "which department",
                      "attendance rate"],
        "placement": ["placement", "drives", "open drives", "companies",
                     "recruitment", "how many drives"],
        "department": ["department", "branch", "cse", "ece", "mech",
                      "civil", "which branch", "compare"],
        "students": ["total students", "how many students", "enrolled",
                    "student count"],
        "teachers": ["total teachers", "faculty count", "how many faculty",
                    "staff"],
        "alerts": ["alerts", "active alerts", "notifications",
                  "warnings", "flagged"],
        "summary": ["summary", "overview", "hello", "hi", "hey",
                   "help", "report", "status", "institution"]
    }
}

BLOCKED_PATTERNS = {
    "student": [
        "other student", "another student", "all students",
        "everyone's data", "show all students", "class list",
        "teacher data", "teacher salary", "admin data",
        "who else scored", "other people marks"
    ],
    "teacher": [
        "admin settings", "admin password", "other teacher salary",
        "personal phone number", "personal address",
        "student home address", "confidential admin"
    ],
    "faculty": [
        "admin settings", "admin password", "other teacher salary",
        "personal phone number", "student home address"
    ],
    "admin": []  # Admin has full access
}

def agent_input_processor(state: ChatPipelineState) -> ChatPipelineState:
    """
    Agent 1: Processes raw input.
    - Checks access control
    - Classifies intent
    - Extracts keywords
    - Normalizes message
    """
    try:
        message = state["raw_message"].lower().strip()
        role = state["role"].lower()

        # Access control check
        blocked = BLOCKED_PATTERNS.get(role, [])
        for pattern in blocked:
            if pattern in message:
                state["access_allowed"] = False
                state["denial_reason"] = (
                    f"You don't have access to that information. "
                    f"As a {role}, you can only view your own "
                    f"academic data."
                )
                state["intent"] = "denied"
                state["normalized_message"] = message
                state["keywords"] = []
                return state

        state["access_allowed"] = True
        state["denial_reason"] = ""

        # Intent classification with scoring
        msg = message
        filler = ["what", "is", "my", "the", "are", "do",
                  "i", "have", "any", "this", "a", "an",
                  "me", "tell", "show", "give", "how",
                  "many", "much", "today", "week", "month"]
        words = [w for w in msg.split() if w not in filler]
        cleaned = " ".join(words)

        intent_map = INTENT_KEYWORDS.get(
            role,
            INTENT_KEYWORDS.get("student", {})
        )

        best_intent = "summary"
        best_score = 0

        for intent, keywords in intent_map.items():
            score = 0
            for kw in keywords:
                # Check original message
                if kw in msg:
                    score += len(kw.split()) * 2
                # Check cleaned message (without fillers)
                if kw in cleaned:
                    score += len(kw.split())
                # Check individual words
                for word in words:
                    if word == kw or kw.startswith(word):
                        score += 1

            if score > best_score:
                best_score = score
                best_intent = intent

        # Special overrides for common patterns
        msg_lower = msg.lower()
        
        marks_indicators = [
            "mark", "marks", "score", "mid", "result",
            "exam", "grade", "mid1", "mid2", "percentage", "test"
        ]
        
        attendance_indicators = [
            "attendance", "present", "absent", "bunk",
            "how many classes", "classes attended"
        ]

        if any(w in msg_lower for w in ["hello", "hi", "hey", "help"]):
            best_intent = "greeting"
        elif "summary" in msg_lower or "overview" in msg_lower or "everything" in msg_lower:
            best_intent = "summary"
        elif "assignment" in msg_lower or "submit" in msg_lower or "pending" in msg_lower:
            best_intent = "assignments"
        # Check attendance FIRST
        elif any(w in msg_lower for w in attendance_indicators):
            best_intent = "attendance"
        # THEN check marks
        elif any(w in msg_lower for w in marks_indicators):
            best_intent = "marks"
        elif "risk" in msg_lower or "fail" in msg_lower or "danger" in msg_lower:
            best_intent = "risk"
        elif "task" in msg_lower or "today" in msg_lower or "focus" in msg_lower:
            best_intent = "tasks"
        elif "placement" in msg_lower or "eligible" in msg_lower or "drive" in msg_lower:
            best_intent = "placement"
        elif "alert" in msg_lower or "notification" in msg_lower or "warn" in msg_lower:
            best_intent = "alerts"
        elif "event" in msg_lower or "events" in msg_lower or "happening" in msg_lower:
            best_intent = "events"
        elif "resource" in msg_lower or "material" in msg_lower or "notes" in msg_lower or "upload" in msg_lower:
            best_intent = "resources"
        elif "timetable" in msg_lower or "schedule" in msg_lower:
            best_intent = "timetable"
        
        # If message mentions a specific subject name
        import re
        subject_pattern = re.compile(
            r'\b(machine learning|python|java|dbms|os|cn|'
            r'networks|algorithms|data structures|mathematics|'
            r'physics|chemistry|english|ml|ai|web|cloud|'
            r'computing|software|database)\b',
            re.IGNORECASE
        )
        if subject_pattern.search(msg_lower):
            if any(w in msg_lower for w in marks_indicators + ["about", "tell", "what"]):
                best_intent = "marks"
            if any(w in msg_lower for w in attendance_indicators):
                best_intent = "attendance"

        # Extract keywords found in message
        all_kws = []
        for kws in intent_map.values():
            all_kws.extend([kw for kw in kws if kw in message])

        state["intent"] = best_intent
        state["normalized_message"] = message
        state["keywords"] = list(set(all_kws))

        return state

    except Exception:
        traceback.print_exc()
        state["access_allowed"] = True
        state["intent"] = "summary"
        state["denial_reason"] = ""
        state["normalized_message"] = state.get("raw_message", "")
        state["keywords"] = []
        return state

def agent_context_retriever(state: ChatPipelineState) -> ChatPipelineState:
    """
    Agent 2: Retrieves relevant data from database.
    - Fetches only what the intent needs
    - Enforces role-based data scoping
    - Never fetches cross-user data for student/teacher
    """
    try:
        if not state["access_allowed"]:
            state["context"] = {}
            state["context_source"] = "denied"
            return state

        user_id = state["user_id"]
        role = state["role"].lower()
        intent = state["intent"]
        db = state["db"]

        from rag.context_builder import (
            build_student_context,
            build_teacher_context,
            build_admin_context,
            get_student_attendance_detail,
            get_student_marks_detail,
            get_student_assignments_detail,
            get_teacher_class_detail,
            get_admin_department_detail
        )

        context = {}

        if role == "student":
            if intent == "attendance":
                context = get_student_attendance_detail(user_id, db)
                # Always include base risk context
                base = build_student_context(user_id, db)
                context["risk_level"] = base.get("risk_level", "LOW")
            elif intent in ("marks", "marks_detail"):
                context = get_student_marks_detail(user_id, db)
            elif intent == "assignments":
                context = get_student_assignments_detail(user_id, db)
            elif intent == "risk":
                att = get_student_attendance_detail(user_id, db)
                marks = get_student_marks_detail(user_id, db)
                context = {**att, **marks}
                base = build_student_context(user_id, db)
                context["risk_level"] = base.get("risk_level", "LOW")
                context["active_alerts"] = base.get("active_alerts", [])
            elif intent == "alerts":
                base = build_student_context(user_id, db)
                context = {
                    "active_alerts": base.get("active_alerts", []),
                    "risk_level": base.get("risk_level", "LOW")
                }
            elif intent == "placement":
                base = build_student_context(user_id, db)
                att = get_student_attendance_detail(user_id, db)
                context = {
                    "attendance_pct": att.get("attendance_pct", 0),
                    "risk_level": base.get("risk_level", "LOW")
                }
            elif intent == "events":
                from rag.context_builder import get_student_events
                context = get_student_events(user_id, db)
            elif intent == "resources":
                from rag.context_builder import get_student_resources
                context = get_student_resources(user_id, db)
            elif intent == "timetable":
                try:
                    from models import Timetable
                    entries = db.query(Timetable).limit(20).all()
                    context = {
                        "timetable": [
                            {
                                "day": getattr(t, 'day', 'Unknown'),
                                "subject": getattr(t, 'subject_name',
                                          getattr(t, 'subject', 'Unknown')),
                                "time": getattr(t, 'time',
                                       getattr(t, 'start_time', 'Unknown')),
                                "room": getattr(t, 'room',
                                       getattr(t, 'venue', 'Unknown'))
                            }
                            for t in entries
                        ]
                    }
                except Exception:
                    context = {"timetable": [], "note": "No timetable data"}
            else:
                # summary, greeting, tasks, xp
                context = build_student_context(user_id, db)
                marks_detail = get_student_marks_detail(user_id, db)
                att_detail = get_student_attendance_detail(user_id, db)
                context = {**context, **marks_detail, **att_detail}

        elif role in ("teacher", "faculty"):
            context = get_teacher_class_detail(user_id, db)

        elif role == "admin":
            if intent == "department":
                context = get_admin_department_detail(db)
                base = build_admin_context(db)
                context = {**base, **context}
            else:
                context = build_admin_context(db)

        state["context"] = context
        state["context_source"] = "database"
        return state

    except Exception:
        traceback.print_exc()
        state["context"] = {}
        state["context_source"] = "empty"
        return state

def safe_pct(score, total):
    """Safe percentage calculation — never returns /0.0"""
    try:
        s = float(score) if score is not None else 0.0
        t = float(total) if total is not None else 0.0
        if t <= 0:
            if s <= 30:
                return round((s / 30) * 100, 1)
            elif s <= 100:
                return round(s, 1)
            else:
                return 0.0
        return round((s / t) * 100, 1)
    except Exception:
        return 0.0

def format_mark(score, total):
    """Format mark display — never shows /0.0"""
    try:
        s = float(score) if score is not None else 0
        t = float(total) if total is not None else 0
        if t > 0:
            return f"{s}/{t}"
        else:
            return f"{s} pts"
    except Exception:
        return "N/A"

def agent_answer_generator(state: ChatPipelineState) -> ChatPipelineState:
    try:
        # Access denied — return immediately
        if not state.get("access_allowed", True):
            state["raw_answer"] = state.get("denial_reason",
                "You don't have access to that information.")
            state["answer_source"] = "access_control"
            state["data_found"] = False
            return state

        role = state["role"].lower()
        intent = state["intent"]
        context = state["context"]
        message = state["raw_message"]
        history = state.get("history", [])

        state["data_found"] = bool(context)

        print(f"[ANSWER] role={role} intent={intent} "
              f"gemini={GEMINI_AVAILABLE} "
              f"context_keys={list(context.keys())[:5]}")

        if GEMINI_AVAILABLE and GEMINI_CLIENT:
            answer = call_gemini_answer(
                role=role,
                intent=intent,
                context=context,
                message=message,
                history=history
            )
            if answer:
                state["raw_answer"] = answer
                state["answer_source"] = "gemini"
                print(f"[ANSWER] Gemini replied: {answer[:60]}")
                return state

        # Gemini failed or unavailable
        # Use simple honest fallback — do NOT use templates
        state["raw_answer"] = build_honest_fallback(
            role, intent, context, message
        )
        state["answer_source"] = "fallback"
        return state

    except Exception:
        traceback.print_exc()
        state["raw_answer"] = (
            "I had trouble processing that. "
            "Please check your dashboard."
        )
        state["answer_source"] = "error"
        return state


def call_gemini_answer(role, intent, context,
                       message, history) -> str:
    """
    Single Gemini call that handles ALL query types.
    Context contains the real database data.
    Gemini generates a natural, specific answer.
    """
    try:
        # Build readable context string
        ctx_lines = []

        # --- Student context ---
        if "attendance_pct" in context:
            att = context["attendance_pct"]
            total = context.get("total_classes", 0)
            present = context.get("present_classes", 0)
            ctx_lines.append(
                f"ATTENDANCE: {att}% "
                f"({present}/{total} classes attended)"
            )

        if "subject_attendance" in context:
            per_subj = context["subject_attendance"]
            if per_subj:
                lines = [
                    f"  {s['subject']}: {s['pct']}% "
                    f"({s['present']}/{s['total']})"
                    for s in per_subj
                ]
                ctx_lines.append(
                    "PER-SUBJECT ATTENDANCE:\n" +
                    "\n".join(lines)
                )

        if "subject_marks" in context:
            marks = context["subject_marks"]
            if marks:
                lines = []
                for m in marks:
                    subj = m.get("subject", "Unknown")
                    score = m.get("score", 0)
                    out_of = m.get("out_of", 0)
                    pct = m.get("pct", 0)
                    exam = m.get("exam_type", "")
                    label = f"{subj}"
                    if exam:
                        label += f" [{exam}]"
                    if out_of > 0:
                        lines.append(
                            f"  {label}: {score}/{out_of} ({pct}%)"
                        )
                    else:
                        lines.append(f"  {label}: {score} pts ({pct}%)")
                ctx_lines.append(
                    "MARKS:\n" + "\n".join(lines)
                )

        if "risk_level" in context:
            ctx_lines.append(
                f"RISK LEVEL: {context['risk_level']}"
            )

        if "active_alerts" in context:
            alerts = context["active_alerts"]
            ctx_lines.append(
                f"ACTIVE ALERTS: {len(alerts)}"
            )
            if alerts:
                ctx_lines.append(
                    "ALERT DETAILS: " +
                    "; ".join(str(a) for a in alerts[:3])
                )

        if "pending_assignments" in context:
            ctx_lines.append(
                f"PENDING ASSIGNMENTS: "
                f"{context['pending_assignments']}"
            )

        if "xp" in context:
            ctx_lines.append(
                f"XP: {context['xp']} | "
                f"STREAK: {context.get('streak', 0)} days"
            )

        if "upcoming_events" in context:
            events = context["upcoming_events"]
            ctx_lines.append(
                f"EVENTS AVAILABLE: {len(events)}"
            )
            if events:
                ev_list = [
                    f"  {e['name']} on {e['date']}"
                    for e in events[:5]
                ]
                ctx_lines.append("\n".join(ev_list))

        if "recent_resources" in context:
            resources = context["recent_resources"]
            ctx_lines.append(
                f"STUDY MATERIALS: {len(resources)} available"
            )
            if resources:
                res_list = [
                    f"  {r['title']} ({r['subject']})"
                    for r in resources[:5]
                ]
                ctx_lines.append("\n".join(res_list))

        # --- Teacher context ---
        if "class_avg_attendance" in context:
            ctx_lines.append(
                f"CLASS AVG ATTENDANCE: "
                f"{context['class_avg_attendance']}%"
            )
        if "at_risk_count" in context:
            ctx_lines.append(
                f"AT-RISK STUDENTS: "
                f"{context['at_risk_count']} out of "
                f"{context.get('total_students', 0)}"
            )
        if "pending_submissions" in context:
            ctx_lines.append(
                f"PENDING SUBMISSIONS: "
                f"{context['pending_submissions']}"
            )
        if "subjects" in context and context["subjects"]:
            ctx_lines.append(
                f"YOUR SUBJECTS: "
                f"{', '.join(context['subjects'])}"
            )
        if "low_attendance_count" in context:
            ctx_lines.append(
                f"STUDENTS BELOW 75% ATTENDANCE: "
                f"{context['low_attendance_count']}"
            )

        # --- Admin context ---
        if "total_students" in context:
            ctx_lines.append(
                f"TOTAL STUDENTS: {context['total_students']}"
            )
        if "total_teachers" in context:
            ctx_lines.append(
                f"TOTAL FACULTY: {context['total_teachers']}"
            )
        if "overall_attendance_pct" in context:
            ctx_lines.append(
                f"OVERALL ATTENDANCE: "
                f"{context['overall_attendance_pct']}%"
            )
        if "department_breakdown" in context:
            depts = context["department_breakdown"]
            if depts:
                dept_lines = [
                    f"  {d['dept']}: "
                    f"{d['attendance']}% attendance, "
                    f"{d.get('at_risk', 0)} at-risk"
                    for d in depts
                ]
                ctx_lines.append(
                    "DEPARTMENT DATA:\n" +
                    "\n".join(dept_lines)
                )
        if "active_alerts_count" in context:
            ctx_lines.append(
                f"SYSTEM ALERTS: "
                f"{context['active_alerts_count']}"
            )
        if "placement_drives_open" in context:
            ctx_lines.append(
                f"OPEN PLACEMENT DRIVES: "
                f"{context['placement_drives_open']}"
            )

        context_string = "\n".join(ctx_lines) if ctx_lines else "No data available."

        # Build history string
        history_text = ""
        for h in history[-4:]:
            r = "User" if h.get("role") == "user" else "Assistant"
            history_text += f"{r}: {h.get('content', '')}\n"

        # Role-specific persona
        personas = {
            "student": (
                "You are a helpful AI academic assistant "
                "for a student at GVP college."
            ),
            "teacher": (
                "You are a helpful AI assistant for a "
                "faculty member at GVP college."
            ),
            "faculty": (
                "You are a helpful AI assistant for a "
                "faculty member at GVP college."
            ),
            "admin": (
                "You are a helpful institutional AI "
                "assistant for the admin of GVP college."
            )
        }
        persona = personas.get(role, personas["student"])

        # Access rules per role
        access_rules = {
            "student": (
                "You can only answer about this student's "
                "own data. If asked about other students, "
                "say: I don't have access to that."
            ),
            "teacher": (
                "You can answer about your class-level "
                "data only. Do not reveal individual "
                "student personal details."
            ),
            "faculty": (
                "You can answer about your class-level "
                "data only."
            ),
            "admin": (
                "You have full institutional data access. "
                "Answer any academic question."
            )
        }
        access = access_rules.get(role, "")

        prompt = f"""{persona}
{access}

REAL DATA FROM DATABASE:
{context_string}

CONVERSATION HISTORY:
{history_text}

USER QUESTION: "{message}"

RULES FOR YOUR ANSWER:
1. Use ONLY the numbers and facts from DATABASE DATA above
2. Never invent numbers — if data is missing say so clearly
3. Be specific — use actual values from the data
4. If the question is about something not in the data,
   say: "I don't have that specific data. Please check
   the [relevant] page in your dashboard."
5. Write in natural conversational sentences
6. Maximum 4 sentences
7. If data shows 0 for something the user expects to be
   non-zero, say the data shows 0 and suggest checking
   the dashboard directly
8. For general knowledge questions not about academics,
   answer briefly and note you're better at academic queries

ANSWER:"""

        print(f"[GEMINI] Sending request for: {message[:50]}")
        from google.genai import types as genai_types
        response = GEMINI_CLIENT.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=300,
                top_p=0.8
            )
        )

        if response and response.text:
            text = response.text.strip()
            print(f"[GEMINI] Got response: {text[:80]}")
            if len(text) > 10:
                return text

        print("[GEMINI] Empty response received")
        return None

    except Exception as e:
        print(f"[GEMINI] Call failed: {e}")
        traceback.print_exc()
        return None


def build_honest_fallback(role, intent, context, message) -> str:
    """
    Used ONLY when Gemini is unavailable.
    Returns honest, specific data — no templates.
    Different response for each intent.
    """
    if not context:
        return (
            f"I don't have data for that query right now. "
            f"Please check your dashboard directly."
        )

    role = role.lower()

    if role == "student":
        if intent == "attendance":
            att = context.get("attendance_pct", None)
            if att is None:
                return "No attendance data found for your account."
            total = context.get("total_classes", 0)
            present = context.get("present_classes", 0)
            warn = (" ⚠️ Below required 75%." if att < 75
                    else " ✅ Above 75% threshold.")
            return (f"Your attendance is {att}% "
                   f"({present}/{total} classes attended).{warn}")

        elif intent == "marks":
            subjects = context.get("subject_marks", [])
            if not subjects:
                return "No marks data found for your account."
            lines = []
            for s in subjects[:5]:
                score = s.get("score", 0)
                out_of = s.get("out_of", 0)
                exam = s.get("exam_type", "")
                subj = s.get("subject", "Unknown")
                label = f"{subj} [{exam}]" if exam else subj
                if out_of > 0:
                    pct = round(score / out_of * 100, 1)
                    lines.append(f"{label}: {score}/{out_of} ({pct}%)")
                else:
                    lines.append(f"{label}: {score} pts")
            return "Your marks: " + " | ".join(lines)

        elif intent == "risk":
            risk = context.get("risk_level", "Unknown")
            att = context.get("attendance_pct", "N/A")
            return (f"Your risk level is {risk}. "
                   f"Attendance: {att}%.")

        elif intent == "assignments":
            pending = context.get("pending_assignments", 0)
            if pending == 0:
                return "No pending assignments found."
            return f"You have {pending} pending assignment(s)."

        elif intent == "events":
            events = context.get("upcoming_events", [])
            if not events:
                return "No events found. Check the Events page."
            names = [e.get("name", "") for e in events[:3]]
            return f"Current events: {', '.join(names)}."

        elif intent == "resources":
            resources = context.get("recent_resources", [])
            if not resources:
                return "No resources found. Check the Resources page."
            names = [r.get("title", "") for r in resources[:3]]
            return f"Recent study materials: {', '.join(names)}."

        else:
            att = context.get("attendance_pct", "N/A")
            risk = context.get("risk_level", "N/A")
            pending = context.get("pending_assignments", 0)
            return (f"Your attendance: {att}%, "
                   f"risk level: {risk}, "
                   f"pending assignments: {pending}.")

    elif role in ("teacher", "faculty"):
        avg_att = context.get("class_avg_attendance", "N/A")
        at_risk = context.get("at_risk_count", "N/A")
        total = context.get("total_students", "N/A")
        pending = context.get("pending_submissions", 0)

        if intent == "attendance":
            return (f"Class average attendance: {avg_att}%. "
                   f"Total students: {total}.")
        elif intent == "risk":
            return (f"{at_risk} out of {total} students "
                   f"are at risk.")
        elif intent == "assignments":
            return (f"{pending} assignment submission(s) "
                   f"are pending.")
        else:
            return (f"Class summary: {avg_att}% avg attendance, "
                   f"{at_risk}/{total} students at risk, "
                   f"{pending} pending submissions.")

    else:  # admin
        total = context.get("total_students", "N/A")
        at_risk = context.get("at_risk_count", "N/A")
        att = context.get("overall_attendance_pct", "N/A")
        drives = context.get("placement_drives_open", 0)

        if intent == "attendance":
            depts = context.get("department_breakdown", [])
            if depts:
                dept_str = ", ".join([
                    f"{d['dept']}: {d['attendance']}%"
                    for d in depts[:4]
                ])
                return (f"Overall: {att}%. "
                       f"By department: {dept_str}.")
            return f"Overall institution attendance: {att}%."
        elif intent == "risk":
            return (f"{at_risk} out of {total} students "
                   f"are at risk institution-wide.")
        elif intent == "placement":
            return f"Active placement drives: {drives}."
        else:
            return (f"Institution: {total} students, "
                   f"{at_risk} at risk, "
                   f"{att}% overall attendance.")

def build_complete_context_string(context: dict, role: str) -> str:
    lines = []
    r = role.lower()

    if r == "student":
        # Attendance
        att = context.get("attendance_pct")
        if att is not None:
            total_cls = context.get("total_classes", 0)
            present = context.get("present_classes", 0)
            lines.append(
                f"OVERALL ATTENDANCE: {att}% "
                f"({present} present out of {total_cls} classes)"
            )

        # Per-subject attendance
        subj_att = context.get("subject_attendance", [])
        if subj_att:
            lines.append("PER-SUBJECT ATTENDANCE:")
            for s in subj_att:
                lines.append(
                    f"  - {s['subject']}: {s['pct']}% "
                    f"({s['present']}/{s['total']} classes)"
                )

        # Marks with exam type
        marks = context.get("subject_marks", [])
        if marks:
            lines.append("MARKS / EXAM SCORES:")
            for m in marks:
                subj = m.get("subject", "Unknown")
                exam = m.get("exam_type", "")
                score = m.get("score", 0)
                out_of = m.get("out_of", 0)
                pct = m.get("pct", 0)
                mid1 = m.get("mid1")
                mid2 = m.get("mid2")

                label = f"{subj}"
                if exam:
                    label += f" (Exam: {exam})"
                if out_of > 0:
                    lines.append(
                        f"  - {label}: {score}/{out_of} = {pct}%"
                    )
                else:
                    lines.append(f"  - {label}: {score} pts")

                if mid1 is not None:
                    lines.append(f"    Mid 1 score: {mid1}")
                if mid2 is not None:
                    lines.append(f"    Mid 2 score: {mid2}")

        # Risk
        risk = context.get("risk_level")
        if risk:
            lines.append(f"ACADEMIC RISK LEVEL: {risk}")

        # Alerts
        alerts = context.get("active_alerts", [])
        lines.append(f"ACTIVE ALERTS: {len(alerts)}")
        for a in alerts[:3]:
            lines.append(f"  - {a}")

        # Assignments
        pending = context.get("pending_assignments", 0)
        submitted = context.get("submitted_assignments", 0)
        total_assg = context.get("total_assignments", 0)
        lines.append(
            f"ASSIGNMENTS: {pending} pending, "
            f"{submitted} submitted out of {total_assg} total"
        )
        details = context.get("assignment_details", [])
        for d in details[:3]:
            lines.append(
                f"  - Pending: {d['title']} "
                f"(due: {d['due_date']})"
            )

        # Events
        events = context.get("upcoming_events", [])
        if events:
            lines.append(f"EVENTS ({len(events)} available):")
            for e in events[:4]:
                lines.append(
                    f"  - {e.get('name','?')} "
                    f"on {e.get('date','?')} "
                    f"({e.get('type','?')})"
                )

        # Resources
        resources = context.get("recent_resources", [])
        if resources:
            lines.append(
                f"STUDY MATERIALS ({len(resources)} available):"
            )
            for r in resources[:4]:
                lines.append(
                    f"  - {r.get('title','?')} "
                    f"[{r.get('subject','?')}] "
                    f"({r.get('type','?')})"
                )

        # XP
        xp = context.get("xp")
        streak = context.get("streak")
        if xp is not None:
            lines.append(
                f"GAMIFICATION: {xp} XP, "
                f"{streak} day streak"
            )

    elif r in ("teacher", "faculty"):
        lines.append(
            f"CLASS AVG ATTENDANCE: "
            f"{context.get('class_avg_attendance', 'N/A')}%"
        )
        lines.append(
            f"TOTAL STUDENTS: "
            f"{context.get('total_students', 'N/A')}"
        )
        lines.append(
            f"AT-RISK STUDENTS: "
            f"{context.get('at_risk_count', 'N/A')}"
        )
        lines.append(
            f"STUDENTS BELOW 75% ATTENDANCE: "
            f"{context.get('low_attendance_count', 'N/A')}"
        )
        lines.append(
            f"PENDING SUBMISSIONS: "
            f"{context.get('pending_submissions', 'N/A')}"
        )
        subjects = context.get("subjects", [])
        if subjects:
            lines.append(
                f"YOUR SUBJECTS: {', '.join(subjects)}"
            )
        else:
            lines.append("YOUR SUBJECTS: Not mapped in system")

    else:  # admin
        lines.append(
            f"TOTAL STUDENTS: "
            f"{context.get('total_students', 'N/A')}"
        )
        lines.append(
            f"TOTAL FACULTY: "
            f"{context.get('total_teachers', 'N/A')}"
        )
        lines.append(
            f"OVERALL ATTENDANCE: "
            f"{context.get('overall_attendance_pct', 'N/A')}%"
        )
        lines.append(
            f"AT-RISK STUDENTS: "
            f"{context.get('at_risk_count', 'N/A')}"
        )
        lines.append(
            f"ACTIVE ALERTS: "
            f"{context.get('active_alerts_count', 'N/A')}"
        )
        lines.append(
            f"OPEN PLACEMENT DRIVES: "
            f"{context.get('placement_drives_open', 'N/A')}"
        )
        depts = context.get("department_breakdown", [])
        if depts:
            lines.append("DEPARTMENT BREAKDOWN:")
            for d in depts:
                lines.append(
                    f"  - {d.get('dept','?')}: "
                    f"{d.get('attendance','?')}% attendance, "
                    f"{d.get('at_risk', 0)} at-risk students"
                )

    return "\n".join(lines) if lines else "No data available."

def build_role_system_prompt(role: str, context: dict) -> str:
    ctx = str(context)
    if role == "student":
        return (
            f"You are an academic assistant for a student at GVP college.\n"
            f"Student data: {ctx}\n"
            f"Rules: Only answer about this student's own data. "
            f"Never invent numbers. Use exact values from data."
        )
    elif role in ("teacher", "faculty"):
        return (
            f"You are an academic assistant for a faculty member.\n"
            f"Class data: {ctx}\n"
            f"Rules: Answer about class-level data only. "
            f"Never reveal individual student personal information."
        )
    else:
        return (
            f"You are an institutional AI assistant for the admin.\n"
            f"Institution data: {ctx}\n"
            f"Rules: Answer any academic question using this data. "
            f"Be precise with numbers."
        )

def generate_rule_answer(role, intent, context, message) -> str:
    try:
        if role == "student":
            return generate_student_answer(intent, context, message)
        elif role in ("teacher", "faculty"):
            return generate_teacher_answer(intent, context, message)
        else:
            return generate_admin_answer(intent, context, message)
    except Exception:
        traceback.print_exc()
        return "Unable to retrieve your data at this moment. Please check your dashboard."

def generate_student_answer(intent, ctx, message) -> str:
    if intent == "attendance":
        att = ctx.get("attendance_pct", 0)
        total = ctx.get("total_classes", 0)
        present = ctx.get("present_classes", 0)
        absent = max(0, total - present)

        if total == 0:
            return "No attendance records found for your account yet."

        if att < 75:
            needed = max(0, int((0.75 * total - present) / 0.25) + 1)
            return (
                f"⚠️ Your attendance is {att}% ({present}/{total} classes). "
                f"You are below the required 75%. "
                f"You need to attend approximately {needed} more "
                f"consecutive classes to reach 75%. Do not miss any classes."
            )
        elif att < 85:
            return (
                f"Your attendance is {att}% ({present}/{total} classes). "
                f"This is acceptable but be careful — "
                f"missing more classes could drop you below 75%."
            )
        else:
            return (
                f"Your attendance is {att}% ({present}/{total} classes). "
                f"Excellent! You are well above the 75% requirement."
            )

    elif intent in ("marks", "marks_detail"):
        subjects = ctx.get("subject_marks", [])
        if not subjects:
            return "No marks records found for your account yet."

        # Check if asking about specific exam type
        msg_lower = message.lower()
        asking_mid1 = any(w in msg_lower for w in [
            "mid 1", "mid1", "first mid", "1st mid", "midterm 1"
        ])
        asking_mid2 = any(w in msg_lower for w in [
            "mid 2", "mid2", "second mid", "2nd mid", "midterm 2"
        ])

        # Filter by exam type if specified
        if asking_mid1:
            filtered = [s for s in subjects
                        if "1" in s.get("exam_type", "").lower()
                        or "mid1" in s.get("exam_type", "").lower()
                        or "first" in s.get("exam_type", "").lower()]
            if filtered:
                subjects = filtered
        elif asking_mid2:
            filtered = [s for s in subjects
                        if "2" in s.get("exam_type", "").lower()
                        or "mid2" in s.get("exam_type", "").lower()
                        or "second" in s.get("exam_type", "").lower()]
            if filtered:
                subjects = filtered

        # Check if asking about a specific subject
        matching = [
            s for s in subjects
            if s.get("raw_subject", s.get("subject", "")).lower() in msg_lower
            or any(
                word in msg_lower
                for word in s.get("raw_subject", s.get("subject", "")).lower().split()
                if len(word) > 3
            )
        ]

        # If asking about specific subject, show only that
        display_subjects = matching if matching else subjects

        lines = []
        weak = []
        for s in display_subjects:
            subj = s.get("subject", "Unknown")
            score = s.get("score", 0)
            out_of = s.get("out_of", 0)
            pct = safe_pct(score, out_of)
            display = format_mark(score, out_of)
            icon = "✅" if pct >= 60 else ("⚠️" if pct >= 40 else "❌")
            lines.append(f"{icon} {subj}: {display} ({pct}%)")
            if pct < 50:
                weak.append(subj)

        if matching and len(matching) == 1:
            # Specific subject query
            s = matching[0]
            pct = safe_pct(s.get("score", 0), s.get("out_of", 0))
            display = format_mark(s.get("score", 0), s.get("out_of", 0))
            status = "good" if pct >= 60 else ("needs improvement" if pct >= 40 else "critically low")
            return (
                f"Your {s.get('subject', 'subject')} marks: "
                f"{display} ({pct}%) — {status}."
            )

        result = "Your marks:\n" + "\n".join(lines)
        if weak:
            result += f"\n\n📚 Focus needed: {', '.join(weak)}"
        return result

    elif intent == "risk":
        att = ctx.get("attendance_pct", 0)
        risk = ctx.get("risk_level", "LOW")
        subjects = ctx.get("subject_marks", [])
        alerts = ctx.get("active_alerts", [])
        weak = [s.get("subject", "") for s in subjects
                if safe_pct(s.get("score", 0), s.get("out_of", 30)) < 40]

        emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(risk, "⚪")
        lines = [f"{emoji} Risk Level: {risk}", f"📊 Attendance: {att}%"]

        if att < 75:
            lines.append("⚠️ Attendance is critically low")
        if weak:
            lines.append(f"📚 Low scoring: {', '.join(weak[:3])}")
        if alerts:
            lines.append(f"🔔 Active alerts: {len(alerts)}")

        if risk == "HIGH":
            lines.append("\n🚨 Action: Contact your faculty advisor immediately.")
        elif risk == "MEDIUM":
            lines.append("\n💡 Action: Improve attendance and revise weak subjects.")
        else:
            lines.append("\n✅ You are on track. Keep it up!")

        return "\n".join(lines)

    elif intent == "tasks":
        att = ctx.get("attendance_pct", 0)
        subjects = ctx.get("subject_marks", [])
        pending = ctx.get("pending_assignments", 0)
        tasks = []

        if att < 75:
            tasks.append(f"🔴 HIGH: Attend all classes (attendance: {att}%)")
        elif att < 85:
            tasks.append(f"🟡 MEDIUM: Maintain attendance (currently {att}%)")

        weak = [s for s in subjects
                if safe_pct(s.get("score", 0), s.get("out_of", 30)) < 50]
        for s in weak[:2]:
            subj = s.get("subject", "subject")
            pct = safe_pct(s.get("score", 0), s.get("out_of", 30))
            tasks.append(f"🟡 Study: Revise {subj} — {pct}%")

        if pending > 0:
            tasks.append(f"📝 Submit {pending} pending assignment(s)")

        if not tasks:
            return "✅ No urgent tasks right now. Keep up the good work!"

        return "Your priority tasks today:\n" + "\n".join(tasks)

    elif intent == "assignments":
        pending = ctx.get("pending_assignments", 0)
        submitted = ctx.get("submitted_assignments", 0)
        if pending == 0:
            return f"✅ No pending assignments. You have submitted {submitted} assignment(s)."
        return (f"📝 You have {pending} pending assignment(s). "
               f"Check the Assignments page to view deadlines and submit.")

    elif intent == "alerts":
        alerts = ctx.get("active_alerts", [])
        if not alerts:
            return "🟢 No active alerts. Everything looks good!"
        result = f"🔔 You have {len(alerts)} active alert(s):\n"
        for i, a in enumerate(alerts[:5], 1):
            result += f"{i}. {a}\n"
        return result.strip()

    elif intent == "placement":
        att = ctx.get("attendance_pct", 0)
        risk = ctx.get("risk_level", "LOW")
        eligible = risk != "HIGH" and att >= 60
        if eligible:
            return (
                f"✅ Based on your profile (attendance: {att}%, "
                f"risk: {risk}), you appear eligible for placement drives. "
                f"Visit the Placement page to see active drives and apply."
            )
        issues = []
        if att < 60:
            issues.append(f"attendance too low ({att}%)")
        if risk == "HIGH":
            issues.append("high academic risk")
        return (
            f"⚠️ Possible eligibility issues: {', '.join(issues)}. "
            f"Improve these areas before applying for placement drives."
        )

    elif intent == "events":
        events = ctx.get("upcoming_events", [])
        total = ctx.get("total_events", 0)
        if not events:
            return ("No events found in the system currently. "
                   "Check the Events page for updates.")
        lines = [f"• {e['name']} — {e['date']} ({e['type']})"
                 for e in events[:5]]
        return (f"There are {total} event(s) available:\n" +
                "\n".join(lines) +
                "\n\nVisit the Events page to register.")

    elif intent == "resources":
        resources = ctx.get("recent_resources", [])
        total = ctx.get("total_resources", 0)
        if not resources:
            return ("No resources uploaded yet. "
                   "Check the Resources page for study materials.")
        lines = [f"• {r['title']} — {r['subject']} ({r['type']})"
                 for r in resources[:5]]
        return (f"Recent study materials ({total} total):\n" +
                "\n".join(lines) +
                "\n\nVisit Resources page to download.")

    elif intent == "timetable":
        entries = ctx.get("timetable", [])
        if not entries:
            return ("No timetable data available. "
                   "Check the Timetable page for your schedule.")
        lines = [f"• {t['day']}: {t['subject']} at {t['time']}"
                 for t in entries[:8]]
        return "Your timetable:\n" + "\n".join(lines)

    elif intent == "greeting":
        att = ctx.get("attendance_pct", "N/A")
        risk = ctx.get("risk_level", "N/A")
        alerts = ctx.get("active_alerts", [])
        pending = ctx.get("pending_assignments", 0)
        emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(str(risk), "⚪")
        return (
            f"👋 Hello! Here's your academic snapshot:\n"
            f"📊 Attendance: {att}%\n"
            f"{emoji} Risk Level: {risk}\n"
            f"🔔 Active Alerts: {len(alerts)}\n"
            f"📝 Pending Assignments: {pending}\n\n"
            f"Ask me about attendance, marks, tasks, "
            f"assignments, or placement eligibility!"
        )

    else:  # summary / default
        att = ctx.get("attendance_pct", "N/A")
        risk = ctx.get("risk_level", "N/A")
        subjects = ctx.get("subject_marks", [])
        alerts = ctx.get("active_alerts", [])
        pending = ctx.get("pending_assignments", 0)
        weak = [s.get("subject", "") for s in subjects
                if safe_pct(s.get("score", 0), s.get("out_of", 30)) < 50]
        emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(str(risk), "⚪")

        lines = [
            "📋 Your Academic Summary:",
            f"📊 Attendance: {att}%",
            f"{emoji} Risk Level: {risk}",
            f"🔔 Active Alerts: {len(alerts)}",
            f"📝 Pending Assignments: {pending}",
        ]
        if weak:
            lines.append(f"⚠️ Needs attention: {', '.join(weak[:3])}")
        return "\n".join(lines)

def generate_teacher_answer(intent, ctx, message) -> str:
    if intent == "attendance":
        avg = ctx.get("class_avg_attendance", 0)
        total = ctx.get("total_students", 0)
        low = ctx.get("low_attendance_count", 0)
        status = "✅ Good" if avg >= 75 else "⚠️ Needs attention"
        answer = f"📊 Class average attendance: {avg}% — {status}\n"
        answer += f"👥 Total students: {total}\n"
        if low > 0:
            answer += f"⚠️ {low} student(s) are below 75% attendance."
        return answer

    elif intent == "risk":
        count = ctx.get("at_risk_count", 0)
        total = ctx.get("total_students", 0)
        if total == 0:
            return "No student data found for your subjects yet."
        pct = round((count / total) * 100, 1) if total > 0 else 0
        if count == 0:
            return f"✅ No at-risk students in your class. All {total} students are on track."
        return (
            f"🔴 {count} out of {total} students ({pct}%) are at risk.\n"
            f"These students need attention. Consider scheduling "
            f"review sessions or sending alerts through the system."
        )

    elif intent == "marks":
        avg = ctx.get("class_avg_marks", 0)
        subjects = ctx.get("subjects", [])
        subj_str = ", ".join(subjects) if subjects else "your subjects"
        if avg == 0:
            return "No marks data available for your class yet."
        label = "✅ Good" if avg >= 60 else ("⚠️ Average" if avg >= 40 else "❌ Low")
        return (
            f"📊 Class average performance: {avg}% — {label}\n"
            f"Subjects: {subj_str}\n"
            f"{'Consider revision sessions for weak students.' if avg < 60 else 'Performance is satisfactory.'}"
        )

    elif intent == "assignments":
        pending = ctx.get("pending_submissions", 0)
        if pending == 0:
            return "✅ All assignments have been submitted. No pending submissions."
        return (
            f"📝 {pending} assignment submission(s) are still pending.\n"
            f"Consider sending a reminder to students who haven't submitted."
        )

    else:  # summary / greeting
        avg_att = ctx.get("class_avg_attendance", "N/A")
        at_risk = ctx.get("at_risk_count", 0)
        total = ctx.get("total_students", 0)
        pending = ctx.get("pending_submissions", 0)
        subjects = ctx.get("subjects", [])
        return (
            f"👋 Hello! Here's your class summary:\n"
            f"📊 Avg Attendance: {avg_att}%\n"
            f"🔴 At-Risk Students: {at_risk}/{total}\n"
            f"📝 Pending Submissions: {pending}\n"
            f"📚 Your Subjects: {', '.join(subjects) if subjects else 'N/A'}\n\n"
            f"Ask me about attendance, at-risk students, marks, or submissions!"
        )

def generate_admin_answer(intent, ctx, message) -> str:
    if intent == "risk":
        at_risk = ctx.get("at_risk_count", 0)
        total = ctx.get("total_students", 0)
        pct = round((at_risk / total) * 100, 1) if total > 0 else 0
        depts = ctx.get("department_breakdown", [])
        high = [d["dept"] for d in depts if d.get("at_risk", 0) > 0]
        answer = f"🔴 {at_risk}/{total} students ({pct}%) are at risk.\n"
        if high:
            answer += f"Departments with at-risk students: {', '.join(high[:4])}."
        return answer

    elif intent == "attendance":
        overall = ctx.get("overall_attendance_pct", 0)
        low_depts = ctx.get("low_attendance_departments", [])
        depts = ctx.get("department_breakdown", [])
        msg_lower = message.lower()

        # Check if asking about a specific department
        dept_keywords = {
            "cse": ["cse", "computer science", "cs"],
            "ece": ["ece", "electronics"],
            "mech": ["mech", "mechanical"],
            "civil": ["civil"],
            "it": [" it ", "information technology"],
            "eee": ["eee", "electrical"]
        }

        specific_dept = None
        for dept_name, keywords in dept_keywords.items():
            if any(kw in msg_lower for kw in keywords):
                specific_dept = dept_name
                break

        if specific_dept and depts:
            # Find matching department
            matching = [
                d for d in depts
                if specific_dept.lower() in d.get("dept", "").lower()
                or any(
                    kw in d.get("dept", "").lower()
                    for kw in dept_keywords.get(specific_dept, [])
                )
            ]
            if matching:
                dept = matching[0]
                att = dept.get("attendance", 0)
                at_risk = dept.get("at_risk", 0)
                # `total` is missing from `department_breakdown` initially, so let's default appropriately
                total = dept.get("total", "N/A")
                status = "✅ Good" if att >= 75 else "⚠️ Below threshold"
                return (
                    f"📊 {dept['dept']} Department attendance: "
                    f"{att}% — {status}\n"
                    f"At-risk: {at_risk}"
                )
            else:
                return (
                    f"No specific data found for that department. "
                    f"Overall institution attendance is {overall}%. "
                    f"Available departments: "
                    f"{', '.join([d['dept'] for d in depts[:5]])}"
                )

        # No specific department — return overall with breakdown
        answer = f"📊 Overall institution attendance: {overall}%\n"
        if low_depts:
            answer += f"⚠️ Below 75%: {', '.join(low_depts)}\n"
        if depts:
            lines = [
                f"  • {d['dept']}: {d['attendance']}%"
                for d in depts[:6]
            ]
            answer += "Department breakdown:\n" + "\n".join(lines)
        return answer

    elif intent == "placement":
        drives = ctx.get("placement_drives_open", 0)
        return (
            f"💼 Active placement drives: {drives}\n"
            f"Visit the Placement section to manage drives and track applications."
        )

    elif intent == "department":
        depts = ctx.get("department_breakdown", [])
        if not depts:
            return "No department data available."
        lines = [
            f"• {d['dept']}: {d['attendance']}% attendance, "
            f"{d.get('at_risk', 0)} at-risk/{d.get('total', 0)} students"
            for d in depts
        ]
        return "🏫 Department breakdown:\n" + "\n".join(lines)

    elif intent == "students":
        total = ctx.get("total_students", 0)
        at_risk = ctx.get("at_risk_count", 0)
        return f"👨🎓 Total enrolled students: {total}. At-risk: {at_risk}."

    elif intent == "teachers":
        total = ctx.get("total_teachers", 0)
        return f"👩🏫 Total faculty members: {total}."

    elif intent == "alerts":
        count = ctx.get("active_alerts_count", 0)
        return f"🔔 Active alerts in system: {count}. Visit Alerts section to review."

    else:  # summary / greeting
        total_s = ctx.get("total_students", "N/A")
        total_t = ctx.get("total_teachers", "N/A")
        att = ctx.get("overall_attendance_pct", "N/A")
        at_risk = ctx.get("at_risk_count", "N/A")
        alerts = ctx.get("active_alerts_count", "N/A")
        drives = ctx.get("placement_drives_open", "N/A")
        return (
            f"👋 Hello! Institution overview:\n"
            f"👨🎓 Students: {total_s} | 👩🏫 Faculty: {total_t}\n"
            f"📊 Overall Attendance: {att}%\n"
            f"🔴 At-Risk Students: {at_risk}\n"
            f"🔔 Active Alerts: {alerts}\n"
            f"💼 Open Placement Drives: {drives}\n\n"
            f"Ask me about risk, attendance, departments, or placement!"
        )

def agent_response_formatter(state: ChatPipelineState) -> ChatPipelineState:
    """
    Agent 4: Formats the final response.
    - Cleans up raw data artifacts
    - Ensures readable formatting
    - Adds appropriate context notes
    """
    try:
        raw = state.get("raw_answer", "")
        source = state.get("answer_source", "rules")

        if not raw or not raw.strip():
            state["final_reply"] = (
                "I couldn't find specific data for that question. "
                "Please check your dashboard for details."
            )
            state["formatted"] = True
            return state

        cleaned = raw.strip()

        # If source is gemini, it's already natural — just return it
        if "gemini" in source:
            state["final_reply"] = cleaned
            state["formatted"] = True
            return state

        # For rule-based answers, clean up display
        # Replace multiple spaces
        import re
        cleaned = re.sub(r'  +', ' ', cleaned)
        # Ensure newlines render properly
        cleaned = cleaned.replace('\\n', '\n')

        state["final_reply"] = cleaned
        state["formatted"] = True
        return state

    except Exception:
        traceback.print_exc()
        state["final_reply"] = (
            "Please check your dashboard for the latest information."
        )
        state["formatted"] = True
        return state

def route_after_input(state: ChatPipelineState) -> str:
    """After Agent 1: if access denied skip to formatter"""
    if not state.get("access_allowed", True):
        return "format"
    return "retrieve"

def build_chat_pipeline():
    """Builds and compiles the 4-agent LangGraph pipeline."""
    workflow = StateGraph(ChatPipelineState)

    # Add the 4 agent nodes
    workflow.add_node("process_input", agent_input_processor)
    workflow.add_node("retrieve_context", agent_context_retriever)
    workflow.add_node("generate_answer", agent_answer_generator)
    workflow.add_node("format_response", agent_response_formatter)

    # Entry point
    workflow.set_entry_point("process_input")

    # Conditional routing after input processing
    workflow.add_conditional_edges(
        "process_input",
        route_after_input,
        {
            "retrieve": "retrieve_context",
            "format": "format_response"
        }
    )

    # Linear flow for allowed queries
    workflow.add_edge("retrieve_context", "generate_answer")
    workflow.add_edge("generate_answer", "format_response")
    workflow.add_edge("format_response", END)

    return workflow.compile()

# Compile once at module load
try:
    CHAT_PIPELINE = build_chat_pipeline()
    print("[PIPELINE] LangGraph chat pipeline compiled successfully")
except Exception as e:
    CHAT_PIPELINE = None
    print(f"[PIPELINE] Failed to compile: {e}")

def run_chat_pipeline(user_id: int, role: str, message: str,
                      history: list, db: Session) -> str:
    """
    Main entry point. Runs the full 4-agent pipeline.
    Always returns a string, never raises.
    """
    try:
        if CHAT_PIPELINE is None:
            # Pipeline failed to compile — use direct answer
            from rag.chat_engine import answer_query
            return answer_query(user_id, role, message, history, db)

        initial_state = ChatPipelineState(
            raw_message=message,
            role=role,
            user_id=user_id,
            history=history,
            db=db,
            intent="",
            access_allowed=True,
            denial_reason="",
            normalized_message="",
            keywords=[],
            context={},
            context_source="",
            raw_answer="",
            answer_source="",
            data_found=False,
            final_reply="",
            formatted=False
        )

        result = CHAT_PIPELINE.invoke(initial_state)
        reply = result.get("final_reply", "")

        if not reply or len(reply.strip()) == 0:
            return "Please check your dashboard for the latest information."

        return reply

    except Exception as e:
        traceback.print_exc()
        return (
            "I'm having trouble processing your request right now. "
            "Please try again in a moment."
        )

def get_full_context_for_gemini(user_id, role, db) -> dict:
    """Gets all available context for Gemini to reason over."""
    try:
        from rag.context_builder import (
            build_student_context,
            build_teacher_context,
            build_admin_context,
            get_student_marks_detail,
            get_student_attendance_detail,
            get_student_assignments_detail,
            get_student_events,
            get_student_resources
        )
        role = role.lower()
        if role == "student":
            ctx = build_student_context(user_id, db)
            ctx.update(get_student_marks_detail(user_id, db))
            ctx.update(get_student_attendance_detail(user_id, db))
            ctx.update(get_student_assignments_detail(user_id, db))
            ctx.update(get_student_events(user_id, db))
            ctx.update(get_student_resources(user_id, db))
            return ctx
        elif role in ("teacher", "faculty"):
            # build_teacher_context doesn't exist, we use get_teacher_class_detail
            from rag.context_builder import get_teacher_class_detail
            return get_teacher_class_detail(user_id, db)
        else:
            from rag.context_builder import build_admin_context
            return build_admin_context(db)
    except Exception:
        traceback.print_exc()
        return {}

def call_gemini_freeform(role, context, message, history) -> str:
    """
    Gemini answers any question from full context.
    Used for queries that don't match known intents.
    """
    try:
        context_str = build_complete_context_string(context, role)
        history_text = "\n".join([
            f"{'User' if h.get('role')=='user' else 'Assistant'}: "
            f"{h.get('content', '')}"
            for h in history[-4:]
        ])

        personas = {
            "student": "academic assistant for a student",
            "teacher": "assistant for a faculty member",
            "faculty": "assistant for a faculty member",
            "admin": "institutional assistant for admin"
        }
        persona = personas.get(role.lower(),
                              "academic assistant")

        prompt = f"""You are an {persona} at GVP college.

AVAILABLE DATA FROM DATABASE:
{context_str}

CONVERSATION HISTORY:
{history_text}

USER QUESTION: "{message}"

INSTRUCTIONS:
- Answer ONLY using the data provided above
- If the data contains the answer, give it specifically
- If the question is about something NOT in the data
  (like faculty details, specific class names, personal
  info about other people), say:
  "I don't have that specific information in my current
  context. Please check the relevant page in your dashboard."
- If the question is a general knowledge question
  not related to the user's academic data, you
  MAY answer it briefly from your general knowledge,
  but always add: 'Note: For academic data, ask me
  about your attendance, marks, or assignments.'
- Never invent numbers or facts
- Be conversational and helpful
- Maximum 4 sentences
- If data is empty, say "No data available for that."

ANSWER:"""

        from google.genai import types as genai_types
        response = GEMINI_CLIENT.models.generate_content(
            model="models/gemini-2.5-flash",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=200
            )
        )
        if response and response.text and len(response.text.strip()) > 10:
            return response.text.strip()
        return None
    except Exception as e:
        print(f"[GEMINI FREEFORM ERROR] {e}")
        return None

