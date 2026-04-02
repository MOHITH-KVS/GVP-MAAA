def calculate_risk(student, thresholds):
    risk_score = 0
    attendance = student.get("attendance", 0)
    marks = student.get("marks", 0)
    assignments = student.get("assignments", 0)

    if attendance < thresholds.get("attendance", 75):
        risk_score += 1
    if marks < thresholds.get("marks", 15):
        risk_score += 1
    if assignments < thresholds.get("assignment", 1):
        risk_score += 1

    reasons = []
    if attendance < thresholds.get("attendance", 75):
        reasons.append("Low attendance")
    if marks < thresholds.get("marks", 15):
        reasons.append("Low marks")
    if assignments < thresholds.get("assignment", 1):
        reasons.append("Missing assignments")

    level = "LOW"
    if risk_score == 1:
        level = "MEDIUM"
    elif risk_score >= 2:
        level = "HIGH"

    return {
        "score": risk_score,
        "level": level,
        "reasons": reasons
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
