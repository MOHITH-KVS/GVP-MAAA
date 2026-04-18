"""
rag/retriever.py  —  R in RAG
Retrieves all structured data from PostgreSQL for a given user/role.
Uses exact column names confirmed from SQLAlchemy logs.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
import traceback


def _safe_rollback(db: Session) -> None:
    """Roll back only when the session is in a failed transaction state."""
    try:
        db.rollback()
    except Exception:
        pass


def retrieve_student_data(student_id: int, db: Session) -> dict:
    """Retrieves ALL data for a student in one call."""
    data = {
        "student_id": student_id,
        "attendance": {},
        "marks": [],
        "assignments": {},
        "alerts": [],
        "events": [],
        "resources": [],
        "risk": {},
        "profile": {}
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
            mark_records = db.query(Mark).filter(
                Mark.student_id == student_id
            ).all()

            marks_list = []
            for m in mark_records:
                subj_name = f"Subject_{m.subject_id}"
                try:
                    subj = db.query(Subject).filter(
                        Subject.subject_id == m.subject_id
                    ).first()
                    if subj and subj.subject_name:
                        subj_name = subj.subject_name
                except Exception:
                    pass

                score   = float(m.marks) if m.marks is not None else 0
                total_m = float(m.total) if (m.total and float(m.total) > 0) else 30
                pct     = round((score / total_m) * 100, 1)

                marks_list.append({
                    "subject":    subj_name,
                    "exam_type":  str(m.exam or ""),
                    "score":      score,
                    "total":      total_m,
                    "percentage": pct,
                    "mid1":  float(m.mid1)  if m.mid1  is not None else None,
                    "mid2":  float(m.mid2)  if m.mid2  is not None else None,
                    "cgpa":  float(m.cgpa)  if m.cgpa  is not None else None,
                    "sgpa":  float(m.sgpa)  if m.sgpa  is not None else None,
                })

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

    except Exception:
        traceback.print_exc()

    return data


def retrieve_teacher_data(teacher_id: int, db: Session) -> dict:
    """Retrieves class-level data for a teacher/faculty."""
    data = {
        "teacher_id":      teacher_id,
        "subjects":        [],
        "class_attendance": {},
        "class_marks":     {},
        "assignments":     {},
        "at_risk_students": {}
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
            from models import Assignment, AssignmentSubmission, FacultySubject, Student as St

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
                    # Count students in this class
                    student_count = db.query(St).filter(
                        St.year == assg.year,
                        St.section == assg.section,
                        St.is_deleted == False
                    ).count()

                    # Count actual submissions for this assignment
                    submitted_count = db.query(AssignmentSubmission).filter(
                        AssignmentSubmission.assignment_id == assg.id
                    ).count()

                    pending = max(0, student_count - submitted_count)
                    if pending > 0:
                        total_pending += pending
                        assignment_details.append({
                            "title": str(assg.title),
                            "year": assg.year,
                            "section": assg.section,
                            "pending": pending,
                            "submitted": submitted_count,
                            "total_students": student_count,
                            "due_date": str(assg.due_date) if assg.due_date else "No deadline"
                        })
                except Exception:
                    continue

            data["assignments"] = {
                "pending_submissions": total_pending,
                "assignment_details": assignment_details[:10]
            }
            print(f"[RETRIEVER] Teacher: {len(active_assignments)} assignments, {total_pending} pending")
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

    return data


def retrieve_admin_data(db: Session) -> dict:
    """Retrieves institution-wide data for admin."""
    data = {
        "institution": {},
        "departments": [],
        "alerts":      {},
        "placement":   {}
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
            departments = []
            try:
                departments = db.query(Department).all()
            except Exception:
                # Some DB variants have departments table columns that do not
                # match ORM (e.g., no "id"). Fallback to users.department_id.
                _safe_rollback(db)
                dept_ids = [
                    r[0] for r in db.query(User.department_id).distinct().all()
                    if r[0] is not None
                ]
                departments = [
                    {"_fallback_id": did, "_fallback_name": f"Department_{did}"}
                    for did in dept_ids
                ]

            print(f"[RETRIEVER] Departments found: {len(departments)}")

            dept_list = []
            for dept in departments[:20]:
                try:
                    # Get primary key — try multiple common names
                    if isinstance(dept, dict):
                        dept_id = dept.get("_fallback_id")
                        dept_name = dept.get("_fallback_name", "Unknown")
                    else:
                        dept_id = (
                            getattr(dept, 'department_id', None) or
                            getattr(dept, 'dept_id', None) or
                            getattr(dept, 'id', None)
                        )
                        dept_name = (
                            getattr(dept, 'name', None) or
                            getattr(dept, 'department_name', None) or
                            getattr(dept, 'dept_name', None) or
                            'Unknown'
                        )

                    print(f"[RETRIEVER] Dept: id={dept_id} name={dept_name}")

                    if not dept_id:
                        continue

                    student_dept_col = getattr(Student, 'department_id', None)

                    if student_dept_col is not None:
                        total_students = db.query(Student).filter(
                            student_dept_col == dept_id,
                            Student.is_deleted == False
                        ).count()

                        dept_student_ids = [
                            s.student_id for s in db.query(Student).filter(
                                student_dept_col == dept_id,
                                Student.is_deleted == False
                            ).limit(100).all()
                        ]
                    else:
                        # Fallback for schemas where department is on users table.
                        total_students = db.query(func.count(Student.student_id)).join(
                            User, User.user_id == Student.student_id
                        ).filter(
                            User.department_id == dept_id,
                            Student.is_deleted == False,
                            User.is_deleted == False
                        ).scalar() or 0

                        dept_student_ids = [
                            r[0] for r in db.query(Student.student_id).join(
                                User, User.user_id == Student.student_id
                            ).filter(
                                User.department_id == dept_id,
                                Student.is_deleted == False,
                                User.is_deleted == False
                            ).limit(100).all()
                        ]

                    if total_students == 0:
                        continue

                    total_att = db.query(
                        func.count(Attendance.attendance_id)
                    ).filter(
                        Attendance.student_id.in_(dept_student_ids)
                    ).scalar() or 0

                    present_att = db.query(
                        func.count(Attendance.attendance_id)
                    ).filter(
                        Attendance.student_id.in_(dept_student_ids),
                        Attendance.status == True
                    ).scalar() or 0

                    att_pct = round(
                        (present_att / total_att) * 100, 1
                    ) if total_att > 0 else 0

                    at_risk = 0
                    for sid in dept_student_ids[:50]:
                        try:
                            t = db.query(
                                func.count(Attendance.attendance_id)
                            ).filter(
                                Attendance.student_id == sid
                            ).scalar() or 0
                            p = db.query(
                                func.count(Attendance.attendance_id)
                            ).filter(
                                Attendance.student_id == sid,
                                Attendance.status == True
                            ).scalar() or 0
                            if t > 0 and (p / t * 100) < 75:
                                at_risk += 1
                        except Exception:
                            continue

                    dept_list.append({
                        "department": dept_name,
                        "attendance_percentage": att_pct,
                        "at_risk_count": at_risk,
                        "total_students": total_students,
                        "status": "Good" if att_pct >= 75 else "LOW ATTENDANCE"
                    })

                    print(
                        f"[RETRIEVER] {dept_name}: {att_pct}% att, "
                        f"{at_risk} at-risk, {total_students} students"
                    )

                except Exception as dept_err:
                    print(f"[RETRIEVER] Dept error: {dept_err}")
                    _safe_rollback(db)
                    continue

            data["departments"] = sorted(
                dept_list,
                key=lambda x: x["attendance_percentage"]
            )
            data["institution"]["at_risk_count"] = sum(
                d["at_risk_count"] for d in dept_list
            )
            print(
                f"[RETRIEVER] Admin dept summary: "
                f"{len(dept_list)} departments loaded"
            )

        except Exception as e:
            print(f"[RETRIEVER] Department section failed: {e}")
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

    except Exception:
        traceback.print_exc()
        _safe_rollback(db)

    return data
