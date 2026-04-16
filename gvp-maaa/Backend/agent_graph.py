from typing import TypedDict, Dict, List, Any
try:
    from langgraph.graph import StateGraph, START, END
except ImportError:
    StateGraph = None
    START = None
    END = None

from agents.risk_agent import RiskAgent
from agents.alert_agent import AlertAgent
from agents.task_agent import TaskAgent
from agents.placement_agent import PlacementAgent

class AgentState(TypedDict):
    student_id: int
    db: Any
    risk_score: float
    risk_flags: list
    alerts: list
    tasks: dict
    placement_data: dict
    insights: dict
    errors: list

# Initialize agents
risk_agent = RiskAgent()
alert_agent = AlertAgent()
task_agent = TaskAgent()
placement_agent = PlacementAgent()

def run_risk_node(state: AgentState):
    student_id = state.get("student_id")
    db = state.get("db")
    result = risk_agent.run(student_id=student_id, db=db)
    
    if result.get("fallback"):
        state["errors"].append({"agent": "RiskAgent", "error": result.get("error")})
    else:
        state["risk_score"] = result.get("risk_score", 0.0)
        state["risk_flags"] = result.get("risk_flags", [])
        
    return state

def run_alert_node(state: AgentState):
    student_id = state.get("student_id")
    db = state.get("db")
    result = alert_agent.run(student_id=student_id, db=db)
    
    if result.get("fallback"):
        state["errors"].append({"agent": "AlertAgent", "error": result.get("error")})
    else:
        state["alerts"] = result.get("alerts", [])
        
    return state

def run_task_node(state: AgentState):
    student_id = state.get("student_id")
    db = state.get("db")
    result = task_agent.run(student_id=student_id, db=db)
    
    if result.get("fallback"):
        state["errors"].append({"agent": "TaskAgent", "error": result.get("error")})
    else:
        # result is directly the tasks dict if successful
        if "today_tasks" in result:
            state["tasks"] = result
        else:
            state["tasks"] = result.get("data", {})
            
    return state

def run_placement_node(state: AgentState):
    student_id = state.get("student_id")
    db = state.get("db")
    result = placement_agent.run(student_id=student_id, db=db)
    
    if result.get("fallback"):
        state["errors"].append({"agent": "PlacementAgent", "error": result.get("error")})
    else:
        state["placement_data"] = result
        
    return state

def route_after_risk(state: AgentState):
    if state.get("risk_score", 0.0) > 0.6:
        return "run_alert_node"
    return "run_task_node"

def compile_graph():
    if not StateGraph:
        return None
        
    builder = StateGraph(AgentState)
    
    # Add nodes
    builder.add_node("run_risk_node", run_risk_node)
    builder.add_node("run_alert_node", run_alert_node)
    builder.add_node("run_task_node", run_task_node)
    builder.add_node("run_placement_node", run_placement_node)
    
    # Flow
    builder.add_edge(START, "run_risk_node")
    builder.add_conditional_edges(
        "run_risk_node",
        route_after_risk,
        {
            "run_alert_node": "run_alert_node",
            "run_task_node": "run_task_node"
        }
    )
    
    builder.add_edge("run_alert_node", "run_task_node")
    builder.add_edge("run_task_node", "run_placement_node")
    builder.add_edge("run_placement_node", END)
    
    return builder.compile()
