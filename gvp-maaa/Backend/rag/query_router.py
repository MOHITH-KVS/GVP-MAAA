BLOCKED_PATTERNS = {
    "student": [
        "other student", "another student", "all students",
        "teacher data", "teacher salary", "admin", "everyone",
        "class list", "who else", "other people"
    ],
    "teacher": [
        "admin data", "admin settings", "other teacher",
        "salary", "personal details of student",
        "student address", "student phone"
    ]
}

def is_query_allowed(message: str, role: str) -> tuple[bool, str]:
    message_lower = message.lower()
    
    # Check block list
    patterns = BLOCKED_PATTERNS.get(role, [])
    for pattern in patterns:
        if pattern in message_lower:
            return False, "You don't have access to that information."

    return True, ""


def build_system_prompt(role: str, context: dict) -> str:
    if role == "student":
        return f"""You are an academic assistant for a student at GVP college.
You have access ONLY to this student's own data: {context}.
Answer questions about their attendance, marks, tasks,
alerts and placement eligibility using exact numbers from context.
If asked about other students, teachers, or admin data,
respond: 'You don't have access to that information.'
If data is not in context, respond: 'No data available for that.'
Never invent numbers. Keep answers under 4 sentences.
Be encouraging and specific."""
            
    elif role == "teacher":
        return f"""You are an academic assistant for a faculty member at GVP college.
You have access ONLY to your class-level data: {context}.
Answer questions about your class attendance averages, marks,
at-risk student counts, and assignment submissions.
Never reveal individual student personal information.
If asked about admin data or other teachers, respond:
'You don't have access to that information.'
If data is not available, respond: 'No data available for that.'
Keep answers under 4 sentences."""

    elif role == "admin":
        return f"""You are an academic intelligence assistant for the admin
of GVP college. You have full institutional data: {context}.
Answer any question about students, teachers, departments,
attendance, marks, risk levels, alerts and placement.
If specific data is not in context, respond:
'No data available for that query.'
Be precise, use actual numbers from context.
Keep answers under 5 sentences."""

    return "You are a generic helpful AI."
