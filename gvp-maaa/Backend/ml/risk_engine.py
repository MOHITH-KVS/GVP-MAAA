def calculate_risk_score(student):
    """Deterministic 0-100 risk score from attendance, marks, and performance trend."""
    try:
        attendance = float(student.get("attendance", 100) if student.get("attendance", 100) is not None else 100)
    except (TypeError, ValueError):
        attendance = 100.0

    mid1_raw = student.get("mid1")
    mid2_raw = student.get("mid2")
    try:
        mid1 = float(mid1_raw) if mid1_raw is not None else None
    except (TypeError, ValueError):
        mid1 = None
    try:
        mid2 = float(mid2_raw) if mid2_raw is not None else None
    except (TypeError, ValueError):
        mid2 = None

    score = 0.0
    breakdown = []

    # Attendance contribution (strong)
    if attendance < 75:
        val = (75 - attendance) * 3
        score += val
        breakdown.append({"factor": "Low Attendance", "value": round(val, 1)})

    # Marks contribution (max 40)
    if mid1 is not None and mid1 < 15:
        val = (15 - mid1) * 2
        score += val
        breakdown.append({"factor": "Low Mid1 Marks", "value": round(val, 1)})

    if mid2 is not None and mid2 < 15:
        val = (15 - mid2) * 2
        score += val
        breakdown.append({"factor": "Low Mid2 Marks", "value": round(val, 1)})

    # Trend penalty (max 10)
    if mid1 is not None and mid2 is not None and mid2 < mid1:
        val = 10
        score += val
        breakdown.append({"factor": "Performance Decline", "value": val})

    # Force minimum risk score for critical conditions
    before_floor = score
    if attendance < 75:
        score = max(score, 40)
        if score > before_floor:
            breakdown.append({"factor": "Minimum Risk Floor (Attendance)", "value": round(score - before_floor, 1)})
            before_floor = score

    if (mid1 is not None and mid1 < 15) or (mid2 is not None and mid2 < 15):
        score = max(score, 40)
        if score > before_floor:
            breakdown.append({"factor": "Minimum Risk Floor (Marks)", "value": round(score - before_floor, 1)})
            before_floor = score

    # Never return NaN; clamp into 0..100
    if score != score:  # NaN check
        score = 0.0
    score = min(round(score, 1), 100)
    breakdown = sorted(breakdown, key=lambda x: float(x.get("value", 0) or 0), reverse=True)
    return score, breakdown


def get_student_attendance_trend(student):
    """Return the latest 5 attendance trend values, padded when needed."""
    history = student.get("attendance_history", []) or []
    normalized = []

    for value in history[-5:]:
        try:
            normalized.append(round(float(value), 2))
        except (TypeError, ValueError):
            normalized.append(None)

    while len(normalized) < 5:
        normalized.insert(0, None)

    return normalized


def get_attendance_trend_label(attendance_history):
    values = []
    for value in attendance_history or []:
        if value is None:
            continue
        try:
            values.append(float(value))
        except (TypeError, ValueError):
            continue

    if len(values) < 2:
        return "Fluctuating"

    start = values[0]
    end = values[-1]
    variation = max(values) - min(values)

    if end < start - 2:
        return "Declining attendance"
    if end > start + 2:
        return "Improving attendance"
    if variation > 8:
        return "Fluctuating"
    return "Fluctuating"


def calculate_risk_movement(student):
    prev_score = student.get("previous_risk_score")
    current_score = student.get("risk_score")

    if prev_score is None:
        return "stable"

    try:
        prev_score = float(prev_score)
        current_score = float(current_score)
    except (TypeError, ValueError):
        return "stable"

    if current_score > prev_score + 5:
        return "increasing"
    elif current_score < prev_score - 5:
        return "decreasing"
    else:
        return "stable"


def calculate_risk(student, thresholds):
    """Returns label + numeric score + explainable reasons/actions."""
    risk_score, risk_breakdown = calculate_risk_score(student)

    if risk_score >= 70:
        risk = "HIGH"
    elif risk_score >= 40:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    reasons = []
    actions = []

    try:
        attendance = float(student.get("attendance", 0) or 0)
    except (TypeError, ValueError):
        attendance = 0.0

    mid1 = student.get("mid1")
    mid2 = student.get("mid2")
    low_marks = False
    try:
        low_marks = (mid1 is not None and float(mid1) < 15) or (mid2 is not None and float(mid2) < 15)
    except (TypeError, ValueError):
        low_marks = False

    if attendance < 75:
        reasons.append("Attendance below 75%")
    if low_marks:
        reasons.append("Low performance in Mid exams")
    try:
        m1 = float(mid1) if mid1 is not None else None
        m2 = float(mid2) if mid2 is not None else None
        if m1 is not None and m2 is not None and m2 < m1:
            reasons.append("Performance declined from Mid1 to Mid2")
    except (TypeError, ValueError):
        pass

    if attendance < 75 and low_marks:
        actions.append("Schedule 1-on-1 intervention")
    elif attendance < 75:
        actions.append("Monitor attendance daily and contact student")
    elif low_marks:
        actions.append("Assign remedial practice / revision sessions")
    else:
        actions.append("Continue regular monitoring")

    reasons = list(dict.fromkeys(reasons))
    actions = list(dict.fromkeys(actions))

    return {
        "risk": risk,
        "level": risk,
        "risk_score": risk_score,
        "risk_breakdown": risk_breakdown,
        # Keep legacy key for backward compatibility where older code expects `score`.
        "score": risk_score,
        "reasons": reasons,
        "actions": actions,
    }

def predict_future_risk(students, thresholds):
    future_risk_students = 0
    att_thresh = thresholds.get("attendance", 75)
    marks_thresh = thresholds.get("marks", 15)
    
    for s in students:
        att = s.get("attendance", 0)
        marks = s.get("marks", 0)
        
        # within 5-10% of threshold
        att_close = (att >= att_thresh) and (att <= att_thresh + 5)
        marks_close = (marks >= marks_thresh) and (marks <= marks_thresh + 2)
        
        if att_close or marks_close:
            future_risk_students += 1
            
    return future_risk_students
