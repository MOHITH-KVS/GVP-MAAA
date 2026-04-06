from __future__ import annotations

from typing import Dict, List

from sqlalchemy.orm import Session

from services.risk_engine import get_student_risk


NO_DATA_MESSAGE = "No performance data available yet. Insights will appear once data is updated."


def generate_student_alerts(
    student_id: int,
    db: Session,
    attendance_threshold: float = 75.0,
    mid_threshold: float = 15.0,
    cgpa_threshold: float = 6.5,
) -> List[Dict[str, str]]:
    risk = get_student_risk(
        student_id=student_id,
        db=db,
        attendance_threshold=attendance_threshold,
        mid_threshold=mid_threshold,
        cgpa_threshold=cgpa_threshold,
    )

    # Final rule: no valid data -> no alerts.
    if not risk.get("has_valid_data"):
        return []

    alerts: List[Dict[str, str]] = []

    # Attendance alert: only when attendance data exists.
    attendance_pct = risk.get("attendance_percentage")
    if attendance_pct is not None and float(attendance_pct) < float(attendance_threshold):
        alerts.append(
            {
                "type": "attendance-monitor",
                "title": "⚠ Attendance Alert",
                "message": f"Your attendance is {float(attendance_pct):.2f}%. Minimum required is {float(attendance_threshold):.0f}%.",
            }
        )

    # Marks alert: only when marks data exists.
    mid1 = risk.get("mid1")
    mid2 = risk.get("mid2")
    has_marks = risk.get("marks_status") != "NO_DATA"
    if has_marks:
        low_mid1 = isinstance(mid1, (int, float)) and float(mid1) < float(mid_threshold)
        low_mid2 = isinstance(mid2, (int, float)) and float(mid2) < float(mid_threshold)
        if low_mid1 or low_mid2:
            alerts.append(
                {
                    "type": "marks-monitor",
                    "title": "⚠ Marks Alert",
                    "message": f"Your internal marks are below {float(mid_threshold):.0f}. Please prepare for the next internal exam.",
                }
            )

    # CGPA alert: only when valid CGPA exists.
    cgpa_val = risk.get("cgpa")
    if isinstance(cgpa_val, (int, float)) and float(cgpa_val) < float(cgpa_threshold):
        alerts.append(
            {
                "type": "cgpa-monitor",
                "title": "⚠ CGPA Alert",
                "message": f"Your CGPA is {float(cgpa_val):.2f}. Minimum required is {float(cgpa_threshold):.1f}.",
            }
        )

    return alerts
