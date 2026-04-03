def generate_alerts(data):
    alerts = []

    students = data.get("students", [])
    predictions = data.get("predictions", {})
    recommendations = data.get("recommendations", [])

    # HIGH RISK ALERT
    high_risk = [s for s in students if s.get("risk", {}).get("level") == "HIGH"]

    if len(high_risk) > 5:
        alerts.append({
            "title": "High Risk Students Detected",
            "type": "academic",
            "severity": "high",
            "timestamp": "now",
            "action": "view_students"
        })

    # ATTENDANCE ALERT
    if predictions.get("expected_attendance", 0) < 75:
        alerts.append({
            "title": "Attendance Likely to Drop",
            "type": "attendance",
            "severity": "high",
            "timestamp": "now",
            "action": "schedule_session"
        })

    # FUTURE RISK ALERT
    if predictions.get("future_risk_students", 0) > 3:
        alerts.append({
            "title": "Students Approaching Risk Threshold",
            "type": "academic",
            "severity": "medium",
            "timestamp": "now",
            "action": "view_students"
        })

    # RECOMMENDATION-BASED ALERTS
    for rec in recommendations:
        if rec.get("priority") == "HIGH":
            alerts.append({
                "title": rec.get("message"),
                "type": rec.get("type"),
                "severity": "high",
                "timestamp": "now",
                "action": rec.get("action")
            })

    return alerts[:5]

