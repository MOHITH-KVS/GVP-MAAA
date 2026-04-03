def generate_recommendations(data):
    recommendations = []

    students = data.get("students", [])
    predictions = data.get("predictions", {})
    weakest_subject = data.get("weakest_subject", {})

    high_risk = [s for s in students if s.get("risk", {}).get("level") == "HIGH"]
    future_risk = predictions.get("future_risk_students", 0)
    expected_attendance = predictions.get("expected_attendance", 0)
    assignment_stats = data.get("assignment_stats", {})

    # 1. High risk students
    if len(high_risk) > 5:
        recommendations.append({
            "type": "performance",
            "message": f"{len(high_risk)} students are at high risk. Schedule intervention session.",
            "priority": "HIGH",
            "action": "view_students"
        })

    # 2. Attendance drop
    if expected_attendance < 75 and expected_attendance > 0:
        recommendations.append({
            "type": "attendance",
            "message": "Attendance is expected to drop. Conduct extra classes.",
            "priority": "HIGH",
            "action": "schedule_session"
        })

    # 3. Assignment delay
    late = assignment_stats.get("late", 0)
    total = sum(assignment_stats.values()) if assignment_stats else 0

    if total > 0 and (late / total) > 0.3:
        recommendations.append({
            "type": "assignment",
            "message": "High number of late submissions. Review assignment deadlines.",
            "priority": "MEDIUM",
            "action": "review_assignments"
        })

    # 4. Weakest subject
    if weakest_subject.get("trend") == "declining":
        recommendations.append({
            "type": "performance",
            "message": f"Performance declining in {weakest_subject.get('name')}. Revise teaching strategy.",
            "priority": "HIGH",
            "action": "view_students"
        })

    # 5. Future risk
    if future_risk > 3:
        recommendations.append({
            "type": "risk",
            "message": f"{future_risk} students may become at-risk soon.",
            "priority": "MEDIUM",
            "action": "view_students"
        })

    # Sort by priority
    priority_order = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}
    recommendations.sort(key=lambda x: priority_order[x["priority"]], reverse=True)

    return recommendations[:5]
