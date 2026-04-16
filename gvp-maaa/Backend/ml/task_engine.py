from sqlalchemy.orm import Session
from sqlalchemy.sql import func
try:
    from models import Attendance, Mark, AssignmentSubmission, StudentProgress
except ImportError:
    pass  # Allow graceful fallback in agents if this fails

def generate_tasks(student_id: int, db: Session) -> dict:
    try:
        tasks = []
        
        # 1. Check Attendance
        try:
            total_classes = db.query(Attendance).filter(Attendance.student_id == student_id).count()
            present_classes = db.query(Attendance).filter(
                Attendance.student_id == student_id, 
                Attendance.status == True
            ).count()
            
            attendance_pct = 100
            if total_classes > 0:
                attendance_pct = (present_classes / total_classes) * 100
                
            if attendance_pct < 75:
                tasks.append({
                    "id": "att_high",
                    "type": "attendance",
                    "priority": "HIGH",
                    "text": f"Attend all classes this week — your attendance is {int(attendance_pct)}%"
                })
            elif attendance_pct < 85:
                tasks.append({
                    "id": "att_med",
                    "type": "attendance",
                    "priority": "MEDIUM",
                    "text": f"Attend all classes this week — your attendance is {int(attendance_pct)}%"
                })
        except Exception:
            pass

        # 2. Check Marks
        try:
            recent_marks = db.query(Mark).filter(Mark.student_id == student_id).all()
            for m in recent_marks:
                # Calculate percentage
                score_pct = 100
                if m.total and m.total > 0:
                    score_pct = (m.marks / m.total) * 100
                elif m.marks is not None:
                    score_pct = float(m.marks) # assuming out of 100 if no total
                
                subject_name = m.subject.subject_name if m.subject else "your subject"
                
                if score_pct < 40:
                    tasks.append({
                        "id": f"mark_high_{m.id}",
                        "type": "marks",
                        "priority": "HIGH",
                        "text": f"Revise {subject_name} — scored {int(score_pct)}% in last assessment"
                    })
                elif score_pct < 60:
                    tasks.append({
                        "id": f"mark_med_{m.id}",
                        "type": "marks",
                        "priority": "MEDIUM",
                        "text": f"Revise {subject_name} — scored {int(score_pct)}% in last assessment"
                    })
        except Exception:
            pass

        # 3. Check Assignments
        try:
            pending_assignments = db.query(AssignmentSubmission).filter(
                AssignmentSubmission.student_id == student_id,
                AssignmentSubmission.status == "pending"
            ).all()
            for a in pending_assignments:
                title = "pending assignment"
                tasks.append({
                    "id": f"assg_med_{a.id}",
                    "type": "assignment",
                    "priority": "MEDIUM", # defaulting to medium for assignments without strict deadlines
                    "text": f"Submit pending assignment: {title}"
                })
        except Exception:
            pass

        # Progress stats
        xp = 0
        streak = 0
        try:
            progress = db.query(StudentProgress).filter(StudentProgress.student_id == student_id).first()
            if progress:
                xp = progress.total_xp
                streak = progress.streak_days
        except Exception:
            pass

        # Sort tasks by priority (HIGH first)
        high_tasks = [t for t in tasks if t["priority"] == "HIGH"]
        med_tasks = [t for t in tasks if t["priority"] == "MEDIUM"]
        low_tasks = [t for t in tasks if t["priority"] == "LOW"]
        
        all_sorted = high_tasks + med_tasks + low_tasks
        
        # Time buckets: today = max 2, this_week = max 3
        today_tasks = all_sorted[:2]
        week_tasks = all_sorted[2:5]
        
        priority_counts = {
            "HIGH": len(high_tasks),
            "MEDIUM": len(med_tasks),
            "LOW": len(low_tasks)
        }

        return {
            "today_tasks": today_tasks,
            "week_tasks": week_tasks,
            "priority_counts": priority_counts,
            "xp": xp,
            "streak": streak
        }

    except Exception as e:
        return {
            "today_tasks": [],
            "week_tasks": [],
            "priority_counts": {"HIGH": 0, "MEDIUM": 0, "LOW": 0},
            "xp": 0,
            "streak": 0
        }
