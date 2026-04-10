from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List

from sqlalchemy import String, case, cast, func, or_
from sqlalchemy.orm import Session

from models import Alert, Attendance, Mark, Student, Subject, User


ATTENDANCE_THRESHOLD = 75.0
CGPA_THRESHOLD = 6.5

DEPARTMENT_LABELS = {
    11: "CSE",
    12: "CSM",
    14: "ECE",
    15: "MECH",
    1: "CIVIL",
}


def _normalize_department_filter(department: str | None) -> str | None:
    normalized = str(department or "").strip().upper()
    if not normalized or normalized == "ALL":
        return None
    return normalized


def _department_name_expr():
    return case(
        *((User.department_id == dept_id, dept_name) for dept_id, dept_name in DEPARTMENT_LABELS.items()),
        else_=cast(User.department_id, String),
    )


def _attendance_percentage_subquery(db: Session, start_dt: datetime | None = None, end_dt: datetime | None = None):
    query = db.query(
        Attendance.student_id.label("student_id"),
        (
            func.sum(case((Attendance.status.is_(True), 1), else_=0))
            * 100.0
            / func.nullif(func.count(Attendance.attendance_id), 0)
        ).label("attendance_pct"),
    )

    if start_dt is not None:
        query = query.filter(Attendance.attendance_date >= start_dt.date())
    if end_dt is not None:
        query = query.filter(Attendance.attendance_date < end_dt.date())

    return query.group_by(Attendance.student_id).subquery()


def _risk_base_subquery(
    db: Session,
    start_dt: datetime | None = None,
    end_dt: datetime | None = None,
    department: str | None = None,
):
    attendance_sq = _attendance_percentage_subquery(db, start_dt, end_dt)
    department_label_expr = _department_name_expr()

    query = (
        db.query(
            Student.student_id.label("student_id"),
            func.coalesce(department_label_expr, "UNKNOWN").label("department"),
            func.coalesce(attendance_sq.c.attendance_pct, 100.0).label("attendance_pct"),
            func.coalesce(Student.cgpa, 0.0).label("cgpa"),
        )
        .outerjoin(attendance_sq, attendance_sq.c.student_id == Student.student_id)
        .outerjoin(User, User.user_id == Student.student_id)
    )

    normalized_department = _normalize_department_filter(department)
    if normalized_department:
        query = query.filter(
            func.upper(func.coalesce(cast(department_label_expr, String), "")) == normalized_department
        )

    return query.subquery()


def _weekly_alert_count(db: Session, start_dt: datetime, end_dt: datetime) -> int:
    return int(
        db.query(func.count(Alert.id))
        .filter(Alert.created_at >= start_dt, Alert.created_at < end_dt)
        .scalar()
        or 0
    )


def get_admin_departments(db: Session) -> List[Dict[str, str]]:
    department_label_expr = _department_name_expr()

    rows = (
        db.query(func.upper(func.coalesce(cast(department_label_expr, String), "UNKNOWN")).label("name"))
        .join(Student, Student.student_id == User.user_id)
        .distinct()
        .order_by(func.upper(func.coalesce(cast(department_label_expr, String), "UNKNOWN")).asc())
        .all()
    )

    names = [str(row.name).strip().upper() for row in rows if row.name]
    return [{"name": name} for name in names]


def get_admin_overview_payload(db: Session, department: str | None = None) -> Dict[str, Any]:
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    current_sq = _risk_base_subquery(db, week_start, now, department=department)
    prev_sq = _risk_base_subquery(db, prev_week_start, week_start, department=department)

    current_risk_condition = or_(current_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, current_sq.c.cgpa < CGPA_THRESHOLD)
    prev_risk_condition = or_(prev_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, prev_sq.c.cgpa < CGPA_THRESHOLD)

    current_metrics = (
        db.query(
            func.sum(case((current_risk_condition, 1), else_=0)).label("high_risk_students"),
            func.sum(case((current_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, 1), else_=0)).label("critical_attendance"),
            func.count(func.distinct(case((current_risk_condition, current_sq.c.department), else_=None))).label("departments_at_risk"),
            func.avg(current_sq.c.attendance_pct).label("avg_attendance"),
        )
        .select_from(current_sq)
        .one()
    )

    previous_metrics = (
        db.query(
            func.sum(case((prev_risk_condition, 1), else_=0)).label("high_risk_students"),
            func.avg(prev_sq.c.attendance_pct).label("avg_attendance"),
        )
        .select_from(prev_sq)
        .one()
    )

    current_risk = int(current_metrics.high_risk_students or 0)
    previous_risk = int(previous_metrics.high_risk_students or 0)

    current_attendance = float(current_metrics.avg_attendance or 0.0)
    previous_attendance = float(previous_metrics.avg_attendance or 0.0)

    current_alerts = _weekly_alert_count(db, week_start, now)

    return {
        "high_risk_students": current_risk,
        "departments_at_risk": int(current_metrics.departments_at_risk or 0),
        "critical_attendance": int(current_metrics.critical_attendance or 0),
        "active_alerts": current_alerts,
        "trend": {
            "risk": "up" if current_risk > previous_risk else "down",
            "attendance": "up" if current_attendance > previous_attendance else "down",
        },
    }


def get_recent_admin_alerts(db: Session, limit: int = 10, department: str | None = None) -> List[Dict[str, Any]]:
    severity_case = case(
        (func.lower(Alert.type).in_(["emergency", "critical"]), "high"),
        (func.lower(Alert.type).in_(["warning", "urgent"]), "medium"),
        else_="low",
    )

    department_label_expr = _department_name_expr()

    query = (
        db.query(
            Alert.id,
            Alert.message,
            severity_case.label("severity"),
            Alert.created_at,
        )
        .outerjoin(Student, Student.student_id == Alert.student_id)
        .outerjoin(User, User.user_id == Student.student_id)
    )

    normalized_department = _normalize_department_filter(department)
    if normalized_department:
        query = query.filter(
            or_(
                func.upper(func.coalesce(Alert.department, "")) == normalized_department,
                func.upper(func.coalesce(cast(department_label_expr, String), "")) == normalized_department,
            )
        )

    rows = query.order_by(Alert.created_at.desc()).limit(limit).all()

    return [
        {
            "id": row.id,
            "message": row.message,
            "severity": row.severity,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


def get_admin_risk_summary(db: Session, department: str | None = None) -> Dict[str, Any]:
    normalized_department = _normalize_department_filter(department)
    risk_sq = _risk_base_subquery(db, department=normalized_department)
    risk_condition = or_(risk_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, risk_sq.c.cgpa < CGPA_THRESHOLD)

    total_at_risk_students = int(
        db.query(func.sum(case((risk_condition, 1), else_=0))).select_from(risk_sq).scalar() or 0
    )

    department_rows = (
        db.query(
            risk_sq.c.department,
            func.sum(case((risk_condition, 1), else_=0)).label("at_risk_students"),
        )
        .select_from(risk_sq)
        .group_by(risk_sq.c.department)
        .having(func.sum(case((risk_condition, 1), else_=0)) > 0)
        .order_by(func.sum(case((risk_condition, 1), else_=0)).desc())
        .all()
    )

    department_wise_risk = [
        {
            "department": row.department,
            "at_risk_students": int(row.at_risk_students or 0),
        }
        for row in department_rows
    ]

    failure_expr = case((func.coalesce(Mark.total, Mark.marks, 0) < 40, 1), else_=0)
    subject_query = (
        db.query(
            Mark.subject_id,
            func.coalesce(Subject.subject_name, "Unknown Subject").label("subject_name"),
            func.sum(failure_expr).label("failure_count"),
            func.count(Mark.id).label("records"),
        )
        .outerjoin(Subject, Subject.subject_id == Mark.subject_id)
        .outerjoin(Student, Student.student_id == Mark.student_id)
        .outerjoin(User, User.user_id == Student.student_id)
    )

    if normalized_department:
        subject_department_expr = _department_name_expr()
        subject_query = subject_query.filter(
            func.upper(func.coalesce(cast(subject_department_expr, String), "")) == normalized_department
        )

    subject_rows = (
        subject_query
        .group_by(Mark.subject_id, Subject.subject_name)
        .having(func.sum(failure_expr) > 0)
        .order_by(func.sum(failure_expr).desc())
        .limit(5)
        .all()
    )

    subject_wise_failure = [
        {
            "subject_id": int(row.subject_id) if row.subject_id is not None else None,
            "subject_name": row.subject_name,
            "failure_count": int(row.failure_count or 0),
            "records": int(row.records or 0),
        }
        for row in subject_rows
    ]

    return {
        "total_at_risk_students": total_at_risk_students,
        "department_wise_risk": department_wise_risk,
        "top_departments": department_wise_risk[:3],
        "subject_wise_failure": subject_wise_failure,
    }


def build_admin_insights(db: Session, limit: int = 5, department: str | None = None) -> List[Dict[str, Any]]:
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)
    prev_week_start = now - timedelta(days=14)

    overall_sq = _risk_base_subquery(db, department=department)
    current_sq = _risk_base_subquery(db, week_start, now, department=department)
    prev_sq = _risk_base_subquery(db, prev_week_start, week_start, department=department)

    overall_risk_condition = or_(overall_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, overall_sq.c.cgpa < CGPA_THRESHOLD)
    current_risk_condition = or_(current_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, current_sq.c.cgpa < CGPA_THRESHOLD)
    prev_risk_condition = or_(prev_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, prev_sq.c.cgpa < CGPA_THRESHOLD)

    total_students = int(db.query(func.count(Student.student_id)).scalar() or 0)

    attendance_low_count = int(
        db.query(func.sum(case((overall_sq.c.attendance_pct < ATTENDANCE_THRESHOLD, 1), else_=0)))
        .select_from(overall_sq)
        .scalar()
        or 0
    )
    cgpa_low_count = int(
        db.query(func.sum(case((overall_sq.c.cgpa < CGPA_THRESHOLD, 1), else_=0))).select_from(overall_sq).scalar() or 0
    )

    current_risk = int(
        db.query(func.sum(case((current_risk_condition, 1), else_=0))).select_from(current_sq).scalar() or 0
    )
    last_week_risk = int(
        db.query(func.sum(case((prev_risk_condition, 1), else_=0))).select_from(prev_sq).scalar() or 0
    )

    current_alerts = _weekly_alert_count(db, week_start, now)
    last_week_alerts = _weekly_alert_count(db, prev_week_start, week_start)

    dept_cluster = (
        db.query(
            overall_sq.c.department,
            func.sum(case((overall_risk_condition, 1), else_=0)).label("at_risk_students"),
        )
        .select_from(overall_sq)
        .group_by(overall_sq.c.department)
        .order_by(func.sum(case((overall_risk_condition, 1), else_=0)).desc())
        .first()
    )

    insights: List[Dict[str, Any]] = []

    risk_delta = current_risk - last_week_risk
    future_risk = current_risk + risk_delta
    if risk_delta > 0:
        insights.append(
            {
                "type": "prediction",
                "message": f"{risk_delta} more students may become at-risk",
                "confidence": "high" if risk_delta >= 10 else "medium",
                "action": "assign_mentoring",
            }
        )
    else:
        insights.append(
            {
                "type": "prediction",
                "message": f"At-risk students projected around {max(future_risk, 0)} for next week",
                "confidence": "medium",
                "action": "monitor_closely",
            }
        )

    if total_students > 0 and (attendance_low_count / total_students) > 0.30:
        insights.append(
            {
                "type": "cause",
                "message": "Low attendance is major institutional risk",
                "confidence": "high",
                "action": "assign_mentoring",
            }
        )

    if total_students > 0 and (cgpa_low_count / total_students) > 0.25:
        insights.append(
            {
                "type": "cause",
                "message": "Academic performance decline detected",
                "confidence": "medium",
                "action": "send_alerts",
            }
        )

    if current_risk > last_week_risk:
        insights.append(
            {
                "type": "trend",
                "message": "Risk trend increasing",
                "confidence": "high",
                "action": "send_alerts",
            }
        )

    if dept_cluster and int(dept_cluster.at_risk_students or 0) > 0:
        insights.append(
            {
                "type": "cluster",
                "message": f"Department-level risk cluster detected in {dept_cluster.department}",
                "confidence": "medium",
                "action": "assign_mentoring",
            }
        )

    if current_alerts > last_week_alerts:
        insights.append(
            {
                "type": "alerts",
                "message": "Spike in alerts detected",
                "confidence": "medium",
                "action": "send_alerts",
            }
        )

    return insights[:limit]


def run_admin_action(db: Session, action_type: str, actor_user_id: int) -> Dict[str, Any]:
    if action_type == "assign_mentoring":
        summary = get_admin_risk_summary(db)
        return {
            "message": "Mentoring workflow triggered",
            "target_students": summary["total_at_risk_students"],
            "status": "queued",
        }

    if action_type == "send_alerts":
        summary = get_admin_risk_summary(db)
        alert = Alert(
            title="Administrative Risk Alert",
            message=f"Campus-wide risk monitoring update: {summary['total_at_risk_students']} at-risk students need attention.",
            type="warning",
            target_role="student",
            target_type="all",
            created_at=datetime.utcnow(),
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)
        return {
            "message": "Administrative alert broadcast created",
            "alert_id": alert.id,
            "status": "sent",
        }

    return {
        "message": "Unknown action",
        "status": "ignored",
    }
