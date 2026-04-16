from sqlalchemy.orm import Session
import traceback

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
                total_marks = float(m.total) if hasattr(m, 'total') and m.total else 100
                pct = round((score / total_marks) * 100, 1) if total_marks > 0 else score
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
        pending = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id,
            AssignmentSubmission.status == "pending"
        ).count()
        context["pending_assignments"] = pending
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
    
    # Get this teacher's subject IDs
    try:
        faculty_subjects = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == teacher_id
        ).all()
        
        if not faculty_subjects:
            return context
        
        subject_ids = [fs.subject_id for fs in faculty_subjects]
        
        # Subject names
        try:
            from models import Subject
            subjects = db.query(Subject).filter(
                Subject.id.in_(subject_ids)
            ).all()
            context["subjects"] = [
                getattr(s, 'subject_name', getattr(s, 'name', 'Unknown')) 
                for s in subjects
            ]
        except Exception:
            pass
        
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
            pending = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.status == "pending"
            ).count()
            context["pending_submissions"] = pending
        except Exception:
            pass
            
    except Exception:
        traceback.print_exc()
    
    return context

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
                for sid in dept_student_ids[:20]:
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
        context["at_risk_count"] = sum(d["at_risk"] for d in breakdown)
        
    except Exception:
        traceback.print_exc()
    
    return context
