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
                        Subject.id.in_(subject_ids)
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
        "low_attendance_departments": []
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
    
    try:
        drives = db.query(PlacementDrive).filter(
            PlacementDrive.status == "open"
        ).count()
        context["placement_drives_open"] = drives
    except Exception:
        pass
    
    # Department breakdown
    try:
        departments = db.query(Department).all()
        breakdown = []
        low_att_depts = []
        
        for dept in departments[:10]:
            try:
                dept_name = getattr(dept, 'name', getattr(dept, 'department_name', 'Unknown'))
                dept_students = db.query(Student).filter(
                    Student.department_id == dept.id
                ).all()
                dept_student_ids = [s.student_id for s in dept_students] # USING student_id not id
                
                if not dept_student_ids:
                    continue
                
                # At-risk in dept (use attendance threshold)
                at_risk_dept = 0
                att_values = []
                for sid in dept_student_ids:
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
                            at_risk_dept += 1
                    except Exception:
                        continue
                
                avg_att = round(sum(att_values) / len(att_values), 1) if att_values else 0
                
                breakdown.append({
                    "dept": dept_name,
                    "attendance": avg_att,
                    "at_risk": at_risk_dept
                })
                
                if avg_att < 75:
                    low_att_depts.append(dept_name)
                    
            except Exception:
                continue
        
        context["department_breakdown"] = breakdown
        context["low_attendance_departments"] = low_att_depts
        
        # Total at-risk count
        context["at_risk_count"] = count_at_risk_students(db)
        
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
        
        # Per-subject attendance
        # Read models.py for exact subject relationship
        try:
            from sqlalchemy import func
            from models import Subject
            subject_ids = db.query(Attendance.subject_id).filter(
                Attendance.student_id == student_id
            ).distinct().all()
            
            for (subj_id,) in subject_ids[:10]:
                if subj_id is None:
                    continue
                t = db.query(Attendance).filter(
                    Attendance.student_id == student_id,
                    Attendance.subject_id == subj_id
                ).count()
                p = db.query(Attendance).filter(
                    Attendance.student_id == student_id,
                    Attendance.subject_id == subj_id,
                    Attendance.status == True
                ).count()
                pct = round((p / t) * 100, 1) if t > 0 else 0
                
                subj_name = str(subj_id)
                try:
                    subj = db.query(Subject).filter(Subject.id == subj_id).first()
                    if subj:
                        subj_name = getattr(subj, "subject_name",
                                   getattr(subj, "name", str(subj_id)))
                except Exception:
                    pass
                
                result["subject_attendance"].append({
                    "subject": subj_name,
                    "pct": pct,
                    "present": p,
                    "total": t
                })
        except Exception:
            pass
    except Exception:
        traceback.print_exc()
    return result

def get_student_marks_detail(student_id: int, db: Session) -> dict:
    """Returns detailed marks breakdown for a student."""
    result = {"subject_marks": [], "overall_avg": 0.0}
    try:
        marks_records = db.query(Mark).filter(
            Mark.student_id == student_id
        ).all()
        
        subject_marks = []
        total_pct = 0
        count = 0
        
        for m in marks_records:
            try:
                score = float(m.marks) if m.marks is not None else 0
                out_of = float(m.total) if (
                    hasattr(m, 'total') and m.total
                    and float(m.total) > 0
                ) else 30
                
                pct = round((score / out_of) * 100, 1)
                
                subj_name = "Unknown"
                if hasattr(m, 'subject') and m.subject:
                    subj_name = getattr(m.subject, 'subject_name',
                               getattr(m.subject, 'name', 'Unknown'))
                
                # Get exam type
                exam_type = getattr(m, 'exam_type',
                           getattr(m, 'exam_name',
                           getattr(m, 'type',
                           getattr(m, 'assessment_type', ''))))
                
                # Build label: "MACHINE LEARNING (Mid 1)"
                label = subj_name
                if exam_type:
                    label = f"{subj_name} ({exam_type})"

                subject_marks.append({
                    "subject": label,
                    "raw_subject": subj_name,
                    "exam_type": str(exam_type),
                    "score": score,
                    "out_of": out_of,
                    "pct": pct
                })
                total_pct += pct
                count += 1
            except Exception:
                continue
        
        result["subject_marks"] = subject_marks
        result["overall_avg"] = round(total_pct / count, 1) if count > 0 else 0
    except Exception:
        traceback.print_exc()
    return result

def get_student_assignments_detail(student_id: int, db: Session) -> dict:
    result = {"pending_assignments": 0, "submitted_assignments": 0}
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
            
            pending_count = sum(1 for a in assignments if a.id not in submitted_ids)
            
            result["pending_assignments"] = pending_count
            result["submitted_assignments"] = len(submissions)
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
        "subjects": []
    }
    try:
        # Get teacher's subject IDs — read models.py for exact name
        faculty_subjects = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == teacher_id
        ).all()
        
        if not faculty_subjects:
            return result
        
        subject_ids = [fs.subject_id for fs in faculty_subjects]
        
        # Get subject names
        try:
            from models import Subject
            subjs = db.query(Subject).filter(Subject.id.in_(subject_ids)).all()
            result["subjects"] = [
                getattr(s, "subject_name", getattr(s, "name", "Unknown"))
                for s in subjs
            ]
        except Exception:
            pass
        
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
        
        # Pending submissions
        try:
            pending = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.status == "pending"
            ).count()
            result["pending_submissions"] = pending
        except Exception:
            pass
            
    except Exception:
        traceback.print_exc()
    return result

def get_admin_department_detail(db: Session) -> dict:
    """Returns per-department breakdown for admin."""
    result = {"department_breakdown": [], "low_attendance_departments": []}
    try:
        departments = db.query(Department).all()
        breakdown = []
        low_depts = []
        
        for dept in departments:
            try:
                dept_name = getattr(dept, "name",
                           getattr(dept, "department_name", "Unknown"))
                
                dept_students = db.query(Student).filter(
                    Student.department_id == dept.id
                ).all()
                student_ids = [s.student_id for s in dept_students]
                
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
                    "total": len(student_ids)
                })
                
                if avg_att < 75:
                    low_depts.append(dept_name)
                    
            except Exception:
                continue
        
        result["department_breakdown"] = sorted(
            breakdown, key=lambda x: x["attendance"]
        )
        result["low_attendance_departments"] = low_depts
        
    except Exception:
        traceback.print_exc()
    return result
