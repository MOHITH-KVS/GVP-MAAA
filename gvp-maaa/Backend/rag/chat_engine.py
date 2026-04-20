from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import traceback
import os

# Gemini import — new google.genai SDK
try:
    from google import genai as _google_genai
    from pathlib import Path
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    if GEMINI_KEY and GEMINI_KEY.startswith("AIzaSy"):
        _gemini_client = _google_genai.Client(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
    else:
        _gemini_client = None
        GEMINI_AVAILABLE = False
except Exception:
    GEMINI_AVAILABLE = False
    _gemini_client = None

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
from rag.query_router import is_query_allowed, build_system_prompt

# ─── Intent definitions ───────────────────────────────────────────────────────

STUDENT_INTENTS = {
    "attendance": [
        "attendance", "present", "absent", "percentage", "classes",
        "how many classes", "bunk", "miss", "missed", "attenden"
    ],
    "marks": [
        "mark", "marks", "score", "scores", "grade", "grades",
        "result", "results", "exam", "mid", "mid1", "mid2",
        "performance", "subject", "fail", "pass", "percentage"
    ],
    "risk": [
        "risk", "at risk", "fail", "failing", "danger", "warning",
        "struggling", "backlog", "detention", "risk level"
    ],
    "tasks": [
        "task", "tasks", "today", "do today", "focus", "study",
        "what should i", "priority", "plan", "action", "complete"
    ],
    "alerts": [
        "alert", "alerts", "notification", "warning", "flagged",
        "notif", "message"
    ],
    "placement": [
        "placement", "eligible", "eligibility", "drive", "drives",
        "job", "company", "recruit", "interview", "criteria"
    ],
    "assignments": [
        "assignment", "assignments", "submit", "submission", "pending",
        "due", "deadline", "homework", "project"
    ],
    "xp": [
        "xp", "streak", "points", "leaderboard", "badge", "reward",
        "level", "progress"
    ],
    "greeting": [
        "hello", "hi", "hey", "good morning", "good evening",
        "good afternoon", "help", "start", "begin", "what can you"
    ],
    "summary": [
        "summary", "overview", "overall", "everything", "all",
        "how am i doing", "my status", "update", "report"
    ]
}

TEACHER_INTENTS = {
    "attendance": [
        "attendance", "present", "absent", "class attendance",
        "average attendance", "who is absent", "low attendance"
    ],
    "risk": [
        "risk", "at risk", "struggling", "fail", "weak",
        "how many at risk", "risk students", "alert students"
    ],
    "marks": [
        "marks", "performance", "scores", "class average",
        "average marks", "low marks", "weak students", "subject"
    ],
    "assignments": [
        "assignment", "submission", "pending", "submitted",
        "not submitted", "late", "deadline"
    ],
    "alerts": [
        "alert", "alerts", "warning", "warnings", "notification", "notifications"
    ],
    "summary": [
        "summary", "overview", "this week", "focus", "what should",
        "help", "hello", "hi", "hey", "report", "status"
    ]
}

ADMIN_INTENTS = {
    "risk": [
        "risk", "at risk", "high risk", "how many at risk",
        "students at risk", "critical"
    ],
    "attendance": [
        "attendance", "overall attendance", "department attendance",
        "low attendance", "which department", "attendance rate"
    ],
    "placement": [
        "placement", "drives", "open drives", "companies",
        "recruitment", "how many drives"
    ],
    "department": [
        "department", "branch", "cse", "ece", "mech", "civil",
        "which branch", "compare departments"
    ],
    "summary": [
        "summary", "overview", "report", "week", "hello", "hi",
        "hey", "help", "status", "institution", "college"
    ],
    "students": [
        "total students", "how many students", "enrolled",
        "student count"
    ],
    "teachers": [
        "total teachers", "faculty", "how many teachers",
        "staff count"
    ],
    "alerts": [
        "alerts", "active alerts", "notifications", "warnings"
    ]
}

# ─── Intent classifier ────────────────────────────────────────────────────────

def classify_intent(message: str, role: str) -> str:
    """Returns the best matching intent string for this message and role."""
    msg = message.lower().strip()
    
    if role == "student":
        intent_map = STUDENT_INTENTS
    elif role in ("teacher", "faculty"):
        intent_map = TEACHER_INTENTS
    else:
        intent_map = ADMIN_INTENTS
    
    best_intent = "summary"
    best_score = 0
    
    for intent, keywords in intent_map.items():
        score = sum(1 for kw in keywords if kw in msg)
        # Boost exact matches
        score += sum(2 for kw in keywords if msg == kw or msg.startswith(kw + " "))
        if score > best_score:
            best_score = score
            best_intent = intent
    
    return best_intent

# ─── Specific data fetchers ───────────────────────────────────────────────────
# These are called AFTER intent classification to get precise data

def fetch_precise_context(user_id: int, role: str, intent: str, db: Session) -> dict:
    """
    Fetches only the data needed for the specific intent.
    Much more precise than dumping all context.
    """
    try:
        if role == "student":
            if intent == "attendance":
                return get_student_attendance_detail(user_id, db)
            elif intent == "marks":
                return get_student_marks_detail(user_id, db)
            elif intent == "assignments":
                return get_student_assignments_detail(user_id, db)
            elif intent == "risk":
                # Need both attendance and marks for risk
                att = get_student_attendance_detail(user_id, db)
                marks = get_student_marks_detail(user_id, db)
                return {**att, **marks}
            else:
                # For summary, tasks, alerts, placement, greeting
                # use full context but it's cached
                return build_student_context(user_id, db)
        
        elif role in ("teacher", "faculty"):
            if intent in ("attendance", "risk", "marks", "assignments", "alerts", "summary"):
                return get_teacher_class_detail(user_id, db)
            else:
                return build_teacher_context(user_id, db)
        
        else:  # admin
            if intent == "department":
                return get_admin_department_detail(db)
            else:
                return build_admin_context(db)
    except Exception:
        traceback.print_exc()
        return {}

# ─── Answer builders (one per intent per role) ───────────────────────────────

def build_student_answer(intent: str, context: dict, message: str) -> str:
    try:
        if intent == "attendance":
            att = context.get("attendance_pct", 0)
            total = context.get("total_classes", 0)
            present = context.get("present_classes", 0)
            absent = total - present if total > 0 else 0
            
            if att == 0 and total == 0:
                return "No attendance data found for your account yet."
            
            status = ""
            if att < 75:
                shortage = present
                needed = int((0.75 * total - present) / 0.25) + 1 if total > 0 else 0
                status = (f"⚠️ Your attendance is critically low at {att}%. "
                         f"You need to attend {needed} more consecutive classes "
                         f"to reach the 75% requirement.")
            elif att < 85:
                status = (f"Your attendance is {att}% — acceptable but you should "
                         f"not miss any more classes to stay above 75%.")
            else:
                status = f"Your attendance is {att}% — good standing."
            
            return (f"{status} "
                   f"Total classes: {total}, Present: {present}, Absent: {absent}.")

        elif intent == "marks":
            subjects = context.get("subject_marks", [])
            if not subjects:
                return "No marks data found for your account yet."
            
            lines = []
            weak = []
            for s in subjects:
                subj = s.get("subject", "Unknown")
                score = s.get("score", 0)
                out_of = s.get("out_of", 100)
                label = "✓" if score >= 60 else ("⚠" if score >= 40 else "✗")
                lines.append(f"{label} {subj}: {score}/{out_of}")
                if score < 40:
                    weak.append(subj)
            
            result = "Your marks:\n" + "\n".join(lines)
            if weak:
                result += f"\n\nFocus needed: {', '.join(weak)} — scoring below 40%."
            return result

        elif intent == "risk":
            att = context.get("attendance_pct", 0)
            risk = context.get("risk_level", "LOW")
            subjects = context.get("subject_marks", [])
            
            weak_subjects = [
                s.get("subject", "Unknown")
                for s in subjects if s.get("score", 100) < 40
            ]
            
            risk_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(risk, "⚪")
            
            answer = f"{risk_emoji} Your risk level is {risk}.\n"
            answer += f"Attendance: {att}%"
            
            if att < 75:
                answer += " (below required 75% — urgent!)"
            answer += "\n"
            
            if weak_subjects:
                answer += f"Low scoring subjects: {', '.join(weak_subjects)}\n"
            
            if risk == "HIGH":
                answer += "\nAction required: Contact your faculty advisor immediately."
            elif risk == "MEDIUM":
                answer += "\nAction: Improve attendance and revise weak subjects."
            else:
                answer += "\nYou are on track. Keep it up!"
            
            return answer

        elif intent == "tasks":
            att = context.get("attendance_pct", 0)
            subjects = context.get("subject_marks", [])
            pending = context.get("pending_assignments", 0)
            alerts = context.get("active_alerts", [])
            
            tasks = []
            if att < 75:
                tasks.append("🔴 HIGH: Attend all classes — attendance is " + str(att) + "%")
            elif att < 85:
                tasks.append("🟡 MEDIUM: Don't miss any classes — attendance is " + str(att) + "%")
            
            weak = [s for s in subjects if s.get("score", 100) < 50]
            for s in weak[:2]:
                tasks.append(f"🟡 Study: Revise {s.get('subject', 'subject')} — {s.get('score', 0)}%")
            
            if pending > 0:
                tasks.append(f"📝 Submit {pending} pending assignment(s)")
            
            if not tasks:
                tasks.append("✅ No urgent tasks. Keep maintaining your performance!")
            
            return "Your priority tasks:\n" + "\n".join(tasks)

        elif intent == "alerts":
            alerts = context.get("active_alerts", [])
            if not alerts:
                return "You have no active alerts right now. All clear!"
            result = f"You have {len(alerts)} active alert(s):\n"
            for i, a in enumerate(alerts[:5], 1):
                result += f"{i}. {a}\n"
            return result.strip()

        elif intent == "assignments":
            pending = context.get("pending_assignments", 0)
            if pending == 0:
                return "No pending assignments found. You are all caught up!"
            return (f"You have {pending} pending assignment(s). "
                   f"Check the Assignments page to view deadlines and submit.")

        elif intent == "placement":
            risk = context.get("risk_level", "LOW")
            att = context.get("attendance_pct", 0)
            eligible = (risk != "HIGH" and att >= 60)
            
            if eligible:
                return (f"Based on your profile (attendance: {att}%, risk: {risk}), "
                       f"you appear eligible for placement drives. "
                       f"Visit the Placement page to see active drives and apply.")
            else:
                issues = []
                if att < 60:
                    issues.append(f"attendance is {att}% (minimum ~60% required)")
                if risk == "HIGH":
                    issues.append("academic risk level is HIGH")
                return (f"You may face eligibility issues: {', '.join(issues)}. "
                       f"Improve these areas before applying for placement drives.")

        elif intent == "xp":
            xp = context.get("xp", 0)
            streak = context.get("streak", 0)
            return (f"Your academic XP: {xp} points. "
                   f"Current streak: {streak} day(s). "
                   f"Complete daily tasks to earn more XP and maintain your streak!")

        elif intent == "greeting":
            att = context.get("attendance_pct", "N/A")
            risk = context.get("risk_level", "N/A")
            alerts = context.get("active_alerts", [])
            risk_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(risk, "⚪")
            return (f"Hello! I'm your AI academic assistant. Here's your quick snapshot:\n"
                   f"📊 Attendance: {att}%\n"
                   f"{risk_emoji} Risk Level: {risk}\n"
                   f"🔔 Active Alerts: {len(alerts)}\n\n"
                   f"Ask me about your attendance, marks, tasks, "
                   f"assignments, or placement eligibility!")

        else:  # summary / default
            att = context.get("attendance_pct", "N/A")
            risk = context.get("risk_level", "N/A")
            subjects = context.get("subject_marks", [])
            alerts = context.get("active_alerts", [])
            pending = context.get("pending_assignments", 0)
            
            weak = [s.get("subject") for s in subjects if s.get("score", 100) < 50]
            risk_emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(str(risk), "⚪")
            
            summary = (f"📋 Your Academic Summary:\n"
                      f"📊 Attendance: {att}%\n"
                      f"{risk_emoji} Risk Level: {risk}\n"
                      f"🔔 Active Alerts: {len(alerts)}\n"
                      f"📝 Pending Assignments: {pending}\n")
            
            if weak:
                summary += f"⚠️ Subjects needing attention: {', '.join(weak)}\n"
            
            return summary.strip()

    except Exception:
        traceback.print_exc()
        att = context.get("attendance_pct", "N/A")
        risk = context.get("risk_level", "N/A")
        return (f"Your attendance is {att}% and risk level is {risk}. "
               f"Check your dashboard for full details.")

def build_teacher_answer(intent: str, context: dict, message: str) -> str:
    try:
        msg = (message or "").lower()
        wants_names = any(
            k in msg for k in [
                "name", "names", "roll", "roll no", "roll number",
                "who", "which student", "student list", "list students"
            ]
        )

        def _format_students(students, limit=25):
            if not students:
                return "No matching student details available."
            lines = []
            for s in students[:limit]:
                att = s.get("attendance_pct")
                att_text = f" | Att: {att}%" if att is not None else ""
                lines.append(
                    f"- {s.get('name', 'Unknown')} (Roll: {s.get('roll_no', 'N/A')}){att_text}"
                )
            return "\n".join(lines)

        if intent == "attendance":
            avg = context.get("class_avg_attendance", 0)
            total = context.get("total_students", 0)
            low_count = context.get("low_attendance_count", 0)
            class_students = context.get("class_students", [])
            low_att_students = [
                s for s in class_students
                if float(s.get("attendance_pct", 100) or 100) < 75
            ]

            if wants_names and low_att_students:
                return (
                    f"Students below 75% attendance ({len(low_att_students)}):\n"
                    f"{_format_students(low_att_students, limit=40)}"
                )
            if wants_names and class_students:
                return (
                    f"Class student details ({len(class_students)}):\n"
                    f"{_format_students(class_students, limit=40)}"
                )
            
            status = "good" if avg >= 75 else "needs attention"
            answer = f"Class average attendance: {avg}% ({status}).\n"
            answer += f"Total students: {total}.\n"
            if low_count > 0:
                answer += f"⚠️ {low_count} student(s) are below 75% attendance."
            return answer

        elif intent == "risk":
            count = context.get("at_risk_count", 0)
            total = context.get("total_students", 0)
            pct = round((count / total * 100), 1) if total > 0 else 0
            at_risk_students = context.get("at_risk_students_detail", [])
            alert_students = context.get("active_alerts", [])

            if wants_names and at_risk_students:
                return (
                    f"At-risk students ({len(at_risk_students)}):\n"
                    f"{_format_students(at_risk_students, limit=40)}"
                )

            if wants_names and alert_students:
                lines = []
                for a in alert_students[:40]:
                    lines.append(
                        f"- {a.get('name', 'Unknown')} (Roll: {a.get('roll_no', 'N/A')})"
                    )
                return "Students with alerts:\n" + "\n".join(lines)
            
            if count == 0:
                return f"No at-risk students in your class right now. All {total} students are on track."
            return (f"🔴 {count} out of {total} students ({pct}%) are currently at risk.\n"
                   f"These students need attention — consider scheduling review sessions "
                   f"or notifying them through the Alerts system.")

        elif intent == "marks":
            avg = context.get("class_avg_marks", 0)
            subjects = context.get("subjects", [])
            subj_text = ", ".join(subjects) if subjects else "your assigned subjects"
            
            if avg == 0:
                return "No marks data available for your class yet."
            
            label = "good" if avg >= 60 else ("average" if avg >= 40 else "low")
            return (f"Class average marks: {avg}% ({label}) across {subj_text}.\n"
                   f"{'Consider revision sessions for weak students.' if avg < 60 else 'Performance is satisfactory.'}")

        elif intent == "assignments":
            pending = context.get("pending_submissions", 0)
            pending_flat = context.get("pending_students_flat", [])
            assignment_details = context.get("assignment_details", [])

            if wants_names and assignment_details:
                lines = []
                for d in assignment_details[:8]:
                    lines.append(
                        f"{d.get('title', 'Assignment')} (Year {d.get('year', '?')} Sec {d.get('section', '?')}):"
                    )
                    pending_students = d.get("pending_students", [])
                    if pending_students:
                        for s in pending_students[:20]:
                            lines.append(
                                f"- {s.get('name', 'Unknown')} (Roll: {s.get('roll_no', 'N/A')})"
                            )
                    else:
                        lines.append("- No pending students")
                return "Pending assignment student details:\n" + "\n".join(lines)

            if wants_names and pending_flat:
                return (
                    f"Students with pending assignments ({len(pending_flat)}):\n"
                    f"{_format_students(pending_flat, limit=40)}"
                )

            if pending == 0:
                return "All assignments have been submitted. No pending submissions."
            return (f"📝 {pending} assignment submission(s) are still pending.\n"
                   f"Consider sending a reminder to students who haven't submitted yet.")

        elif intent == "alerts":
            alert_students = context.get("active_alerts", [])
            if not alert_students:
                return "No active student alerts found for your class right now."

            if wants_names:
                lines = []
                for a in alert_students[:40]:
                    lines.append(
                        f"- {a.get('name', 'Unknown')} (Roll: {a.get('roll_no', 'N/A')}) | "
                        f"{a.get('title', 'Alert')}"
                    )
                return f"Students with active alerts ({len(alert_students)}):\n" + "\n".join(lines)

            return f"There are {len(alert_students)} active student alert(s) in your class."

        else:  # summary / greeting
            avg_att = context.get("class_avg_attendance", "N/A")
            at_risk = context.get("at_risk_count", 0)
            total = context.get("total_students", 0)
            pending = context.get("pending_submissions", 0)
            subjects = context.get("subjects", [])
            
            return (f"📋 Your Class Summary:\n"
                   f"📊 Avg Attendance: {avg_att}%\n"
                   f"🔴 At-Risk Students: {at_risk}/{total}\n"
                   f"📝 Pending Submissions: {pending}\n"
                   f"📚 Your Subjects: {', '.join(subjects) if subjects else 'N/A'}\n\n"
                   f"Ask me about attendance, at-risk students, marks, or submissions!")

    except Exception:
        traceback.print_exc()
        return build_teacher_fallback(context)

def build_admin_answer(intent: str, context: dict, message: str) -> str:
    try:
        msg = (message or "").lower()
        wants_names = any(
            k in msg for k in [
                "name", "names", "list", "who", "faculty", "teacher",
                "department faculty", "department names", "roll", "student"
            ]
        )

        def _format_faculty(faculty_rows, limit=20):
            if not faculty_rows:
                return "No faculty details available."
            return "\n".join([
                f"- {f.get('name', 'Unknown')} (Emp ID: {f.get('employee_id', 'N/A')}) | Dept: {f.get('department', 'Unknown')}"
                for f in faculty_rows[:limit]
            ])

        if intent == "risk":
            at_risk = context.get("at_risk_count", 0)
            total = context.get("total_students", 0)
            pct = round((at_risk / total * 100), 1) if total > 0 else 0
            depts = context.get("department_breakdown", [])
            high_risk_depts = [d["dept"] for d in depts if d.get("at_risk", 0) > 0]
            
            answer = f"🔴 {at_risk} out of {total} students ({pct}%) are at risk institution-wide.\n"
            if high_risk_depts:
                answer += f"Departments with at-risk students: {', '.join(high_risk_depts[:3])}."
            return answer

        elif intent == "attendance":
            overall = context.get("overall_attendance_pct", 0)
            low_depts = context.get("low_attendance_departments", [])
            depts = context.get("department_breakdown", [])
            
            answer = f"📊 Overall institution attendance: {overall}%.\n"
            if low_depts:
                answer += f"⚠️ Departments below 75%: {', '.join(low_depts)}.\n"
            if depts:
                breakdown = ", ".join([f"{d['dept']}: {d['attendance']}%" for d in depts[:4]])
                answer += f"Breakdown: {breakdown}."
            return answer

        elif intent == "placement":
            drives = context.get("placement_drives_open", 0)
            return (f"📋 There are currently {drives} active placement drive(s).\n"
                   f"Visit the Placement section to manage drives and track applications.")

        elif intent == "students":
            total = context.get("total_students", 0)
            at_risk = context.get("at_risk_count", 0)
            return f"Total enrolled students: {total}. Of these, {at_risk} are currently flagged at-risk."

        elif intent == "teachers":
            total = context.get("total_teachers", 0)
            faculty_list = context.get("faculty_list", [])
            faculty_by_department = context.get("faculty_by_department", {})

            if wants_names and faculty_list:
                return (
                    f"Total faculty members: {total}.\n"
                    f"Faculty details:\n{_format_faculty(faculty_list, limit=30)}"
                )

            if faculty_by_department:
                dept_lines = []
                for dept_name, dept_faculty in faculty_by_department.items():
                    dept_lines.append(
                        f"- {dept_name}: {', '.join([f.get('name', 'Unknown') for f in dept_faculty[:8]])}"
                    )
                return (
                    f"Total faculty members: {total}.\n"
                    f"Faculty by department:\n" + "\n".join(dept_lines[:12])
                )

            return f"Total faculty members: {total}."

        elif intent == "alerts":
            count = context.get("active_alerts_count", 0)
            return (f"🔔 {count} active alert(s) in the system.\n"
                   f"Visit the Alerts section to review and manage them.")

        elif intent == "department":
            depts = context.get("department_breakdown", [])
            if not depts:
                return "No department data available."
            lines = []
            for d in depts:
                faculty_names = d.get("faculty_names", [])
                faculty_text = (
                    f" | Faculty: {', '.join(faculty_names[:6])}"
                    if faculty_names else ""
                )
                lines.append(
                    f"• {d['dept']}: {d['attendance']}% attendance, {d['at_risk']} at-risk{faculty_text}"
                )
            return "Department breakdown:\n" + "\n".join(lines)

        else:  # summary / greeting
            total_s = context.get("total_students", "N/A")
            total_t = context.get("total_teachers", "N/A")
            att = context.get("overall_attendance_pct", "N/A")
            at_risk = context.get("at_risk_count", "N/A")
            alerts = context.get("active_alerts_count", "N/A")
            drives = context.get("placement_drives_open", "N/A")
            
            return (f"📋 Institution Overview:\n"
                   f"👨🎓 Total Students: {total_s}\n"
                   f"👩🏫 Total Faculty: {total_t}\n"
                   f"📊 Overall Attendance: {att}%\n"
                   f"🔴 At-Risk Students: {at_risk}\n"
                   f"🔔 Active Alerts: {alerts}\n"
                   f"💼 Open Placement Drives: {drives}\n\n"
                   f"Ask me about risk, attendance, departments, or placement!")

    except Exception:
        traceback.print_exc()
        return build_admin_fallback(context)

def build_teacher_fallback(context):
    att = context.get("class_avg_attendance", "N/A")
    risk = context.get("at_risk_count", "N/A")
    return f"Class avg attendance: {att}%. At-risk students: {risk}. Check Insights for details."

def build_admin_fallback(context):
    total = context.get("total_students", "N/A")
    risk = context.get("at_risk_count", "N/A")
    return f"Institution: {total} students, {risk} at-risk. Check dashboard for full details."

# ─── Gemini call (optional enhancement) ──────────────────────────────────────

def call_gemini(system_prompt: str, message: str, history: list) -> str:
    """Uses the shared generator flow so Gemini and Grok both work here."""
    try:
        from rag.generator import call_gemini as shared_call_gemini
        return shared_call_gemini(system_prompt, message=message, history=history)
    except Exception:
        traceback.print_exc()
        return None

# ─── Cache ────────────────────────────────────────────────────────────────────

_context_cache = {}
CACHE_TTL = timedelta(minutes=10)

def get_cached_base_context(user_id: int, role: str, db: Session) -> dict:
    key = f"{role}_{user_id}"
    now = datetime.now()
    if key in _context_cache:
        ts, data = _context_cache[key]
        if now - ts < CACHE_TTL:
            return data
    try:
        if role == "student":
            ctx = build_student_context(user_id, db)
        elif role in ("teacher", "faculty"):
            ctx = build_teacher_context(user_id, db)
        else:
            ctx = build_admin_context(db)
    except Exception:
        ctx = {"role": role}
    _context_cache[key] = (now, ctx)
    return ctx

# ─── Main entry point ─────────────────────────────────────────────────────────

def answer_query(user_id: int, role: str, message: str,
                 history: list, db: Session) -> str:
    try:
        # Step 1: Access control check
        from rag.query_router import is_query_allowed
        allowed, denial = is_query_allowed(message, role)
        if not allowed:
            return denial

        # Step 2: Classify intent from the actual message
        intent = classify_intent(message, role)

        # Step 3: Fetch precise context for this specific intent
        precise_ctx = fetch_precise_context(user_id, role, intent, db)

        # Step 4: Merge with base context for completeness
        base_ctx = get_cached_base_context(user_id, role, db)
        context = {**base_ctx, **precise_ctx}

        # Step 5: Build deterministic answer from context + intent
        if role == "student":
            deterministic_answer = build_student_answer(intent, context, message)
        elif role in ("teacher", "faculty"):
            deterministic_answer = build_teacher_answer(intent, context, message)
        else:
            deterministic_answer = build_admin_answer(intent, context, message)

        # Step 6: If Gemini available, enhance the answer
        # If not, return the deterministic answer directly
        if GEMINI_AVAILABLE:
            from rag.query_router import build_system_prompt
            system_prompt = build_system_prompt(role, context)
            # Pass deterministic answer as context hint to Gemini
            enhanced_prompt = (
                system_prompt +
                f"\n\nPre-computed answer for reference: {deterministic_answer}"
                f"\n\nNow answer the user's question naturally using the data above."
            )
            gemini_reply = call_gemini(enhanced_prompt, message, history)
            if gemini_reply:
                return gemini_reply

        # Return deterministic answer (works without Gemini)
        return deterministic_answer

    except Exception as e:
        traceback.print_exc()
        return "I'm having trouble accessing your data. Please try again in a moment."
