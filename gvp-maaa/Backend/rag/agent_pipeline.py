from typing import TypedDict, Optional, List, Dict, Any
from langgraph.graph import StateGraph, END
from sqlalchemy.orm import Session
import traceback
import os

try:
    import google.generativeai as genai
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
    else:
        GEMINI_AVAILABLE = False
except Exception:
    GEMINI_AVAILABLE = False

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
                   "how am i", "my status", "update", "all data"]
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
        intent_map = INTENT_KEYWORDS.get(role, INTENT_KEYWORDS["student"])
        best_intent = "summary"
        best_score = 0

        for intent, keywords in intent_map.items():
            score = 0
            for kw in keywords:
                if kw in message:
                    # Longer keyword match = higher confidence
                    score += len(kw.split())
            if score > best_score:
                best_score = score
                best_intent = intent

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
    """
    Agent 3: Generates the answer.
    - Access denied: returns denial message
    - Rule-based: always generates a specific answer
    - Gemini: enhances if available
    """
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

        # Generate rule-based answer first
        rule_answer = generate_rule_answer(role, intent, context, message)
        state["data_found"] = bool(context)

        # Try Gemini enhancement
        if GEMINI_AVAILABLE and context:
            try:
                system = build_role_system_prompt(role, context)
                hint = f"Pre-computed answer: {rule_answer}"
                full_prompt = (
                    f"{system}\n\n{hint}\n\n"
                    f"User asked: {message}\n\n"
                    f"Using the data above, give a natural, "
                    f"specific, helpful response. "
                    f"Use the exact numbers from the data. "
                    f"Keep it under 4 sentences."
                )
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(full_prompt)
                if response and response.text and len(response.text.strip()) > 20:
                    state["raw_answer"] = response.text.strip()
                    state["answer_source"] = "gemini"
                    return state
            except Exception:
                traceback.print_exc()

        state["raw_answer"] = rule_answer
        state["answer_source"] = "rules"
        return state

    except Exception:
        traceback.print_exc()
        state["raw_answer"] = "I had trouble generating an answer. Please check your dashboard."
        state["answer_source"] = "fallback"
        state["data_found"] = False
        return state

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

        lines = []
        weak = []
        best = None
        best_score = -1

        for s in subjects:
            subj = s.get("subject", "Unknown")
            score = s.get("score", 0)
            out_of = s.get("out_of", 0)
            pct = safe_pct(score, out_of)
            display = format_mark(score, out_of)
            icon = "✅" if pct >= 60 else ("⚠️" if pct >= 40 else "❌")
            lines.append(f"{icon} {subj}: {display} ({pct}%)")
            if pct < 50:
                weak.append(subj)
            if pct > best_score:
                best_score = pct
                best = subj

        result = "Your marks:\n" + "\n".join(lines)
        if weak:
            result += f"\n\n📚 Focus needed: {', '.join(weak)}"
        elif best:
            result += f"\n\n✨ Best subject: {best} ({best_score}%)"
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
        answer = f"📊 Overall institution attendance: {overall}%\n"
        if low_depts:
            answer += f"⚠️ Below 75%: {', '.join(low_depts)}\n"
        if depts:
            breakdown = "\n".join([
                f"  • {d['dept']}: {d['attendance']}% ({d.get('at_risk',0)} at-risk)"
                for d in depts[:5]
            ])
            answer += f"Department breakdown:\n{breakdown}"
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

        if not raw or len(raw.strip()) == 0:
            state["final_reply"] = (
                "I couldn't find specific data for that question. "
                "Please check your dashboard for the latest information."
            )
            state["formatted"] = True
            return state

        # Clean up common artifacts
        cleaned = raw.strip()

        # Remove any accidental Python dict artifacts
        if cleaned.startswith("{") and cleaned.endswith("}"):
            cleaned = "Please check your dashboard for this information."

        # If no data found, add helpful redirect
        if not state.get("data_found", True):
            cleaned += "\n\nℹ️ For full details, visit your dashboard."

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
