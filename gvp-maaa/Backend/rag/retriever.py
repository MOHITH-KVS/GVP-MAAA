"""
rag/retriever.py  —  R in RAG
Retrieves all structured data from PostgreSQL for a given user/role.
Uses exact column names confirmed from SQLAlchemy logs.
"""
import time
from concurrent.futures import ThreadPoolExecutor

from sqlalchemy.orm import Session
from sqlalchemy import func
import traceback

from database import SessionLocal


def _safe_rollback(db: Session) -> None:
    """Roll back only when the session is in a failed transaction state."""
    try:
        db.rollback()
    except Exception:
        pass


_CACHE = {}
CACHE_TTL = 300  # 5 minutes


def get_cached(key):
    if key in _CACHE:
        data, ts = _CACHE[key]
        if time.time() - ts < CACHE_TTL:
            print(f"[CACHE HIT] {key}")
            return data
    return None


def set_cached(key, data):
    _CACHE[key] = (data, time.time())


def retrieve_student_data(student_id: int, db: Session) -> dict:
    """Retrieves ALL data for a student in one call."""
    start = time.time()
    cache_key = f"retrieve_student_data:{student_id}"
    cached = get_cached(cache_key)
    if cached is not None:
        print(f"[PERF] retrieve_student_data took {time.time() - start:.2f}s")
        return cached

    data = {
        "student_id": student_id,
        "attendance": {},
        "marks": [],
        "assignments": {},
        "alerts": [],
        "events": [],
        "resources": [],
        "risk": {},
        "profile": {},
        "placement": {}
    }

    try:
        from models import (Student, Attendance, Mark, Subject,
                            Assignment, AssignmentSubmission, Alert)

        # ── PROFILE ──────────────────────────────────────────────
        try:
            student = db.query(Student).filter(
                Student.student_id == student_id
            ).first()
            if student:
                data["profile"] = {
                    "year":     student.year,
                    "section":  student.section,
                    "semester": student.semester,
                    "cgpa":     float(student.cgpa) if student.cgpa else None,
                    "roll_no":  student.roll_no
                }
        except Exception:
            traceback.print_exc()

        # ── ATTENDANCE ───────────────────────────────────────────
        try:
            total = db.query(
                func.count(Attendance.attendance_id)
            ).filter(Attendance.student_id == student_id).scalar() or 0

            present = db.query(
                func.count(Attendance.attendance_id)
            ).filter(
                Attendance.student_id == student_id,
                Attendance.status == True
            ).scalar() or 0

            att_pct = round((present / total) * 100, 1) if total > 0 else 0

            # Per-subject breakdown
            subject_ids = [
                r[0] for r in db.query(Attendance.subject_id).filter(
                    Attendance.student_id == student_id
                ).distinct().all()
                if r[0] is not None
            ]

            per_subject = []
            for sid in subject_ids:
                s_total = db.query(
                    func.count(Attendance.attendance_id)
                ).filter(
                    Attendance.student_id == student_id,
                    Attendance.subject_id == sid
                ).scalar() or 0

                s_present = db.query(
                    func.count(Attendance.attendance_id)
                ).filter(
                    Attendance.student_id == student_id,
                    Attendance.subject_id == sid,
                    Attendance.status == True
                ).scalar() or 0

                s_pct = round(
                    (s_present / s_total) * 100, 1
                ) if s_total > 0 else 0

                subj_name = f"Subject_{sid}"
                try:
                    subj = db.query(Subject).filter(
                        Subject.subject_id == sid
                    ).first()
                    if subj and subj.subject_name:
                        subj_name = subj.subject_name
                except Exception:
                    pass

                per_subject.append({
                    "subject_id":    sid,
                    "subject_name":  subj_name,
                    "total_classes": s_total,
                    "present":       s_present,
                    "percentage":    s_pct,
                    "status":        "OK" if s_pct >= 75 else "LOW"
                })

            data["attendance"] = {
                "overall_percentage": att_pct,
                "total_classes":      total,
                "present":            present,
                "absent":             total - present,
                "status": "Above 75%" if att_pct >= 75 else "Below 75% - URGENT",
                "per_subject":        per_subject
            }
        except Exception:
            traceback.print_exc()

        # ── MARKS ────────────────────────────────────────────────
        try:
            from models import Faculty, User

            mark_records = db.query(Mark).filter(
                Mark.student_id == student_id
            ).all()

            marks_list = []
            for m in mark_records:
                try:
                    subj_name = f"Subject_{m.subject_id}"
                    try:
                        subj = db.query(Subject).filter(
                            Subject.subject_id == m.subject_id
                        ).first()
                        if subj and subj.subject_name:
                            subj_name = subj.subject_name
                    except Exception:
                        pass

                    faculty_name = "Unknown"
                    faculty_id = getattr(m, 'faculty_id', None)
                    if faculty_id:
                        try:
                            fac = db.query(Faculty).filter(
                                Faculty.faculty_id == faculty_id
                            ).first()
                            if fac:
                                fac_user_id = (
                                    getattr(fac, 'user_id', None) or
                                    faculty_id
                                )
                                fac_user = db.query(User).filter(
                                    User.user_id == fac_user_id
                                ).first()
                                if fac_user:
                                    faculty_name = (
                                        getattr(fac_user, 'name', None) or
                                        getattr(fac_user, 'full_name', None) or
                                        getattr(fac_user, 'username', None) or
                                        "Unknown"
                                    )
                        except Exception:
                            pass

                    score = float(m.marks) if m.marks is not None else 0
                    out_of = float(m.total) if (m.total and float(m.total) > 0) else 30
                    pct = round((score / out_of) * 100, 1) if out_of > 0 else 0

                    marks_list.append({
                        "subject": subj_name,
                        "faculty_name": faculty_name,
                        "exam_type": str(m.exam or ""),
                        "score": score,
                        "out_of": out_of,
                        "pct": pct,
                        "total": out_of,
                        "percentage": pct,
                        "mid1": float(m.mid1) if m.mid1 is not None else None,
                        "mid2": float(m.mid2) if m.mid2 is not None else None,
                        "cgpa": float(m.cgpa) if m.cgpa is not None else None,
                        "sgpa": float(m.sgpa) if m.sgpa is not None else None,
                    })
                except Exception:
                    continue

            data["marks"] = marks_list
        except Exception:
            traceback.print_exc()

        # ── ASSIGNMENTS ──────────────────────────────────────────
        try:
            year    = data["profile"].get("year")
            section = data["profile"].get("section")

            if year and section:
                all_assignments = db.query(Assignment).filter(
                    Assignment.year    == year,
                    Assignment.section == section,
                    Assignment.is_active == True
                ).all()

                submissions = db.query(AssignmentSubmission).filter(
                    AssignmentSubmission.student_id == student_id
                ).all()

                submitted_ids = set()
                for sub in submissions:
                    is_sub = getattr(sub, 'is_submitted', None)
                    status = getattr(sub, 'status', None)
                    if (is_sub is True or
                            str(status).lower() in [
                                'submitted', '1', 'true', 'done']):
                        submitted_ids.add(sub.assignment_id)

                pending        = []
                submitted_list = []
                for assg in all_assignments:
                    if assg.id in submitted_ids:
                        submitted_list.append(assg.title)
                    else:
                        pending.append({
                            "title":    assg.title,
                            "due_date": str(assg.due_date) if assg.due_date else "No deadline"
                        })

                data["assignments"] = {
                    "total":          len(all_assignments),
                    "pending_count":  len(pending),
                    "submitted_count": len(submitted_list),
                    "pending_list":   pending[:5],
                    "submitted_list": submitted_list[:3]
                }
        except Exception:
            traceback.print_exc()

        # ── ALERTS ───────────────────────────────────────────────
        try:
            alerts = db.query(Alert).filter(
                Alert.student_id == student_id
            ).limit(5).all()
            data["alerts"] = [
                {
                    "title":   getattr(a, 'title',   ''),
                    "message": getattr(a, 'message', ''),
                    "type":    getattr(a, 'type',    '')
                }
                for a in alerts
            ]
        except Exception:
            traceback.print_exc()

        # ── RISK ─────────────────────────────────────────────────
        try:
            from ml.risk_engine import calculate_risk
            att_pct = data["attendance"].get("overall_percentage", 100)
            marks   = data["marks"]
            mid1    = marks[0].get("mid1") if marks else None
            mid2    = marks[0].get("mid2") if marks else None
            risk_result = calculate_risk(
                {"attendance": att_pct, "mid1": mid1, "mid2": mid2},
                {"attendance": 75, "marks": 15}
            )
            data["risk"] = {
                "level":   risk_result.get("level",      "LOW"),
                "score":   risk_result.get("risk_score", 0),
                "reasons": risk_result.get("reasons",    []),
                "actions": risk_result.get("actions",    [])
            }
        except Exception:
            data["risk"] = {"level": "LOW", "score": 0}

        # ── EVENTS ───────────────────────────────────────────────
        try:
            from models import Event
            events = db.query(Event).limit(10).all()
            data["events"] = [
                {
                    "name": getattr(e, 'title',      getattr(e, 'name', 'Event')),
                    "date": str(getattr(e, 'event_date', getattr(e, 'date', 'TBD'))),
                    "type": getattr(e, 'event_type', getattr(e, 'type', 'General'))
                }
                for e in events
            ]
        except Exception:
            pass

        # ── RESOURCES ────────────────────────────────────────────
        try:
            from models import Resource
            resources = db.query(Resource).order_by(
                Resource.id.desc()
            ).limit(15).all()

            resource_list = []
            for r in resources:
                # Resolve subject name from subject_id
                subj_name = "General"
                r_subj_id = getattr(r, 'subject_id', None)
                if r_subj_id:
                    try:
                        subj = db.query(Subject).filter(
                            Subject.subject_id == r_subj_id
                        ).first()
                        if subj and subj.subject_name:
                            subj_name = subj.subject_name
                        else:
                            subj_name = f"Subject_{r_subj_id}"
                    except Exception:
                        subj_name = f"Subject_{r_subj_id}"

                resource_list.append({
                    "title":    getattr(r, 'title', getattr(r, 'resource_name', 'Resource')),
                    "subject":  subj_name,
                    "type":     getattr(r, 'type', getattr(r, 'resource_type', 'Document')),
                    "uploaded": str(getattr(r, 'created_at', 'Recent'))
                })

            data["resources"] = resource_list
        except Exception:
            pass

        # ── PLACEMENT ────────────────────────────────────────────
        try:
            from models import PlacementDrive, StudentDrive
            from sqlalchemy import text

            # Get student's eligibility info
            student = data.get("profile", {})
            cgpa = student.get("cgpa", 0) or 0

            # Get open placement drives
            open_drives = db.query(PlacementDrive).filter(
                PlacementDrive.status == "open"
            ).limit(5).all()

            drive_list = []
            for drive in open_drives:
                min_cgpa = getattr(drive, 'min_cgpa', 0) or 0
                eligible = float(cgpa) >= float(min_cgpa) if min_cgpa else True

                drive_list.append({
                    "company": getattr(drive, 'company_name',
                               getattr(drive, 'title', 'Company')),
                    "role": getattr(drive, 'role', 'N/A'),
                    "package": getattr(drive, 'package_lpa', 'N/A'),
                    "min_cgpa": min_cgpa,
                    "eligible": eligible,
                    "deadline": str(getattr(drive, 'registration_deadline',
                                   getattr(drive, 'drive_date', 'TBD')))
                })

            data["placement"] = {
                "open_drives_count": len(drive_list),
                "drives": drive_list,
                "student_cgpa": cgpa
            }
            print(f"[RETRIEVER] Student placement: "
                  f"{len(drive_list)} open drives")

        except Exception as e:
            print(f"[RETRIEVER] Placement error: {e}")
            data["placement"] = {"open_drives_count": 0, "drives": []}

    except Exception:
        traceback.print_exc()

    set_cached(cache_key, data)
    print(f"[PERF] retrieve_student_data took {time.time() - start:.2f}s")
    return data


def retrieve_teacher_data(teacher_id: int, db: Session) -> dict:
    """Retrieves class-level data for a teacher/faculty."""
    start = time.time()
    cache_key = f"retrieve_teacher_data:{teacher_id}"
    cached = get_cached(cache_key)
    if cached is not None:
        print(f"[PERF] retrieve_teacher_data took {time.time() - start:.2f}s")
        return cached

    data = {
        "teacher_id":      teacher_id,
        "faculty_name": "Unknown",
        "subjects":        [],
        "class_attendance": {},
        "class_marks":     {},
        "assignments":     {},
        "at_risk_students": {},
        "class_students": [],
        "at_risk_students_detail": []
    }

    try:
        from models import FacultySubject, Subject, Attendance, Mark, Faculty
        from models import Assignment, AssignmentSubmission

        # ── FACULTY ID RESOLUTION ────────────────────────────────
        # Faculty.faculty_id is a FK to users.user_id (same value),
        # but double-check in case ID differs from auth user_id
        actual_faculty_id = teacher_id
        try:
            faculty_rec = db.query(Faculty).filter(
                Faculty.faculty_id == teacher_id
            ).first()
            if faculty_rec:
                actual_faculty_id = faculty_rec.faculty_id
            else:
                # Some setups use a separate id column
                faculty_rec2 = db.query(Faculty).filter(
                    getattr(Faculty, 'user_id', Faculty.faculty_id) == teacher_id
                ).first()
                if faculty_rec2:
                    actual_faculty_id = faculty_rec2.faculty_id
        except Exception:
            pass  # keep teacher_id as fallback

        print(f"[RETRIEVER] teacher_id={teacher_id} -> actual_faculty_id={actual_faculty_id}")

        try:
            from models import User

            faculty = db.query(Faculty).filter(
                Faculty.faculty_id == actual_faculty_id
            ).first()

            faculty_name = "Unknown"
            if faculty:
                faculty_user_id = (
                    getattr(faculty, 'user_id', None) or
                    getattr(faculty, 'id', None) or
                    actual_faculty_id
                )
                user = db.query(User).filter(
                    User.user_id == faculty_user_id
                ).first()
                if user:
                    faculty_name = (
                        getattr(user, 'name', None) or
                        getattr(user, 'full_name', None) or
                        getattr(user, 'username', None) or
                        "Unknown"
                    )

            data["faculty_name"] = faculty_name
            print(f"[RETRIEVER] Faculty name: {faculty_name}")
        except Exception as e:
            print(f"[RETRIEVER] Faculty name error: {e}")
            data["faculty_name"] = "Unknown"

        # ── SUBJECTS ─────────────────────────────────────────────
        subject_ids = []
        try:
            faculty_subjects = db.query(FacultySubject).filter(
                FacultySubject.faculty_id == actual_faculty_id
            ).all()
            subject_ids = [
                fs.subject_id for fs in faculty_subjects
                if fs.subject_id is not None
            ]

            if not subject_ids:
                # Fallback: look at marks table
                rows = db.query(Mark.subject_id).filter(
                    Mark.faculty_id == actual_faculty_id
                ).distinct().all()
                subject_ids = [r[0] for r in rows if r[0]]

            for sid in subject_ids:
                try:
                    subj = db.query(Subject).filter(
                        Subject.subject_id == sid
                    ).first()
                    if subj:
                        data["subjects"].append({
                            "id":   sid,
                            "name": subj.subject_name or f"Subject_{sid}"
                        })
                except Exception:
                    pass
        except Exception:
            traceback.print_exc()

        # ── STUDENT IDs TAUGHT ────────────────────────────────────
        try:
            student_ids = [
                r[0] for r in db.query(Attendance.student_id).filter(
                    Attendance.faculty_id == actual_faculty_id
                ).distinct().all() if r[0]
            ]

            if not student_ids and subject_ids:
                student_ids = [
                    r[0] for r in db.query(Attendance.student_id).filter(
                        Attendance.subject_id.in_(subject_ids)
                    ).distinct().all() if r[0]
                ]

            if not student_ids:
                try:
                    from models import Student as St

                    class_pairs = db.query(
                        FacultySubject.year,
                        FacultySubject.section
                    ).filter(
                        FacultySubject.faculty_id == actual_faculty_id
                    ).distinct().all()

                    for yr, sec in class_pairs:
                        if yr is None or sec is None:
                            continue
                        ids = db.query(St.student_id).filter(
                            St.year == yr,
                            St.section == sec,
                            St.is_deleted == False
                        ).all()
                        for row in ids:
                            if row[0] and row[0] not in student_ids:
                                student_ids.append(row[0])
                except Exception:
                    pass

            if not student_ids:
                try:
                    from models import Assignment, Student as St

                    class_pairs = db.query(
                        Assignment.year,
                        Assignment.section
                    ).filter(
                        Assignment.faculty_id == actual_faculty_id,
                        Assignment.is_active == True
                    ).distinct().all()

                    for yr, sec in class_pairs:
                        if yr is None or sec is None:
                            continue
                        ids = db.query(St.student_id).filter(
                            St.year == yr,
                            St.section == sec,
                            St.is_deleted == False
                        ).all()
                        for row in ids:
                            if row[0] and row[0] not in student_ids:
                                student_ids.append(row[0])
                except Exception:
                    pass

            if student_ids:
                att_values = []
                low_att    = 0

                for sid in student_ids[:100]:
                    try:
                        t = db.query(func.count(Attendance.attendance_id)).filter(
                            Attendance.student_id == sid,
                            Attendance.faculty_id == actual_faculty_id
                        ).scalar() or 0
                        p = db.query(func.count(Attendance.attendance_id)).filter(
                            Attendance.student_id == sid,
                            Attendance.faculty_id == actual_faculty_id,
                            Attendance.status == True
                        ).scalar() or 0
                        if t > 0:
                            pct = (p / t) * 100
                            att_values.append(pct)
                            if pct < 75:
                                low_att += 1
                    except Exception:
                        continue

                avg_att = round(sum(att_values) / len(att_values), 1) if att_values else 0

                data["class_attendance"] = {
                    "average_percentage": avg_att,
                    "total_students":     len(student_ids),
                    "students_below_75":  low_att,
                    "at_risk_count":      low_att,
                    "status": "Good" if avg_att >= 75 else "Needs attention"
                }
                data["at_risk_students"] = {
                    "count":      low_att,
                    "total":      len(student_ids),
                    "percentage": round(
                        (low_att / len(student_ids)) * 100, 1
                    ) if student_ids else 0
                }

            try:
                from models import Student, User

                teacher_students = []
                for sid in student_ids[:200]:
                    try:
                        s = db.query(Student).filter(
                            Student.student_id == sid
                        ).first()
                        if not s:
                            continue

                        user = db.query(User).filter(
                            User.user_id == sid
                        ).first()
                        name = "Unknown"
                        if user:
                            name = (
                                getattr(user, 'name', None) or
                                getattr(user, 'full_name', None) or
                                getattr(user, 'username', None) or
                                "Unknown"
                            )

                        # Get attendance for this student
                        total = db.query(
                            func.count(Attendance.attendance_id)
                        ).filter(
                            Attendance.student_id == sid,
                            Attendance.faculty_id == actual_faculty_id
                        ).scalar() or 0

                        present = db.query(
                            func.count(Attendance.attendance_id)
                        ).filter(
                            Attendance.student_id == sid,
                            Attendance.faculty_id == actual_faculty_id,
                            Attendance.status == True
                        ).scalar() or 0

                        att_pct = round(
                            (present / total) * 100, 1
                        ) if total > 0 else 0

                        teacher_students.append({
                            "name": str(name),
                            "roll_no": str(s.roll_no or "N/A"),
                            "year": s.year,
                            "section": str(s.section or "N/A"),
                            "attendance_pct": att_pct,
                            "at_risk": att_pct < 75
                        })
                    except Exception:
                        continue

                data["class_students"] = teacher_students
                data["at_risk_students_detail"] = [
                    s for s in teacher_students if s["at_risk"]
                ]
                print(f"[RETRIEVER] Teacher class: {len(teacher_students)} students")

            except Exception as e:
                print(f"[RETRIEVER] Class students error: {e}")
                data["class_students"] = []
                data["at_risk_students_detail"] = []
        except Exception:
            traceback.print_exc()

        # ── CLASS MARKS ─────────────────────────────────────────
        try:
            subject_marks_map = {}
            mark_rows = db.query(Mark).filter(
                Mark.subject_id.in_(subject_ids)
            ).all()

            for mark in mark_rows:
                subject_id = getattr(mark, 'subject_id', None)
                if subject_id is None:
                    continue

                score = float(mark.marks) if mark.marks is not None else 0.0
                total = float(mark.total) if mark.total and float(mark.total) > 0 else 30.0
                percentage = round((score / total) * 100, 1) if total > 0 else 0.0

                bucket = subject_marks_map.setdefault(subject_id, {
                    "subject": f"Subject_{subject_id}",
                    "scores": []
                })
                bucket["scores"].append(percentage)

            if subject_marks_map:
                subject_names = {}
                try:
                    subject_lookup = db.query(Subject).filter(
                        Subject.subject_id.in_(list(subject_marks_map.keys()))
                    ).all()
                    subject_names = {
                        subj.subject_id: (subj.subject_name or f"Subject_{subj.subject_id}")
                        for subj in subject_lookup
                    }
                except Exception:
                    pass

                subject_marks = []
                averages = []
                for subject_id, entry in subject_marks_map.items():
                    if subject_id in subject_names:
                        entry["subject"] = subject_names[subject_id]
                    avg = round(sum(entry["scores"]) / len(entry["scores"]), 1)
                    averages.append(avg)
                    subject_marks.append({
                        "subject": entry["subject"],
                        "average_percentage": avg,
                        "records": len(entry["scores"]),
                    })

                data["class_marks"] = {
                    "average_percentage": round(sum(averages) / len(averages), 1),
                    "subject_marks": subject_marks
                }
        except Exception:
            traceback.print_exc()

        # ── PENDING SUBMISSIONS (per assignment) ──────────────────
        try:
            from models import Assignment, AssignmentSubmission, FacultySubject, Student as St, User

            # Get teacher's subject IDs
            subject_ids_for_assignments = []
            try:
                fs_records = db.query(FacultySubject).filter(
                    FacultySubject.faculty_id == actual_faculty_id
                ).all()
                subject_ids_for_assignments = [fs.subject_id for fs in fs_records]
            except Exception:
                pass

            total_pending = 0
            assignment_details = []
            pending_students_flat = []
            seen_pending_students = set()

            if subject_ids_for_assignments:
                active_assignments = db.query(Assignment).filter(
                    Assignment.subject_id.in_(subject_ids_for_assignments),
                    Assignment.is_active == True
                ).all()
            else:
                active_assignments = db.query(Assignment).filter(
                    Assignment.is_active == True
                ).all()

            for assg in active_assignments:
                try:
                    # Load all students in this class for precise pending list
                    class_students = db.query(St).filter(
                        St.year == assg.year,
                        St.section == assg.section,
                        St.is_deleted == False
                    ).all()
                    student_count = len(class_students)

                    student_meta = {}
                    for st in class_students:
                        try:
                            sid = st.student_id
                            if sid is None:
                                continue
                            user = db.query(User).filter(
                                User.user_id == sid
                            ).first()
                            name = "Unknown"
                            if user:
                                name = (
                                    getattr(user, 'name', None) or
                                    getattr(user, 'full_name', None) or
                                    getattr(user, 'username', None) or
                                    "Unknown"
                                )
                            student_meta[sid] = {
                                "student_id": sid,
                                "name": str(name),
                                "roll_no": str(st.roll_no or "N/A"),
                                "year": st.year,
                                "section": str(st.section or "N/A")
                            }
                        except Exception:
                            continue

                    submission_rows = db.query(AssignmentSubmission).filter(
                        AssignmentSubmission.assignment_id == assg.id
                    ).all()

                    submitted_ids = set()
                    for sub in submission_rows:
                        sid = getattr(sub, 'student_id', None)
                        if sid is None:
                            continue
                        is_sub = getattr(sub, 'is_submitted', None)
                        status = str(getattr(sub, 'status', '')).lower()
                        if (
                            is_sub is True or
                            status in ['submitted', '1', 'true', 'done', 'completed']
                        ):
                            submitted_ids.add(sid)

                    # Compatibility fallback: if rows exist but explicit flags are missing,
                    # treat existing submission rows as submitted records.
                    if not submitted_ids and submission_rows:
                        submitted_ids = {
                            getattr(sub, 'student_id', None)
                            for sub in submission_rows
                            if getattr(sub, 'student_id', None) is not None
                        }

                    pending_students = [
                        meta for sid, meta in student_meta.items()
                        if sid not in submitted_ids
                    ]
                    submitted_count = min(student_count, len(submitted_ids))
                    pending = len(pending_students)

                    if pending > 0:
                        total_pending += pending
                        for ps in pending_students:
                            sid = ps.get("student_id")
                            if sid not in seen_pending_students:
                                seen_pending_students.add(sid)
                                pending_students_flat.append(ps)

                        assignment_details.append({
                            "title": str(assg.title),
                            "year": assg.year,
                            "section": assg.section,
                            "pending": pending,
                            "submitted": submitted_count,
                            "total_students": student_count,
                            "due_date": str(assg.due_date) if assg.due_date else "No deadline",
                            "pending_students": pending_students[:25]
                        })
                except Exception:
                    continue

            data["assignments"] = {
                "pending_submissions": total_pending,
                "assignment_details": assignment_details[:10],
                "pending_students_flat": pending_students_flat[:100]
            }
            print(f"[RETRIEVER] Teacher: {len(active_assignments)} assignments, {total_pending} pending")

            if not data.get("class_students") and assignment_details:
                try:
                    from collections import Counter
                    from models import User

                    pair_counter = Counter()
                    for d in assignment_details:
                        y = d.get("year")
                        s = d.get("section")
                        if y is not None and s:
                            pair_counter[(y, s)] += 1

                    if pair_counter:
                        (target_year, target_section), _ = pair_counter.most_common(1)[0]

                        fallback_students = db.query(St).filter(
                            St.year == target_year,
                            St.section == target_section,
                            St.is_deleted == False
                        ).all()

                        teacher_students = []
                        for st in fallback_students[:200]:
                            try:
                                user = db.query(User).filter(
                                    User.user_id == st.student_id
                                ).first()
                                name = "Unknown"
                                if user:
                                    name = (
                                        getattr(user, 'name', None) or
                                        getattr(user, 'full_name', None) or
                                        getattr(user, 'username', None) or
                                        "Unknown"
                                    )

                                total = db.query(
                                    func.count(Attendance.attendance_id)
                                ).filter(
                                    Attendance.student_id == st.student_id
                                ).scalar() or 0

                                present = db.query(
                                    func.count(Attendance.attendance_id)
                                ).filter(
                                    Attendance.student_id == st.student_id,
                                    Attendance.status == True
                                ).scalar() or 0

                                att_pct = round(
                                    (present / total) * 100, 1
                                ) if total > 0 else 0

                                teacher_students.append({
                                    "name": str(name),
                                    "roll_no": str(st.roll_no or "N/A"),
                                    "year": st.year,
                                    "section": str(st.section or "N/A"),
                                    "attendance_pct": att_pct,
                                    "at_risk": att_pct < 75
                                })
                            except Exception:
                                continue

                        data["class_students"] = teacher_students
                        data["at_risk_students_detail"] = [
                            s for s in teacher_students if s.get("at_risk")
                        ]
                        print(
                            f"[RETRIEVER] Teacher class fallback from assignments: "
                            f"{len(teacher_students)} students"
                        )
                except Exception as fallback_err:
                    print(f"[RETRIEVER] Class fallback error: {fallback_err}")
        except Exception:
            traceback.print_exc()

        # ── RESOURCES UPLOADED BY THIS TEACHER ────────────────────
        try:
            from models import Resource, Subject as SubjR
            res_rows = db.query(Resource).filter(
                Resource.faculty_id == actual_faculty_id
            ).order_by(Resource.id.desc()).limit(10).all()

            res_list = []
            for r in res_rows:
                subj_name = "General"
                if r.subject_id:
                    try:
                        subj = db.query(SubjR).filter(
                            SubjR.subject_id == r.subject_id
                        ).first()
                        if subj and subj.subject_name:
                            subj_name = subj.subject_name
                    except Exception:
                        pass
                res_list.append({
                    "title":    r.title or "Resource",
                    "subject":  subj_name,
                    "type":     getattr(r, 'type', 'Document') or 'Document',
                    "uploaded": str(r.created_at or 'Recent'),
                })

            data["resources"] = res_list
            print(f"[RETRIEVER] Teacher resources: {len(res_list)}")
        except Exception:
            traceback.print_exc()


    except Exception:
        traceback.print_exc()

    set_cached(cache_key, data)
    print(f"[PERF] retrieve_teacher_data took {time.time() - start:.2f}s")
    return data


def retrieve_admin_data(db: Session) -> dict:
    """Retrieves institution-wide data for admin."""
    start = time.time()
    cache_key = "retrieve_admin_data"
    cached = get_cached(cache_key)
    if cached is not None:
        print(f"[PERF] retrieve_admin_data took {time.time() - start:.2f}s")
        return cached

    data = {
        "institution": {},
        "departments": [],
        "alerts":      {},
        "placement":   {},
        "faculty_list": [],
        "faculty_by_department": {}
    }

    try:
        from models import Student, Faculty, Attendance, Department, User
        from models import Alert, PlacementDrive

        # ── INSTITUTION TOTALS ────────────────────────────────────
        try:
            total_students = db.query(
                func.count(Student.student_id)
            ).filter(Student.is_deleted == False).scalar() or 0

            total_faculty = db.query(
                func.count(Faculty.faculty_id)
            ).scalar() or 0

            total_att   = db.query(func.count(Attendance.attendance_id)).scalar() or 0
            present_att = db.query(func.count(Attendance.attendance_id)).filter(
                Attendance.status == True
            ).scalar() or 0

            overall_att = round(
                (present_att / total_att) * 100, 1
            ) if total_att > 0 else 0

            data["institution"] = {
                "total_students":     total_students,
                "total_faculty":      total_faculty,
                "overall_attendance": overall_att,
            }
        except Exception:
            traceback.print_exc()
            _safe_rollback(db)

        # ── DEPARTMENT BREAKDOWN ────────────────────────────────
        try:
            from sqlalchemy import text

            dept_result = db.execute(text(
                "SELECT * FROM departments LIMIT 1"
            )).fetchone()

            if dept_result:
                print(f"[RETRIEVER] Department columns: "
                      f"{list(dept_result._fields)}")

            dept_rows = db.execute(
                text("SELECT * FROM departments")
            ).fetchall()

            print(f"[RETRIEVER] Raw departments: {len(dept_rows)}")

            def _build_department_summary(row_dict):
                local_db = SessionLocal()
                try:
                    dept_id = (
                        row_dict.get('department_id') or
                        row_dict.get('dept_id') or
                        row_dict.get('id')
                    )
                    dept_name = (
                        row_dict.get('name') or
                        row_dict.get('department_name') or
                        row_dict.get('dept_name') or
                        'Unknown'
                    )

                    if not dept_id:
                        return None

                    try:
                        student_has_department_col = bool(local_db.execute(text(
                            "SELECT 1 FROM information_schema.columns "
                            "WHERE table_name='students' AND column_name='department_id'"
                        )).fetchone())
                    except Exception:
                        student_has_department_col = False

                    if student_has_department_col:
                        total_students = local_db.execute(text(
                            "SELECT COUNT(*) FROM students "
                            "WHERE department_id = :did "
                            "AND COALESCE(is_deleted, false) = false"
                        ), {"did": dept_id}).scalar() or 0

                        student_ids_raw = local_db.execute(text(
                            "SELECT student_id FROM students "
                            "WHERE department_id = :did "
                            "AND COALESCE(is_deleted, false) = false LIMIT 100"
                        ), {"did": dept_id}).fetchall()
                    else:
                        total_students = local_db.execute(text(
                            "SELECT COUNT(*) FROM students s "
                            "JOIN users u ON u.user_id = s.student_id "
                            "WHERE u.department_id = :did "
                            "AND COALESCE(s.is_deleted, false) = false "
                            "AND COALESCE(u.is_deleted, false) = false"
                        ), {"did": dept_id}).scalar() or 0

                        student_ids_raw = local_db.execute(text(
                            "SELECT s.student_id FROM students s "
                            "JOIN users u ON u.user_id = s.student_id "
                            "WHERE u.department_id = :did "
                            "AND COALESCE(s.is_deleted, false) = false "
                            "AND COALESCE(u.is_deleted, false) = false LIMIT 100"
                        ), {"did": dept_id}).fetchall()

                    if total_students == 0:
                        return None

                    student_ids = [r[0] for r in student_ids_raw]

                    if student_ids:
                        id_list = ",".join(str(i) for i in student_ids)
                        att_row = local_db.execute(text(
                            f"SELECT COUNT(*) as total, "
                            f"SUM(CASE WHEN status = true THEN 1 ELSE 0 END) as present "
                            f"FROM attendance "
                            f"WHERE student_id IN ({id_list})"
                        )).fetchone()

                        total_att = att_row.total or 0
                        present_att = att_row.present or 0
                        att_pct = round(
                            (present_att / total_att) * 100, 1
                        ) if total_att > 0 else 0

                        at_risk = 0
                        for sid in student_ids[:30]:
                            try:
                                row = local_db.execute(text(
                                    "SELECT COUNT(*) as t, "
                                    "SUM(CASE WHEN status=true THEN 1 ELSE 0 END) as p "
                                    "FROM attendance WHERE student_id=:sid"
                                ), {"sid": sid}).fetchone()
                                if row.t and row.t > 0:
                                    pct = (row.p or 0) / row.t * 100
                                    if pct < 75:
                                        at_risk += 1
                            except Exception:
                                continue
                    else:
                        att_pct = 0
                        at_risk = 0

                    result = {
                        "department": str(dept_name),
                        "attendance_percentage": att_pct,
                        "at_risk_count": at_risk,
                        "total_students": total_students,
                        "status": "Good" if att_pct >= 75 else "LOW ATTENDANCE"
                    }
                    print(f"[RETRIEVER] Loaded dept: {dept_name} "
                          f"{att_pct}% {at_risk} at-risk")
                    return result
                except Exception as dept_err:
                    print(f"[RETRIEVER] Dept error: {dept_err}")
                    traceback.print_exc()
                    return None
                finally:
                    local_db.close()

            dept_inputs = [dict(row._mapping) for row in dept_rows]
            with ThreadPoolExecutor() as executor:
                dept_list = [
                    result for result in executor.map(
                        _build_department_summary,
                        dept_inputs,
                    ) if result is not None
                ]

            data["departments"] = sorted(
                dept_list,
                key=lambda x: x["attendance_percentage"]
            )
            data["institution"]["at_risk_count"] = sum(
                d["at_risk_count"] for d in dept_list
            )
            print(f"[RETRIEVER] Total departments loaded: {len(dept_list)}")

        except Exception as e:
            print(f"[RETRIEVER] Dept raw SQL failed: {e}")
            traceback.print_exc()
            _safe_rollback(db)

        # ── ALERTS ───────────────────────────────────────────────
        try:
            alert_count = db.query(func.count(Alert.id)).scalar() or 0
            data["alerts"] = {"total_active": alert_count}
        except Exception:
            _safe_rollback(db)
            pass

        # ── PLACEMENT ────────────────────────────────────────────
        try:
            open_drives = db.query(PlacementDrive).filter(
                PlacementDrive.status == "open"
            ).count()
            data["placement"] = {"open_drives": open_drives}
        except Exception:
            _safe_rollback(db)
            pass

        # ── INDIVIDUAL STUDENTS (ADMIN ONLY) ───────────────────
        try:
            data["students_list"] = retrieve_admin_students_list(db)
            data["at_risk_students_list"] = [
                s for s in data["students_list"] if s["at_risk"]
            ]
            dept_students = {}
            for s in data["students_list"]:
                dept = s.get("department", "Unknown")
                if dept not in dept_students:
                    dept_students[dept] = []
                dept_students[dept].append(s)
            data["students_by_department"] = dept_students
            print(f"[RETRIEVER] Departments with students: {list(dept_students.keys())}")
            print(f"[RETRIEVER] Loaded {len(data['students_list'])} students")
        except Exception as e:
            print(f"[RETRIEVER] students_list error: {e}")
            data["students_list"] = []
            data["at_risk_students_list"] = []
            data["students_by_department"] = {}

        # ── FACULTY LISTS / DEPARTMENT MAPPING ──────────────────
        try:
            dept_name_map = {}
            try:
                dept_rows_for_map = db.execute(text("SELECT * FROM departments")).fetchall()
                for row in dept_rows_for_map:
                    row_dict = dict(row._mapping)
                    dept_id = (
                        row_dict.get('department_id') or
                        row_dict.get('dept_id') or
                        row_dict.get('id')
                    )
                    dept_name = (
                        row_dict.get('name') or
                        row_dict.get('department_name') or
                        row_dict.get('dept_name') or
                        'Unknown'
                    )
                    if dept_id is not None:
                        dept_name_map[dept_id] = str(dept_name)
            except Exception:
                pass

            faculty_rows = db.query(Faculty).all()
            faculty_list = []
            faculty_by_department = {}

            for fac in faculty_rows:
                try:
                    faculty_user_id = getattr(fac, 'faculty_id', None)
                    user = db.query(User).filter(User.user_id == faculty_user_id).first()
                    name = "Unknown"
                    department_id = None
                    department_name = "Unknown"

                    if user:
                        name = (
                            getattr(user, 'name', None) or
                            getattr(user, 'full_name', None) or
                            getattr(user, 'username', None) or
                            "Unknown"
                        )
                        department_id = getattr(user, 'department_id', None)
                        if department_id in dept_name_map:
                            department_name = dept_name_map[department_id]

                    faculty_entry = {
                        "faculty_id": faculty_user_id,
                        "name": str(name),
                        "employee_id": str(getattr(fac, 'employee_id', 'N/A') or 'N/A'),
                        "designation": str(getattr(fac, 'designation', 'N/A') or 'N/A'),
                        "expertise": str(getattr(fac, 'expertise', '') or 'N/A'),
                        "phone": str(getattr(fac, 'phone', '') or 'N/A'),
                        "department": department_name,
                        "department_id": department_id
                    }
                    faculty_list.append(faculty_entry)
                    faculty_by_department.setdefault(department_name, []).append(faculty_entry)
                except Exception:
                    continue

            data["faculty_list"] = faculty_list
            data["faculty_by_department"] = faculty_by_department
            try:
                for dept in data.get("departments", []):
                    dept_name = dept.get("department", "Unknown")
                    dept["faculty_names"] = [
                        f.get("name", "Unknown")
                        for f in faculty_by_department.get(dept_name, [])
                    ]
                    dept["faculty_count"] = len(
                        faculty_by_department.get(dept_name, [])
                    )
            except Exception:
                pass
            print(f"[RETRIEVER] Loaded {len(faculty_list)} faculty records")
        except Exception as e:
            print(f"[RETRIEVER] faculty list error: {e}")
            data["faculty_list"] = []
            data["faculty_by_department"] = {}

    except Exception:
        traceback.print_exc()
        _safe_rollback(db)

    set_cached(cache_key, data)
    print(f"[PERF] retrieve_admin_data took {time.time() - start:.2f}s")
    return data


def retrieve_admin_students_list(
    db, year=None, section=None, at_risk_only=False
) -> list:
    """
    Fetch ALL students with name, department, attendance.
    Admin only. Reads exact column names from models.py.
    """
    try:
        from models import Student, User, Department, Attendance
        from sqlalchemy import func

        dept_lookup = {}
        try:
            depts = db.query(Department).all()
            for d in depts:
                did = (
                    getattr(d, 'department_id', None) or
                    getattr(d, 'dept_id', None) or
                    getattr(d, 'id', None)
                )
                dname = (
                    getattr(d, 'name', None) or
                    getattr(d, 'department_name', None) or
                    getattr(d, 'dept_name', None) or
                    'Unknown'
                )
                if did is not None:
                    dept_lookup[did] = dname
        except Exception as de:
            print(f"[RETRIEVER] Dept lookup error: {de}")

        query = db.query(Student).filter(
            Student.is_deleted == False
        )
        if year:
            query = query.filter(Student.year == year)
        if section:
            query = query.filter(Student.section == section)

        students = query.all()

        print(f"[RETRIEVER] Processing {len(students)} students")
        result = []

        for s in students:
            try:
                user = db.query(User).filter(
                    User.user_id == s.student_id
                ).first()

                name = "Unknown"
                if user:
                    name = (
                        getattr(user, 'name', None) or
                        getattr(user, 'full_name', None) or
                        getattr(user, 'username', None) or
                        getattr(user, 'email', 'Unknown')
                    )

                dept_id = getattr(s, 'department_id', None)
                if dept_id is None and user:
                    dept_id = getattr(user, 'department_id', None)
                dept_name = dept_lookup.get(dept_id, 'Unknown')

                total = db.query(
                    func.count(Attendance.attendance_id)
                ).filter(
                    Attendance.student_id == s.student_id
                ).scalar() or 0

                present = db.query(
                    func.count(Attendance.attendance_id)
                ).filter(
                    Attendance.student_id == s.student_id,
                    Attendance.status == True
                ).scalar() or 0

                att_pct = round(
                    (present / total) * 100, 1
                ) if total > 0 else 0

                is_at_risk = att_pct < 75
                if at_risk_only and not is_at_risk:
                    continue

                result.append({
                    "name": str(name),
                    "roll_no": str(s.roll_no or "N/A"),
                    "year": s.year,
                    "section": str(s.section or "N/A"),
                    "department": dept_name,
                    "department_id": dept_id,
                    "attendance_pct": att_pct,
                    "cgpa": float(s.cgpa) if s.cgpa else None,
                    "at_risk": is_at_risk
                })

            except Exception:
                traceback.print_exc()
                continue

        print(f"[RETRIEVER] Students loaded: {len(result)}")
        return result

    except Exception as e:
        print(f"[RETRIEVER] students_list failed: {e}")
        traceback.print_exc()
        return []
