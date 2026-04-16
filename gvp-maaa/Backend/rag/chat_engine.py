import logging
import datetime
from sqlalchemy.orm import Session

# Import dependencies wrapped in try/except for safety
try:
    import google.generativeai as genai
except ImportError:
    genai = None

from rag.context_builder import build_student_context, build_teacher_context, build_admin_context
from rag.query_router import is_query_allowed, build_system_prompt

logger = logging.getLogger(__name__)

# Simple in-memory cache: (user_id, role) -> {"context": dict, "expiry": datetime}
SIMPLE_IN_MEMORY_CACHE = {}


def get_context(user_id: int, role: str, db: Session) -> dict:
    cache_key = (user_id, role)
    now = datetime.datetime.utcnow()

    # Check Cache
    if cache_key in SIMPLE_IN_MEMORY_CACHE:
        cached_data = SIMPLE_IN_MEMORY_CACHE[cache_key]
        if now < cached_data["expiry"]:
            return cached_data["context"]

    # Cache miss or expired - Build Context
    context = {}
    if role == "student":
        context = build_student_context(user_id, db)
    elif role == "faculty" or role == "teacher":
        # The app might use 'faculty' as role in auth, so we handle both.
        context = build_teacher_context(user_id, db)
    elif role == "admin":
        context = build_admin_context(db)

    # Store in Cache for 10 minutes
    SIMPLE_IN_MEMORY_CACHE[cache_key] = {
        "context": context,
        "expiry": now + datetime.timedelta(minutes=10)
    }
    
    return context


def answer_query(user_id: int, role: str, message: str, history: list, db: Session) -> str:
    """Answers a question via RAG, enforcing role limits and applying fallbacks."""
    
    # Map raw DB role to specific system role logic if needed
    sys_role = "teacher" if role == "faculty" else role
    
    # Step 1: Query Allowed
    allowed, error_msg = is_query_allowed(message, sys_role)
    if not allowed:
        return error_msg

    try:
        # Step 2: Get Context
        context = get_context(user_id, sys_role, db)
        
        # Step 3: Build System Prompt
        sys_prompt = build_system_prompt(sys_role, context)

        # Step 4: Construct Gemini Messages
        gemini_messages = [{"role": "user", "parts": [{"text": sys_prompt}]}]
        
        # Add last 6 history messages
        recent_history = history[-6:] if history else []
        for msg in recent_history:
            role_map = "user" if msg.get("from") == "user" else "model"
            gemini_messages.append({"role": role_map, "parts": [{"text": msg.get("text", "")}]})
            
        # Add the new message
        gemini_messages.append({"role": "user", "parts": [{"text": message}]})

        # Step 5: Gemini Make Call
        if genai:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(gemini_messages)
            return response.text
        else:
            raise Exception("Gemini Library not found or uninitialized.")

    except Exception as e:
        logger.error(f"Error answering query via RAG: {e}")
        
        # Step 6: Fallback Response without Exception
        if not context:
            context = {}

        if sys_role == "student":
            pct = context.get("attendance_pct", "0.0")
            risk_level = context.get("risk_level", "Unknown")
            alerts = context.get("active_alerts", [])
            return f"Based on your data - Attendance: {pct}%, Risk: {risk_level}, Active alerts: {len(alerts)}. Please check your dashboard for full details."
            
        elif sys_role == "teacher":
            pct = context.get("class_avg_attendance", "0.0")
            count = context.get("at_risk_count", 0)
            return f"Your class data - Avg attendance: {pct}%, At-risk students: {count}. Check insights for details."
            
        elif sys_role == "admin":
            total_students = context.get("total_students", 0)
            at_risk = context.get("at_risk_count", 0)
            pct = context.get("overall_attendance_pct", "0.0")
            return f"Institution data - {total_students} students, {at_risk} at risk, overall attendance {pct}%. Check insights dashboard for full breakdown."
            
        return "Service temporarily unavailable. Please try again later."
