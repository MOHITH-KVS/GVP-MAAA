from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
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
                AssignmentSubmission.assignment_id.in_(assignment_ids),
                or_(
                    AssignmentSubmission.is_submitted == True,
                    func.lower(func.coalesce(AssignmentSubmission.status, "")).in_(
                        ["submitted", "done", "completed"]
                    ),
                ),
            ).all()

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
            open_drives = db.query(PlacementDrive).filter(
                func.lower(func.coalesce(PlacementDrive.status, "open")) == "open"
            ).order_by(PlacementDrive.registration_deadline.asc().nulls_last()).limit(10).all()

            if asks_drive_count and not asks_apply_drives:
                return f"There are currently {len(open_drives)} open placement drive(s)."
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

            pending_total = 0
            for a in my_assignments:
                cls_students = db.query(Student.student_id).filter(
                    Student.year == a.year,
                    Student.section == a.section,
                ).all()
                cls_ids = [r[0] for r in cls_students]
                if not cls_ids:
                    continue

                submitted = db.query(func.count(AssignmentSubmission.id)).filter(
                    AssignmentSubmission.assignment_id == a.id,
                    AssignmentSubmission.student_id.in_(cls_ids),
                    or_(
                        AssignmentSubmission.is_submitted == True,
                        func.lower(func.coalesce(AssignmentSubmission.status, "")).in_(
                            ["submitted", "done", "completed"]
                        ),
                    ),
                ).scalar() or 0
                pending_total += max(len(cls_ids) - int(submitted), 0)

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
    tmp_path = None
    try:
        if isinstance(current_user, dict):
            user_id = int(current_user.get("user_id", 0) or 0)
        else:
            user_id = int(getattr(current_user, "user_id", 0) or 0)

        if user_id <= 0:
            return {"message": "Authentication required.", "filename": "", "uploaded": False}

        if file.content_type and "pdf" not in file.content_type.lower():
            return {"message": "Only PDF files are supported.", "filename": file.filename or "", "uploaded": False}

        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        from rag.pdf_processor import extract_text_from_pdf, set_pdf_context_for_user

        text = extract_text_from_pdf(tmp_path)
        if not text or text.startswith("Could not"):
            return {
                "message": "Could not read the PDF file.",
                "filename": file.filename or "",
                "uploaded": False,
            }

        set_pdf_context_for_user(user_id, text, file.filename or "")

        return {
            "message": "PDF uploaded successfully. Ask your question and I will answer using this document.",
            "filename": file.filename or "",
            "uploaded": True,
        }
    except Exception as e:
        traceback.print_exc()
        return {"message": f"Error: {e}", "filename": "", "uploaded": False}
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

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

        # ── Run LangGraph RAG pipeline ──────────────────────────
        role_lower = str(role).lower()
        reply_source = "unknown"
        try:
            question_for_pipeline = request.message
            try:
                from rag.pdf_processor import get_pdf_context_for_user
                pdf_context = get_pdf_context_for_user(int(user_id))
                pdf_text = str(pdf_context.get("text") or "").strip()
                pdf_filename = str(pdf_context.get("filename") or "uploaded PDF")
                if pdf_text:
                    question_for_pipeline = (
                        f"User has uploaded a PDF named '{pdf_filename}'. "
                        "Use the following PDF content when answering the user question. "
                        "If the question is unrelated to this PDF, answer normally.\n\n"
                        f"PDF CONTENT:\n{pdf_text[:4000]}\n\n"
                        f"USER QUESTION:\n{request.message}"
                    )
            except Exception:
                pass

            from rag.graph_pipeline import run_rag_pipeline
            pipeline_result = run_rag_pipeline(
                user_id=int(user_id),
                role=role_lower,
                question=question_for_pipeline,
                history=history[-6:],
                db=db,
                include_meta=True,
                force_live_ai=force_live_ai,
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
