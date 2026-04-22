from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import traceback
import time
import tempfile
import os
import re
from datetime import datetime, date
from sqlalchemy import func, or_, case

from auth import get_current_user
from database import get_db
router = APIRouter(prefix="/chat", tags=["RAG Chatbot"])

AI_DAILY_RESPONSE_LIMIT = 3

# Store uploaded PDFs in memory per session
# Key: user_id, Value: {path, filename}
_PDF_STORE = {}


def map_response_mode(source: str) -> str:
    src = (source or "").lower()
    if src in {"verified_data", "fallback"}:
        return "verified_data"
    if src in {"gemini", "langchain", "cache", "legacy"}:
        return "live_ai"
    return "live_ai"


def infer_mode_from_text(reply_text: str) -> Optional[str]:
    lower = str(reply_text or "").lower()
    if "verified dashboard data" in lower or "ai-generated wording is temporarily unavailable" in lower:
        return "verified_data"
    return None

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Any]] = []
    thread_id: Optional[str] = None

    class Config:
        extra = "allow"

def normalize_history(raw_history):
    if not raw_history:
        return []
    normalized = []
    for item in raw_history:
        try:
            if isinstance(item, dict):
                normalized.append({
                    "role": str(item.get("role",
                              item.get("from",
                              item.get("sender", "user")))),
                    "content": str(item.get("content",
                                  item.get("text",
                                  item.get("message", ""))))
                })
            elif isinstance(item, str):
                normalized.append({"role": "user", "content": item})
        except Exception:
            continue
    return normalized[-6:]


def chunk_text(text: str, chunk_size: int = 40):
    for index in range(0, len(text), chunk_size):
        yield text[index:index + chunk_size]


def _get_daily_ai_usage_count(db: Session, user_id: int) -> int:
    try:
        from models import UserActivityLog
        count = db.query(func.count(UserActivityLog.id)).filter(
            UserActivityLog.user_id == int(user_id),
            UserActivityLog.action == "chat_ai_response",
            func.date(UserActivityLog.created_at) == date.today(),
        ).scalar()
        return int(count or 0)
    except Exception:
        return 0


def _record_daily_ai_usage(db: Session, user_id: int, role: str) -> None:
    try:
        from models import UserActivityLog

        usage_event = UserActivityLog(
            user_id=int(user_id),
            role=str(role or "student"),
            department=None,
            year=None,
            section=None,
            page="/chat/message",
            action="chat_ai_response",
            session_id=f"chat-ai-{date.today().isoformat()}",
        )
        db.add(usage_event)
        db.commit()
    except Exception:
        db.rollback()


def _metric_aliases_for_role(role: str) -> Dict[str, str]:
    role = _normalize_role(role)
    if role == "faculty":
        return {
            "class attendance": "class_attendance",
            "attendance": "class_attendance",
            "pending submissions": "pending_submissions",
            "pending submission": "pending_submissions",
        }
    if role == "admin":
        return {
            "institution attendance": "institution_attendance",
            "overall attendance": "institution_attendance",
            "attendance": "institution_attendance",
            "at risk students": "at_risk_students",
            "risk students": "at_risk_students",
            "at-risk students": "at_risk_students",
        }
    return {
        "attendance": "attendance",
        "cgpa": "cgpa",
        "marks": "avg_marks",
        "average marks": "avg_marks",
        "pending assignments": "pending_assignments",
        "pending assignment": "pending_assignments",
    }


def _words_to_number(tokens: List[str]) -> Optional[float]:
    units = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4,
        "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
        "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13,
        "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17,
        "eighteen": 18, "nineteen": 19,
    }
    tens = {
        "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
        "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    }

    if not tokens:
        return None

    total = 0
    current = 0
    consumed = False
    for token in tokens:
        word = token.strip().lower()
        if word in units:
            current += units[word]
            consumed = True
            continue
        if word in tens:
            current += tens[word]
            consumed = True
            continue
        if word == "hundred":
            if current == 0:
                current = 1
            current *= 100
            consumed = True
            continue
        if word in {"and", "percent", "percentage", "%"}:
            continue
        break

    if not consumed:
        return None
    total += current
    return float(total)


def _extract_threshold(text: str) -> Optional[float]:
    number_match = re.search(r"(-?\d+(?:\.\d+)?)", text)
    if number_match:
        return float(number_match.group(1))

    normalized = re.sub(r"[^a-z\s-]", " ", text.lower())
    normalized = normalized.replace("-", " ")
    words = [w for w in normalized.split() if w]

    # Prefer numbers that appear after comparative tokens.
    comparative_tokens = {"below", "under", "above", "over", "equal", "equals", "than", "to"}
    for idx, word in enumerate(words):
        if word in comparative_tokens:
            value = _words_to_number(words[idx + 1: idx + 7])
            if value is not None:
                return value

    # Fallback: first parseable word-number sequence in text.
    for idx in range(len(words)):
        value = _words_to_number(words[idx: idx + 6])
        if value is not None:
            return value

    return None


def _parse_alert_rules_from_message(message: str, role: str) -> List[dict]:
    text = str(message or "").strip().lower()
    if not text:
        return []

    trigger_tokens = ["alert me", "set alert", "remind me", "notify me"]
    if not any(token in text for token in trigger_tokens):
        return []

    aliases = _metric_aliases_for_role(role)
    clauses = re.split(r"\b(?:and|also)\b|,", text)
    rules = []

    # Track defaults from full text so short clauses can inherit.
    default_condition = "lt"
    if any(token in text for token in ["above", "greater than", "more than", "higher than", ">"]):
        default_condition = "gt"
    elif any(token in text for token in ["equal", "equals", "="]):
        default_condition = "eq"

    for clause in clauses:
        clause_text = clause.strip()
        if not clause_text:
            continue

        metric = None
        for key in sorted(aliases.keys(), key=len, reverse=True):
            if key in clause_text:
                metric = aliases[key]
                break
        if not metric:
            continue

        condition = default_condition
        if any(token in clause_text for token in ["below", "under", "less than", "lower than", "<"]):
            condition = "lt"
        elif any(token in clause_text for token in ["above", "greater than", "more than", "higher than", ">"]):
            condition = "gt"
        elif any(token in clause_text for token in ["equal", "equals", "="]):
            condition = "eq"

        threshold = _extract_threshold(clause_text)
        if threshold is None:
            continue

        rules.append({
            "type": metric,
            "condition": condition,
            "threshold": threshold,
            "message": str(message or "").strip(),
            "active": True,
        })

    # Fallback to single-rule behavior if split clauses yielded nothing.
    if not rules:
        metric = None
        for key in sorted(aliases.keys(), key=len, reverse=True):
            if key in text:
                metric = aliases[key]
                break
        if metric is not None:
            threshold = _extract_threshold(text)
            if threshold is not None:
                rules.append({
                    "type": metric,
                    "condition": default_condition,
                    "threshold": threshold,
                    "message": str(message or "").strip(),
                    "active": True,
                })

    unique = []
    seen = set()
    for rule in rules:
        key = (rule["type"], rule["condition"], float(rule["threshold"]))
        if key in seen:
            continue
        seen.add(key)
        unique.append(rule)
    return unique


def _format_display_name(raw_name: str) -> str:
    name = str(raw_name or "").strip()
    if not name:
        return ""
    # Keep greeting concise by using first token only.
    first = name.split()[0]
    return first[:1].upper() + first[1:]


def resolve_user_display_name(current_user, db: Session) -> str:
    """Resolve user name quickly: token fields first, DB fallback by user_id."""
    try:
        if isinstance(current_user, dict):
            for key in ("name", "full_name", "username"):
                value = str(current_user.get(key) or "").strip()
                if value:
                    return _format_display_name(value)
            user_id = int(current_user.get("user_id", 0) or 0)
        else:
            for key in ("name", "full_name", "username"):
                value = str(getattr(current_user, key, "") or "").strip()
                if value:
                    return _format_display_name(value)
            user_id = int(getattr(current_user, "user_id", 0) or 0)

        if user_id <= 0:
            return ""

        from models import User
        user = db.query(User).filter(User.user_id == user_id).first()
        if user and getattr(user, "name", None):
            return _format_display_name(user.name)
    except Exception:
        pass
    return ""


def get_fast_smalltalk_reply(message: str, display_name: str = "") -> Optional[str]:
    text = str(message or "").strip().lower()
    if not text:
        return None

    normalized = re.sub(r"[^a-z\s]", " ", text)
    normalized = re.sub(r"\s+", " ", normalized).strip()

    greeting_prefix = f"Hi {display_name}!" if display_name else "Hi!"

    if normalized in {"hi", "hello", "hey", "hii", "hiii", "yo", "sup", "hi there", "hello there", "hey there"}:
        return f"{greeting_prefix} How can I help you today?"
    if normalized in {"good morning", "good afternoon", "good evening", "good night"}:
        return f"{greeting_prefix} How can I help you today with your academic questions?"
    if normalized in {"how are you"}:
        return "I am doing well. How can I help you today?"
    if normalized in {"thanks", "thank you"}:
        return "You are welcome. I am here if you need anything else."
    if normalized in {"ok", "okay"}:
        return "Great. Tell me what you want to do next."
    if normalized in {"bye", "goodbye", "see you"}:
        return "Goodbye. Have a great day."

    return None


def _normalize_text(message: str) -> str:
    text = str(message or "").lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_subject_hint(message: str) -> str:
    normalized = _normalize_text(message)
    tokens = [
        t for t in normalized.split(" ")
        if t and t not in {
            "what", "is", "my", "marks", "mark", "in", "of", "for", "subject",
            "tell", "me", "about", "the", "current", "latest", "score", "scores",
            "exam", "result", "results", "today"
        }
    ]
    return " ".join(tokens).strip()


def get_fast_standard_reply(message: str, user_id: int, role: str, db: Session) -> Optional[str]:
    """Answer common dashboard questions directly from DB without LLM."""
    role_key = str(role or "").lower()
    if user_id <= 0:
        return None

    text = _normalize_text(message)
    if not text:
        return None

    from models import (
        Attendance,
        Assignment,
        AssignmentSubmission,
        FacultySubject,
        Mark,
        PlacementDrive,
        Student,
        Subject,
    )

    def _risk_level(att_pct: float, avg_marks: float) -> str:
        if att_pct < 60 or avg_marks < 40:
            return "HIGH"
        if att_pct < 75 or avg_marks < 55:
            return "MEDIUM"
        return "LOW"

    asks_attendance = (
        "attendance" in text and
        any(k in text for k in ["today", "now", "current", "percentage", "status", "my"])
    )
    asks_pending_assignments = (
        ("pending" in text and "assignment" in text) or
        ("assignment" in text and any(k in text for k in ["pending", "due", "submit", "left"]))
    )
    asks_marks = any(k in text for k in ["marks", "mark", "score", "result", "grade"])
    asks_risk = any(k in text for k in ["at risk", "risk", "failing", "fail", "danger"])
    asks_drive_count = (
        any(k in text for k in ["how many", "count", "current"]) and
        any(k in text for k in ["placement", "placements", "drive", "drives"])
    )
    asks_apply_drives = (
        "drive" in text and any(k in text for k in ["apply", "available", "open", "any"])
    )
    asks_class = any(k in text for k in ["class", "students", "my class"])
    asks_institution = any(k in text for k in ["institution", "overall", "college", "campus", "all students"])

    if not any([asks_attendance, asks_pending_assignments, asks_marks, asks_risk, asks_drive_count, asks_apply_drives]):
        return None

    if role_key == "student":
        student = db.query(Student).filter(Student.student_id == user_id).first()
        if not student:
            return "I could not find your student profile yet."

        if asks_attendance:
            today = date.today()
            today_total = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id == user_id,
                Attendance.attendance_date == today,
            ).scalar() or 0

            if today_total > 0:
                today_present = db.query(func.count(Attendance.attendance_id)).filter(
                    Attendance.student_id == user_id,
                    Attendance.attendance_date == today,
                    Attendance.status == True,
                ).scalar() or 0
                pct = round((today_present / today_total) * 100, 1)
                return f"Today attendance: {today_present}/{today_total} classes present ({pct}%)."

            total = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id == user_id,
            ).scalar() or 0
            present = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id == user_id,
                Attendance.status == True,
            ).scalar() or 0
            pct = round((present / total) * 100, 1) if total > 0 else 0
            return (
                "No attendance marked for today yet. "
                f"Your overall attendance is {pct}% ({present}/{total})."
            )

        if asks_pending_assignments:
            class_assignments = db.query(Assignment).filter(
                Assignment.year == student.year,
                Assignment.section == student.section,
                Assignment.is_active == True,
            ).all()
            if not class_assignments:
                return "No active assignments found for your class right now."

            assignment_ids = [a.id for a in class_assignments]
            submitted_rows = db.query(AssignmentSubmission.assignment_id).filter(
                AssignmentSubmission.student_id == user_id,
                or_(
                    AssignmentSubmission.is_submitted == True,
                    func.lower(func.coalesce(AssignmentSubmission.status, "")).in_(
                        ["submitted", "done", "completed"]
                    ),
                ),
                AssignmentSubmission.assignment_id.in_(assignment_ids),
            ).distinct().all()

            submitted_ids = {row[0] for row in submitted_rows}
            pending = [a for a in class_assignments if a.id not in submitted_ids]
            if not pending:
                return "You have no pending assignments. You are all caught up."

            pending_sorted = sorted(pending, key=lambda x: x.due_date or datetime.max)
            next_due = pending_sorted[0]
            due_text = next_due.due_date.strftime("%d %b %Y, %I:%M %p") if next_due.due_date else "No due date"
            return (
                f"You have {len(pending)} pending assignment(s). "
                f"Next due: {next_due.title} ({due_text})."
            )

        if asks_marks:
            subject_hint = _extract_subject_hint(message)
            marks_query = db.query(Mark, Subject).outerjoin(
                Subject, Subject.subject_id == Mark.subject_id
            ).filter(Mark.student_id == user_id)

            if subject_hint:
                marks_query = marks_query.filter(
                    func.lower(func.coalesce(Subject.subject_name, "")).like(f"%{subject_hint}%")
                )

            rows = marks_query.order_by(Mark.created_at.desc()).limit(8).all()
            if not rows:
                if subject_hint:
                    return f"I could not find marks for '{subject_hint}'."
                return "No marks records found for your account yet."

            if subject_hint:
                best_mark, best_subject = rows[0]
                subject_name = best_subject.subject_name if best_subject else "subject"
                score = float(best_mark.marks or 0)
                total = float(best_mark.total or 0)
                pct = round((score / total) * 100, 1) if total > 0 else 0
                exam = str(best_mark.exam or "latest exam")
                if total > 0:
                    return f"Your {subject_name} marks ({exam}): {score}/{total} ({pct}%)."
                return f"Your {subject_name} marks ({exam}): {score}."

            lines = []
            for mark_row, subject_row in rows[:3]:
                subject_name = subject_row.subject_name if subject_row else f"Subject {mark_row.subject_id}"
                score = float(mark_row.marks or 0)
                total = float(mark_row.total or 0)
                lines.append(f"{subject_name}: {score}/{total}" if total > 0 else f"{subject_name}: {score}")
            return "Your latest marks: " + " | ".join(lines)

        if asks_risk:
            total_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id == user_id,
            ).scalar() or 0
            present_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id == user_id,
                Attendance.status == True,
            ).scalar() or 0
            att_pct = round((present_att / total_att) * 100, 1) if total_att > 0 else 0
            avg_total = db.query(func.avg(Mark.total)).filter(
                Mark.student_id == user_id,
                Mark.total.isnot(None),
            ).scalar()
            avg_marks = round(float(avg_total), 1) if avg_total is not None else 0.0
            level = _risk_level(att_pct, avg_marks)
            return (
                f"Your current risk level is {level} "
                f"(attendance: {att_pct}%, average marks: {avg_marks})."
            )

        if asks_drive_count or asks_apply_drives:
            open_count = db.query(func.count(PlacementDrive.id)).filter(
                func.lower(func.coalesce(PlacementDrive.status, "open")) == "open"
            ).scalar() or 0

            if asks_drive_count and not asks_apply_drives:
                return f"There are currently {open_count} open placement drive(s)."

            open_drives = db.query(PlacementDrive).filter(
                func.lower(func.coalesce(PlacementDrive.status, "open")) == "open"
            ).order_by(PlacementDrive.registration_deadline.asc().nulls_last()).limit(10).all()

            if not open_drives:
                return "There are no open placement drives to apply right now."

            student_cgpa = float(student.cgpa or 0)
            eligible = []
            for drive in open_drives:
                min_cgpa = float(drive.min_cgpa or 0)
                if student_cgpa >= min_cgpa:
                    eligible.append(drive)

            target = eligible if eligible else open_drives
            lines = []
            for d in target[:3]:
                company = d.company_name or d.title or "Company"
                role_name = d.role or "Role"
                deadline = d.registration_deadline.strftime("%d %b") if d.registration_deadline else "TBD"
                lines.append(f"{company} - {role_name} (deadline: {deadline})")

            if eligible:
                return "Yes, drives are available. You can apply to: " + " | ".join(lines)
            return (
                "There are open drives, but eligibility may depend on criteria. "
                "Open drives: " + " | ".join(lines)
            )

    if role_key in {"faculty", "teacher"}:
        class_maps = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == user_id,
            FacultySubject.is_active == True,
        ).all()

        class_pairs = {(m.year, m.section) for m in class_maps if m.year and m.section}
        if not class_pairs:
            return None

        student_rows = db.query(Student.student_id, Student.year, Student.section).filter(
            or_(*[(Student.year == y) & (Student.section == s) for y, s in class_pairs])
        ).all()
        class_student_ids = [r[0] for r in student_rows]
        total_students = len(class_student_ids)

        if asks_attendance:
            if not class_student_ids:
                return "I could not find students mapped to your class yet."
            total_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id.in_(class_student_ids)
            ).scalar() or 0
            present_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.student_id.in_(class_student_ids),
                Attendance.status == True,
            ).scalar() or 0
            pct = round((present_att / total_att) * 100, 1) if total_att > 0 else 0
            return (
                f"Your class average attendance is {pct}% "
                f"across {total_students} student(s)."
            )

        if asks_pending_assignments:
            my_assignments = db.query(Assignment).filter(
                Assignment.faculty_id == user_id,
                Assignment.is_active == True,
            ).all()
            if not my_assignments:
                return "You have no active assignments right now."

            class_pairs = {(a.year, a.section) for a in my_assignments if a.year is not None and a.section}
            student_rows = db.query(Student.student_id, Student.year, Student.section).filter(
                or_(*[(Student.year == year_value) & (Student.section == section_value) for year_value, section_value in class_pairs])
            ).all() if class_pairs else []

            class_students = {}
            all_class_student_ids = []
            for sid, year_value, section_value in student_rows:
                class_students.setdefault((year_value, section_value), []).append(sid)
                all_class_student_ids.append(sid)

            submission_counts = {}
            if all_class_student_ids:
                submission_rows = db.query(
                    AssignmentSubmission.assignment_id,
                    func.count(AssignmentSubmission.id),
                ).filter(
                    AssignmentSubmission.assignment_id.in_([a.id for a in my_assignments]),
                    AssignmentSubmission.student_id.in_(all_class_student_ids),
                    or_(
                        AssignmentSubmission.is_submitted == True,
                        func.lower(func.coalesce(AssignmentSubmission.status, "")).in_([
                            "submitted", "done", "completed"
                        ]),
                    ),
                ).group_by(AssignmentSubmission.assignment_id).all()
                submission_counts = {assignment_id: int(count or 0) for assignment_id, count in submission_rows}

            pending_total = 0
            for a in my_assignments:
                cls_ids = class_students.get((a.year, a.section), [])
                if not cls_ids:
                    continue
                submitted = submission_counts.get(a.id, 0)
                pending_total += max(len(cls_ids) - submitted, 0)

            return (
                f"You have {len(my_assignments)} active assignment(s) with "
                f"approximately {pending_total} pending submission(s)."
            )

        if asks_marks:
            if not class_student_ids:
                return "I could not find marks scope for your class yet."
            avg_marks = db.query(func.avg(Mark.total)).filter(
                Mark.student_id.in_(class_student_ids),
                Mark.total.isnot(None),
            ).scalar()
            avg_value = round(float(avg_marks), 1) if avg_marks is not None else 0.0
            return (
                f"Your class average marks are {avg_value} "
                f"across {total_students} student(s)."
            )

        if asks_risk:
            if not class_student_ids:
                return "I could not find students in your class yet."

            att_rows = db.query(
                Attendance.student_id,
                func.count(Attendance.attendance_id),
                func.sum(case((Attendance.status == True, 1), else_=0)),
            ).filter(
                Attendance.student_id.in_(class_student_ids)
            ).group_by(Attendance.student_id).all()
            att_map = {}
            for sid, total, present in att_rows:
                total = int(total or 0)
                present = int(present or 0)
                att_map[sid] = round((present / total) * 100, 1) if total > 0 else 0

            mark_rows = db.query(
                Mark.student_id,
                func.avg(Mark.total),
            ).filter(
                Mark.student_id.in_(class_student_ids),
                Mark.total.isnot(None),
            ).group_by(Mark.student_id).all()
            mark_map = {sid: float(avg or 0) for sid, avg in mark_rows}

            at_risk = 0
            for sid in class_student_ids:
                level = _risk_level(att_map.get(sid, 0), mark_map.get(sid, 0))
                if level == "HIGH":
                    at_risk += 1

            pct = round((at_risk / total_students) * 100, 1) if total_students > 0 else 0
            return f"{at_risk} out of {total_students} students are at high risk ({pct}%)."

        if asks_drive_count or asks_apply_drives:
            open_count = db.query(func.count(PlacementDrive.id)).filter(
                func.lower(func.coalesce(PlacementDrive.status, "open")) == "open"
            ).scalar() or 0
            return f"There are currently {open_count} open placement drive(s)."

    if role_key == "admin":
        total_students = db.query(func.count(Student.student_id)).scalar() or 0

        if asks_attendance:
            total_att = db.query(func.count(Attendance.attendance_id)).scalar() or 0
            present_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.status == True,
            ).scalar() or 0
            pct = round((present_att / total_att) * 100, 1) if total_att > 0 else 0
            return f"Institution-wide attendance is {pct}% currently."

        if asks_marks:
            avg_marks = db.query(func.avg(Mark.total)).filter(
                Mark.total.isnot(None),
            ).scalar()
            avg_value = round(float(avg_marks), 1) if avg_marks is not None else 0.0
            return f"Institution-wide average marks are {avg_value}."

        if asks_pending_assignments:
            active_assignments = db.query(func.count(Assignment.id)).filter(
                Assignment.is_active == True,
            ).scalar() or 0
            return f"There are currently {active_assignments} active assignment(s) across the institution."

        if asks_risk or asks_institution or asks_class:
            att_rows = db.query(
                Attendance.student_id,
                func.count(Attendance.attendance_id),
                func.sum(case((Attendance.status == True, 1), else_=0)),
            ).group_by(Attendance.student_id).all()
            att_map = {}
            for sid, total, present in att_rows:
                total = int(total or 0)
                present = int(present or 0)
                att_map[sid] = round((present / total) * 100, 1) if total > 0 else 0

            mark_rows = db.query(Mark.student_id, func.avg(Mark.total)).filter(
                Mark.total.isnot(None),
            ).group_by(Mark.student_id).all()
            mark_map = {sid: float(avg or 0) for sid, avg in mark_rows}

            student_ids = [sid for (sid,) in db.query(Student.student_id).all()]
            at_risk = 0
            for sid in student_ids:
                if _risk_level(att_map.get(sid, 0), mark_map.get(sid, 0)) == "HIGH":
                    at_risk += 1

            pct = round((at_risk / total_students) * 100, 1) if total_students > 0 else 0
            return (
                f"{at_risk} out of {total_students} students are at high risk "
                f"institution-wide ({pct}%)."
            )

        if asks_drive_count or asks_apply_drives:
            open_drives = db.query(PlacementDrive).filter(
                func.lower(func.coalesce(PlacementDrive.status, "open")) == "open"
            ).order_by(PlacementDrive.registration_deadline.asc().nulls_last()).limit(5).all()
            if asks_drive_count and not asks_apply_drives:
                return f"There are currently {len(open_drives)} open placement drive(s)."
            if not open_drives:
                return "There are no open placement drives right now."
            lines = []
            for d in open_drives[:3]:
                company = d.company_name or d.title or "Company"
                role_name = d.role or "Role"
                lines.append(f"{company} - {role_name}")
            return "Open drives: " + " | ".join(lines)

    return None


@router.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        if isinstance(current_user, dict):
            user_id = (
                current_user.get("id") or
                current_user.get("user_id") or 1
            )
        else:
            user_id = (
                getattr(current_user, 'id', None) or
                getattr(current_user, 'user_id', None) or 1
            )

        user_id = int(user_id)

        import tempfile
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".pdf"
        ) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Remove previous uploaded PDF for this user, if any.
        old_pdf = _PDF_STORE.get(user_id, {})
        old_path = old_pdf.get("path")
        if old_path and os.path.exists(old_path):
            try:
                os.unlink(old_path)
            except Exception:
                pass

        # Store PDF path for follow-up questions
        _PDF_STORE[user_id] = {
            "path": tmp_path,
            "filename": file.filename
        }

        return {
            "message": "PDF uploaded successfully. Ask your question to analyze this document.",
            "filename": file.filename,
            "has_pdf": True
        }
    except Exception as e:
        traceback.print_exc()
        return {
            "message": f"Error uploading PDF: {str(e)}",
            "filename": "",
            "has_pdf": False
        }

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import traceback
    request_start = time.time()
    try:
        # ── Resolve user identity ─────────────────────────────────
        if isinstance(current_user, dict):
            user_id = current_user.get("user_id", 1)
            role    = current_user.get("role", "student")
        else:
            user_id = getattr(current_user, 'user_id', 1)
            role    = getattr(current_user, 'role', 'student')

        query = str(request.message or "")
        request_payload = request.dict()
        force_live_ai = bool(request_payload.get("force_live_ai", False))
        print(f"[REQUEST] user={user_id} query='{query}'")
        print(f"[CHAT] role={role} user_id={user_id} msg={request.message[:60]}")

        # ── Natural-language alert rule creation path ────────────
        parsed_rules = _parse_alert_rules_from_message(query, str(role or "student"))
        if parsed_rules:
            from rag.alert_rules_engine import add_alert_rule

            normalized_role = _normalize_role(str(role or "student"))
            saved_items = []
            for parsed_rule in parsed_rules:
                parsed_rule["role"] = normalized_role
                add_alert_rule(int(user_id), parsed_rule)
                cond_label = {
                    "lt": "below",
                    "gt": "above",
                    "eq": "equal to",
                }.get(str(parsed_rule.get("condition")), "below")
                saved_items.append(
                    f"{str(parsed_rule.get('type', '')).replace('_', ' ')} {cond_label} {parsed_rule.get('threshold')}"
                )

            if len(saved_items) == 1:
                confirmation = (
                    f"Alert set successfully. I will notify you when {saved_items[0]}."
                )
            else:
                confirmation = (
                    "Multiple alerts set successfully:\n- "
                    + "\n- ".join(saved_items)
                )

            def stream_alert_confirmation():
                for chunk in chunk_text(confirmation):
                    yield chunk

            return StreamingResponse(
                stream_alert_confirmation(),
                media_type="text/plain; charset=utf-8",
                headers={
                    "X-Response-Mode": "verified_data",
                    "X-Response-Source": "alert_rule",
                },
            )

        # ── Fast path for greetings/courtesy messages ─────────────
        display_name = resolve_user_display_name(current_user, db)
        quick_reply = get_fast_smalltalk_reply(query, display_name=display_name)
        if quick_reply:
            print("[CHAT] Fast small-talk response path")

            def stream_fast_response():
                for chunk in chunk_text(quick_reply):
                    yield chunk

            return StreamingResponse(
                stream_fast_response(),
                media_type="text/plain; charset=utf-8",
                headers={
                    "X-Response-Mode": "live_ai",
                    "X-Response-Source": "fast_local",
                }
            )

        # ── Fast path for standard dashboard questions ──────────
        fast_data_reply = get_fast_standard_reply(
            message=query,
            user_id=int(user_id or 0),
            role=str(role or "student"),
            db=db,
        )
        if fast_data_reply:
            print("[CHAT] Fast standard-data response path")

            def stream_fast_data_response():
                for chunk in chunk_text(fast_data_reply):
                    yield chunk

            return StreamingResponse(
                stream_fast_data_response(),
                media_type="text/plain; charset=utf-8",
                headers={
                    "X-Response-Mode": "verified_data",
                    "X-Response-Source": "fast_db",
                }
            )

        # ── Access control ────────────────────────────────────────
        try:
            from rag.query_router import is_query_allowed
            allowed, denial = is_query_allowed(request.message, role)
            if not allowed:
                return {"reply": denial, "role": role, "allowed": False}
        except Exception:
            pass   # if query_router is missing, skip check

        history = normalize_history(request.history or [])

        # Check if user has an uploaded PDF and question
        # is about the PDF
        user_id_for_pdf = int(user_id)
        if user_id_for_pdf in _PDF_STORE:
            pdf_keywords = [
                "pdf", "document", "file", "uploaded",
                "explain", "summarize", "what does it say",
                "according to", "in the document", "the report",
                "project", "technologies", "technology", "tech stack",
                "team members", "members"
            ]
            if any(kw in query.lower() for kw in pdf_keywords):
                from rag.pdf_processor import answer_pdf_question
                pdf_info = _PDF_STORE[user_id_for_pdf]
                pdf_answer = answer_pdf_question(
                    pdf_info["path"],
                    query,
                    role
                )
                if pdf_answer:
                    return {
                        "reply": pdf_answer,
                        "role": role,
                        "allowed": True,
                        "source": "pdf"
                    }

        # ── AI daily usage guard (applies only to expensive AI calls) ──
        ai_used_today = _get_daily_ai_usage_count(db, int(user_id))
        ai_remaining_before = max(0, AI_DAILY_RESPONSE_LIMIT - ai_used_today)

        if ai_remaining_before <= 0:
            limit_text = (
                "You have reached your daily AI limit (3/3). "
                "AI responses are paused for today. "
                "You can still ask related to your marks, attendance, assignments, and other dashboard data."
            )

            return StreamingResponse(
                chunk_text(limit_text),
                media_type="text/plain; charset=utf-8",
                headers={
                    "X-Response-Mode": "verified_data",
                    "X-Response-Source": "ai_limit",
                    "X-AI-Limit-Remaining": "0",
                    "X-AI-Limit": str(AI_DAILY_RESPONSE_LIMIT),
                    "X-AI-Limit-Status": "exceeded",
                },
            )

        # ── Run LangGraph RAG pipeline ──────────────────────────
        role_lower = str(role).lower()
        reply_source = "unknown"
        try:
            from rag.graph_pipeline import run_rag_pipeline
            pipeline_result = run_rag_pipeline(
                user_id=int(user_id),
                role=role_lower,
                question=request.message,
                history=history[-6:],
                db=db,
                include_meta=True,
                force_live_ai=force_live_ai,
                thread_id=str(request_payload.get("thread_id") or "").strip() or None,
            )
            if isinstance(pipeline_result, dict):
                reply = pipeline_result.get("answer")
                reply_source = str(pipeline_result.get("source") or "unknown")
            else:
                reply = pipeline_result
        except Exception:
            traceback.print_exc()
            reply = None
            reply_source = "error"

        if not reply or len(str(reply).strip()) < 3:
            reply = ("I couldn't find specific data for that. "
                     "Please check your dashboard.")
            reply_source = "error"

        ai_reply_sources = {"gemini", "langchain"}
        ai_limit_status = "not_used"
        ai_remaining_after = ai_remaining_before

        if str(reply_source or "").lower() in ai_reply_sources:
            _record_daily_ai_usage(db, int(user_id), str(role))
            ai_remaining_after = max(0, ai_remaining_before - 1)

            if ai_remaining_after <= 0:
                ai_limit_status = "reached"
                reply = (
                    f"{str(reply).strip()}\n\n"
                    "AI limit update: You have completed your AI limit for today (3/3). "
                    "You can still ask related to your marks, attendance, assignments, and dashboard data."
                )
            elif ai_remaining_after == 1:
                ai_limit_status = "warning"
                reply = (
                    f"{str(reply).strip()}\n\n"
                    "Warning: You have 1 AI response left for today. "
                    "You can always continue with marks/attendance/dashboard queries."
                )
            else:
                ai_limit_status = "ok"

        response_mode = map_response_mode(reply_source)
        inferred_mode = infer_mode_from_text(str(reply))
        if inferred_mode:
            response_mode = inferred_mode

        print(f"[CHAT] reply={str(reply)}")
        print(f"[CHAT] source={reply_source} mode={response_mode}")
        print(f"[TOTAL TIME] {time.time() - request_start:.2f}s")

        def stream_response():
            full_text = str(reply)
            for chunk in chunk_text(full_text):
                yield chunk

        return StreamingResponse(
            stream_response(),
            media_type="text/plain; charset=utf-8",
            headers={
                "X-Response-Mode": response_mode,
                "X-Response-Source": reply_source,
                "X-AI-Limit-Remaining": str(ai_remaining_after),
                "X-AI-Limit": str(AI_DAILY_RESPONSE_LIMIT),
                "X-AI-Limit-Status": ai_limit_status,
            }
        )

    except Exception as e:
        traceback.print_exc()
        print(f"[ERROR] {str(e)}")
        print(f"[CHAT ERROR] {e}")
        print(f"[TOTAL TIME] {time.time() - request_start:.2f}s")
        return JSONResponse(
            status_code=200,
            content={
                "reply": "I'm having trouble accessing your data. Please try again.",
                "role":    "unknown",
                "allowed": True,
                "mode": "verified_data",
                "source": "error",
            }
        )

@router.get("/suggested/{role}")
async def get_suggested(role: str):
    role = role.lower()
    if role == "faculty":
        role = "teacher"
    
    suggestions = {
        "student": [
            "What is my current attendance percentage?",
            "Which subject do I need to focus on?",
            "Am I at risk of failing?",
            "What tasks should I complete today?",
            "Am I eligible for placement drives?"
        ],
        "teacher": [
            "What is my class average attendance?",
            "How many students are at risk in my class?",
            "Which subject has the lowest performance?",
            "How many assignments are pending submission?",
            "What should I focus on this week?"
        ],
        "admin": [
            "How many students are at risk institution-wide?",
            "Which department has the lowest attendance?",
            "How many placement drives are currently open?",
            "Give me this week's academic summary.",
            "Which departments need immediate intervention?"
        ]
    }
    return suggestions.get(role, suggestions["student"])


@router.get("/gemini-status")
async def get_gemini_status(db: Session = Depends(get_db)):
    """
    Returns the status of all Gemini API keys for monitoring/debugging.
    Shows which keys are active, exhausted, or in cooldown.
    """
    try:
        from rag.key_pool_manager import KeyPoolManager
        
        manager = KeyPoolManager(db)
        status = manager.get_key_status()
        
        return {
            "timestamp": time.time(),
            "keys": status,
            "message": "API key pool status snapshot"
        }
    except Exception as e:
        print(f"[ERROR] Failed to get Gemini status: {str(e)}")
        return {
            "timestamp": time.time(),
            "keys": {},
            "error": str(e),
            "message": "Unable to fetch Gemini status"
        }


class AlertRuleCreateRequest(BaseModel):
    type: str
    condition: str = "lt"  # lt | gt | eq
    threshold: float
    message: Optional[str] = ""


class AlertRuleUpdateRequest(BaseModel):
    type: Optional[str] = None
    condition: Optional[str] = None
    threshold: Optional[float] = None
    message: Optional[str] = None
    active: Optional[bool] = None


def _normalize_role(raw_role: str) -> str:
    role = str(raw_role or "student").strip().lower()
    if role == "teacher":
        return "faculty"
    return role


def _compute_role_metrics(user_id: int, role: str, db: Session) -> Dict[str, float]:
    from models import Attendance, Assignment, AssignmentSubmission, Student, Mark

    role = _normalize_role(role)
    metrics: Dict[str, float] = {}

    if role == "student":
        total_rows = db.query(Attendance).filter(Attendance.student_id == user_id).count()
        present_rows = db.query(Attendance).filter(
            Attendance.student_id == user_id,
            Attendance.status == True,
        ).count()
        attendance_pct = (present_rows / total_rows * 100.0) if total_rows > 0 else 100.0

        student = db.query(Student).filter(Student.student_id == user_id).first()
        cgpa = float(student.cgpa) if student and student.cgpa is not None else 0.0

        marks_avg = db.query(func.avg(Mark.total)).filter(Mark.student_id == user_id).scalar()
        avg_marks = float(marks_avg) if marks_avg is not None else 0.0

        pending_assignments = (
            db.query(Assignment)
            .filter(
                Assignment.year == (student.year if student else -1),
                Assignment.section == (student.section if student else ""),
                Assignment.is_active == True,
            )
            .count()
        )
        submitted_assignment_ids = {
            sid for (sid,) in db.query(AssignmentSubmission.assignment_id).filter(
                AssignmentSubmission.student_id == user_id,
                AssignmentSubmission.is_submitted == True,
            ).all()
        }
        pending_count = max(0, int(pending_assignments) - len(submitted_assignment_ids))

        metrics = {
            "attendance": attendance_pct,
            "cgpa": cgpa,
            "avg_marks": avg_marks,
            "pending_assignments": float(pending_count),
        }
        return metrics

    if role == "faculty":
        total_rows = db.query(Attendance).filter(Attendance.faculty_id == user_id).count()
        present_rows = db.query(Attendance).filter(
            Attendance.faculty_id == user_id,
            Attendance.status == True,
        ).count()
        class_attendance_pct = (present_rows / total_rows * 100.0) if total_rows > 0 else 100.0

        assignments = db.query(Assignment).filter(
            Assignment.faculty_id == user_id,
            Assignment.is_active == True,
        ).all()
        pending_submissions = 0
        for assignment in assignments:
            total_students = db.query(Student).filter(
                Student.year == assignment.year,
                Student.section == assignment.section,
                Student.is_deleted == False,
            ).count()
            submitted = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id == assignment.id,
                AssignmentSubmission.is_submitted == True,
            ).count()
            pending_submissions += max(0, total_students - submitted)

        metrics = {
            "class_attendance": class_attendance_pct,
            "pending_submissions": float(pending_submissions),
        }
        return metrics

    # admin
    total_rows = db.query(Attendance).count()
    present_rows = db.query(Attendance).filter(Attendance.status == True).count()
    institution_attendance_pct = (present_rows / total_rows * 100.0) if total_rows > 0 else 100.0

    student_ids = [sid for (sid,) in db.query(Student.student_id).filter(Student.is_deleted == False).all()]
    at_risk_count = 0
    for sid in student_ids:
        sid_total = db.query(Attendance).filter(Attendance.student_id == sid).count()
        if sid_total <= 0:
            continue
        sid_present = db.query(Attendance).filter(
            Attendance.student_id == sid,
            Attendance.status == True,
        ).count()
        sid_pct = sid_present / sid_total * 100.0
        if sid_pct < 75.0:
            at_risk_count += 1

    metrics = {
        "institution_attendance": institution_attendance_pct,
        "at_risk_students": float(at_risk_count),
    }
    return metrics


@router.post("/alert-rules")
async def create_alert_rule(
    payload: AlertRuleCreateRequest,
    current_user=Depends(get_current_user),
):
    from rag.alert_rules_engine import add_alert_rule

    role = _normalize_role(current_user.get("role", "student"))
    user_id = int(current_user.get("user_id", 0) or 0)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")

    rule = {
        "role": role,
        "type": str(payload.type or "").strip().lower(),
        "condition": str(payload.condition or "lt").strip().lower(),
        "threshold": float(payload.threshold),
        "message": str(payload.message or "").strip(),
        "active": True,
    }
    add_alert_rule(user_id, rule)
    return {"ok": True, "message": "Alert rule saved successfully"}


@router.get("/alert-rules")
async def get_alert_rules(current_user=Depends(get_current_user)):
    from rag.alert_rules_engine import list_alert_rules

    user_id = int(current_user.get("user_id", 0) or 0)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")
    return list_alert_rules(user_id)


@router.patch("/alert-rules/{rule_id}")
async def patch_alert_rule(
    rule_id: str,
    payload: AlertRuleUpdateRequest,
    current_user=Depends(get_current_user),
):
    from rag.alert_rules_engine import update_alert_rule

    user_id = int(current_user.get("user_id", 0) or 0)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")

    updates = payload.dict(exclude_none=True)
    ok = update_alert_rule(user_id=user_id, rule_id=rule_id, updates=updates)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return {"ok": True, "message": "Alert rule updated"}


@router.delete("/alert-rules/{rule_id}")
async def remove_alert_rule(rule_id: str, current_user=Depends(get_current_user)):
    from rag.alert_rules_engine import delete_alert_rule

    user_id = int(current_user.get("user_id", 0) or 0)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")

    ok = delete_alert_rule(user_id=user_id, rule_id=rule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Alert rule not found")
    return {"ok": True, "message": "Alert rule deleted"}


@router.get("/alert-notifications")
async def get_alert_notifications(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from rag.alert_rules_engine import evaluate_alert_rules, get_alert_notifications

    user_id = int(current_user.get("user_id", 0) or 0)
    role = _normalize_role(current_user.get("role", "student"))
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")

    metrics = _compute_role_metrics(user_id=user_id, role=role, db=db)
    evaluate_alert_rules(user_id=user_id, role=role, metrics=metrics)
    return get_alert_notifications(user_id)


@router.post("/alert-notifications/mark-all-read")
async def mark_chat_alerts_read(current_user=Depends(get_current_user)):
    from rag.alert_rules_engine import mark_all_notifications_read

    user_id = int(current_user.get("user_id", 0) or 0)
    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user")
    updated = mark_all_notifications_read(user_id)
    return {"ok": True, "updated": updated}
