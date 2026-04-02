def generate_recommendations(data, attendance_threshold=75):
    recommendations = []

    students = data.get("students", [])
    predictions = data.get("predictions", {})
    weakest_subject = data.get("weakest_subject", {})
    assignment_summary = data.get("assignment_summary", {})

    high_risk_count = sum(1 for s in students if s.get("risk", {}).get("level") == "HIGH")
    if high_risk_count > 5:
        recommendations.append({
            "type": "performance",
            "message": "Schedule intervention session for high-risk students",
            "priority": "HIGH",
            "action": "schedule_session"
        })

    expected_attendance = predictions.get("expected_attendance", 100.0)
    if expected_attendance > 0 and expected_attendance < attendance_threshold:
        recommendations.append({
            "type": "attendance",
            "message": "Conduct extra class or attendance drive",
            "priority": "HIGH",
            "action": "schedule_session"
        })

    total_possible = assignment_summary.get("total_assignments", 0) # Could be tracked globally
    late_submissions = assignment_summary.get("late_submissions", 0)
    submitted_count = assignment_summary.get("submitted_count", 0)

    if submitted_count > 0:
        if (late_submissions / submitted_count) > 0.30:
            recommendations.append({
                "type": "assignment",
                "message": "Review assignment deadlines and enforce submission tracking",
                "priority": "MEDIUM",
                "action": "review_assignments"
            })

    if weakest_subject.get("trend") == "declining":
        name = weakest_subject.get("name", "Unknown")
        recommendations.append({
            "type": "performance",
            "message": f"Revise teaching strategy for {name}",
            "priority": "HIGH",
            "action": "view_students"
        })

    future_risk = predictions.get("future_risk_students", 0)
    if future_risk > 3:
        recommendations.append({
            "type": "performance",
            "message": "Monitor students approaching risk threshold",
            "priority": "MEDIUM",
            "action": "view_students"
        })

    priority_map = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    recommendations.sort(key=lambda x: priority_map.get(x["priority"], 3))

    # Safely de-duplicate taking strictly dictionary items comparing natively.
    seen_messages = set()
    final_output = []
    for r in recommendations:
        if r["message"] not in seen_messages:
            seen_messages.add(r["message"])
            final_output.append(r)
            if len(final_output) >= 5:
                break
                
    return final_output
