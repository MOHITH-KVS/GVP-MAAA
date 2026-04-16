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
        "timestamp": datetime.utcnow().isoformat()
    }
