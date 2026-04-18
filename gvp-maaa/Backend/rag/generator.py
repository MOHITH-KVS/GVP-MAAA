"""
rag/generator.py  —  G in RAG
Takes retrieved DB data, formats it as context, calls Gemini.

SDK: google.genai (new SDK)
Fallback: 3 API keys × 4 models — cycles until one works.
"""
import os
import traceback
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env", override=True)

# ── ALL KEYS ─────────────────────────────────────────────────────
ALL_KEYS = [
    k.strip() for k in [
        os.environ.get("GEMINI_API_KEY",   ""),
        os.environ.get("GEMINI_API_KEY_2", ""),
        os.environ.get("GEMINI_API_KEY_3", ""),
    ] if k and len(k.strip()) > 20
]

print(f"[GENERATOR] Found {len(ALL_KEYS)} API key(s)")

FALLBACK_MODELS = [
    # Prioritize models confirmed working by check_gemini_keys.py.
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash",
]

GEMINI_AVAILABLE = False
GEMINI_CLIENT    = None
GEMINI_MODEL     = None
ACTIVE_KEY_INDEX = 0
KEY_MODEL_CACHE  = {}

def try_connect():
    global GEMINI_CLIENT, GEMINI_MODEL, GEMINI_AVAILABLE, ACTIVE_KEY_INDEX, KEY_MODEL_CACHE
    try:
        from google import genai as _genai
    except ImportError:
        print("[GENERATOR] google-genai not installed")
        return False

    for key_idx, key in enumerate(ALL_KEYS):
        for model in FALLBACK_MODELS:
            try:
                client = _genai.Client(api_key=key)
                test = client.models.generate_content(
                    model=model,
                    contents="Say OK"
                )
                if test and test.text:
                    GEMINI_CLIENT    = client
                    GEMINI_MODEL     = model
                    ACTIVE_KEY_INDEX = key_idx
                    GEMINI_AVAILABLE = True
                    KEY_MODEL_CACHE[key_idx] = model
                    print(f"[GENERATOR] Connected: key {key_idx+1}, model {model}")
                    return True
            except Exception as e:
                err = str(e)
                if "429" in err or "quota" in err.lower():
                    print(f"[GENERATOR] Key {key_idx+1} {model}: quota exhausted")
                    continue
                elif "404" in err or "not found" in err.lower():
                    print(f"[GENERATOR] Key {key_idx+1} {model}: model not available")
                    continue
                else:
                    print(f"[GENERATOR] Key {key_idx+1} {model}: {err[:50]}")
                    continue
    return False

# Initial connection attempt
try_connect()


def call_gemini(prompt: str) -> str:
    """
    Calls Gemini with automatic failover across all keys and models.
    Updates global state (GEMINI_CLIENT, GEMINI_MODEL) on successful switch.
    """
    global GEMINI_CLIENT, GEMINI_MODEL, GEMINI_AVAILABLE, ACTIVE_KEY_INDEX, ALL_KEYS, KEY_MODEL_CACHE

    print(
        f"[GEMINI_CALL] client={GEMINI_CLIENT is not None} "
        f"model={GEMINI_MODEL} "
        f"keys={len(ALL_KEYS)}"
    )

    if not ALL_KEYS:
        print("[GEMINI_CALL] No keys available")
        return None

    try:
        from google import genai as _genai
    except ImportError:
        return None

    for key_idx, key in enumerate(ALL_KEYS):
        preferred_models = []
        cached_model = KEY_MODEL_CACHE.get(key_idx)
        if cached_model:
            preferred_models.append(cached_model)
        preferred_models.extend([m for m in FALLBACK_MODELS if m != cached_model])

        for model in preferred_models:
            try:
                print(f"[GEMINI_CALL] Trying key {key_idx+1} model {model}")
                client = _genai.Client(api_key=key)
                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "temperature": 0.1,
                        "max_output_tokens": 300
                    }
                )
                print(f"[GEMINI_CALL] Response: {str(response)[:100]}")

                if response and response.text:
                    text = response.text.strip()
                    print(f"[GEMINI_CALL] SUCCESS: {text[:80]}")

                    # Update global pointer if we switched
                    if key_idx != ACTIVE_KEY_INDEX or model != GEMINI_MODEL:
                        print(f"[GENERATOR] Failover to key {key_idx+1}, model {model}")
                        ACTIVE_KEY_INDEX = key_idx
                        GEMINI_MODEL     = model
                        GEMINI_CLIENT    = client
                        GEMINI_AVAILABLE = True
                    KEY_MODEL_CACHE[key_idx] = model
                    return text
                else:
                    print("[GEMINI_CALL] Empty response.text")
            except Exception as e:
                err = str(e)
                print(f"[GEMINI_CALL] Error key {key_idx+1} {model}: {err[:100]}")
                if "429" in err or "quota" in err.lower():
                    continue
                else:
                    continue

    print("[GEMINI_CALL] All attempts failed")
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
        pending_total = assg.get("pending_submissions", 0)
        details = assg.get("assignment_details", [])

        lines.append(f"\nASSIGNMENTS:")
        lines.append(f"Total pending submissions: {pending_total}")

        if details:
            lines.append("Breakdown by assignment:")
            for d in details:
                lines.append(
                    f"  - {d['title']} (Year {d.get('year','?')} "
                    f"Sec {d.get('section','?')}): "
                    f"{d['pending']} students pending, "
                    f"{d['submitted']} submitted"
                )

        resources = data.get("resources", [])
        if resources:
            lines.append(f"\nRESOURCES YOU UPLOADED ({len(resources)}):")
            for r in resources:
                lines.append(
                    f"  - {r['title']} [{r['subject']}] ({r['type']})"
                )
        else:
            lines.append("\nRESOURCES: None uploaded yet")

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
    Analytical / complex queries are first routed to the LangChain chain;
    simple queries go directly to Gemini; rule-based fallback if all fail.
    """
    try:
        # ── 1. Try LangChain for analytical/complex queries ────────────
        try:
            from rag.analytical_chain import (
                is_analytical_query,
                run_analytical_chain,
            )
            print(f"[GENERATOR] Answering: {user_question[:50]}")
            if is_analytical_query(user_question):
                print("[GENERATOR] Routing to analytical chain")
                chain_answer = run_analytical_chain(
                    role, retrieved_data, user_question
                )
                if chain_answer and len(chain_answer) > 10:
                    return chain_answer
                print("[GENERATOR] Chain returned nothing — falling through to Gemini")
        except Exception as _ce:
            print(f"[GENERATOR] Chain import/run error: {_ce}")

        # ── 2. Direct Gemini for simple queries ────────────────────────
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
            print(f"[GENERATOR] Gemini LIVE — replied: {answer[:80]}")
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
