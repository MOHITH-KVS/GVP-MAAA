def generate_insights(attendance_values, predicted_values, risk_count, avg_marks, total_students=None):
    """
    Lightweight, deterministic decision-support insights.

    Returns: list[ {title, message, action, severity} ]
    """
    if not attendance_values:
        return []

    # Decision-support thresholds (deterministic + lightweight)
    avg_attendance = sum(attendance_values) / max(len(attendance_values), 1)

    # Ensure avg_marks is numeric when provided
    avg = None
    if avg_marks is not None:
        try:
            avg = float(avg_marks)
        except Exception:
            avg = None

    insights = []

    # Attendance insight
    if avg_attendance < 75:
        insights.append({
            "title": "Low Attendance",
            "message": f"Average attendance is {round(avg_attendance, 1)}%.",
            "action": "Conduct extra classes or notify students with low attendance.",
            "severity": "high"
        })

    # Marks insight (using the threshold requested)
    if avg is not None and avg < 18:
        insights.append({
            "title": "Low Performance",
            "message": "Students are scoring below average.",
            "action": "Arrange revision sessions and provide focused practice for weak concepts.",
            "severity": "medium"
        })

    # Risk insight
    if risk_count > 0:
        insights.append({
            "title": "Student Risk Increase",
            "message": f"{risk_count} students are at risk.",
            "action": "Focus on high-risk students and schedule short intervention plans.",
            "severity": "high"
        })

    # Final safety (always return at least one insight)
    if len(insights) == 0:
        insights.append({
            "title": "Stable Performance",
            "message": "No major issues detected.",
            "action": "Continue current teaching strategy and monitor weekly.",
            "severity": "low"
        })

    return insights

