from sqlalchemy.orm import Session
from models import Attendance, Mark, AssignmentSubmission, StudentProgress, Alert, FacultySubject, User, Student, Assignment
import logging

logger = logging.getLogger(__name__)

# Attempt to import risk engine
try:
    from ml.risk_engine import calculate_risk
except ImportError:
    calculate_risk = None


def build_student_context(student_id: int, db: Session) -> dict:
    """Safely builds context for a single student."""
    context = {
        "role": "student",
        "student_id": student_id,
        "attendance_pct": 0.0,
        "subject_marks": [],
        "pending_assignments": 0,
        "active_alerts": [],
        "xp": 0,
        "streak": 0,
        "risk_level": "LOW",
    }
    
    try:
        # Attendance
        attendances = db.query(Attendance).filter(Attendance.student_id == student_id).all()
        if attendances:
            present = sum(1 for a in attendances if a.status)
            context["attendance_pct"] = round((present / len(attendances)) * 100, 1)

        # Marks
        marks = db.query(Mark).filter(Mark.student_id == student_id).all()
        mid1_total = 0
        mid2_total = 0
        for m in marks:
            if m.subject:
                context["subject_marks"].append({
                    "subject": m.subject.subject_name,
                    "score": float(m.marks or m.total or 0.0)
                })
            mid1_total += float(m.mid1 or 0)
            mid2_total += float(m.mid2 or 0)
            
        # Assignments
        pending = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id,
            AssignmentSubmission.is_submitted == False
        ).count()
        context["pending_assignments"] = pending
        
        # Gamification
        progress = db.query(StudentProgress).filter(StudentProgress.student_id == student_id).first()
        if progress:
            context["xp"] = progress.total_xp
            context["streak"] = progress.streak_days
            
        # Alerts
        alerts = db.query(Alert).filter(Alert.student_id == student_id).all()
        context["active_alerts"] = [a.title for a in alerts]
        
        # Risk (safely)
        if calculate_risk:
            # Emulate dict structure required by risk engine
            student_dict = {
                "attendance": context["attendance_pct"],
                "mid1": mid1_total / max(1, len(marks)),
                "mid2": mid2_total / max(1, len(marks))
            }
            risk_info = calculate_risk(student_dict, thresholds={})
            if risk_info and "risk" in risk_info:
                context["risk_level"] = risk_info["risk"]
                
    except Exception as e:
        logger.error(f"Error building student context: {e}")
        return {}
        
    return context


def build_teacher_context(teacher_id: int, db: Session) -> dict:
    """Safely builds class-level stats for a faculty member."""
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
    try:
        # Get Teacher's Subjects
        fac_subjects = db.query(FacultySubject).filter(FacultySubject.faculty_id == teacher_id).all()
        subject_ids = [fs.subject_id for fs in fac_subjects]
        context["subjects"] = [fs.subject.subject_name for fs in fac_subjects if fs.subject]
        
        if not subject_ids:
            return context

        # Total assigned students (Approximated from Attendances under them)
        students_assigned = db.query(Attendance.student_id).filter(Attendance.faculty_id == teacher_id).distinct().count()
        context["total_students"] = students_assigned
        
        # Class Average Attendance
        att = db.query(Attendance).filter(Attendance.faculty_id == teacher_id).all()
        if att:
            present = sum(1 for a in att if a.status)
            context["class_avg_attendance"] = round((present / len(att)) * 100, 1)
            
        # Class Average Marks
        marks = db.query(Mark).filter(Mark.faculty_id == teacher_id).all()
        if marks:
            total_score = sum(float(m.total or 0) for m in marks)
            context["class_avg_marks"] = round(total_score / len(marks), 1)
            
            # Simple at-risk (attendance < 75 or low marks) proxy for the class since we only need count
            # In a real setup, we'd query per student. Here we approximate by simple DB threshold:
            at_risk = db.query(Mark.student_id).filter(
                Mark.faculty_id == teacher_id,
                Mark.total < 15
            ).distinct().count()
            context["at_risk_count"] = at_risk
            
        # Pending Submissions for this teacher's assignments
        active_assignments = db.query(Assignment.id).filter(Assignment.faculty_id == teacher_id).all()
        assign_ids = [a.id for a in active_assignments]
        if assign_ids:
            pending = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.assignment_id.in_(assign_ids),
                AssignmentSubmission.is_submitted == False
            ).count()
            context["pending_submissions"] = pending

    except Exception as e:
        logger.error(f"Error building teacher context: {e}")
        return {}

    return context


def build_admin_context(db: Session) -> dict:
    """Builds institution-wide aggregates."""
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
    
    try:
        from models import PlacementDrive
        
        context["total_students"] = db.query(Student).count()
        context["total_teachers"] = db.query(User).filter(User.role == "faculty").count()
        
        att = db.query(Attendance).all()
        if att:
            present = sum(1 for a in att if a.status)
            context["overall_attendance_pct"] = round((present / len(att)) * 100, 1)

        alerts = db.query(Alert).filter(Alert.is_read == False).count()
        context["active_alerts_count"] = alerts

        drives = db.query(PlacementDrive).filter(PlacementDrive.status == "open").count()
        context["placement_drives_open"] = drives

        # Since we just need an overall count, we'll proxy it here for the LLM
        # by checking students with an alert title related to risk:
        # Or just simulate a DB query for total failing subjects
        at_risk = db.query(Mark.student_id).filter(Mark.total < 15).distinct().count()
        context["at_risk_count"] = at_risk

    except Exception as e:
        logger.error(f"Error building admin context: {e}")
        return {}
        
    return context
