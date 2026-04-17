from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db

from agents.risk_agent import RiskAgent
from agents.alert_agent import AlertAgent
from agents.task_agent import TaskAgent
from agents.placement_agent import PlacementAgent
from agents.insights_agent import InsightsAgent
from agent_graph import compile_graph

router = APIRouter(prefix="/agents", tags=["Multi-Agent System"])

risk_agent = RiskAgent()
alert_agent = AlertAgent()
task_agent = TaskAgent()
placement_agent = PlacementAgent()
insights_agent = InsightsAgent()

graph = compile_graph()

@router.post("/run/{student_id}")
def run_agents(student_id: int, db: Session = Depends(get_db)):
    state = {
        "student_id": student_id,
        "db": db,
        "risk_score": 0.0,
        "risk_flags": [],
        "alerts": [],
        "tasks": {},
        "placement_data": {},
        "insights": {},
        "errors": []
    }
    
    try:
        if graph:
            # Note: The LangGraph state passing logic can occasionally have strict requirements on State inputs, 
            # so we ensure it wraps normally.
            result = graph.invoke(state)
            
            # Avoid passing raw DB sessions back over JSON
            if "db" in result:
                del result["db"]
            return result
        else:
            # Fallback if LangGraph fails to load
            result_risk = risk_agent.run(student_id=student_id, db=db)
            result_alert = alert_agent.run(student_id=student_id, db=db)
            result_task = task_agent.run(student_id=student_id, db=db)
            result_place = placement_agent.run(student_id=student_id, db=db)
            
            state["risk_score"] = result_risk.get("risk_score", 0.0)
            state["alerts"] = result_alert.get("alerts", [])
            state["tasks"] = result_task.get("data", {}) if result_task.get("fallback") else result_task
            state["placement_data"] = result_place
            del state["db"]
            return state

    except Exception as e:
        del state["db"]
        return {"error": str(e), "partial_data": state}

@router.get("/risk/{student_id}")
def get_risk(student_id: int, db: Session = Depends(get_db)):
    return risk_agent.run(student_id=student_id, db=db)

@router.get("/alerts/{student_id}")
def get_alerts(student_id: int, db: Session = Depends(get_db)):
    return alert_agent.run(student_id=student_id, db=db)

@router.get("/tasks/{student_id}")
def get_tasks(student_id: int, db: Session = Depends(get_db)):
    return task_agent.run(student_id=student_id, db=db)

@router.get("/placement/{student_id}")
def get_placement(student_id: int, db: Session = Depends(get_db)):
    return placement_agent.run(student_id=student_id, db=db)

@router.get("/insights")
def get_insights(department_id: int = None, db: Session = Depends(get_db)):
    return insights_agent.run(db=db, department_id=department_id)

@router.get("/status")
def get_status():
    return {
        "agents": ["risk", "alert", "task", "placement", "insights"],
        "graph": "ok" if graph else "error",
    }

@router.get("/debug/student/{student_id}")
async def debug_student_data(
    student_id: int,
    db: Session = Depends(get_db)
):
    """
    Debug endpoint — shows exactly what data the chatbot
    can see for a student. Use this to verify data is correct.
    """
    try:
        from rag.context_builder import (
            build_student_context,
            get_student_attendance_detail,
            get_student_marks_detail,
            get_student_assignments_detail,
            get_student_events,
            get_student_resources
        )
        return {
            "base": build_student_context(student_id, db),
            "attendance": get_student_attendance_detail(
                student_id, db
            ),
            "marks": get_student_marks_detail(student_id, db),
            "assignments": get_student_assignments_detail(
                student_id, db
            ),
            "events": get_student_events(student_id, db),
            "resources": get_student_resources(student_id, db)
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/assignments/{student_id}")
async def debug_assignments(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Shows raw assignment data to diagnose pending count."""
    try:
        from models import AssignmentSubmission
        all_subs = db.query(AssignmentSubmission).filter(
            AssignmentSubmission.student_id == student_id
        ).all()
        return {
            "total_submissions": len(all_subs),
            "statuses": list(set([
                str(getattr(s, 'status', 'unknown'))
                for s in all_subs
            ])),
            "submissions": [
                {
                    "id": s.id,
                    "status": str(getattr(s, 'status', None)),
                    "assignment_id": getattr(
                        s, 'assignment_id', None
                    )
                }
                for s in all_subs[:10]
            ]
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/debug/teacher/{teacher_id}")
async def debug_teacher(teacher_id: int,
                        db: Session = Depends(get_db)):
    from models import FacultySubject
    results = {}

    # Check 1: Does faculty_subject have records?
    try:
        fs = db.query(FacultySubject).all()
        results["total_faculty_subject_records"] = len(fs)
        results["sample_records"] = [
            {
                "id": r.id,
                "faculty_id_field": str(getattr(r, 'faculty_id', 'NOT FOUND')),
                "subject_id": getattr(r, 'subject_id', 'NOT FOUND')
            }
            for r in fs[:5]
        ]
    except Exception as e:
        results["faculty_subject_error"] = str(e)

    # Check 2: What records exist for this teacher_id?
    try:
        matching = db.query(FacultySubject).filter(
            FacultySubject.faculty_id == teacher_id
        ).all()
        results["records_for_this_teacher"] = len(matching)
    except Exception as e:
        results["faculty_id_filter_error"] = str(e)

    results["queried_teacher_id"] = teacher_id
    return results

@router.get("/debug/admin")
async def debug_admin(db: Session = Depends(get_db)):
    from rag.context_builder import build_admin_context
    return build_admin_context(db)
