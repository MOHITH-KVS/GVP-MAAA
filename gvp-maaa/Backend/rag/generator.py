"""
rag/generator.py  —  G in RAG
Takes retrieved DB data, formats it as context, calls Gemini.

SDK: google.genai (new SDK)
Fallback: 3 API keys × 5 models — cycles until one works.
"""
import os
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── All API keys (primary + backups) ────────────────────────────
ALL_API_KEYS = [
    k.strip() for k in [
        os.environ.get("GEMINI_API_KEY",   ""),
        os.environ.get("GEMINI_API_KEY_2", ""),
        os.environ.get("GEMINI_API_KEY_3", ""),
    ] if k.strip().startswith("AIzaSy")
]

# ── Models in fallback order ─────────────────────────────────
FALLBACK_MODELS = [
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-8b",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
]

GEMINI_AVAILABLE = False
GEMINI_CLIENT    = None
GEMINI_MODEL     = None

print(f"[GENERATOR] API keys found: {len(ALL_API_KEYS)}")

try:
    from google import genai as _genai_sdk

    # Try every key × every model until one succeeds
    _found = False
    for _key in ALL_API_KEYS:
        if _found:
            break
        try:
            _client = _genai_sdk.Client(api_key=_key)
        except Exception as _ce:
            print(f"[GENERATOR] Client init failed for key ...{_key[-6:]}: {_ce}")
            continue

        for _model in FALLBACK_MODELS:
            try:
                _r = _client.models.generate_content(
                    model=_model, contents="Say OK"
                )
                if _r and _r.text:
                    GEMINI_CLIENT    = _client
                    GEMINI_MODEL     = _model
                    GEMINI_AVAILABLE = True
                    print(f"[GENERATOR] Gemini ready: {_model} (key ...{_key[-6:]})")
                    _found = True
                    break
            except Exception as _me:
                err = str(_me)
                if "429" in err or "quota" in err.lower() or "exhausted" in err.lower():
                    print(f"[GENERATOR] {_model}/key-{_key[-4:]} quota hit, trying next...")
                elif "404" in err or "not found" in err.lower():
                    pass  # model not available in region
                else:
                    print(f"[GENERATOR] {_model} error: {err[:70]}")
                continue

    if not GEMINI_AVAILABLE:
        print("[GENERATOR] All keys/models exhausted — using rule-based fallback")

except ImportError:
    print("[GENERATOR] google-genai not installed: pip install google-genai")
except Exception as _e:
    print(f"[GENERATOR] Setup error: {_e}")


# ── Core Gemini caller with per-call fallback ──────────────────────

def call_gemini(prompt: str) -> str:
    """
    Try active model first, then all other models/keys on 429.
    Returns the text response or None if all fail.
    """
    global GEMINI_CLIENT, GEMINI_MODEL, GEMINI_AVAILABLE

    if not GEMINI_CLIENT:
        return None

    # Build try-list: active model first, then remaining fallbacks
    models_to_try = [GEMINI_MODEL] + [
        m for m in FALLBACK_MODELS if m != GEMINI_MODEL
    ]

    for model in models_to_try:
        if not model:
            continue
        try:
            response = GEMINI_CLIENT.models.generate_content(
                model=model,
                contents=prompt,
                config={"temperature": 0.1, "max_output_tokens": 350}
            )
            if response and response.text and len(response.text.strip()) > 5:
                if model != GEMINI_MODEL:
                    print(f"[GENERATOR] Switched to model: {model}")
                    GEMINI_MODEL = model
                return response.text.strip()
        except Exception as e:
            err = str(e)
            if "429" in err or "quota" in err.lower():
                print(f"[GENERATOR] {model} quota hit, trying next...")
                continue
            else:
                print(f"[GENERATOR] {model} error: {err[:80]}")
                continue

    # All models on current key failed: try backup keys
    try:
        from google import genai as _sdk
        for _key in ALL_API_KEYS:
            if GEMINI_CLIENT and _key == getattr(GEMINI_CLIENT, '_api_key', None):
                continue  # skip current key
            try:
                _backup = _sdk.Client(api_key=_key)
                for model in FALLBACK_MODELS:
                    try:
                        response = _backup.models.generate_content(
                            model=model, contents=prompt,
                            config={"temperature": 0.1, "max_output_tokens": 350}
                        )
                        if response and response.text and len(response.text.strip()) > 5:
                            print(f"[GENERATOR] Failover: key ...{_key[-4:]} / {model}")
                            GEMINI_CLIENT = _backup
                            GEMINI_MODEL  = model
                            GEMINI_AVAILABLE = True
                            return response.text.strip()
                    except Exception:
                        continue
            except Exception:
                continue
    except Exception:
        pass

    print("[GENERATOR] All keys/models exhausted — using fallback response")
    GEMINI_AVAILABLE = False
    return None


# ── Context formatter (A in RAG) ─────────────────────────────────

def format_data_for_gemini(data: dict, role: str) -> str:
    """Converts structured DB data into clear readable text for Gemini."""
    lines = [f"=== {role.upper()} ACADEMIC DATA ===\n"]

    if role == "student":
        # Profile
        profile = data.get("profile", {})
        if profile:
            lines.append(
                f"Student Profile: Year {profile.get('year')}, "
                f"Section {profile.get('section')}, "
                f"Semester {profile.get('semester')}, "
                f"CGPA: {profile.get('cgpa', 'N/A')}"
            )

        # Attendance
        att = data.get("attendance", {})
        if att:
            lines.append(
                f"\nATTENDANCE:\n"
                f"Overall: {att.get('overall_percentage')}% "
                f"({att.get('present')}/{att.get('total_classes')} classes) "
                f"— {att.get('status')}"
            )
            per_subj = att.get("per_subject", [])
            if per_subj:
                lines.append("Per Subject:")
                for s in per_subj:
                    lines.append(
                        f"  {s['subject_name']}: "
                        f"{s['percentage']}% "
                        f"({s['present']}/{s['total_classes']} classes) "
                        f"[{s['status']}]"
                    )

        # Marks
        marks = data.get("marks", [])
        if marks:
            lines.append("\nMARKS / EXAM SCORES:")
            for m in marks:
                exam  = m.get("exam_type", "")
                label = m["subject"] + (f" [{exam}]" if exam else "")
                lines.append(
                    f"  {label}: {m['score']}/{m['total']} ({m['percentage']}%)"
                )
                if m.get("mid1") is not None:
                    lines.append(f"    Mid-1: {m['mid1']}")
                if m.get("mid2") is not None:
                    lines.append(f"    Mid-2: {m['mid2']}")
                if m.get("cgpa") is not None:
                    lines.append(f"    CGPA: {m['cgpa']}")

        # Assignments
        assg = data.get("assignments", {})
        if assg:
            lines.append(
                f"\nASSIGNMENTS:\n"
                f"Total: {assg.get('total', 0)}, "
                f"Pending: {assg.get('pending_count', 0)}, "
                f"Submitted: {assg.get('submitted_count', 0)}"
            )
            for p in assg.get("pending_list", []):
                lines.append(f"  PENDING: {p['title']} (due: {p['due_date']})")

        # Risk
        risk = data.get("risk", {})
        if risk:
            lines.append(
                f"\nACADEMIC RISK:\n"
                f"Level: {risk.get('level')}, Score: {risk.get('score')}"
            )
            for r in risk.get("reasons", []):
                lines.append(f"  Reason: {r}")
            for a in risk.get("actions", []):
                lines.append(f"  Action: {a}")

        # Alerts
        alerts = data.get("alerts", [])
        lines.append(f"\nALERTS: {len(alerts)} active")
        for a in alerts[:3]:
            lines.append(f"  - {a.get('title')}: {a.get('message')}")

        # Events
        events = data.get("events", [])
        if events:
            lines.append(f"\nEVENTS ({len(events)} available):")
            for e in events[:5]:
                lines.append(f"  - {e['name']} on {e['date']} ({e['type']})")

        # Resources
        resources = data.get("resources", [])
        if resources:
            lines.append(f"\nSTUDY MATERIALS ({len(resources)} available):")
            for r in resources[:5]:
                lines.append(f"  - {r['title']} [{r['subject']}] ({r['type']})")

    elif role in ("teacher", "faculty"):
        subjects = data.get("subjects", [])
        names    = [s["name"] for s in subjects] if subjects else []
        lines.append(
            f"Your Subjects: {', '.join(names) if names else 'Not mapped in system'}"
        )

        att = data.get("class_attendance", {})
        if att:
            lines.append(
                f"\nCLASS ATTENDANCE:\n"
                f"Average: {att.get('average_percentage')}% "
                f"— {att.get('status')}\n"
                f"Total students: {att.get('total_students')}\n"
                f"Students below 75%: {att.get('students_below_75')}"
            )

        risk = data.get("at_risk_students", {})
        if risk:
            lines.append(
                f"\nAT-RISK STUDENTS:\n"
                f"{risk.get('count')} out of {risk.get('total')} students "
                f"({risk.get('percentage')}%) are at risk"
            )

        assg = data.get("assignments", {})
        if assg:
            lines.append(
                f"\nASSIGNMENTS:\n"
                f"Pending submissions: {assg.get('pending_submissions', 0)}"
            )

    else:  # admin
        inst = data.get("institution", {})
        lines.append(
            f"INSTITUTION OVERVIEW:\n"
            f"Total Students: {inst.get('total_students')}\n"
            f"Total Faculty: {inst.get('total_faculty')}\n"
            f"Overall Attendance: {inst.get('overall_attendance')}%\n"
            f"At-Risk Students: {inst.get('at_risk_count')}"
        )

        depts = data.get("departments", [])
        if depts:
            lines.append("\nDEPARTMENT BREAKDOWN (sorted by attendance):")
            for d in depts:
                lines.append(
                    f"  {d['department']}: "
                    f"{d['attendance_percentage']}% attendance, "
                    f"{d['at_risk_count']} at-risk / {d['total_students']} students "
                    f"[{d['status']}]"
                )

        alerts    = data.get("alerts",    {})
        placement = data.get("placement", {})
        lines.append(f"\nActive System Alerts: {alerts.get('total_active', 0)}")
        lines.append(f"Open Placement Drives: {placement.get('open_drives', 0)}")

    return "\n".join(lines)


# ── Main generation function ─────────────────────────────────────

def generate_answer(
    role: str,
    retrieved_data: dict,
    user_question: str,
    conversation_history: list
) -> str:
    """
    Core RAG generation: formats context → builds prompt → calls Gemini.
    Falls back to deterministic answer if Gemini unavailable.
    """
    try:
        context = format_data_for_gemini(retrieved_data, role)

        history_text = ""
        for h in conversation_history[-4:]:
            label = "User" if h.get("role") == "user" else "Assistant"
            history_text += f"{label}: {h.get('content', '')}\n"

        personas = {
            "student": "helpful AI academic assistant for a student",
            "teacher": "helpful AI assistant for a faculty member",
            "faculty": "helpful AI assistant for a faculty member",
            "admin":   "institutional AI assistant for admin"
        }
        persona = personas.get(role.lower(), "academic assistant")

        access_rules = {
            "student": (
                "Only discuss this student's own data. "
                "If asked about other students, say: 'I can only show your own data.'"
            ),
            "teacher": (
                "Discuss class-level data only. Do not name individual students. "
                "If asked for admin data, say: 'That is outside my access.'"
            ),
            "faculty": "Discuss class-level data only.",
            "admin":   "You have full institutional data access."
        }
        access = access_rules.get(role.lower(), "")

        # Extract attendance numbers for what-if calculations in prompt
        att_block   = retrieved_data.get("attendance", {})
        att_present = att_block.get("present", 0)
        att_total   = att_block.get("total_classes", 0)

        prompt = f"""You are a {persona} at GVP college.
{access}

REAL DATA RETRIEVED FROM DATABASE:
{context}

CONVERSATION HISTORY:
{history_text}
USER QUESTION: "{user_question}"

INSTRUCTIONS FOR YOUR ANSWER:
1. Answer ONLY using the DATABASE DATA section above
2. Be specific — use actual numbers from the data
3. If the data does not contain what is asked, say:
   "I don't have that specific data. Please check the relevant page in your dashboard."
4. Never make up or estimate numbers not in the data
5. Write in natural conversational sentences (2-4 sentences max)
6. If a value is 0 or null, say so honestly
7. For "what if I miss N more classes" questions:
   Use these ACTUAL numbers from the data above:
   Current present classes = {att_present}
   Current total classes   = {att_total}
   If student misses N more: new_total = {att_total} + N
   New percentage = ({att_present} / ({att_total} + N)) * 100
   Show the calculated result clearly.
8. For resource/event questions, list actual items from the data
9. For subject-specific questions (e.g. "ML attendance"),
   find that subject in the per-subject data above and answer specifically

ANSWER:"""

        if not GEMINI_AVAILABLE or not GEMINI_CLIENT:
            print("[GENERATOR] Gemini not available, using fallback")
            return build_fallback(role, retrieved_data, user_question)

        print(f"[GENERATOR] Calling Gemini for: {user_question[:60]}")
        answer = call_gemini(prompt)

        if answer:
            print(f"[GENERATOR] Gemini replied: {answer[:80]}")
            return answer

        print("[GENERATOR] No Gemini response, using fallback")
        return build_fallback(role, retrieved_data, user_question)

    except Exception as e:
        print(f"[GENERATOR] Error: {e}")
        traceback.print_exc()
        return build_fallback(role, retrieved_data, user_question)


# ── Fallback (Gemini unavailable) ────────────────────────────────

def build_fallback(role: str, data: dict, question: str) -> str:
    """Honest, data-driven fallback when Gemini is unavailable."""
    q = question.lower()
    try:
        if role == "student":
            if any(w in q for w in ["attendance", "present", "absent", "class", "bunk"]):
                att = data.get("attendance", {})
                pct = att.get("overall_percentage", "N/A")
                p   = att.get("present", 0)
                t   = att.get("total_classes", 0)
                per_subj = att.get("per_subject", [])
                reply = f"Your overall attendance is {pct}% ({p}/{t} classes)."
                if per_subj:
                    low = [s for s in per_subj if s["status"] == "LOW"]
                    if low:
                        names = ", ".join(s["subject_name"] for s in low[:3])
                        reply += f" Subjects below 75%: {names}."
                return reply

            if any(w in q for w in ["mark", "score", "mid", "exam", "result", "cgpa", "sgpa"]):
                marks = data.get("marks", [])
                if not marks:
                    return "No marks data found in the system."
                lines = [
                    f"{m['subject']}: {m['score']}/{m['total']} ({m['percentage']}%)"
                    for m in marks[:4]
                ]
                return "Your marks: " + " | ".join(lines)

            if any(w in q for w in ["assignment", "pending", "submit", "homework"]):
                assg    = data.get("assignments", {})
                pending = assg.get("pending_count", 0)
                total   = assg.get("total", 0)
                if pending == 0:
                    return f"All {total} assignment(s) submitted — nothing pending!"
                pending_list = assg.get("pending_list", [])
                titles = ", ".join(p["title"] for p in pending_list[:3])
                return (
                    f"You have {pending} pending assignment(s) out of {total} total. "
                    + (f"Pending: {titles}." if titles else "")
                )

            if any(w in q for w in ["event", "happening", "workshop", "fest"]):
                events = data.get("events", [])
                if not events:
                    return "No events found. Check the Events page in your dashboard."
                names = [e["name"] for e in events[:4]]
                return f"Upcoming events: {', '.join(names)}."

            if any(w in q for w in ["resource", "material", "note", "upload", "study"]):
                resources = data.get("resources", [])
                if not resources:
                    return "No study materials found. Check the Resources page."
                names = [r["title"] for r in resources[:4]]
                return f"Available study materials: {', '.join(names)}."

            if any(w in q for w in ["risk", "fail", "danger", "warning"]):
                risk  = data.get("risk", {})
                level = risk.get("level", "N/A")
                reasons = risk.get("reasons", [])
                r_text  = "; ".join(reasons[:2]) if reasons else "No specific reasons flagged"
                return f"Your academic risk level is {level}. Reasons: {r_text}."

            # Generic summary
            att  = data.get("attendance", {}).get("overall_percentage", "N/A")
            risk = data.get("risk", {}).get("level", "N/A")
            assg = data.get("assignments", {}).get("pending_count", 0)
            return (
                f"Your overview: Attendance {att}%, "
                f"Risk level {risk}, "
                f"Pending assignments: {assg}."
            )

        elif role in ("teacher", "faculty"):
            att  = data.get("class_attendance", {})
            risk = data.get("at_risk_students", {})
            return (
                f"Class average attendance: {att.get('average_percentage', 'N/A')}%. "
                f"At-risk students: {risk.get('count', 'N/A')} "
                f"out of {risk.get('total', 'N/A')} total."
            )

        else:  # admin
            inst = data.get("institution", {})
            return (
                f"Institution: {inst.get('total_students', 'N/A')} students, "
                f"{inst.get('total_faculty', 'N/A')} faculty, "
                f"{inst.get('overall_attendance', 'N/A')}% overall attendance, "
                f"{inst.get('at_risk_count', 'N/A')} at-risk students."
            )

    except Exception:
        return "Please check your dashboard for the latest information."
