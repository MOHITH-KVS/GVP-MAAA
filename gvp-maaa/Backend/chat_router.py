from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import traceback

from auth import get_current_user
from database import get_db
from rag.agent_pipeline import run_chat_pipeline
router = APIRouter(prefix="/chat", tags=["RAG Chatbot"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user["user_id"]
    role = current_user["role"]
    import traceback
    print(f"[CHAT] user_id={user_id}, role={role}, msg={request.message[:50]}")
    
    try:
        # Convert history to simple list of dicts
        history = [
            {"role": m.role, "content": m.content} 
            for m in (request.history or [])
        ]
        
        reply = run_chat_pipeline(
            user_id=user_id,
            role=role,
            message=request.message,
            history=history[-6:],
            db=db
        )
        
        return {
            "reply": reply,
            "role": role,
            "allowed": True
        }
        
    except Exception as e:
        traceback.print_exc()
        return JSONResponse(
            status_code=200,
            content={
                "reply": "I had trouble processing that. Please try again.",
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
