"""
rag/analytical_chain.py — LangChain-powered analytical query engine.

Handles complex, multi-step reasoning queries that need more than
a single Gemini call:
  - "Which department needs most attention?"
  - "Predict if my attendance will be enough by semester end"
  - "Compare CSE and ECE attendance"
  - "Who are the top performing students?"
  - "What is the trend in marks this semester?"
"""

import os
import traceback
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── LangChain bootstrap ──────────────────────────────────────────
CHAIN_AVAILABLE = False
llm = None

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser

    _api_key = os.environ.get("GEMINI_API_KEY", "")
    if _api_key.startswith("AIzaSy"):
        llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=_api_key,
            temperature=0.1,
            max_output_tokens=400,
        )
        CHAIN_AVAILABLE = True
        print("[CHAIN] LangChain + Gemini ready")
    else:
        print("[CHAIN] No valid GEMINI_API_KEY — chain disabled")

except ImportError as _ie:
    print(f"[CHAIN] Not available (missing package): {_ie}")
except Exception as _e:
    print(f"[CHAIN] Not available: {_e}")


# ── Query classifier ─────────────────────────────────────────────

ANALYTICAL_QUERY_PATTERNS = [
    "which", "compare", "trend", "predict", "best",
    "worst", "lowest", "highest", "most", "least",
    "top", "bottom", "rank", "analysis", "insight",
    "department needs", "should focus", "recommend",
    "improve", "why is", "how many total", "percentage of",
]


def is_analytical_query(message: str) -> bool:
    """Return True if this message looks like a complex/analytical query."""
    msg = message.lower()
    return any(p in msg for p in ANALYTICAL_QUERY_PATTERNS)


# ── Student analytical chain ─────────────────────────────────────

def analytical_student_chain(data: dict, question: str) -> str:
    """Run a LangChain analytical chain for a student question."""
    if not CHAIN_AVAILABLE:
        return None
    try:
        att     = data.get("attendance", {})
        marks   = data.get("marks", [])
        assg    = data.get("assignments", {})
        risk    = data.get("risk", {})
        profile = data.get("profile", {})

        marks_summary = "\n".join([
            f"- {m['subject']} [{m.get('exam_type', '')}]: "
            f"{m['score']}/{m['total']} ({m['percentage']}%)"
            for m in marks
        ]) if marks else "No marks data"

        per_subj_att = "\n".join([
            f"- {s['subject_name']}: {s['percentage']}% "
            f"({s['present']}/{s['total_classes']} classes) [{s['status']}]"
            for s in att.get("per_subject", [])
        ]) if att.get("per_subject") else "No per-subject data"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an academic AI assistant for a student at GVP college.
Answer analytically and specifically. Use ONLY the data provided. Never invent numbers.

STUDENT DATA:
Year: {year}, Section: {section}, CGPA: {cgpa}

ATTENDANCE:
Overall: {overall_att}% ({present}/{total_classes} classes)
Per Subject:
{per_subject_att}

MARKS:
{marks_data}

ASSIGNMENTS: {pending} pending of {total_assg} total
RISK LEVEL: {risk_level}
RISK REASONS: {risk_reasons}"""),
            ("human", "{question}"),
        ])

        chain = prompt | llm | StrOutputParser()

        result = chain.invoke({
            "year":          profile.get("year", "N/A"),
            "section":       profile.get("section", "N/A"),
            "cgpa":          profile.get("cgpa", "N/A"),
            "overall_att":   att.get("overall_percentage", 0),
            "present":       att.get("present", 0),
            "total_classes": att.get("total_classes", 0),
            "per_subject_att": per_subj_att,
            "marks_data":    marks_summary,
            "pending":       assg.get("pending_count", 0),
            "total_assg":    assg.get("total", 0),
            "risk_level":    risk.get("level", "LOW"),
            "risk_reasons":  ", ".join(risk.get("reasons", [])),
            "question":      question,
        })

        print(f"[CHAIN] Student analytical: {result[:80]}")
        return result

    except Exception as e:
        print(f"[CHAIN] Student error: {e}")
        traceback.print_exc()
        return None


# ── Teacher analytical chain ─────────────────────────────────────

def analytical_teacher_chain(data: dict, question: str) -> str:
    """Run a LangChain analytical chain for a teacher/faculty question."""
    if not CHAIN_AVAILABLE:
        return None
    try:
        subjects  = data.get("subjects", [])
        class_att = data.get("class_attendance", {})
        at_risk   = data.get("at_risk_students", {})
        assg      = data.get("assignments", {})

        subject_names = [s["name"] for s in subjects]

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an AI assistant for a faculty member at GVP college.
Answer analytically. Use ONLY the data provided. Never invent student names.

FACULTY DATA:
Subjects Taught: {subjects}

CLASS ATTENDANCE:
Average: {avg_att}%
Total Students: {total_students}
Students Below 75%: {low_att_count}
Status: {att_status}

AT-RISK STUDENTS:
Count: {at_risk_count} out of {total_students}
Percentage: {at_risk_pct}%

ASSIGNMENTS:
Pending Submissions: {pending_subs}

Note: Individual student names are not available for privacy.
Provide class-level analysis only."""),
            ("human", "{question}"),
        ])

        chain = prompt | llm | StrOutputParser()

        result = chain.invoke({
            "subjects":        ", ".join(subject_names) if subject_names else "Not mapped",
            "avg_att":         class_att.get("average_percentage", 0),
            "total_students":  class_att.get("total_students", 0),
            "low_att_count":   class_att.get("students_below_75", 0),
            "att_status":      class_att.get("status", "Unknown"),
            "at_risk_count":   at_risk.get("count", 0),
            "at_risk_pct":     at_risk.get("percentage", 0),
            "pending_subs":    assg.get("pending_submissions", 0),
            "question":        question,
        })

        print(f"[CHAIN] Teacher analytical: {result[:80]}")
        return result

    except Exception as e:
        print(f"[CHAIN] Teacher error: {e}")
        traceback.print_exc()
        return None


# ── Admin analytical chain ───────────────────────────────────────

def analytical_admin_chain(data: dict, question: str) -> str:
    """Run a LangChain analytical chain for an admin question."""
    if not CHAIN_AVAILABLE:
        return None
    try:
        inst      = data.get("institution", {})
        depts     = data.get("departments", [])
        placement = data.get("placement", {})

        dept_summary = "\n".join([
            f"- {d['department']}: {d['attendance_percentage']}% att, "
            f"{d['at_risk_count']} at-risk, "
            f"{d['total_students']} students [{d['status']}]"
            for d in depts
        ]) if depts else "No department data"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an institutional AI assistant for the admin of GVP college.
Answer analytically using the data provided.
You CAN answer about specific departments when asked.

INSTITUTION DATA:
Total Students: {total_students}
Total Faculty: {total_faculty}
Overall Attendance: {overall_att}%
At-Risk Students: {at_risk}
Active Alerts: {alerts}
Open Placement Drives: {drives}

DEPARTMENT BREAKDOWN:
{dept_data}

For department-specific questions, use the department data above.
Be specific and actionable."""),
            ("human", "{question}"),
        ])

        chain = prompt | llm | StrOutputParser()

        result = chain.invoke({
            "total_students": inst.get("total_students", 0),
            "total_faculty":  inst.get("total_faculty", 0),
            "overall_att":    inst.get("overall_attendance", 0),
            "at_risk":        inst.get("at_risk_count", 0),
            "alerts":         data.get("alerts", {}).get("total_active", 0),
            "drives":         placement.get("open_drives", 0),
            "dept_data":      dept_summary,
            "question":       question,
        })

        print(f"[CHAIN] Admin analytical: {result[:80]}")
        return result

    except Exception as e:
        print(f"[CHAIN] Admin error: {e}")
        traceback.print_exc()
        return None


# ── Public dispatcher ────────────────────────────────────────────

def run_analytical_chain(role: str, data: dict, question: str) -> str:
    """
    Route an analytical question to the correct role-aware chain.

    Returns the chain's answer string, or None if the chain is
    unavailable or encounters an error (caller should fall back to Gemini).
    """
    role = role.lower()
    if role == "student":
        return analytical_student_chain(data, question)
    elif role in ("teacher", "faculty"):
        return analytical_teacher_chain(data, question)
    else:
        return analytical_admin_chain(data, question)
