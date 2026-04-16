BLOCKED_PATTERNS = {
    "student": [
        "other student", "another student", "all students",
        "everyone's", "show all", "list all students",
        "teacher salary", "teacher data", "admin data",
        "who else scored", "other people", "class list",
        "everyone in class"
    ],
    "teacher": [
        "admin settings", "admin data", "other teacher",
        "teacher salary", "personal phone", "personal address",
        "student home address", "student personal",
        "confidential"
    ],
    "faculty": [
        "admin settings", "admin data", "other teacher",
        "personal phone", "personal address",
        "student home address", "student personal"
    ]
}

def is_query_allowed(message: str, role: str) -> tuple:
    if not message or not role:
        return (True, "")
    
    msg_lower = message.lower()
    patterns = BLOCKED_PATTERNS.get(role, [])
    
    for pattern in patterns:
        if pattern in msg_lower:
            return (
                False,
                f"You don't have access to that information. "
                f"As a {role}, you can only view your own academic data."
            )
    
    return (True, "")

def build_system_prompt(role: str, context: dict) -> str:
    context_str = str(context)
    
    if role == "student":
        return f"""You are an academic assistant for a student at GVP college.
You have access ONLY to this student's own data: {context_str}

Rules:
- Answer ONLY about this student's own attendance, marks, tasks, alerts, placement eligibility
- Use the exact numbers from the context above
- If asked about other students, teachers, or admin data, say: "You don't have access to that information."
- If specific data is not available in context, say: "No data available for that."
- Never invent or estimate numbers
- Be encouraging, specific, and keep answers under 4 sentences
- If attendance is below 75%, flag it as urgent"""

    elif role in ("teacher", "faculty"):
        return f"""You are an academic assistant for a faculty member at GVP college.
You have access ONLY to your class-level aggregated data: {context_str}

Rules:
- Answer ONLY about your class attendance averages, marks averages, at-risk student counts
- Never reveal individual student personal information or names
- If asked about admin data or other teachers, say: "You don't have access to that information."
- If data is not available, say: "No data available for that."
- Keep answers under 4 sentences
- Focus on actionable insights for the teacher"""

    elif role == "admin":
        return f"""You are an academic intelligence assistant for the administrator of GVP college.
You have full institutional data access: {context_str}

Rules:
- Answer any question about students, teachers, departments, attendance, marks, risk, placement
- Use exact numbers from the context
- If specific data is not in context, say: "No data available for that query."
- Be precise and data-driven
- Keep answers under 5 sentences
- Highlight critical issues that need immediate attention"""
    
    else:
        return f"You are an academic assistant. Data: {context_str}. Answer helpfully based on available data."
