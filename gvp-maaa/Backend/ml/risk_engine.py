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

    # Attendance contribution (strong)
    if attendance < 75:
        score += (75 - attendance) * 3

    # Marks contribution (max 40)
    if mid1 is not None and mid1 < 15:
        score += (15 - mid1) * 2

    if mid2 is not None and mid2 < 15:
        score += (15 - mid2) * 2

    # Trend penalty (max 10)
    if mid1 is not None and mid2 is not None and mid2 < mid1:
        score += 10

    # Force minimum risk score for critical conditions
    if attendance < 75:
        score = max(score, 40)

    if (mid1 is not None and mid1 < 15) or (mid2 is not None and mid2 < 15):
        score = max(score, 40)

    # Never return NaN; clamp into 0..100
    if score != score:  # NaN check
        score = 0.0
    return min(round(score, 1), 100)


def calculate_risk(student, thresholds):
    """Returns label + numeric score + explainable reasons/actions."""
    risk_score = calculate_risk_score(student)

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
