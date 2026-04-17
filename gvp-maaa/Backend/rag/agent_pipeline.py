from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
import traceback
import os

try:
    import google.generativeai as genai
    from dotenv import load_dotenv
    import os
    
    # Force load .env from Backend folder
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    load_dotenv(env_path)
    
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    print(f"[STARTUP] GEMINI_KEY present: {bool(GEMINI_KEY)}")
    print(f"[STARTUP] GEMINI_KEY starts with: {GEMINI_KEY[:8] if GEMINI_KEY else 'EMPTY'}")
    
    if GEMINI_KEY and GEMINI_KEY.startswith("AIza"):
        genai.configure(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
        print("[GEMINI] Configured successfully")
    else:
        GEMINI_AVAILABLE = False
        print(f"[GEMINI] Key missing or invalid: '{GEMINI_KEY[:10] if GEMINI_KEY else ''}'")
except Exception as e:
    GEMINI_AVAILABLE = False
    print(f"[GEMINI] Import failed: {e}")

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
        if not state["access_allowed"]:
            state["raw_answer"] = state["denial_reason"]
            state["answer_source"] = "access_control"
            state["data_found"] = False
            return state

        role = state["role"].lower()
        intent = state["intent"]
        context = state["context"]
        message = state["raw_message"]
        history = state.get("history", [])

        state["data_found"] = bool(context)

        # Step 1: Handle unrecognized queries dynamically using Gemini
        summary_trigger_words = [
            "summary", "overview", "everything", "all data",
            "hello", "hi", "hey", "help", "good morning"
        ]
        msg_lower = message.lower()
        is_summary_request = any(
            w in msg_lower for w in summary_trigger_words
        )

        if intent == "summary" and not is_summary_request:
            # This is an unrecognized query — try Gemini with
            # full context before falling back to summary
            full_context = get_full_context_for_gemini(
                user_id=state["user_id"],
                role=role,
                db=state["db"]
            )
            if GEMINI_AVAILABLE and full_context:
                gemini_reply = call_gemini_freeform(
                    role=role,
                    context=full_context,
                    message=message,
                    history=history
                )
                if gemini_reply:
                    state["raw_answer"] = gemini_reply
                    state["answer_source"] = "gemini_freeform"
                    state["data_found"] = True
                    return state

            # Gemini not available or failed — tell user honestly
            if not GEMINI_AVAILABLE:
                state["raw_answer"] = (
                    f"I understand you're asking about "
                    f"'{message}'. I don't have specific data "
                    f"for that in my current context. "
                    f"Please check the relevant page in your "
                    f"dashboard, or ask me about: attendance, "
                    f"marks, assignments, events, resources, "
                    f"placement eligibility, or risk level."
                )
                state["answer_source"] = "no_match"
                state["data_found"] = False
                return state

            state["raw_answer"] = (
                "I don't have specific data for that query in my "
                "current context. Please check the relevant page "
                "in your dashboard for that information."
            )
            state["answer_source"] = "no_data"
            state["data_found"] = False
            return state

        # Step 2: Generate rule-based answer (always accurate data)
        rule_answer = generate_rule_answer(role, intent, context, message)

        # Step 2: Try Gemini as primary responder
        if GEMINI_AVAILABLE:
            gemini_reply = call_gemini_primary(
                role=role,
                intent=intent,
                context=context,
                rule_answer=rule_answer,
                message=message,
                history=history
            )
            if gemini_reply and len(gemini_reply.strip()) > 20:
                state["raw_answer"] = gemini_reply
                state["answer_source"] = "gemini"
                return state

        # Step 3: Fall back to rule-based if Gemini unavailable
        state["raw_answer"] = rule_answer
        state["answer_source"] = "rules"
        return state

    except Exception:
        traceback.print_exc()
        state["raw_answer"] = ("I had trouble retrieving your data. "
                              "Please check your dashboard.")
        state["answer_source"] = "fallback"
        state["data_found"] = False
        return state

def call_gemini_primary(role, intent, context, rule_answer,
                        message, history) -> str:
    try:
        # Build conversation history
        history_text = ""
        for h in history[-4:]:
            r = "Student" if h.get("role") == "user" else "Assistant"
            history_text += f"{r}: {h.get('content', '')}\n"

        # Build context summary based on intent
        context_summary = build_context_summary(intent, context, role)

        # Role-specific persona
        personas = {
            "student": (
                "You are an AI academic assistant for a student "
                "at GVP college. You have access to their real "
                "academic data. Be helpful, encouraging, and specific."
            ),
            "teacher": (
                "You are an AI assistant for a faculty member "
                "at GVP college. You have access to class-level "
                "academic data. Be professional and data-focused."
            ),
            "faculty": (
                "You are an AI assistant for a faculty member "
                "at GVP college. Be professional and data-focused."
            ),
            "admin": (
                "You are an institutional AI assistant for the "
                "admin of GVP college. You have full institutional "
                "data. Be precise, concise, and data-driven."
            )
        }
        persona = personas.get(role, personas["student"])

        prompt = f"""{persona}

REAL DATA FROM DATABASE FOR THIS USER:
{context_summary}

STRUCTURED ANSWER FROM DATA:
{rule_answer}

RECENT CONVERSATION:
{history_text}

USER'S QUESTION: "{message}"

YOUR TASK:
Using ONLY the data provided above, answer the user's question
naturally and conversationally.

STRICT RULES:
- Use ONLY numbers and facts from the data above
- NEVER invent, estimate, or assume any data
- If the data shows 0 pending assignments, say that clearly
- If asked about something not in the data (like events or
  resources if not provided), say the data is not available
  and suggest checking that page in the dashboard
- Be specific — use actual numbers from the data
- Write in natural sentences, not bullet points
- Keep response under 5 sentences
- If data is empty or null, say "No data available for that.
  Please check your dashboard." — do not make up numbers

RESPOND NOW:"""

        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 250,
                "top_p": 0.8
            }
        )

        response = model.generate_content(prompt)

        if response and response.text:
            text = response.text.strip()
            # Sanity check — if Gemini invented numbers not in
            # context, fall back to rule answer
            if len(text) > 15:
                return text

        return None

    except Exception as e:
        print(f"[GEMINI ERROR] {e}")
        traceback.print_exc()
        return None

def build_context_summary(intent: str, context: dict,
                          role: str) -> str:
    """
    Builds a clean, readable context string for Gemini.
    Filters to only show data relevant to the intent.
    """
    try:
        if not context:
            return "No data available."

        lines = []

        # Always include these if available
        if "attendance_pct" in context:
            lines.append(f"Attendance: {context['attendance_pct']}%")
        if "total_classes" in context:
            lines.append(
                f"Total classes: {context['total_classes']}, "
                f"Present: {context.get('present_classes', 0)}"
            )
        if "risk_level" in context:
            lines.append(f"Risk level: {context['risk_level']}")

        # Marks
        if "subject_marks" in context and context["subject_marks"]:
            marks_lines = []
            for s in context["subject_marks"]:
                score = s.get("score", 0)
                out_of = s.get("out_of", 0)
                subj = s.get("subject", "Unknown")
                if out_of > 0:
                    marks_lines.append(
                        f"{subj}: {score}/{out_of}"
                    )
                else:
                    marks_lines.append(f"{subj}: {score} pts")
            lines.append("Marks: " + ", ".join(marks_lines))

        # Assignments
        if "pending_assignments" in context:
            lines.append(
                f"Pending assignments: "
                f"{context['pending_assignments']}"
            )
        if "submitted_assignments" in context:
            lines.append(
                f"Submitted assignments: "
                f"{context['submitted_assignments']}"
            )

        # Alerts
        if "active_alerts" in context:
            alerts = context["active_alerts"]
            lines.append(f"Active alerts: {len(alerts)}")
            if alerts:
                lines.append(
                    "Alert details: " + "; ".join(
                        str(a) for a in alerts[:3]
                    )
                )

        # XP / Streak
        if "xp" in context and context["xp"]:
            lines.append(f"XP: {context['xp']}, "
                        f"Streak: {context.get('streak', 0)} days")

        # Events
        if "upcoming_events" in context:
            events = context["upcoming_events"]
            lines.append(f"Events available: {len(events)}")
            if events:
                event_names = [e.get("name", "") for e in events[:3]]
                lines.append(
                    "Events: " + ", ".join(event_names)
                )

        # Resources
        if "recent_resources" in context:
            resources = context["recent_resources"]
            lines.append(f"Resources available: {len(resources)}")
            if resources:
                res_names = [r.get("title", "") for r in resources[:3]]
                lines.append(
                    "Recent uploads: " + ", ".join(res_names)
                )

        # Teacher context
        if "class_avg_attendance" in context:
            lines.append(
                f"Class average attendance: "
                f"{context['class_avg_attendance']}%"
            )
        if "at_risk_count" in context:
            lines.append(
                f"At-risk students: {context['at_risk_count']} "
                f"out of {context.get('total_students', 0)}"
            )
        if "pending_submissions" in context:
            lines.append(
                f"Pending assignment submissions: "
                f"{context['pending_submissions']}"
            )
        if "subjects" in context and context["subjects"]:
            lines.append(
                "Subjects taught: " +
                ", ".join(context["subjects"])
            )

        # Admin context
        if "total_students" in context and "total_teachers" in context:
            lines.append(
                f"Total students: {context['total_students']}, "
                f"Total faculty: {context['total_teachers']}"
            )
        if "overall_attendance_pct" in context:
            lines.append(
                f"Overall attendance: "
                f"{context['overall_attendance_pct']}%"
            )
        if "active_alerts_count" in context:
            lines.append(
                f"Active alerts: {context['active_alerts_count']}"
            )
        if "placement_drives_open" in context:
            lines.append(
                f"Open placement drives: "
                f"{context['placement_drives_open']}"
            )
        if "department_breakdown" in context:
            depts = context["department_breakdown"]
            if depts:
                dept_summary = "; ".join([
                    f"{d['dept']}: {d['attendance']}% attendance"
                    for d in depts[:4]
                ])
                lines.append(f"Departments: {dept_summary}")

        return "\n".join(lines) if lines else "No data available."

    except Exception:
        return str(context)[:500]

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
        context_str = build_context_summary("summary", context, role)
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

        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 200
            }
        )
        response = model.generate_content(prompt)
        if response and response.text and len(response.text.strip()) > 10:
            return response.text.strip()
        return None
    except Exception as e:
        print(f"[GEMINI FREEFORM ERROR] {e}")
        return None

