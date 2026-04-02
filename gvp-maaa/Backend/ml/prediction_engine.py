def forecast_attendance(trend):
    if not trend or len(trend) < 2:
        return 0.0
    
    recent_vals = [t.get("percentage", 0) for t in trend[-3:]]
    if len(recent_vals) < 2:
        return 0.0
        
    diffs = [recent_vals[i] - recent_vals[i-1] for i in range(1, len(recent_vals))]
    avg_diff = sum(diffs) / len(diffs)
    
    pred = recent_vals[-1] + avg_diff
    return max(0.0, min(100.0, float(pred)))

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
