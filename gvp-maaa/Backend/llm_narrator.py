import os
import time
try:
    from google import genai
except ImportError:
    genai = None

# Simple TTL Cache definition
# Cache format: { student_id: (timestamp, narrative) }
_narrative_cache = {}
CACHE_TTL = 30 * 60 # 30 minutes

def get_fallback_narrative(state: dict) -> str:
    """Builds a fallback narrative cleanly without raising exceptions."""
    try:
        risk_score = state.get("risk_score", 0.0)
        risk_level = "High" if risk_score > 0.6 else "Medium" if risk_score > 0.3 else "Low"
        alert_count = len(state.get("alerts", []))
        
        tasks_dict = state.get("tasks", {})
        today_tasks = tasks_dict.get("today_tasks", [])
        
        first_task = today_tasks[0].get("text", "Check portal for updates") if today_tasks else "Ensure your attendance and assignments are caught up."
        
        return f"Student risk level is {risk_level}. We tracked {alert_count} active alerts. Priority task: {first_task}"
    except Exception:
        # Ultimate fallback
        return "Student performance data analyzed. Please refer to dashboard metrics."

def narrate_student_report(agent_state: dict) -> str:
    try:
        risk_level = agent_state.get("risk_score", 0)
        flags = agent_state.get("risk_flags", [])
        alerts = agent_state.get("alerts", [])
        tasks = agent_state.get("tasks", {})
        today_tasks = tasks.get("today_tasks", [])

        risk_label = "high" if risk_level > 0.6 else "moderate" if risk_level > 0.3 else "low"
        alert_count = len(alerts)
        top_task = today_tasks[0] if today_tasks else "No pending tasks"
        flag_text = ", ".join(flags[:2]) if flags else "no critical issues"

        return (
            f"Your current academic risk level is {risk_label} "
            f"with {alert_count} active alert(s) flagged ({flag_text}). "
            f"Your top priority task today is: {top_task}. "
            f"Stay consistent — small daily actions compound into strong results."
        )
    except Exception:
        return "Your academic data has been analysed. Check your tasks and alerts for actionable next steps."
