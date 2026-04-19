from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Query as SAQuery, Session

from auth import get_current_user
from database import SessionLocal, get_db
from models import User, UserActivityLog

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

ALLOWED_ROLES = {"student", "teacher", "admin"}
ANALYTICS_ROLES = {"student", "teacher"}
ALLOWED_ACTIONS = {"visit", "click", "submit", "login"}
ALLOWED_RANGES = {"today", "week", "month"}

DEPARTMENT_FALLBACK_MAP = {
    1: "CSE",
    2: "ECE",
    3: "EEE",
    4: "MECH",
    5: "CIVIL",
    6: "CSM",
}


class AnalyticsTrackRequest(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = Field(default=None, max_length=20)
    department: Optional[str] = Field(default=None, max_length=50)
    year: Optional[int] = None
    section: Optional[str] = Field(default=None, max_length=20)
    page: str = Field(..., min_length=1, max_length=200)
    action: str = Field(default="visit", max_length=20)
    session_id: str = Field(..., min_length=8, max_length=120)


def ensure_user_analytics_table() -> None:
    """Backward-compatible startup hook name used by main.py."""
    ensure_user_activity_logs_table()


def ensure_user_activity_logs_table() -> None:
    db = SessionLocal()
    try:
        db.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_activity_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INT,
                    role VARCHAR(20) NOT NULL,
                    department VARCHAR(50),
                    year INT,
                    section VARCHAR(20),
                    page VARCHAR(200) NOT NULL,
                    action VARCHAR(20) NOT NULL,
                    session_id VARCHAR(120) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL
                );
                """
            )
        )
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_role ON user_activity_logs(role);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_department ON user_activity_logs(department);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_year ON user_activity_logs(year);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_section ON user_activity_logs(section);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_page ON user_activity_logs(page);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_session_id ON user_activity_logs(session_id);"))
        db.execute(text("CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);"))
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _normalize_role(value: Optional[str]) -> Optional[str]:
    role = str(value or "").strip().lower()
    if role == "faculty":
        return "teacher"
    return role or None


def _normalize_department(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def _load_department_lookup(db: Session) -> dict[int, str]:
    mapping: dict[int, str] = dict(DEPARTMENT_FALLBACK_MAP)

    try:
        columns = {
            str(row.column_name).lower()
            for row in db.execute(
                text(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'departments'
                    """
                )
            ).fetchall()
        }
    except Exception:
        db.rollback()
        return mapping

    id_column = "id" if "id" in columns else "department_id" if "department_id" in columns else None
    name_column = (
        "name"
        if "name" in columns
        else "department"
        if "department" in columns
        else "dept_name"
        if "dept_name" in columns
        else "branch"
        if "branch" in columns
        else None
    )

    if not id_column or not name_column:
        return mapping

    try:
        rows = db.execute(
            text(
                f"""
                SELECT {id_column} AS dept_id, {name_column} AS dept_name
                FROM departments
                WHERE {name_column} IS NOT NULL AND BTRIM({name_column}::TEXT) <> ''
                """
            )
        ).fetchall()
        for row in rows:
            try:
                dept_id = int(row.dept_id)
            except Exception:
                continue
            dept_name = str(row.dept_name).strip().upper()
            if dept_name:
                mapping[dept_id] = dept_name
    except Exception:
        db.rollback()

    return mapping


def _resolve_department_name(
    db: Session,
    department_value: Optional[str],
    user_id: Optional[int] = None,
    department_lookup: Optional[dict[int, str]] = None,
) -> Optional[str]:
    normalized = _normalize_department(department_value)
    lookup = department_lookup or _load_department_lookup(db)

    if not normalized:
        if user_id is not None:
            user_department_id = (
                db.query(User.department_id)
                .filter(User.user_id == user_id)
                .scalar()
            )
            try:
                if user_department_id is not None:
                    return lookup.get(int(user_department_id), None)
            except Exception:
                return None
        return None

    if normalized.isdigit():
        try:
            return lookup.get(int(normalized), None)
        except Exception:
            return None

    return normalized.upper()


def _normalize_year(value: Optional[int]) -> Optional[int]:
    if value is None:
        return None
    try:
        year = int(value)
        return year if year > 0 else None
    except Exception:
        return None


def _normalize_section(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    text_value = str(value).strip().upper()
    return text_value or None


def _to_role_filter(role: str) -> Optional[str]:
    normalized = _normalize_role(role)
    if normalized in {None, "all"}:
        return None
    if normalized not in ANALYTICS_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role filter. Use all, student, or teacher.")
    return normalized


def _to_range_window(range_value: str) -> tuple[str, datetime, datetime, datetime]:
    normalized = str(range_value or "week").strip().lower()
    if normalized not in ALLOWED_RANGES:
        raise HTTPException(status_code=400, detail="Invalid range filter. Use today, week, or month.")

    now = datetime.utcnow()
    duration_map = {
        "today": timedelta(days=1),
        "week": timedelta(days=7),
        "month": timedelta(days=30),
    }
    current_duration = duration_map[normalized]
    current_start = now - current_duration
    previous_start = current_start - current_duration
    return normalized, now, current_start, previous_start


def _assert_admin(current_user: dict) -> None:
    if _normalize_role(current_user.get("role")) != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _apply_global_filters(
    query: SAQuery,
    role: Optional[str],
    department: Optional[str],
    year: Optional[int],
    section: Optional[str],
    start_time: Optional[datetime] = None,
) -> SAQuery:
    if role:
        query = query.filter(UserActivityLog.role == role)
    else:
        query = query.filter(UserActivityLog.role.in_(tuple(ANALYTICS_ROLES)))
    if department:
        query = query.filter(UserActivityLog.department == department)
    if year is not None:
        query = query.filter(UserActivityLog.year == year)
    if section:
        query = query.filter(UserActivityLog.section == section)
    if start_time is not None:
        query = query.filter(UserActivityLog.created_at >= start_time)
    return query


def _prettify_page(page: str) -> str:
    path = str(page or "").strip().strip("/")
    if not path:
        return "Home"
    segments = [segment for segment in path.split("/") if segment]
    if segments and segments[0] in {"student", "teacher", "admin", "faculty"}:
        segments = segments[1:] or ["overview"]
    return " / ".join(item.replace("-", " ").title() for item in segments)


def _feature_from_page(page: str) -> str:
    path = str(page or "").strip().strip("/")
    if not path:
        return "Overview"
    segments = [segment for segment in path.split("/") if segment]
    if segments and segments[0] in {"student", "teacher", "admin", "faculty"}:
        if len(segments) > 1:
            return segments[1].replace("-", " ").title()
        return "Overview"
    return segments[0].replace("-", " ").title()


def _group_label(year: Optional[int], section: Optional[str]) -> str:
    if year is None or not section:
        return "Unknown"
    return f"Year {year} - {section}"


def _build_ai_summary(
    total_users: int,
    top_page: Optional[str],
    student_share: float,
    teacher_share: float,
    top_feature: Optional[str],
    top_feature_percent: float,
) -> str:
    if total_users == 0:
        return "Not enough data yet."

    if student_share > teacher_share:
        role_line = "Students are more active than teachers."
    elif teacher_share > student_share:
        role_line = "Teachers are more active than students."
    else:
        role_line = "Students and teachers show similar activity."

    if top_page and top_feature:
        if "ai assistant" in str(top_feature).strip().lower() and top_feature_percent < 12:
            return f"{role_line} {_prettify_page(top_page)} and {top_feature} are frequently used. AI Assistant usage is still low."
        return f"{role_line} {_prettify_page(top_page)} and {top_feature} are the most used areas."
    if top_page:
        return f"{role_line} {_prettify_page(top_page)} is the most used page."
    return f"{role_line} Not enough feature-level data yet."


@router.post("/track")
def track_analytics(
    payload: AnalyticsTrackRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    print("Analytics event received:", payload.dict())

    incoming_role = _normalize_role(payload.role)
    token_role = _normalize_role(current_user.get("role"))

    role = incoming_role or token_role
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Only student/teacher/admin tracking is supported")

    action = str(payload.action or "visit").strip().lower()
    if action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=400, detail="Action must be one of: visit, click, submit, login")

    try:
        token_user_id = int(current_user.get("user_id")) if current_user.get("user_id") is not None else None
    except Exception:
        token_user_id = None

    resolved_user_id = token_user_id or payload.user_id
    resolved_page = str(payload.page or "").strip()
    resolved_session_id = str(payload.session_id or "").strip()

    if resolved_user_id is None:
        raise HTTPException(status_code=400, detail="Missing required field: user_id")
    if not role:
        raise HTTPException(status_code=400, detail="Missing required field: role")
    if not resolved_page:
        raise HTTPException(status_code=400, detail="Missing required field: page")
    if not action:
        raise HTTPException(status_code=400, detail="Missing required field: action")
    if not resolved_session_id:
        raise HTTPException(status_code=400, detail="Missing required field: session_id")

    department_lookup = _load_department_lookup(db)
    resolved_department = _resolve_department_name(
        db,
        payload.department or current_user.get("department") or current_user.get("department_id"),
        user_id=resolved_user_id,
        department_lookup=department_lookup,
    )
    if role in ANALYTICS_ROLES and not resolved_department:
        resolved_department = "UNKNOWN"

    log = UserActivityLog(
        user_id=resolved_user_id,
        role=role,
        department=resolved_department,
        year=_normalize_year(payload.year),
        section=_normalize_section(payload.section),
        page=resolved_page,
        action=action,
        session_id=resolved_session_id,
    )

    db.add(log)
    db.commit()

    return {"success": True}


@router.get("/dashboard")
def analytics_dashboard(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_admin(current_user)

    role_filter = _to_role_filter(role)
    range_key, now, current_start, previous_start = _to_range_window(range)
    department_filter = _normalize_department(department)
    year_filter = _normalize_year(year)
    section_filter = _normalize_section(section)

    base = _apply_global_filters(
        db.query(UserActivityLog),
        role_filter,
        department_filter,
        year_filter,
        section_filter,
        current_start,
    )

    total_events = base.with_entities(func.count(UserActivityLog.id)).scalar() or 0
    if total_events == 0:
        return {
            "has_data": False,
            "ai_summary": "Not enough data yet. Insights will appear as users interact.",
            "empty_message": "No data yet. Start using the platform to generate insights.",
            "overview": {
                "total_users": 0,
                "total_sessions": 0,
                "active_users_24h": 0,
                "avg_session_time_ms": 0,
            },
            "page_usage": {
                "top_pages": [],
                "least_used_pages": [],
            },
            "engagement": {
                "avg_time_per_page": [],
                "feature_usage": [],
            },
            "insights": {
                "most_active_department": None,
                "most_active_class": None,
                "least_active_group": None,
                "drop_off": None,
            },
        }

    total_users = base.with_entities(func.count(func.distinct(UserActivityLog.user_id))).scalar() or 0
    total_sessions = base.with_entities(func.count(func.distinct(UserActivityLog.session_id))).scalar() or 0

    active_window = now - timedelta(hours=24)
    active_users_24h = (
        base.filter(UserActivityLog.created_at >= active_window)
        .with_entities(func.count(func.distinct(UserActivityLog.user_id)))
        .scalar()
        or 0
    )

    session_duration_rows = (
        base.with_entities(
            UserActivityLog.session_id.label("session_id"),
            (func.extract("epoch", func.max(UserActivityLog.created_at) - func.min(UserActivityLog.created_at)) * 1000).label("duration_ms"),
        )
        .group_by(UserActivityLog.session_id)
        .all()
    )
    avg_session_time_ms = (
        sum(float(row.duration_ms or 0) for row in session_duration_rows) / len(session_duration_rows)
        if session_duration_rows
        else 0
    )

    current_period = _apply_global_filters(
        db.query(UserActivityLog),
        role_filter,
        department_filter,
        year_filter,
        section_filter,
    ).filter(UserActivityLog.created_at >= current_start, UserActivityLog.created_at < now)

    previous_period = _apply_global_filters(
        db.query(UserActivityLog),
        role_filter,
        department_filter,
        year_filter,
        section_filter,
    ).filter(UserActivityLog.created_at >= previous_start, UserActivityLog.created_at < current_start)

    current_total_users = current_period.with_entities(func.count(func.distinct(UserActivityLog.user_id))).scalar() or 0
    previous_total_users = previous_period.with_entities(func.count(func.distinct(UserActivityLog.user_id))).scalar() or 0

    current_total_sessions = current_period.with_entities(func.count(func.distinct(UserActivityLog.session_id))).scalar() or 0
    previous_total_sessions = previous_period.with_entities(func.count(func.distinct(UserActivityLog.session_id))).scalar() or 0

    current_active_users = current_total_users
    previous_active_users = previous_total_users

    current_session_durations = (
        current_period.with_entities(
            UserActivityLog.session_id.label("session_id"),
            (func.extract("epoch", func.max(UserActivityLog.created_at) - func.min(UserActivityLog.created_at)) * 1000).label("duration_ms"),
        )
        .group_by(UserActivityLog.session_id)
        .all()
    )
    previous_session_durations = (
        previous_period.with_entities(
            UserActivityLog.session_id.label("session_id"),
            (func.extract("epoch", func.max(UserActivityLog.created_at) - func.min(UserActivityLog.created_at)) * 1000).label("duration_ms"),
        )
        .group_by(UserActivityLog.session_id)
        .all()
    )

    current_avg_session_time_ms = (
        sum(float(row.duration_ms or 0) for row in current_session_durations) / len(current_session_durations)
        if current_session_durations
        else 0
    )
    previous_avg_session_time_ms = (
        sum(float(row.duration_ms or 0) for row in previous_session_durations) / len(previous_session_durations)
        if previous_session_durations
        else 0
    )

    def _trend(current_value: float, previous_value: float):
        if previous_value <= 0:
            return None
        delta = ((current_value - previous_value) / previous_value) * 100
        direction = "up" if delta > 0 else "down" if delta < 0 else "neutral"
        return {
            "direction": direction,
            "delta_percent": round(delta, 1),
            "trend": direction,
            "change_percent": round(delta, 1),
            "current": round(float(current_value), 2),
            "previous": round(float(previous_value), 2),
        }

    page_visit_rows = (
        base.with_entities(
            UserActivityLog.page.label("page"),
            func.count(UserActivityLog.id).label("count"),
        )
        .group_by(UserActivityLog.page)
        .order_by(func.count(UserActivityLog.id).desc())
        .all()
    )
    page_usage = [
        {"page": row.page, "label": _prettify_page(row.page), "count": int(row.count)}
        for row in page_visit_rows
    ]

    top_pages = page_usage[:5]
    least_used_pages = sorted(page_usage, key=lambda item: item["count"])[:5]

    page_session_durations = (
        base.filter(UserActivityLog.action == "visit")
        .with_entities(
            UserActivityLog.page.label("page"),
            UserActivityLog.session_id.label("session_id"),
            (func.extract("epoch", func.max(UserActivityLog.created_at) - func.min(UserActivityLog.created_at)) * 1000).label("duration_ms"),
        )
        .group_by(UserActivityLog.page, UserActivityLog.session_id)
        .all()
    )

    page_duration_map = {}
    for row in page_session_durations:
        page_duration_map.setdefault(row.page, []).append(float(row.duration_ms or 0))

    avg_time_per_page = [
        {
            "page": page,
            "label": _prettify_page(page),
            "avg_time_ms": (sum(values) / len(values)) if values else 0,
        }
        for page, values in page_duration_map.items()
    ]
    avg_time_per_page.sort(key=lambda item: item["avg_time_ms"], reverse=True)
    avg_time_per_page = avg_time_per_page[:5]

    feature_counts = {}
    for item in page_usage:
        feature = _feature_from_page(item["page"])
        feature_counts[feature] = feature_counts.get(feature, 0) + int(item["count"])

    total_feature_events = sum(feature_counts.values()) or 1
    feature_usage = [
        {
            "feature": feature,
            "count": count,
            "percent": round((count / total_feature_events) * 100, 1),
        }
        for feature, count in sorted(feature_counts.items(), key=lambda entry: entry[1], reverse=True)
    ][:5]

    department_lookup = _load_department_lookup(db)
    department_activity_rows = (
        base.join(User, User.user_id == UserActivityLog.user_id)
        .with_entities(User.department_id.label("department_id"), func.count(UserActivityLog.id).label("count"))
        .group_by(User.department_id)
        .all()
    )

    merged_department_counts = {}
    for row in department_activity_rows:
        try:
            dept_id = int(row.department_id) if row.department_id is not None else None
        except Exception:
            dept_id = None
        if dept_id is None:
            continue
        dept_name = department_lookup.get(dept_id)
        if not dept_name or dept_name == "UNKNOWN":
            continue
        merged_department_counts[dept_name] = merged_department_counts.get(dept_name, 0) + int(row.count)

    department_rows = []

    # Fallback to department field from logs if user->department join yields no usable names.
    if not merged_department_counts:
        department_rows = (
            base.filter(UserActivityLog.department.isnot(None))
            .with_entities(UserActivityLog.department, func.count(UserActivityLog.id).label("count"))
            .group_by(UserActivityLog.department)
            .all()
        )
        for row in department_rows:
            clean_name = _resolve_department_name(db, row.department, department_lookup=department_lookup)
            if clean_name and clean_name != "UNKNOWN":
                merged_department_counts[clean_name] = merged_department_counts.get(clean_name, 0) + int(row.count)

    most_active_department = None
    department_total = sum(merged_department_counts.values()) or 1

    known_departments = sorted(
        {
            str(name).strip().upper()
            for name in department_lookup.values()
            if name and str(name).strip().upper() != "UNKNOWN"
        }
    )
    if not known_departments:
        known_departments = sorted(merged_department_counts.keys())

    department_comparison = [
        {
            "name": dept_name,
            "usage": int(merged_department_counts.get(dept_name, 0)),
            "percent": round((int(merged_department_counts.get(dept_name, 0)) / department_total) * 100, 1),
        }
        for dept_name in known_departments
    ]
    department_comparison.sort(key=lambda item: (item["usage"], item["name"]), reverse=True)
    if merged_department_counts:
        top_dept, top_dept_count = sorted(merged_department_counts.items(), key=lambda item: item[1], reverse=True)[0]
        most_active_department = {
            "name": top_dept,
            "department": top_dept,
            "activity": int(top_dept_count),
            "percent": round((int(top_dept_count) / department_total) * 100, 1),
        }

    inactive_departments = []
    if department_lookup:
        inactive_departments = [
            {
                "name": dept_name,
                "usage": int(merged_department_counts.get(dept_name, 0)),
            }
            for _, dept_name in sorted(department_lookup.items(), key=lambda item: item[1])
            if dept_name and dept_name != "UNKNOWN"
        ]
        inactive_departments.sort(key=lambda item: item["usage"])
        inactive_departments = inactive_departments[:5]

    class_rows = (
        base.filter(UserActivityLog.year.isnot(None), UserActivityLog.section.isnot(None))
        .with_entities(UserActivityLog.year, UserActivityLog.section, UserActivityLog.department, func.count(UserActivityLog.id).label("count"))
        .group_by(UserActivityLog.year, UserActivityLog.section, UserActivityLog.department)
        .order_by(func.count(UserActivityLog.id).desc())
        .all()
    )

    role_rows = (
        base.with_entities(UserActivityLog.role, func.count(UserActivityLog.id).label("count"))
        .group_by(UserActivityLog.role)
        .all()
    )

    student_count = next((int(row.count) for row in role_rows if row.role == "student"), 0)
    teacher_count = next((int(row.count) for row in role_rows if row.role == "teacher"), 0)
    role_total = max(student_count + teacher_count, 1)
    student_share = (student_count / role_total) * 100
    teacher_share = (teacher_count / role_total) * 100

    group_candidates = []
    for row in role_rows:
        group_candidates.append({"label": f"Role: {str(row.role).title()}", "count": int(row.count)})
    for row in department_rows:
        group_candidates.append({"label": f"Department: {row.department}", "count": int(row.count)})
    for row in class_rows:
        dept = row.department or "UNKNOWN"
        group_candidates.append({"label": f"Class: {_group_label(int(row.year), row.section)}", "department": dept, "count": int(row.count)})

    least_active_group = None
    if group_candidates:
        least_active_group = min(group_candidates, key=lambda item: item["count"])

    low_engagement_threshold_ms = 15000
    low_engagement_pages = [item for item in avg_time_per_page if float(item.get("avg_time_ms") or 0) < low_engagement_threshold_ms]

    sorted_feature_usage_low = sorted(feature_usage, key=lambda item: float(item.get("percent") or 0))
    lowest_feature = sorted_feature_usage_low[0] if sorted_feature_usage_low else None

    least_active_department = None
    if merged_department_counts:
        least_active_department = sorted(merged_department_counts.items(), key=lambda item: item[1])[0]

    actionable_suggestion = "Not enough insights yet"
    if lowest_feature and float(lowest_feature.get("percent") or 0) <= 20:
        actionable_suggestion = f"{lowest_feature['feature']} usage is low. Promote it on dashboard."
    elif least_active_department:
        actionable_suggestion = f"{least_active_department[0]} department is least active. Run a targeted engagement campaign."
    elif low_engagement_pages:
        actionable_suggestion = f"{low_engagement_pages[0]['label']} has low engagement time. Improve clarity and calls-to-action."

    login_count = (
        base.filter(UserActivityLog.action == "login")
        .with_entities(func.count(func.distinct(UserActivityLog.user_id)))
        .scalar()
        or 0
    )
    dashboard_count = (
        base.filter(UserActivityLog.page.in_(["/student", "/teacher", "/admin", "/overview"]))
        .with_entities(func.count(func.distinct(UserActivityLog.user_id)))
        .scalar()
        or 0
    )
    feature_count = (
        base.filter(
            ~UserActivityLog.page.in_(["/student", "/teacher", "/admin", "/overview", "/login", "/signin"]),
            UserActivityLog.action.in_(["visit", "click", "submit"]),
        )
        .with_entities(func.count(func.distinct(UserActivityLog.user_id)))
        .scalar()
        or 0
    )

    drop_dashboard_percent = ((login_count - dashboard_count) / login_count) * 100 if login_count > 0 else 0
    drop_feature_percent = ((dashboard_count - feature_count) / dashboard_count) * 100 if dashboard_count > 0 else 0

    drop_off = None
    if login_count > 0 and dashboard_count > 0:
        if drop_feature_percent >= drop_dashboard_percent:
            drop_off = {
                "stage_from": "Dashboard",
                "stage_to": "Feature",
                "drop_stage": "Dashboard → Feature",
                "drop_percent": round(drop_feature_percent, 1),
                "message": f"Only {max(0, 100 - drop_feature_percent):.1f}% of users move from Dashboard to Feature.",
            }
        else:
            drop_off = {
                "stage_from": "Login",
                "stage_to": "Dashboard",
                "drop_stage": "Login → Dashboard",
                "drop_percent": round(drop_dashboard_percent, 1),
                "message": f"Only {max(0, 100 - drop_dashboard_percent):.1f}% of users move from Login to Dashboard.",
            }

    top_feature = feature_usage[0]["feature"] if feature_usage else None
    top_feature_percent = float(feature_usage[0]["percent"]) if feature_usage else 0
    ai_summary = _build_ai_summary(
        total_users=int(total_users),
        top_page=top_pages[0]["page"] if top_pages else None,
        student_share=student_share,
        teacher_share=teacher_share,
        top_feature=top_feature,
        top_feature_percent=top_feature_percent,
    )

    page_visits_logged = total_events > 0
    session_ids_consistent = (
        base.filter((UserActivityLog.session_id.is_(None)) | (UserActivityLog.session_id == "")).count() == 0
    )
    login_event_exists = login_count > 0
    missing_department_count = (
        base.filter(
            UserActivityLog.role.in_(tuple(ANALYTICS_ROLES)),
            (UserActivityLog.department.is_(None)) | (UserActivityLog.department == "") | (UserActivityLog.department == "UNKNOWN"),
        ).count()
    )
    role_department_stored = missing_department_count == 0

    return {
        "has_data": True,
        "ai_summary": ai_summary,
        "empty_message": "No data yet. Start using the platform to generate insights.",
        "filters": {
            "range": range_key,
            "role": role_filter or "all",
        },
        "overview": {
            "total_users": int(total_users),
            "total_sessions": int(total_sessions),
            "active_users_24h": int(active_users_24h),
            "avg_session_time_ms": float(avg_session_time_ms),
            "trends": {
                "total_users": _trend(float(current_total_users), float(previous_total_users)),
                "total_sessions": _trend(float(current_total_sessions), float(previous_total_sessions)),
                "active_users_24h": _trend(float(current_active_users), float(previous_active_users)),
                "avg_session_time_ms": _trend(float(current_avg_session_time_ms), float(previous_avg_session_time_ms)),
            },
        },
        "role_breakdown": {
            "students": {"count": student_count, "percent": round(student_share, 1)},
            "teachers": {"count": teacher_count, "percent": round(teacher_share, 1)},
        },
        "page_usage": {
            "top_pages": top_pages,
            "least_used_pages": least_used_pages,
        },
        "engagement": {
            "avg_time_per_page": avg_time_per_page,
            "feature_usage": feature_usage,
        },
        "insights": {
            "most_active_department": most_active_department,
            "most_active_class": {
                "year": int(class_rows[0].year),
                "section": class_rows[0].section,
                "department": _resolve_department_name(
                    db,
                    class_rows[0].department,
                    department_lookup=department_lookup,
                )
                or "UNKNOWN",
                "label": _group_label(int(class_rows[0].year), class_rows[0].section),
                "count": int(class_rows[0].count),
            }
            if class_rows
            else None,
            "least_active_group": least_active_group,
            "drop_off": drop_off,
            "actionable": {"suggestion": actionable_suggestion},
            "inactive_departments": inactive_departments,
            "department_comparison": department_comparison,
        },
        "validation": {
            "page_visits_logged": page_visits_logged,
            "session_ids_consistent": session_ids_consistent,
            "login_event_exists": login_event_exists,
            "role_department_stored": role_department_stored,
            "department_field_missing_count": int(missing_department_count),
        },
    }


@router.get("/overview")
def analytics_overview(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    return {
        **data["overview"],
        "smart_summary": data["ai_summary"],
        "role_engagement": data.get("role_breakdown", {}),
    }


@router.get("/page-usage")
def analytics_page_usage(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    return data["page_usage"]["top_pages"]


@router.get("/time-spent")
def analytics_time_spent(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    return [
        {"page": item["page"], "label": item["label"], "avg_time": item["avg_time_ms"]}
        for item in data["engagement"]["avg_time_per_page"]
    ]


@router.get("/role-distribution")
def analytics_role_distribution(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    roles = data.get("role_breakdown", {})
    students = roles.get("students", {"count": 0, "percent": 0})
    teachers = roles.get("teachers", {"count": 0, "percent": 0})
    return {
        "students": int(students.get("count", 0)),
        "teachers": int(teachers.get("count", 0)),
        "student_percent": float(students.get("percent", 0)),
        "teacher_percent": float(teachers.get("percent", 0)),
    }


@router.get("/feature-usage")
def analytics_feature_usage(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    return data["engagement"]["feature_usage"]


@router.get("/department-usage")
def analytics_department_usage(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_admin(current_user)

    role_filter = _to_role_filter(role)
    _, _, current_start, _ = _to_range_window(range)
    department_filter = _normalize_department(department)
    year_filter = _normalize_year(year)
    section_filter = _normalize_section(section)

    base = _apply_global_filters(
        db.query(UserActivityLog),
        role_filter,
        department_filter,
        year_filter,
        section_filter,
        current_start,
    )

    rows = (
        base.filter(UserActivityLog.department.isnot(None))
        .with_entities(UserActivityLog.department.label("department"), func.count(UserActivityLog.id).label("count"))
        .group_by(UserActivityLog.department)
        .order_by(func.count(UserActivityLog.id).desc())
        .all()
    )

    total = sum(int(row.count) for row in rows) or 1
    return [
        {
            "department": row.department,
            "count": int(row.count),
            "percent": round((int(row.count) / total) * 100, 1),
        }
        for row in rows
    ]


@router.get("/class-usage")
def analytics_class_usage(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _assert_admin(current_user)

    role_filter = _to_role_filter(role)
    _, _, current_start, _ = _to_range_window(range)
    department_filter = _normalize_department(department)
    year_filter = _normalize_year(year)
    section_filter = _normalize_section(section)

    base = _apply_global_filters(
        db.query(UserActivityLog),
        role_filter,
        department_filter,
        year_filter,
        section_filter,
        current_start,
    )

    rows = (
        base.filter(UserActivityLog.year.isnot(None), UserActivityLog.section.isnot(None))
        .with_entities(UserActivityLog.year, UserActivityLog.section, func.count(UserActivityLog.id).label("count"))
        .group_by(UserActivityLog.year, UserActivityLog.section)
        .order_by(func.count(UserActivityLog.id).desc())
        .all()
    )

    total = sum(int(row.count) for row in rows) or 1
    return [
        {
            "year": int(row.year),
            "section": row.section,
            "class_label": _group_label(int(row.year), row.section),
            "count": int(row.count),
            "percent": round((int(row.count) / total) * 100, 1),
        }
        for row in rows
    ]


@router.get("/engagement-summary")
def analytics_engagement_summary(
    role: str = Query("all"),
    range: str = Query("week"),
    department: Optional[str] = Query(default=None),
    year: Optional[int] = Query(default=None),
    section: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    data = analytics_dashboard(role, range, department, year, section, current_user, db)
    return data["engagement"]["feature_usage"]
