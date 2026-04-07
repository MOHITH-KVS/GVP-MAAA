from __future__ import annotations

from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from models import (
    Attendance,
    Assignment,
    AssignmentSubmission,
    Mark,
    PlacementCompany,
    PlacementInterview,
    PlacementProgress,
    PlacementStudentProfile,
    PlacementStudentSkill,
    Student,
    TaskLog,
    User,
)

NO_PLACEMENT_DATA_MESSAGE = "No placement data available yet. Start attending interviews."

DEPARTMENT_MAP = {
    1: "CIVIL",
    11: "CSE",
    12: "CSM",
    14: "ECE",
    15: "MECH",
}

ROUND_ORDER = {
    "applied": 0,
    "screening": 1,
    "aptitude": 2,
    "technical": 3,
    "managerial": 4,
    "hr": 5,
    "offer": 6,
    "selected": 7,
}

TECHNICAL_SKILLS = {
    "dsa",
    "coding",
    "programming",
    "python",
    "java",
    "c",
    "c++",
    "sql",
    "dbms",
    "os",
    "oops",
    "computer networks",
}

COMMUNICATION_SKILLS = {
    "communication",
    "communication skills",
    "spoken english",
    "presentation",
    "soft skills",
}

APTITUDE_SKILLS = {
    "aptitude",
    "quantitative aptitude",
    "reasoning",
    "logical reasoning",
}


def _to_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def _clamp(value: float, minimum: float = 0.0, maximum: float = 100.0) -> float:
    return max(minimum, min(maximum, value))


def _normalize_text(value: Any) -> str:
    return str(value or "").strip().lower()


def _title_case(value: Any) -> str:
    text = str(value or "").strip()
    return text.title() if text else ""


def _department_name(department_id: Optional[int]) -> Optional[str]:
    if department_id is None:
        return None
    return DEPARTMENT_MAP.get(department_id, str(department_id))


def _average_marks_score(marks: List[Mark]) -> float:
    values: List[float] = []
    for row in marks:
        score = _to_float(row.total)
        if score <= 0:
            score = _to_float(row.semester)
        if score <= 0:
            score = _to_float(row.marks)
        if score > 0:
            values.append(score)
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def _estimate_backlogs_from_marks(marks: List[Mark]) -> int:
    latest_subject_rows: Dict[Any, Mark] = {}
    for row in marks:
        subject_id = row.subject_id or row.id
        previous = latest_subject_rows.get(subject_id)
        if not previous or (row.created_at and previous.created_at and row.created_at >= previous.created_at):
            latest_subject_rows[subject_id] = row

    backlog_count = 0
    for row in latest_subject_rows.values():
        score = _to_float(row.total)
        if score <= 0:
            score = _to_float(row.semester)
        if score <= 0:
            score = _to_float(row.marks)
        if score > 0 and score < 40:
            backlog_count += 1
    return backlog_count


def _attendance_percentage(attendance_rows: List[Attendance]) -> float:
    total = len(attendance_rows)
    if total == 0:
        return 0.0
    present = sum(1 for row in attendance_rows if bool(row.status))
    return round((present / total) * 100, 2)


def _task_completion_percentage(task_logs: List[TaskLog], assignments: List[Assignment], submissions: List[AssignmentSubmission]) -> float:
    completed_tasks = sum(1 for row in task_logs if bool(row.completed))
    task_total = len(task_logs)
    task_score = (completed_tasks / task_total) * 100 if task_total else 0.0

    assigned_count = len(assignments)
    submitted_ids = {
        submission.assignment_id
        for submission in submissions
        if bool(submission.is_submitted) or _normalize_text(submission.status) == "submitted"
    }
    submission_score = (len(submitted_ids) / assigned_count) * 100 if assigned_count else 0.0

    if task_total and assigned_count:
        return round((task_score * 0.5 + submission_score * 0.5), 2)
    if task_total:
        return round(task_score, 2)
    if assigned_count:
        return round(submission_score, 2)
    return 0.0


def _interview_success_rate(interviews: List[PlacementInterview]) -> float:
    completed = [row for row in interviews if _normalize_text(row.status) == "completed" or _normalize_text(row.result) in {"selected", "rejected"}]
    if not completed:
        return 40.0 if interviews else 0.0
    selected = sum(1 for row in completed if _normalize_text(row.result) == "selected")
    return round((selected / len(completed)) * 100, 2)


def _round_score(round_label: Optional[str]) -> int:
    key = _normalize_text(round_label)
    if not key:
        return 0
    return ROUND_ORDER.get(key, 0) * 12


def _get_student_context(db: Session, student_id: int) -> Optional[Dict[str, Any]]:
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None

    user = db.query(User).filter(User.user_id == student_id).first()
    placement_profile = db.query(PlacementStudentProfile).filter(PlacementStudentProfile.student_id == student_id).first()
    skill_rows = db.query(PlacementStudentSkill).filter(PlacementStudentSkill.student_id == student_id).all()
    interviews = (
        db.query(PlacementInterview)
        .filter(PlacementInterview.student_id == student_id)
        .order_by(desc(PlacementInterview.date), desc(PlacementInterview.id))
        .all()
    )
    companies = db.query(PlacementCompany).order_by(PlacementCompany.name.asc()).all()
    attendance_rows = db.query(Attendance).filter(Attendance.student_id == student_id).all()
    task_logs = db.query(TaskLog).filter(TaskLog.student_id == student_id).all()
    assignments = (
        db.query(Assignment)
        .filter(
            Assignment.year == student.year,
            Assignment.section == student.section,
            Assignment.is_active == True,
        )
        .all()
    )
    submissions = db.query(AssignmentSubmission).filter(AssignmentSubmission.student_id == student_id).all()
    marks = db.query(Mark).filter(Mark.student_id == student_id).order_by(Mark.created_at.asc()).all()

    return {
        "student": student,
        "user": user,
        "placement_profile": placement_profile,
        "skill_rows": skill_rows,
        "interviews": interviews,
        "companies": companies,
        "attendance_rows": attendance_rows,
        "task_logs": task_logs,
        "assignments": assignments,
        "submissions": submissions,
        "marks": marks,
    }


def _resolve_profile_values(context: Dict[str, Any]) -> Dict[str, Any]:
    student = context["student"]
    placement_profile = context["placement_profile"]
    user = context["user"]

    cgpa = _to_float(placement_profile.cgpa) if placement_profile and placement_profile.cgpa is not None else _to_float(student.cgpa)
    backlogs = placement_profile.backlogs if placement_profile and placement_profile.backlogs is not None else _estimate_backlogs_from_marks(context["marks"])
    department = (
        placement_profile.department
        if placement_profile and placement_profile.department
        else _department_name(user.department_id if user else None)
    )
    year = placement_profile.year if placement_profile and placement_profile.year is not None else student.year

    return {
        "cgpa": cgpa,
        "backlogs": int(backlogs or 0),
        "department": department,
        "year": int(year) if year is not None else None,
    }


def _infer_skill_level(skill_name: str, context: Dict[str, Any], interview_success_rate: float) -> str:
    skill_key = _normalize_text(skill_name)
    cgpa = _to_float(context["profile_values"]["cgpa"])
    attendance = _attendance_percentage(context["attendance_rows"])
    marks_score = _average_marks_score(context["marks"])

    if skill_key in TECHNICAL_SKILLS:
        if marks_score >= 70 or interview_success_rate >= 60:
            return "high"
        if marks_score >= 50:
            return "medium"
        return "low"

    if skill_key in APTITUDE_SKILLS:
        if cgpa >= 7.5 or attendance >= 85:
            return "high"
        if cgpa >= 6.5 or attendance >= 75:
            return "medium"
        return "low"

    if skill_key in COMMUNICATION_SKILLS:
        interviews = context["interviews"]
        weak_areas = [_normalize_text(interview.weak_area) for interview in interviews[:3] if interview.weak_area]
        if interview_success_rate >= 60 and "communication" not in weak_areas:
            return "high"
        if interview_success_rate >= 40:
            return "medium"
        return "low"

    if cgpa >= 7 or marks_score >= 65:
        return "medium"
    return "low"


def _build_student_skill_map(context: Dict[str, Any], interview_success_rate: float) -> List[Dict[str, str]]:
    explicit_rows = context["skill_rows"]
    if explicit_rows:
        return [
            {
                "skill_name": row.skill_name,
                "level": _normalize_text(row.level) or "medium",
            }
            for row in explicit_rows
        ]

    student = context["student"]
    student_skills = [skill.strip() for skill in (student.skills or "").split(",") if skill.strip()]
    if not student_skills:
        return []

    context = dict(context)
    context["profile_values"] = _resolve_profile_values(context)
    return [
        {
            "skill_name": skill,
            "level": _infer_skill_level(skill, context, interview_success_rate),
        }
        for skill in student_skills
    ]


def _skills_score(skill_rows: List[Dict[str, str]]) -> float:
    if not skill_rows:
        return 0.0
    mapping = {"low": 35.0, "medium": 68.0, "high": 90.0}
    values = [mapping.get(_normalize_text(row.get("level")), 55.0) for row in skill_rows]
    return round(sum(values) / len(values), 2)


def _consistency_score(context: Dict[str, Any]) -> float:
    attendance_pct = _attendance_percentage(context["attendance_rows"])
    task_pct = _task_completion_percentage(context["task_logs"], context["assignments"], context["submissions"])
    if attendance_pct == 0 and task_pct == 0:
        return 0.0
    return round((attendance_pct * 0.6) + (task_pct * 0.4), 2)


def _score_status(score: float) -> str:
    if score >= 75:
        return "Ready"
    if score >= 55:
        return "Borderline"
    return "Not Ready"


def _collect_reasons(breakdown: Dict[str, float], interview_insights: Dict[str, Any], skill_gap: Dict[str, List[str]]) -> List[str]:
    reasons: List[str] = []
    if breakdown["cgpa"] < 70:
        reasons.append("CGPA is below the usual placement comfort zone")
    if breakdown["skills"] < 65:
        reasons.append("Skill coverage is not yet strong enough for most recruiters")
    if breakdown["interview"] < 60:
        reasons.append("Recent interview performance needs more consistency")
    if breakdown["consistency"] < 60:
        reasons.append("Attendance and task completion need a stronger rhythm")
    if interview_insights.get("common_weak_area"):
        reasons.append(f"Repeated weak area: {interview_insights['common_weak_area']}")
    if skill_gap["missing_skills"]:
        reasons.append(f"Missing skills: {', '.join(skill_gap['missing_skills'][:3])}")
    if not reasons:
        reasons.append("Your current placement profile is on track")
    return reasons


def _build_action_plan(
    context: Dict[str, Any],
    readiness_breakdown: Dict[str, float],
    skill_gap: Dict[str, List[str]],
    interview_insights: Dict[str, Any],
) -> Dict[str, List[str]]:
    weekly_plan: List[str] = []
    priority_actions: List[str] = []

    cgpa = _resolve_profile_values(context)["cgpa"]
    if cgpa < 7.0:
        weekly_plan.append("Focus on improving internal marks to lift your CGPA")
        priority_actions.append("Focus on improving internal marks")

    if skill_gap["missing_skills"]:
        weekly_plan.append(f"Cover the next missing skill: {skill_gap['missing_skills'][0]}")
        priority_actions.append(f"Close the skill gap in {skill_gap['missing_skills'][0]}")

    if skill_gap["weak_skills"]:
        weekly_plan.append(f"Practice {skill_gap['weak_skills'][0]} for 30 mins daily")
        priority_actions.append(f"Practice {skill_gap['weak_skills'][0]} every day")

    if interview_insights.get("common_weak_area"):
        weekly_plan.append("Attend one mock interview and review the feedback")
        priority_actions.append("Attend a mock interview")

    if readiness_breakdown.get("consistency", 0) < 70:
        weekly_plan.append("Keep attendance above 85% and complete every assigned task")
        priority_actions.append("Improve attendance and task completion")

    if not weekly_plan:
        weekly_plan.append("Maintain your current placement rhythm and keep updating interview feedback")
    if not priority_actions:
        priority_actions.append("Maintain the current level across CGPA, skills, and interviews")

    return {
        "weekly_plan": weekly_plan[:5],
        "priority_actions": priority_actions[:5],
    }


def _upsert_progress(db: Session, student_id: int, readiness_score: float) -> None:
    progress = db.query(PlacementProgress).filter(PlacementProgress.student_id == student_id).first()
    if not progress:
        progress = PlacementProgress(student_id=student_id)
        db.add(progress)
    progress.readiness_score = round(readiness_score, 2)
    progress.last_updated = datetime.utcnow()
    db.commit()


def get_skill_gap(
    student_id: int,
    db: Session,
    context: Optional[Dict[str, Any]] = None,
    skill_rows: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, List[str]]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return {"missing_skills": [], "weak_skills": [], "strong_skills": []}

    profile_values = _resolve_profile_values(context)
    context = dict(context)
    context["profile_values"] = profile_values
    interview_success_rate = _interview_success_rate(context["interviews"])
    skills = skill_rows or _build_student_skill_map(context, interview_success_rate)
    skill_lookup = {_normalize_text(item["skill_name"]): item for item in skills}

    required_skills: List[str] = []
    for company in context["companies"]:
        for skill in company.required_skills or []:
            normalized = _title_case(skill)
            if normalized and normalized not in required_skills:
                required_skills.append(normalized)

    student_skill_names = [_title_case(row["skill_name"]) for row in skills]
    missing_skills = [skill for skill in required_skills if skill not in student_skill_names]

    weak_skills = []
    strong_skills = []
    for row in skill_lookup.values():
        display_name = _title_case(row["skill_name"])
        level = _normalize_text(row.get("level"))
        if level == "high":
            strong_skills.append(display_name)
        else:
            weak_skills.append(display_name)

    return {
        "missing_skills": missing_skills,
        "weak_skills": weak_skills,
        "strong_skills": strong_skills,
    }


def get_interview_insights(
    student_id: int,
    db: Session,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return {
            "has_data": False,
            "common_weak_area": None,
            "last_round_reached": None,
            "improvement_suggestion": None,
            "recent_interviews": [],
        }

    interviews = context["interviews"][:3]
    if not interviews:
        return {
            "has_data": False,
            "common_weak_area": None,
            "last_round_reached": None,
            "improvement_suggestion": None,
            "recent_interviews": [],
        }

    weak_area_counts = Counter(_title_case(interview.weak_area) for interview in interviews if interview.weak_area)
    common_weak_area = weak_area_counts.most_common(1)[0][0] if weak_area_counts else None

    latest_round = None
    highest_score = -1
    for interview in interviews:
        round_label = _title_case(interview.round_reached)
        round_score = ROUND_ORDER.get(_normalize_text(round_label), 0)
        if round_score > highest_score:
            highest_score = round_score
            latest_round = round_label or None

    suggestion_map = {
        "dsa": "Practice DSA problems daily and review common patterns.",
        "coding": "Solve timed coding problems and review failed solutions.",
        "aptitude": "Revise aptitude formulas and timed test strategies.",
        "communication": "Do one mock interview and rehearse clear self-introductions.",
        "technical knowledge": "Revisit core technical concepts and explain them aloud.",
    }
    suggestion_key = _normalize_text(common_weak_area)
    suggestion = suggestion_map.get(suggestion_key, "Review the last interview feedback and close the weakest gap first.")

    recent_interviews = []
    for interview in interviews:
        recent_interviews.append(
            {
                "company_name": interview.company_name,
                "date": interview.date.isoformat() if interview.date else None,
                "mode": interview.mode,
                "status": interview.status,
                "result": interview.result,
                "round_reached": interview.round_reached,
                "weak_area": interview.weak_area,
            }
        )

    return {
        "has_data": True,
        "common_weak_area": common_weak_area,
        "last_round_reached": latest_round,
        "improvement_suggestion": suggestion,
        "recent_interviews": recent_interviews,
    }


def get_placement_readiness(student_id: int, db: Session) -> Dict[str, Any]:
    context = _get_student_context(db, student_id)
    if not context:
        return {
            "has_data": False,
            "no_data_message": NO_PLACEMENT_DATA_MESSAGE,
            "readiness_score": None,
            "status": "Not Ready",
            "breakdown": {"cgpa": 0, "skills": 0, "interview": 0, "consistency": 0},
            "reasons": [],
            "suggestions": [],
            "last_updated": None,
        }

    profile_values = _resolve_profile_values(context)
    context = dict(context)
    context["profile_values"] = profile_values
    interview_success_rate = _interview_success_rate(context["interviews"])
    skill_rows = _build_student_skill_map(context, interview_success_rate)

    cgpa_score = _clamp((profile_values["cgpa"] / 10.0) * 100 if profile_values["cgpa"] else 0.0)
    skills_score = _skills_score(skill_rows)
    interview_score = _interview_performance_score(context["interviews"])
    consistency_score = _consistency_score(context)

    readiness_score = round(
        (cgpa_score * 0.30)
        + (skills_score * 0.25)
        + (interview_score * 0.25)
        + (consistency_score * 0.20),
        2,
    )
    status = _score_status(readiness_score)

    skill_gap = get_skill_gap(student_id, db, context=context, skill_rows=skill_rows)
    interview_insights = get_interview_insights(student_id, db, context=context)
    reasons = _collect_reasons(
        {"cgpa": cgpa_score, "skills": skills_score, "interview": interview_score, "consistency": consistency_score},
        interview_insights,
        skill_gap,
    )
    action_plan = _build_action_plan(
        context,
        {"cgpa": cgpa_score, "skills": skills_score, "interview": interview_score, "consistency": consistency_score},
        skill_gap,
        interview_insights,
    )

    _upsert_progress(db, student_id, readiness_score)
    progress = db.query(PlacementProgress).filter(PlacementProgress.student_id == student_id).first()

    return {
        "has_data": True,
        "student_id": student_id,
        "readiness_score": readiness_score,
        "status": status,
        "breakdown": {
            "cgpa": round(cgpa_score, 2),
            "skills": round(skills_score, 2),
            "interview": round(interview_score, 2),
            "consistency": round(consistency_score, 2),
        },
        "reasons": reasons,
        "suggestions": action_plan["priority_actions"],
        "last_updated": progress.last_updated.isoformat() if progress and progress.last_updated else None,
    }


def get_company_eligibility(student_id: int, db: Session, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return []

    profile_values = _resolve_profile_values(context)
    companies = context["companies"]
    if not companies:
        return []

    items: List[Dict[str, Any]] = []
    for company in companies:
        min_cgpa = _to_float(company.min_cgpa)
        max_backlogs = int(company.max_backlogs or 0)
        eligible = profile_values["cgpa"] >= min_cgpa and profile_values["backlogs"] <= max_backlogs
        reasons: List[str] = []
        if profile_values["cgpa"] < min_cgpa:
            reasons.append("CGPA below requirement")
        if profile_values["backlogs"] > max_backlogs:
            reasons.append("Backlogs exceed limit")
        if eligible:
            reasons = ["Meets the published academic thresholds"]

        items.append(
            {
                "company_name": company.name,
                "eligible": eligible,
                "reasons": reasons,
                "min_cgpa": float(min_cgpa),
                "max_backlogs": max_backlogs,
                "required_skills": company.required_skills or [],
            }
        )

    return items


def get_skill_gap(
    student_id: int,
    db: Session,
    context: Optional[Dict[str, Any]] = None,
    skill_rows: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, List[str]]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return {"missing_skills": [], "weak_skills": [], "strong_skills": []}

    profile_values = _resolve_profile_values(context)
    context = dict(context)
    context["profile_values"] = profile_values
    interview_success_rate = _interview_success_rate(context["interviews"])
    skills = skill_rows or _build_student_skill_map(context, interview_success_rate)
    skill_lookup = {_normalize_text(item["skill_name"]): item for item in skills}

    required_skills: List[str] = []
    for company in context["companies"]:
        for skill in company.required_skills or []:
            normalized = _title_case(skill)
            if normalized and normalized not in required_skills:
                required_skills.append(normalized)

    student_skill_names = [_title_case(row["skill_name"]) for row in skills]
    missing_skills = [skill for skill in required_skills if skill not in student_skill_names]

    weak_skills = []
    strong_skills = []
    for row in skill_lookup.values():
        display_name = _title_case(row["skill_name"])
        level = _normalize_text(row.get("level"))
        if level == "high":
            strong_skills.append(display_name)
        else:
            weak_skills.append(display_name)

    return {
        "missing_skills": missing_skills,
        "weak_skills": weak_skills,
        "strong_skills": strong_skills,
    }


def get_selection_probability(student_id: int, db: Session, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return {
            "has_data": False,
            "current_probability": 0,
            "improved_probability": 0,
            "suggestion": NO_PLACEMENT_DATA_MESSAGE,
        }

    readiness = get_placement_readiness(student_id, db)
    interview_success_rate = _interview_success_rate(context["interviews"])
    readiness_score = readiness["readiness_score"] or 0

    current_probability = round((_clamp(readiness_score) * 0.65) + (_clamp(interview_success_rate) * 0.35), 2)
    improvement_headroom = max(8.0, (100.0 - readiness_score) * 0.25)
    improved_probability = round(_clamp(current_probability + improvement_headroom), 2)

    weakest_driver = min(
        [
            (readiness["breakdown"]["cgpa"], "CGPA"),
            (readiness["breakdown"]["skills"], "skills"),
            (readiness["breakdown"]["interview"], "interviews"),
            (readiness["breakdown"]["consistency"], "consistency"),
        ],
        key=lambda item: item[0],
    )[1]

    suggestion_map = {
        "CGPA": "Improve CGPA through internal marks and targeted subject revision.",
        "skills": "Close your largest skill gaps before the next drive.",
        "interviews": "Do mock interviews and practice timed responses.",
        "consistency": "Keep attendance and task completion above the safe threshold.",
    }

    return {
        "has_data": True,
        "current_probability": int(round(current_probability)),
        "improved_probability": int(round(improved_probability)),
        "suggestion": suggestion_map.get(weakest_driver, "Improve the weakest placement signal first."),
    }


def generate_action_plan(
    student_id: int,
    db: Session,
    context: Optional[Dict[str, Any]] = None,
    skill_rows: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, List[str]]:
    context = context or _get_student_context(db, student_id)
    if not context:
        return {"weekly_plan": [], "priority_actions": []}

    skill_gap = get_skill_gap(student_id, db, context=context, skill_rows=skill_rows)
    interview_insights = get_interview_insights(student_id, db, context=context)
    readiness_breakdown = get_placement_readiness(student_id, db)["breakdown"] if context else {"cgpa": 0, "skills": 0, "interview": 0, "consistency": 0}
    return _build_action_plan(context, readiness_breakdown, skill_gap, interview_insights)
