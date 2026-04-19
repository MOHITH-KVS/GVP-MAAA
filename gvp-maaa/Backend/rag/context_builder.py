from sqlalchemy.orm import Session
import traceback

def safe_mark_percentage(score, total):
    try:
        s = float(score) if score is not None else 0
        t = float(total) if total is not None else 0
        if t <= 0:
            # total is null or zero — check if score looks
            # like it's already out of 30 (mid exam pattern)
            if s <= 30:
                return round((s / 30) * 100, 1)
            elif s <= 100:
                return round(s, 1)
            else:
                return 0.0
        return round((s / t) * 100, 1)
    except Exception:
        return 0.0

# Import models using EXACT class names from models.py
try:
    from models import (
        Student,      
        Attendance,   
        Mark,         
        Assignment,   
        AssignmentSubmission,  
        Alert,        
        StudentProgress,  
        Faculty,      
        FacultySubject,  
        Department,   
        PlacementDrive,  
    )
    MODELS_AVAILABLE = True
except ImportError as e:
    MODELS_AVAILABLE = False
    print(f"Model import warning: {e}")

def build_student_context(student_id: int, db: Session) -> dict:
    context = {
        "role": "student",
        "student_id": student_id,
        "attendance_pct": 0.0,
        "subject_marks": [],
        "pending_assignments": 0,
        "active_alerts": [],
        "xp": 0,
        "streak": 0,
        "risk_level": "LOW"
    }
    
    if not MODELS_AVAILABLE:
        return context
    
    # Attendance
    try:
        total = db.query(Attendance).filter(
            Attendance.student_id == student_id
        ).count()
        present = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.status == True
        ).count()
        if total > 0:
            context["attendance_pct"] = round((present / total) * 100, 1)
    except Exception:
        traceback.print_exc()
    
    # Marks
    try:
        marks_records = db.query(Mark).filter(
            Mark.student_id == student_id
        ).all()
        subject_marks = []
        for m in marks_records:
            try:
                score = float(m.marks) if m.marks is not None else 0
                total_marks = float(m.total) if hasattr(m, 'total') and m.total else 0
                pct = safe_mark_percentage(score, total_marks)
                subject_name = "Unknown"
                if hasattr(m, 'subject') and m.subject:
                    subject_name = getattr(m.subject, 'subject_name', 
                                  getattr(m.subject, 'name', 'Unknown'))
                subject_marks.append({
                    "subject": subject_name,
                    "score": pct
                })
            except Exception:
                continue
        context["subject_marks"] = subject_marks[:5]
    except Exception:
        traceback.print_exc()
    
    # Risk level from existing risk engine
    try:
        from ml.risk_engine import calculate_risk
        student_data = {
            "attendance": context["attendance_pct"],
            "mid1": context["subject_marks"][0]["score"] if context["subject_marks"] else None,
            "mid2": context["subject_marks"][1]["score"] if len(context["subject_marks"]) > 1 else None
        }
        risk_result = calculate_risk(student_data, {"attendance": 75, "marks": 40})
        context["risk_level"] = risk_result.get("level", "LOW")
    except Exception:
        pass
    
    # Pending assignments
    try:
        student = db.query(Student).filter(Student.student_id == student_id).first()
        if student:
            assignments = db.query(Assignment).filter(
                Assignment.year == student.year,
                Assignment.section == student.section,
                Assignment.is_active == True
            ).all()
            
            submissions = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.student_id == student_id
            ).all()
            
            submitted_ids = {s.assignment_id for s in submissions}
            
            pending_count = 0
            for a in assignments:
                if a.id not in submitted_ids:
                    pending_count += 1
                    
            context["pending_assignments"] = pending_count
    except Exception:
        traceback.print_exc()
    
    # Active alerts
    try:
        alerts = db.query(Alert).filter(
            Alert.student_id == student_id
        ).limit(5).all()
        context["active_alerts"] = [
            getattr(a, 'message', getattr(a, 'title', 'Alert')) 
            for a in alerts
        ]
    except Exception:
        traceback.print_exc()
    
    return context

def build_teacher_context(teacher_id: int, db: Session) -> dict:
    context = {
        "role": "teacher",
        "teacher_id": teacher_id,
        "subjects": [],
        "class_avg_attendance": 0.0,
        "class_avg_marks": 0.0,
        "at_risk_count": 0,
        "total_students": 0,
        "pending_submissions": 0
    }
    
    if not MODELS_AVAILABLE:
        return context
    
    # Get this teacher's subjects exactly like main.py
    try:
        from models import FacultySubject, Subject
        assignments = (
            db.query(FacultySubject, Subject)
            .join(Subject, FacultySubject.subject_id == Subject.subject_id)
            .filter(
                FacultySubject.faculty_id == teacher_id,
                FacultySubject.is_active == True
            )
            .all()
        )
        
        if not assignments:
            # Fallback: get subjects from Attendance table
            try:
                from models import Attendance, Subject
                teacher_attendances = db.query(
                    Attendance.subject_id
                ).filter(
                    getattr(Attendance, 'faculty_id',
                    getattr(Attendance, 'teacher_id',
                    Attendance.subject_id)) == teacher_id
                ).distinct().all()

                subject_ids = [a[0] for a in teacher_attendances if a[0] is not None]

                if subject_ids:
                    subjects = db.query(Subject).filter(
                        Subject.subject_id.in_(subject_ids)
                    ).all()
                    context["subjects"] = [
                        getattr(s, 'subject_name',
                               getattr(s, 'name', 'Unknown'))
                        for s in subjects
                    ]
                else:
                    # Emergency fallback logic as requested
                    context["subjects"] = ["Unable to load - check faculty mapping"]
                    context["class_avg_attendance"] = "Data not available"
                    context["at_risk_count"] = "Data not available"
                    context["total_students"] = "Data not available"
                    context["pending_submissions"] = "Data not available"
                    context["note"] = "Faculty-subject mapping not found in database"
                    return context
            except Exception:
                traceback.print_exc()
                context["subjects"] = ["Unable to load - check faculty mapping"]
                context["class_avg_attendance"] = "Data not available"
                context["at_risk_count"] = "Data not available"
                context["total_students"] = "Data not available"
                context["pending_submissions"] = "Data not available"
                context["note"] = "Faculty-subject mapping not found in database"
                return context
        else:    
            subject_ids = [s.subject_id for fs, s in assignments]
            context["subjects"] = [s.subject_name for fs, s in assignments]
        
        # Students in these subjects via attendance
        try:
            student_ids = db.query(Attendance.student_id).filter(
                Attendance.subject_id.in_(subject_ids)
            ).distinct().all()
            student_ids = [s[0] for s in student_ids]
            context["total_students"] = len(student_ids)
            
            # Average attendance for these students
            if student_ids:
                total_records = db.query(Attendance).filter(
                    Attendance.student_id.in_(student_ids),
                    Attendance.subject_id.in_(subject_ids)
                ).count()
                present_records = db.query(Attendance).filter(
                    Attendance.student_id.in_(student_ids),
                    Attendance.subject_id.in_(subject_ids),
                    Attendance.status == True
                ).count()
                if total_records > 0:
                    context["class_avg_attendance"] = round(
                        (present_records / total_records) * 100, 1
                    )
                
                # At-risk count
                at_risk = 0
                for sid in student_ids[:50]:
                    try:
                        total_s = db.query(Attendance).filter(
                            Attendance.student_id == sid
                        ).count()
                        present_s = db.query(Attendance).filter(
                            Attendance.student_id == sid,
                            Attendance.status == True
                        ).count()
                        att_pct = (present_s / total_s * 100) if total_s > 0 else 100
                        if att_pct < 75:
                            at_risk += 1
                    except Exception:
                        continue
                context["at_risk_count"] = at_risk
        except Exception:
            traceback.print_exc()

        # Marks for the teacher's subjects.
        try:
            from models import Mark, Subject

            mark_rows = db.query(Mark).filter(
                Mark.subject_id.in_(subject_ids)
            ).all()

            subject_marks_map = {}
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
                subject_lookup = db.query(Subject).filter(
                    Subject.subject_id.in_(list(subject_marks_map.keys()))
                ).all()
                for subj in subject_lookup:
                    subject_id = getattr(subj, 'subject_id', None)
                    if subject_id in subject_marks_map:
                        subject_marks_map[subject_id]["subject"] = (
                            subj.subject_name or f"Subject_{subject_id}"
                        )

                subject_marks = []
                averages = []
                for subject_id, entry in subject_marks_map.items():
                    avg = round(sum(entry["scores"]) / len(entry["scores"]), 1)
                    averages.append(avg)
                    subject_marks.append({
                        "subject": entry["subject"],
                        "average_percentage": avg,
                        "records": len(entry["scores"])
                    })

                context["subject_marks"] = subject_marks
                context["class_avg_marks"] = round(sum(averages) / len(averages), 1)
        except Exception:
            traceback.print_exc()
        
        # Pending submissions
        try:
            from models import AssignmentSubmission, Assignment
            # Find assignments for these subjects
            assignment_ids = db.query(Assignment.id).filter(
                Assignment.subject_id.in_(subject_ids)
            ).all()
            a_ids = [a[0] for a in assignment_ids]
            if a_ids:
                pending = db.query(AssignmentSubmission).filter(
                    AssignmentSubmission.assignment_id.in_(a_ids),
                    AssignmentSubmission.status == "pending"
                ).count()
                context["pending_submissions"] = pending
        except Exception:
            pass
            
    except Exception:
        traceback.print_exc()
    
    return context

from sqlalchemy.sql import func

def count_at_risk_students(db):
    try:
        from models import Attendance
        from sqlalchemy import Integer
        # Count students where attendance < 75%
        # using a direct aggregate query
        subquery = db.query(
            Attendance.student_id,
            (func.sum(
                func.cast(Attendance.status, Integer)
            ) * 100.0 / func.count(Attendance.id)
            ).label('att_pct')
        ).group_by(Attendance.student_id).subquery()

        at_risk = db.query(func.count()).filter(
            subquery.c.att_pct < 75
        ).scalar()

        return int(at_risk) if at_risk else 0
    except Exception:
        traceback.print_exc()
        return 0

def build_admin_context(db: Session) -> dict:
    context = {
        "role": "admin",
        "total_students": 0,
        "total_teachers": 0,
        "overall_attendance_pct": 0.0,
        "at_risk_count": 0,
        "department_breakdown": [],
        "active_alerts_count": 0,
        "placement_drives_open": 0,
        "low_attendance_departments": [],
        "faculty_list": [],
        "faculty_by_department": {}
    }
    
    if not MODELS_AVAILABLE:
        return context
    
    try:
        context["total_students"] = db.query(Student).count()
    except Exception:
        pass
    
    try:
        context["total_teachers"] = db.query(Faculty).count()
    except Exception:
        pass
    
    try:
        total = db.query(Attendance).count()
        present = db.query(Attendance).filter(
            Attendance.status == True
        ).count()
        if total > 0:
            context["overall_attendance_pct"] = round(
                (present / total) * 100, 1
            )
    except Exception:
        pass
    
    try:
        context["active_alerts_count"] = db.query(Alert).count()
    except Exception:
        pass

    # Faculty roster with department names
    try:
        from models import User
        faculty_rows = db.query(Faculty).all()
        departments = db.query(Department).all()
        dept_name_map = {}
        for dept in departments:
            dept_id = (
                getattr(dept, "department_id", None) or
                getattr(dept, "dept_id", None) or
                getattr(dept, "id", None)
            )
            if dept_id is not None:
                dept_name_map[dept_id] = getattr(
                    dept, "name",
                    getattr(dept, "department_name", "Unknown")
                )

        faculty_list = []
        faculty_by_department = {}
        for fac in faculty_rows:
            try:
                uid = getattr(fac, "faculty_id", None)
                user = db.query(User).filter(User.user_id == uid).first() if uid is not None else None
                name = "Unknown"
                dept_name = "Unknown"
                dept_id = None
                if user:
                    name = (
                        getattr(user, "name", None) or
                        getattr(user, "full_name", None) or
                        getattr(user, "username", None) or
                        "Unknown"
                    )
                    dept_id = getattr(user, "department_id", None)
                    if dept_id in dept_name_map:
                        dept_name = dept_name_map[dept_id]

                entry = {
                    "faculty_id": uid,
                    "name": str(name),
                    "employee_id": str(getattr(fac, "employee_id", "N/A") or "N/A"),
                    "designation": str(getattr(fac, "designation", "N/A") or "N/A"),
                    "department": dept_name,
                    "department_id": dept_id
                }
                faculty_list.append(entry)
                faculty_by_department.setdefault(dept_name, []).append(entry)
            except Exception:
                continue

        context["faculty_list"] = faculty_list
        context["faculty_by_department"] = faculty_by_department
    except Exception:
        traceback.print_exc()
    
    try:
        drives = db.query(PlacementDrive).filter(
            PlacementDrive.status == "open"
        ).count()
        context["placement_drives_open"] = drives
    except Exception:
        pass
    
    # At-risk count — single SQL aggregate query (fast)
    try:
        from sqlalchemy import Integer as SA_Integer
        att_subq = db.query(
            Attendance.student_id,
            (
                func.sum(func.cast(Attendance.status, SA_Integer)) * 100.0 /
                func.count(Attendance.attendance_id)
            ).label("att_pct")
        ).group_by(Attendance.student_id).subquery()

        at_risk_total = db.query(func.count()).filter(
            att_subq.c.att_pct < 75
        ).scalar() or 0
        context["at_risk_count"] = int(at_risk_total)

        # Overall attendance via direct aggregate
        total_rec = db.query(
            func.count(Attendance.attendance_id)
        ).scalar() or 0
        present_rec = db.query(
            func.count(Attendance.attendance_id)
        ).filter(Attendance.status == True).scalar() or 0
        if total_rec > 0:
            context["overall_attendance_pct"] = round(
                (present_rec / total_rec) * 100, 1
            )
    except Exception:
        traceback.print_exc()

    # Department breakdown — SQL aggregation per dept
    try:
        from models import User

        departments = db.query(Department).all()
        breakdown = []
        low_att_depts = []

        for dept in departments[:10]:
            try:
                dept_id = (
                    getattr(dept, "department_id", None) or
                    getattr(dept, "dept_id", None) or
                    getattr(dept, "id", None)
                )
                dept_name = (
                    getattr(dept, "name", None) or
                    getattr(dept, "department_name", None) or
                    "Unknown"
                )

                dept_ids = [r[0] for r in db.query(Student.student_id).join(
                    User, User.user_id == Student.student_id
                ).filter(
                    User.department_id == dept_id,
                    Student.is_deleted == False,
                    User.is_deleted == False
                ).all()]

                if not dept_ids:
                    continue

                # Aggregate attendance for these students in one query
                from sqlalchemy import Integer as SA_Integer
                dept_att = db.query(
                    Attendance.student_id,
                    (
                        func.sum(func.cast(Attendance.status, SA_Integer)) * 100.0 /
                        func.count(Attendance.attendance_id)
                    ).label("att_pct")
                ).filter(
                    Attendance.student_id.in_(dept_ids)
                ).group_by(Attendance.student_id).all()

                if not dept_att:
                    continue

                att_pcts = [float(row.att_pct or 0) for row in dept_att]
                avg_att = round(sum(att_pcts) / len(att_pcts), 1)
                at_risk_dept = sum(1 for p in att_pcts if p < 75)

                breakdown.append({
                    "dept": dept_name,
                    "attendance": avg_att,
                    "at_risk": at_risk_dept,
                    "total": len(dept_ids)
                })
                if avg_att < 75:
                    low_att_depts.append(dept_name)

            except Exception:
                traceback.print_exc()
                continue

        context["department_breakdown"] = breakdown
        context["low_attendance_departments"] = low_att_depts

    except Exception:
        traceback.print_exc()
    
    return context

def get_student_attendance_detail(student_id: int, db: Session) -> dict:
    """Returns detailed attendance breakdown for a student."""
    result = {
        "attendance_pct": 0.0,
        "total_classes": 0,
        "present_classes": 0,
        "subject_attendance": []
    }
    try:
        total = db.query(Attendance).filter(
            Attendance.student_id == student_id
        ).count()
        present = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.status == True
        ).count()
        result["total_classes"] = total
        result["present_classes"] = present
        if total > 0:
            result["attendance_pct"] = round((present / total) * 100, 1)
        
        # Per-subject attendance using GROUP BY (efficient single query)
        try:
            from sqlalchemy import func, Integer as SA_Integer
            from models import Subject

            subj_records = db.query(
                Attendance.subject_id,
                func.count(Attendance.attendance_id).label("total"),
                func.sum(
                    func.cast(Attendance.status, SA_Integer)
                ).label("present")
            ).filter(
                Attendance.student_id == student_id
            ).group_by(Attendance.subject_id).all()

            subject_attendance = []
            for record in subj_records:
                subj_id = record.subject_id
                total_cls = int(record.total or 0)
                present_cls = int(record.present or 0)
                pct = round((present_cls / total_cls) * 100, 1) \
                      if total_cls > 0 else 0

                subj_name = str(subj_id)
                try:
                    # Subject PK is subject_id — NOT id
                    subj = db.query(Subject).filter(
                        Subject.subject_id == subj_id
                    ).first()
                    if subj:
                        subj_name = subj.subject_name or str(subj_id)
                except Exception:
                    pass

                subject_attendance.append({
                    "subject": subj_name,
                    "pct": pct,
                    "present": present_cls,
                    "total": total_cls
                })

            result["subject_attendance"] = subject_attendance
        except Exception:
            traceback.print_exc()
    except Exception:
        traceback.print_exc()
    return result

def get_student_marks_detail(student_id: int, db: Session) -> dict:
    result = {"subject_marks": [], "overall_avg": 0.0}
    try:
        from models import Mark, Subject

        marks_records = db.query(Mark).filter(
            Mark.student_id == student_id
        ).all()

        subject_marks = []
        total_pct = 0.0
        count = 0

        for m in marks_records:
            try:
                # Use exact column names from SQL log
                subj_name = "Unknown"
                try:
                    if hasattr(m, 'subject') and m.subject:
                        subj_name = getattr(
                            m.subject, 'subject_name',
                            getattr(m.subject, 'name', 'Unknown')
                        )
                    elif m.subject_id:
                        subj = db.query(Subject).filter(
                            Subject.subject_id == m.subject_id
                        ).first()
                        if subj:
                            subj_name = subj.subject_name
                except Exception:
                    pass

                # Get exam type from marks.exam column
                exam_type = str(getattr(m, 'exam', '') or '')

                # Get mid1 and mid2 separately if they exist
                mid1_val = getattr(m, 'mid1', None)
                mid2_val = getattr(m, 'mid2', None)
                marks_val = getattr(m, 'marks', None)
                total_val = getattr(m, 'total', None)

                # Calculate score and total
                score = 0.0
                out_of = 30.0  # Default for mid exams

                if marks_val is not None:
                    try:
                        score = float(marks_val)
                    except Exception:
                        score = 0.0

                if total_val is not None:
                    try:
                        t = float(total_val)
                        if t > 0:
                            out_of = t
                    except Exception:
                        pass

                # Calculate percentage safely
                pct = round((score / out_of) * 100, 1) if out_of > 0 else 0.0

                subject_marks.append({
                    "subject": subj_name,
                    "exam_type": exam_type,
                    "score": score,
                    "out_of": out_of,
                    "pct": pct,
                    "mid1": float(mid1_val) if mid1_val else None,
                    "mid2": float(mid2_val) if mid2_val else None,
                })

                total_pct += pct
                count += 1

            except Exception:
                traceback.print_exc()
                continue

        result["subject_marks"] = subject_marks
        result["overall_avg"] = round(
            total_pct / count, 1
        ) if count > 0 else 0.0

    except Exception:
        traceback.print_exc()
    return result

def get_student_assignments_detail(student_id: int, db: Session) -> dict:
    result = {
        "pending_assignments": 0,
        "submitted_assignments": 0,
        "total_assignments": 0,
        "assignment_details": []
    }
    try:
        from models import Student, Assignment, AssignmentSubmission

        # Get student year and section (matches working query)
        student = db.query(Student).filter(
            Student.student_id == student_id
        ).first()

        if not student:
            return result

        year = student.year
        section = student.section

        # Get all active assignments for this class
        # This matches EXACTLY the query in the SQL log
        all_assignments = db.query(Assignment).filter(
            Assignment.year == year,
            Assignment.section == section,
            Assignment.is_active == True
        ).all()

        result["total_assignments"] = len(all_assignments)

        if not all_assignments:
            return result

        # Get this student's submissions
        submissions = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id
        ).all()

        # Build submitted assignment IDs
        submitted_ids = set()
        for sub in submissions:
            is_sub = getattr(sub, 'is_submitted', None)
            status = getattr(sub, 'status', None)
            # Consider submitted if is_submitted=True OR status='submitted'
            if (is_sub is True or
                    str(status).lower() in ['submitted', 'done', '1', 'true']):
                aid = getattr(sub, 'assignment_id', None)
                if aid:
                    submitted_ids.add(aid)

        submitted_count = 0
        pending_count = 0
        pending_details = []

        for assignment in all_assignments:
            if assignment.id in submitted_ids:
                submitted_count += 1
            else:
                pending_count += 1
                title = getattr(assignment, 'title', 'Assignment')
                due = getattr(assignment, 'due_date', None)
                pending_details.append({
                    "title": str(title),
                    "due_date": str(due) if due else "No deadline set"
                })

        result["pending_assignments"] = pending_count
        result["submitted_assignments"] = submitted_count
        result["assignment_details"] = pending_details[:5]

        print(f"[ASSIGNMENTS] student={student_id} "
              f"year={year} section={section} "
              f"total={len(all_assignments)} "
              f"submitted={submitted_count} "
              f"pending={pending_count}")

    except Exception:
        traceback.print_exc()
    return result

def get_student_events(student_id: int, db: Session) -> dict:
    result = {
        "upcoming_events": [],
        "registered_events": [],
        "total_events": 0
    }
    try:
        from models import Event, EventRegistration
        # Get all upcoming events
        all_events = db.query(Event).filter(Event.status == "upcoming").limit(10).all()
        result["total_events"] = len(all_events)

        for e in all_events:
            event_name = getattr(e, 'title', getattr(e, 'event_name', getattr(e, 'name', 'Unknown Event')))
            event_date = getattr(e, 'event_date', getattr(e, 'date', getattr(e, 'start_date', None)))
            event_type = getattr(e, 'event_type', getattr(e, 'type', getattr(e, 'category', 'General')))

            result["upcoming_events"].append({
                "name": str(event_name),
                "date": str(event_date) if event_date else "TBD",
                "type": str(event_type)
            })

        # Check if student is registered for any events
        try:
            regs = db.query(EventRegistration).filter(EventRegistration.student_id == student_id).all()
            result["registered_events"] = [
                {"event_id": r.event_id, "status": getattr(r, 'status', 'registered')} 
                for r in regs
            ]
        except Exception:
            pass

    except Exception:
        traceback.print_exc()
    return result

def get_student_resources(student_id: int, db: Session) -> dict:
    result = {
        "recent_resources": [],
        "total_resources": 0
    }
    try:
        from models import Resource
        resources = db.query(Resource).order_by(Resource.id.desc()).limit(10).all()
        result["total_resources"] = len(resources)

        for r in resources:
            title = getattr(r, 'title', getattr(r, 'resource_name', getattr(r, 'name', 'Resource')))
            subject = getattr(r, 'subject_name', getattr(r, 'subject', getattr(r, 'topic', 'General')))
            rtype = getattr(r, 'type', getattr(r, 'resource_type', getattr(r, 'file_type', 'Document')))
            uploaded = getattr(r, 'uploaded_at', getattr(r, 'created_at', getattr(r, 'date', None)))

            result["recent_resources"].append({
                "title": str(title),
                "subject": str(subject),
                "type": str(rtype),
                "uploaded": str(uploaded) if uploaded else "Recent"
            })

    except Exception:
        traceback.print_exc()
    return result

def get_teacher_class_detail(teacher_id: int, db: Session) -> dict:
    """Returns detailed class data for a teacher."""
    result = {
        "class_avg_attendance": 0.0,
        "class_avg_marks": 0.0,
        "at_risk_count": 0,
        "low_attendance_count": 0,
        "total_students": 0,
        "pending_submissions": 0,
        "subjects": [],
        "class_students": [],
        "at_risk_students_detail": [],
        "assignment_details": [],
        "pending_students_flat": [],
        "active_alerts": []
    }
    try:
        # Get teacher's subject IDs — read models.py for exact name
        faculty_subjects = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == teacher_id
        ).all()
        
        if not faculty_subjects:
            return result
        
        subject_ids = [fs.subject_id for fs in faculty_subjects]
        
        # Get subject names — PK is subject_id NOT id
        try:
            from models import Subject
            subjs = db.query(Subject).filter(
                Subject.subject_id.in_(subject_ids)
            ).all()
            result["subjects"] = [
                s.subject_name or str(s.subject_id)
                for s in subjs
            ]
        except Exception:
            traceback.print_exc()
        
        # Student IDs in this teacher's subjects
        student_ids_raw = db.query(Attendance.student_id).filter(
            Attendance.subject_id.in_(subject_ids)
        ).distinct().all()
        student_ids = [s[0] for s in student_ids_raw if s[0] is not None]
        result["total_students"] = len(student_ids)
        
        if not student_ids:
            return result
        
        # Calculate per-student attendance
        att_values = []
        at_risk = 0
        low_att = 0
        attendance_by_student = {}
        
        for sid in student_ids[:100]:
            try:
                t = db.query(Attendance).filter(
                    Attendance.student_id == sid,
                    Attendance.subject_id.in_(subject_ids)
                ).count()
                p = db.query(Attendance).filter(
                    Attendance.student_id == sid,
                    Attendance.subject_id.in_(subject_ids),
                    Attendance.status == True
                ).count()
                pct = (p / t * 100) if t > 0 else 100
                att_values.append(pct)
                attendance_by_student[sid] = round(pct, 1)
                if pct < 75:
                    at_risk += 1
                    low_att += 1
            except Exception:
                continue
        
        if att_values:
            result["class_avg_attendance"] = round(
                sum(att_values) / len(att_values), 1
            )
        result["at_risk_count"] = at_risk
        result["low_attendance_count"] = low_att

        # Build class student identity list (name + roll) with attendance
        try:
            from models import Student as St, User

            class_students = []
            for sid in student_ids[:250]:
                try:
                    st = db.query(St).filter(St.student_id == sid).first()
                    if not st:
                        continue

                    user = db.query(User).filter(User.user_id == sid).first()
                    name = "Unknown"
                    if user:
                        name = (
                            getattr(user, "name", None)
                            or getattr(user, "full_name", None)
                            or getattr(user, "username", None)
                            or "Unknown"
                        )

                    att_pct = float(attendance_by_student.get(sid, 0.0))
                    class_students.append({
                        "student_id": sid,
                        "name": str(name),
                        "roll_no": str(getattr(st, "roll_no", None) or "N/A"),
                        "year": getattr(st, "year", None),
                        "section": str(getattr(st, "section", None) or "N/A"),
                        "attendance_pct": round(att_pct, 1),
                        "at_risk": att_pct < 75
                    })
                except Exception:
                    continue

            result["class_students"] = class_students
            result["at_risk_students_detail"] = [
                s for s in class_students if s.get("at_risk")
            ]
        except Exception:
            traceback.print_exc()

        # Marks for the teacher's subjects.
        try:
            from models import Mark, Subject

            mark_rows = db.query(Mark).filter(
                Mark.subject_id.in_(subject_ids)
            ).all()

            subject_marks_map = {}
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
                subject_lookup = db.query(Subject).filter(
                    Subject.subject_id.in_(list(subject_marks_map.keys()))
                ).all()
                for subj in subject_lookup:
                    subject_id = getattr(subj, 'subject_id', None)
                    if subject_id in subject_marks_map:
                        subject_marks_map[subject_id]["subject"] = (
                            subj.subject_name or f"Subject_{subject_id}"
                        )

                subject_marks = []
                averages = []
                for subject_id, entry in subject_marks_map.items():
                    avg = round(sum(entry["scores"]) / len(entry["scores"]), 1)
                    averages.append(avg)
                    subject_marks.append({
                        "subject": entry["subject"],
                        "average_percentage": avg,
                        "records": len(entry["scores"])
                    })

                result["subject_marks"] = subject_marks
                result["class_avg_marks"] = round(sum(averages) / len(averages), 1)
        except Exception:
            traceback.print_exc()
        
        # Pending submissions with assignment-wise pending student identities
        try:
            from models import Assignment, AssignmentSubmission, Student as St, User

            active_assignments = db.query(Assignment).filter(
                Assignment.subject_id.in_(subject_ids),
                Assignment.is_active == True
            ).all()

            total_pending = 0
            assignment_details = []
            pending_students_flat = []
            seen = set()

            for assg in active_assignments:
                try:
                    class_students = db.query(St).filter(
                        St.year == assg.year,
                        St.section == assg.section,
                        St.is_deleted == False
                    ).all()

                    meta = {}
                    for st in class_students:
                        sid = getattr(st, "student_id", None)
                        if sid is None:
                            continue
                        user = db.query(User).filter(User.user_id == sid).first()
                        name = "Unknown"
                        if user:
                            name = (
                                getattr(user, "name", None)
                                or getattr(user, "full_name", None)
                                or getattr(user, "username", None)
                                or "Unknown"
                            )
                        meta[sid] = {
                            "student_id": sid,
                            "name": str(name),
                            "roll_no": str(getattr(st, "roll_no", None) or "N/A"),
                            "year": getattr(st, "year", None),
                            "section": str(getattr(st, "section", None) or "N/A"),
                        }

                    rows = db.query(AssignmentSubmission).filter(
                        AssignmentSubmission.assignment_id == assg.id
                    ).all()

                    submitted_ids = set()
                    for sub in rows:
                        sid = getattr(sub, "student_id", None)
                        if sid is None:
                            continue
                        is_sub = getattr(sub, "is_submitted", None)
                        status = str(getattr(sub, "status", "")).lower()
                        if is_sub is True or status in ["submitted", "1", "true", "done", "completed"]:
                            submitted_ids.add(sid)

                    if not submitted_ids and rows:
                        submitted_ids = {
                            getattr(sub, "student_id", None)
                            for sub in rows
                            if getattr(sub, "student_id", None) is not None
                        }

                    pending_students = [
                        sdata for sid, sdata in meta.items()
                        if sid not in submitted_ids
                    ]
                    pending_count = len(pending_students)
                    if pending_count <= 0:
                        continue

                    total_pending += pending_count
                    for ps in pending_students:
                        sid = ps.get("student_id")
                        if sid not in seen:
                            seen.add(sid)
                            pending_students_flat.append(ps)

                    assignment_details.append({
                        "title": str(getattr(assg, "title", "Assignment")),
                        "year": getattr(assg, "year", None),
                        "section": getattr(assg, "section", None),
                        "pending": pending_count,
                        "submitted": min(len(meta), len(submitted_ids)),
                        "total_students": len(meta),
                        "due_date": str(getattr(assg, "due_date", None) or "No deadline"),
                        "pending_students": pending_students[:25],
                    })
                except Exception:
                    continue

            result["pending_submissions"] = total_pending
            result["assignment_details"] = assignment_details[:10]
            result["pending_students_flat"] = pending_students_flat[:120]
        except Exception:
            traceback.print_exc()

        # Alerts related to this teacher's students
        try:
            from models import Alert, User

            if student_ids:
                alert_rows = db.query(Alert).filter(
                    Alert.student_id.in_(student_ids)
                ).order_by(Alert.created_at.desc()).limit(50).all()

                student_meta = {
                    s.get("student_id"): s
                    for s in result.get("class_students", [])
                    if s.get("student_id") is not None
                }

                alert_items = []
                for a in alert_rows:
                    sid = getattr(a, "student_id", None)
                    sm = student_meta.get(sid, {})
                    name = sm.get("name")
                    roll_no = sm.get("roll_no")

                    if not name and sid is not None:
                        user = db.query(User).filter(User.user_id == sid).first()
                        if user:
                            name = (
                                getattr(user, "name", None)
                                or getattr(user, "full_name", None)
                                or getattr(user, "username", None)
                                or "Unknown"
                            )

                    alert_items.append({
                        "student_id": sid,
                        "name": str(name or "Unknown"),
                        "roll_no": str(roll_no or "N/A"),
                        "title": str(getattr(a, "title", "Alert") or "Alert"),
                        "message": str(getattr(a, "message", "") or ""),
                        "type": str(getattr(a, "type", "general") or "general"),
                        "created_at": str(getattr(a, "created_at", "") or "")
                    })

                result["active_alerts"] = alert_items
        except Exception:
            traceback.print_exc()
            
    except Exception:
        traceback.print_exc()
    return result

def get_admin_department_detail(db: Session) -> dict:
    """Returns per-department breakdown for admin."""
    result = {"department_breakdown": [], "low_attendance_departments": [], "faculty_by_department": {}}
    try:
        from models import User

        departments = db.query(Department).all()
        breakdown = []
        low_depts = []
        
        for dept in departments:
            try:
                dept_id = (
                    getattr(dept, "department_id", None) or
                    getattr(dept, "dept_id", None) or
                    getattr(dept, "id", None)
                )
                dept_name = getattr(
                    dept, "name",
                    getattr(dept, "department_name", "Unknown")
                )

                student_ids = [r[0] for r in db.query(Student.student_id).join(
                    User, User.user_id == Student.student_id
                ).filter(
                    User.department_id == dept_id,
                    Student.is_deleted == False,
                    User.is_deleted == False
                ).all()]
                
                if not student_ids:
                    continue
                
                att_values = []
                at_risk = 0
                
                for sid in student_ids[:30]:
                    try:
                        t = db.query(Attendance).filter(
                            Attendance.student_id == sid
                        ).count()
                        p = db.query(Attendance).filter(
                            Attendance.student_id == sid,
                            Attendance.status == True
                        ).count()
                        pct = (p / t * 100) if t > 0 else 100
                        att_values.append(pct)
                        if pct < 75:
                            at_risk += 1
                    except Exception:
                        continue
                
                avg_att = round(sum(att_values) / len(att_values), 1) \
                         if att_values else 0
                
                breakdown.append({
                    "dept": dept_name,
                    "attendance": avg_att,
                    "at_risk": at_risk,
                    "total": len(student_ids),
                    "faculty_names": []
                })
                
                if avg_att < 75:
                    low_depts.append(dept_name)
                    
            except Exception:
                continue
        
        result["department_breakdown"] = sorted(
            breakdown, key=lambda x: x["attendance"]
        )
        result["low_attendance_departments"] = low_depts

        try:
            faculty_rows = db.query(Faculty).all()
            faculty_by_department = {}
            for fac in faculty_rows:
                try:
                    uid = getattr(fac, "faculty_id", None)
                    user = db.query(User).filter(User.user_id == uid).first() if uid is not None else None
                    name = "Unknown"
                    dept_name = "Unknown"
                    if user:
                        name = (
                            getattr(user, "name", None) or
                            getattr(user, "full_name", None) or
                            getattr(user, "username", None) or
                            "Unknown"
                        )
                        dept_id = getattr(user, "department_id", None)
                        if dept_id is not None:
                            dept_row = db.query(Department).filter(
                                (getattr(Department, 'department_id', Department.id) == dept_id)
                            ).first()
                            if dept_row:
                                dept_name = getattr(dept_row, "name", getattr(dept_row, "department_name", "Unknown"))
                    faculty_by_department.setdefault(dept_name, []).append({
                        "faculty_id": uid,
                        "name": str(name),
                        "employee_id": str(getattr(fac, "employee_id", "N/A") or "N/A")
                    })
                except Exception:
                    continue

            result["faculty_by_department"] = faculty_by_department

            for dept in result["department_breakdown"]:
                dept["faculty_names"] = [
                    f["name"] for f in faculty_by_department.get(dept["dept"], [])
                ]
        except Exception:
            traceback.print_exc()
        
    except Exception:
        traceback.print_exc()
    return result
