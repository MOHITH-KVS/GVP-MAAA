from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
import traceback

from auth import get_current_user
from database import get_db
from rag.agent_pipeline import run_chat_pipeline
router = APIRouter(prefix="/chat", tags=["RAG Chatbot"])

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Any]] = []

    class Config:
        extra = "allow"

def normalize_history(raw_history):
    if not raw_history:
        return []
    normalized = []
    for item in raw_history:
        try:
            if isinstance(item, dict):
                normalized.append({
                    "role": str(item.get("role",
                              item.get("from",
                              item.get("sender", "user")))),
                    "content": str(item.get("content",
                                  item.get("text",
                                  item.get("message", ""))))
                })
            elif isinstance(item, str):
                normalized.append({"role": "user", "content": item})
        except Exception:
            continue
    return normalized[-6:]

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import traceback
    try:
        if isinstance(current_user, dict):
            user_id = current_user.get("user_id", 1)
            role = current_user.get("role", "student")
        else:
            user_id = getattr(current_user, 'user_id', 1)
            role = getattr(current_user, 'role', 'student')

        print(f"[CHAT] role={role} user_id={user_id} msg={request.message[:60]}")

        history = normalize_history(request.history or [])

        reply = run_chat_pipeline(
            user_id=int(user_id),
            role=str(role),
            message=str(request.message),
            history=history,
            db=db
        )

        if not reply or not str(reply).strip():
            reply = ("I could not find specific data for that query. "
                    "Please check your dashboard.")

        print(f"[CHAT] reply={str(reply)[:80]}")
        return {"reply": str(reply), "role": str(role), "allowed": True}

    except Exception as e:
        traceback.print_exc()
        print(f"[CHAT ERROR] {e}")
        return JSONResponse(
            status_code=200,
            content={
                "reply": "I'm having trouble accessing your data. Please try again in a moment.",
                "role": "unknown",
                "allowed": True
            }
        )

@router.get("/suggested/{role}")
async def get_suggested(role: str):
    role = role.lower()
    if role == "faculty":
        role = "teacher"
    
    suggestions = {
        "student": [
            "What is my current attendance percentage?",
            "Which subject do I need to focus on?",
            "Am I at risk of failing?",
            "What tasks should I complete today?",
            "Am I eligible for placement drives?"
        ],
        "teacher": [
            "What is my class average attendance?",
            "How many students are at risk in my class?",
            "Which subject has the lowest performance?",
            "How many assignments are pending submission?",
            "What should I focus on this week?"
        ],
        "admin": [
            "How many students are at risk institution-wide?",
            "Which department has the lowest attendance?",
            "How many placement drives are currently open?",
            "Give me this week's academic summary.",
            "Which departments need immediate intervention?"
        ]
    }
    return suggestions.get(role, suggestions["student"])
