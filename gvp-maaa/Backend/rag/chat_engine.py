from datetime import datetime, timedelta
from sqlalchemy.orm import Session
import traceback

# Safe Gemini import — never crash if not installed
try:
    import google.generativeai as genai
    import os
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")
    if GEMINI_KEY:
        genai.configure(api_key=GEMINI_KEY)
        GEMINI_AVAILABLE = True
    else:
        GEMINI_AVAILABLE = False
except Exception:
    GEMINI_AVAILABLE = False
    genai = None

from rag.context_builder import (
    build_student_context,
    build_teacher_context,
    build_admin_context
)
from rag.query_router import is_query_allowed, build_system_prompt

# Simple in-memory cache
_context_cache = {}
CACHE_TTL_MINUTES = 10

def get_cached_context(user_id, role, db):
    cache_key = f"{role}_{user_id}"
    now = datetime.now()
    
    if cache_key in _context_cache:
        cached_time, cached_data = _context_cache[cache_key]
        if now - cached_time < timedelta(minutes=CACHE_TTL_MINUTES):
            return cached_data
    
    try:
        if role == "student":
            context = build_student_context(user_id, db)
        elif role == "teacher" or role == "faculty":
            context = build_teacher_context(user_id, db)
        elif role == "admin":
            context = build_admin_context(db)
        else:
            context = {"role": role, "note": "Unknown role"}
    except Exception as e:
        traceback.print_exc()
        context = {"role": role, "error": str(e)}
    
    _context_cache[cache_key] = (now, context)
    return context

def build_fallback_response(role, context, message):
    """Always returns a useful string, never fails"""
    try:
        if role == "student":
            att = context.get("attendance_pct", "N/A")
            risk = context.get("risk_level", "N/A")
            alerts = context.get("active_alerts", [])
            return (
                f"Based on your academic data: Your attendance is {att}%, "
                f"risk level is {risk}, and you have {len(alerts)} active alert(s). "
                f"Please check your dashboard for detailed information."
            )
        elif role in ("teacher", "faculty"):
            att = context.get("class_avg_attendance", "N/A")
            risk_count = context.get("at_risk_count", "N/A")
            total = context.get("total_students", "N/A")
            return (
                f"Your class summary: Average attendance is {att}%, "
                f"{risk_count} out of {total} students are at risk. "
                f"Check the Insights page for detailed breakdown."
            )
        elif role == "admin":
            total = context.get("total_students", "N/A")
            at_risk = context.get("at_risk_count", "N/A")
            att = context.get("overall_attendance_pct", "N/A")
            return (
                f"Institution overview: {total} total students, "
                f"{at_risk} at risk, overall attendance {att}%. "
                f"Check the Insights dashboard for full details."
            )
        else:
            return "Your data has been retrieved. Please check your dashboard for details."
    except Exception:
        return "Please check your dashboard for the latest academic information."

def answer_query(user_id, role, message, history, db) -> str:
    try:
        # Step 1: Check if query is allowed for this role
        allowed, denial_msg = is_query_allowed(message, role)
        if not allowed:
            return denial_msg
        
        # Step 2: Get context (with cache)
        context = get_cached_context(user_id, role, db)
        
        # Step 3: Build system prompt
        system_prompt = build_system_prompt(role, context)
        
        # Step 4: Try Gemini if available
        if GEMINI_AVAILABLE:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                
                # Build conversation
                conversation_parts = [system_prompt, "\n\nConversation history:\n"]
                for h in history[-6:]:
                    role_label = "User" if h.get("role") == "user" else "Assistant"
                    conversation_parts.append(
                        f"{role_label}: {h.get('content', '')}"
                    )
                conversation_parts.append(f"\nUser: {message}\nAssistant:")
                
                full_prompt = "\n".join(conversation_parts)
                response = model.generate_content(full_prompt)
                
                if response and response.text:
                    return response.text.strip()
                else:
                    return build_fallback_response(role, context, message)
                    
            except Exception as gemini_error:
                traceback.print_exc()
                # Gemini failed — use fallback
                return build_fallback_response(role, context, message)
        else:
            # No Gemini — use intelligent fallback based on message keywords
            return smart_fallback(role, context, message)
            
    except Exception as e:
        traceback.print_exc()
        return "I'm having trouble accessing your data right now. Please try again in a moment."

def smart_fallback(role, context, message):
    """Rule-based responses when Gemini is unavailable"""
    msg = message.lower()
    
    try:
        if role == "student":
            if any(w in msg for w in ["attendance", "present", "absent"]):
                att = context.get("attendance_pct", 0)
                status = "good" if att >= 75 else "below the required 75% threshold"
                return f"Your current attendance is {att}%. This is {status}."
            
            elif any(w in msg for w in ["mark", "score", "marks", "result", "grade"]):
                subjects = context.get("subject_marks", [])
                if subjects:
                    summary = ", ".join([f"{s['subject']}: {s['score']}%" for s in subjects[:3]])
                    return f"Your recent marks: {summary}. Check the Marks page for full details."
                return "No marks data available yet."
            
            elif any(w in msg for w in ["risk", "fail", "danger", "warning"]):
                risk = context.get("risk_level", "LOW")
                att = context.get("attendance_pct", 0)
                return (
                    f"Your risk level is {risk}. "
                    f"Attendance: {att}%. "
                    f"{'Focus on improving attendance and marks.' if risk != 'LOW' else 'You are performing well, keep it up!'}"
                )
            
            elif any(w in msg for w in ["task", "today", "do", "focus", "study"]):
                alerts = context.get("active_alerts", [])
                att = context.get("attendance_pct", 0)
                task = "Attend all classes" if att < 75 else "Review your study materials"
                return f"Your priority task today: {task}. You have {len(alerts)} active alert(s)."
            
            elif any(w in msg for w in ["placement", "eligible", "drive", "job"]):
                risk = context.get("risk_level", "LOW")
                eligible = risk != "HIGH"
                return (
                    f"Based on your academic profile (risk level: {risk}), "
                    f"you {'appear eligible' if eligible else 'may not be eligible'} "
                    f"for placement drives. Check the Placement page for specific drive requirements."
                )
            
            elif any(w in msg for w in ["hello", "hi", "hey", "help"]):
                att = context.get("attendance_pct", "N/A")
                risk = context.get("risk_level", "N/A")
                return (
                    f"Hello! I'm your AI academic assistant. "
                    f"Your current attendance is {att}% and risk level is {risk}. "
                    f"Ask me about your attendance, marks, tasks, or placement eligibility."
                )
            
            else:
                return build_fallback_response(role, context, message)
        
        elif role in ("teacher", "faculty"):
            if any(w in msg for w in ["attendance", "present"]):
                att = context.get("class_avg_attendance", "N/A")
                return f"Your class average attendance is {att}%."
            
            elif any(w in msg for w in ["risk", "at risk", "struggling"]):
                count = context.get("at_risk_count", 0)
                total = context.get("total_students", 0)
                return f"{count} out of {total} students in your class are currently at risk."
            
            elif any(w in msg for w in ["assignment", "submission", "pending"]):
                pending = context.get("pending_submissions", 0)
                return f"There are {pending} pending assignment submissions in your class."
            
            elif any(w in msg for w in ["hello", "hi", "hey", "help"]):
                att = context.get("class_avg_attendance", "N/A")
                count = context.get("at_risk_count", 0)
                return (
                    f"Hello! I'm your teaching assistant. "
                    f"Your class average attendance is {att}% with {count} at-risk students. "
                    f"Ask me about attendance, marks, assignments, or at-risk students."
                )
            
            else:
                return build_fallback_response(role, context, message)
        
        elif role == "admin":
            if any(w in msg for w in ["hello", "hi", "hey", "help"]):
                total = context.get("total_students", "N/A")
                at_risk = context.get("at_risk_count", "N/A")
                return (
                    f"Hello! I'm your institutional AI assistant. "
                    f"Currently managing {total} students with {at_risk} flagged at-risk. "
                    f"Ask me about students, departments, attendance, or placement."
                )
            elif any(w in msg for w in ["risk", "at risk"]):
                at_risk = context.get("at_risk_count", "N/A")
                total = context.get("total_students", "N/A")
                return f"Currently {at_risk} out of {total} students are flagged as at-risk."
            
            elif any(w in msg for w in ["attendance"]):
                att = context.get("overall_attendance_pct", "N/A")
                low_depts = context.get("low_attendance_departments", [])
                dept_text = ", ".join(low_depts) if low_depts else "none critical"
                return f"Overall institution attendance is {att}%. Departments needing attention: {dept_text}."
            
            elif any(w in msg for w in ["placement", "drive"]):
                drives = context.get("placement_drives_open", 0)
                return f"There are currently {drives} active placement drives."
            
            else:
                return build_fallback_response(role, context, message)
        
        return build_fallback_response(role, context, message)
        
    except Exception:
        return build_fallback_response(role, context, message)
