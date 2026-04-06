from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from models import Attendance, Mark, Student


def _safe_float(value: Any) -> Optional[float]:
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def _normalize_exam(exam_name: Optional[str]) -> str:
    if not exam_name:
        return ""
    return str(exam_name).strip().lower().replace("-", "").replace(" ", "")


def _attendance_percentage(db: Session, student_id: int) -> Optional[float]:
    rows = db.query(Attendance.status).filter(Attendance.student_id == student_id).all()
    total = len(rows)
    if total == 0:
        return None
    present = sum(1 for row in rows if bool(row.status))
    return round((present / total) * 100, 2)


def _mark_rows(db: Session, student_id: int):
    return (
        db.query(Mark)
        .filter(Mark.student_id == student_id)
        .order_by(Mark.created_at.asc())
        .all()
    )


def has_valid_marks(student: Student, db: Optional[Session] = None) -> bool:
    # Primary interpretation from the requirement.
    mid1_attr = _safe_float(getattr(student, "mid1", None))
    mid2_attr = _safe_float(getattr(student, "mid2", None))
    assignments_count_attr = getattr(student, "assignments_count", 0)

    if mid1_attr is not None or mid2_attr is not None:
        return True

    try:
        if int(assignments_count_attr or 0) > 0:
            return True
    except Exception:
        pass

    # Fallback to real academic rows when model attributes are not present.
    if db is None:
        return False

    rows = _mark_rows(db, student.student_id)
    if not rows:
        return False

    for row in rows:
        marks_val = _safe_float(getattr(row, "marks", None))
        if marks_val is not None and marks_val > 0:
            return True

        exam_key = _normalize_exam(getattr(row, "exam", None))
        if exam_key.startswith("assignment"):
            return True

        m1 = _safe_float(getattr(row, "mid1", None))
        m2 = _safe_float(getattr(row, "mid2", None))
        if (m1 is not None and m1 > 0) or (m2 is not None and m2 > 0):
            return True

    return False


def has_valid_cgpa(student: Student) -> bool:
    cgpa_val = _safe_float(student.cgpa)
    return bool(cgpa_val is not None and cgpa_val > 0)


def _marks_summary(db: Session, student_id: int) -> Dict[str, Optional[float]]:
    rows = _mark_rows(db, student_id)

    mid1_vals: List[float] = []
    mid2_vals: List[float] = []
    assignment_vals: List[float] = []

    for row in rows:
        marks_val = _safe_float(row.marks)
        exam_key = _normalize_exam(row.exam)

        if exam_key in {"mid1", "mid01"} and marks_val is not None:
            mid1_vals.append(marks_val)
        elif exam_key in {"mid2", "mid02"} and marks_val is not None:
            mid2_vals.append(marks_val)
        elif exam_key.startswith("assignment") and marks_val is not None:
            assignment_vals.append(marks_val)

    if not mid1_vals:
        for row in rows:
            m1 = _safe_float(getattr(row, "mid1", None))
            if m1 is not None and m1 > 0:
                mid1_vals.append(m1)

    if not mid2_vals:
        for row in rows:
            m2 = _safe_float(getattr(row, "mid2", None))
            if m2 is not None and m2 > 0:
                mid2_vals.append(m2)

    mid1 = round(sum(mid1_vals) / len(mid1_vals), 2) if mid1_vals else None
    mid2 = round(sum(mid2_vals) / len(mid2_vals), 2) if mid2_vals else None
    assignment_avg = round(sum(assignment_vals) / len(assignment_vals), 2) if assignment_vals else None

    return {
        "mid1": mid1,
        "mid2": mid2,
        "assignment": assignment_avg,
    }


def _computed_cgpa_from_marks(mid1: Optional[float], mid2: Optional[float], assignment: Optional[float]) -> Optional[float]:
    # Requirement: never force 0 CGPA when marks are missing.
    if mid1 is None and mid2 is None and assignment is None:
        return None

    values = [v for v in [mid1, mid2, assignment] if v is not None]
    if not values:
        return None

    # Lightweight normalized estimate (bounded to 10), from available internal performance.
    avg_score = sum(values) / len(values)
    # Mid and assignment values in this project are mostly on a 0-30/0-25 style scale.
    normalized = min(10.0, max(0.0, (avg_score / 25.0) * 10.0))
    return round(normalized, 2)


def get_student_risk(
    student_id: int,
    db: Session,
    attendance_threshold: float = 75.0,
    mid_threshold: float = 15.0,
    cgpa_threshold: float = 6.5,
) -> Dict[str, Any]:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return {
            "attendance_status": "NO_DATA",
            "marks_status": "NO_DATA",
            "cgpa_status": "NO_DATA",
            "overall_risk": "NO_DATA",
            "reasons": [],
            "actions": [],
            "has_valid_data": False,
            "attendance_percentage": None,
            "mid1": None,
            "mid2": None,
            "assignment": None,
            "cgpa": None,
            "computed_cgpa": None,
        }

    attendance_pct = _attendance_percentage(db, student_id)
    mark_summary = _marks_summary(db, student_id)
    mid1 = mark_summary["mid1"]
    mid2 = mark_summary["mid2"]
    assignment = mark_summary["assignment"]

    valid_marks = has_valid_marks(student, db)
    valid_cgpa = has_valid_cgpa(student)

    # Stored CGPA is only treated as valid when > 0.
    cgpa = round(float(student.cgpa), 2) if valid_cgpa else None

    # Requirement: if no valid marks, computed CGPA must be None.
    computed_cgpa = None
    if valid_marks:
        computed_cgpa = _computed_cgpa_from_marks(mid1, mid2, assignment)

    reasons: List[str] = []
    actions: List[str] = []

    has_attendance_data = attendance_pct is not None
    has_valid_data = bool(has_attendance_data or valid_marks or valid_cgpa)

    if not has_valid_data:
        return {
            "attendance_status": "NO_DATA",
            "marks_status": "NO_DATA",
            "cgpa_status": "NO_DATA",
            "overall_risk": "NO_DATA",
            "reasons": [],
            "actions": [],
            "has_valid_data": False,
            "attendance_percentage": None,
            "mid1": None,
            "mid2": None,
            "assignment": None,
            "cgpa": None,
            "computed_cgpa": None,
        }

    if has_attendance_data and attendance_pct < attendance_threshold:
        attendance_status = "LOW"
        reasons.append(f"Attendance is {attendance_pct}% (below {attendance_threshold}%)")
        actions.append("Attend all classes this week")
    elif has_attendance_data:
        attendance_status = "SAFE"
    else:
        attendance_status = "NO_DATA"

    marks_low = False
    if valid_marks:
        low_m1 = mid1 is not None and mid1 < mid_threshold
        low_m2 = mid2 is not None and mid2 < mid_threshold
        marks_low = low_m1 or low_m2

    if valid_marks and marks_low:
        marks_status = "LOW"
        reasons.append("Mid marks are below the safe threshold")
        actions.append("Prepare for next internal exam")
    elif valid_marks:
        marks_status = "SAFE"
    else:
        marks_status = "NO_DATA"

    if valid_cgpa and cgpa is not None and cgpa < cgpa_threshold:
        cgpa_status = "LOW"
        reasons.append(f"CGPA is {cgpa} (below {cgpa_threshold})")
        actions.append("Meet mentor and improve weak subjects")
    elif valid_cgpa:
        cgpa_status = "SAFE"
    else:
        cgpa_status = "NO_DATA"

    if attendance_status == "LOW" and (marks_status == "LOW" or cgpa_status == "LOW"):
        overall_risk = "HIGH"
    elif attendance_status == "LOW" or marks_status == "LOW" or cgpa_status == "LOW":
        overall_risk = "MEDIUM"
    else:
        overall_risk = "LOW"

    # Keep output deterministic and deduplicated for all dashboards.
    actions = list(dict.fromkeys(actions))

    return {
        "attendance_status": attendance_status,
        "marks_status": marks_status,
        "cgpa_status": cgpa_status,
        "overall_risk": overall_risk,
        "reasons": reasons,
        "actions": actions,
        "has_valid_data": has_valid_data,
        "attendance_percentage": attendance_pct,
        "mid1": mid1,
        "mid2": mid2,
        "assignment": assignment,
        "cgpa": cgpa,
        "computed_cgpa": computed_cgpa,
    }
