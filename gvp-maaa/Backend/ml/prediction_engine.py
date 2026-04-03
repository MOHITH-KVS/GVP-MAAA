def forecast_attendance(attendance_values, labels=None):
    # Validate input
    if not attendance_values:
        return []

    # Slope-based prediction using the last 2 actual points.
    # This avoids the "predicted == actual" issue and keeps predictions decision-useful.
    last = float(attendance_values[-1])
    prev = float(attendance_values[-2]) if len(attendance_values) > 1 else last
    slope = last - prev

    predicted = []
    current = last

    for _ in range(3):
        next_val = current + slope
        next_val = max(0, min(100, next_val))
        next_val = round(next_val, 2)
        predicted.append(next_val)
        current = next_val

    trend_data = []

    # Actual points
    for i, val in enumerate(attendance_values):
        trend_data.append({
            "label": (labels[i] if isinstance(labels, list) and i < len(labels) else f"Day {i + 1}"),
            "actual": val,
            "predicted": None
        })

    # Predicted future points
    for i, val in enumerate(predicted):
        trend_data.append({
            "label": "Next " + str(i + 1),
            "actual": None,
            "predicted": val
        })

    return trend_data

def forecast_performance(students):
    if not students:
        return 0.0
        
    marks = [s.get("marks", 0) for s in students if isinstance(s.get("marks"), (int, float))]
    if not marks:
        return 0.0
        
    avg_marks = sum(marks) / len(marks)
    
    # Mild smoothing assumption (projection factor ~0.95 or just keeping stable)
    pred_marks = avg_marks * 0.98   # Conservative stabilization factor
    
    return max(0.0, float(pred_marks))
