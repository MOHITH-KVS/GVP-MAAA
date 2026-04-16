from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any

from auth import get_current_user
from database import get_db
from sqlalchemy.orm import Session

from rag.chat_engine import answer_query
from rag.query_router import is_query_allowed

router = APIRouter(prefix="/chat", tags=["RAG Chatbot"])

class ChatMessage(BaseModel):
    from_: str = "user"  # "user" or "ai"
    text: str
    
    # Handle alias for "from" which is a Python keyword
    class Config:
        fields = {'from_': 'from'}

class ChatRequest(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []

@router.post("/message")
def compute_chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Extract user_id and role from JWT payload (from our review of auth.py / login pattern, usually sub is email, and we might query the user or maybe the token has user_id)
        # Actually standard tokens in this app: payload often includes "role" and "sub". Wait, let's look at `User` query if not.
        email = current_user.get("sub") or current_user.get("email")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")

        # Query user to get ID and role exactly to be safe
        from models import User
        user = db.query(User).filter(User.email == email).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        user_id = user.user_id
        role = user.role

        sys_role = "teacher" if role == "faculty" else role

        # Check allowed early mapping to the query router
        allowed, denial_msg = is_query_allowed(request.message, sys_role)
        if not allowed:
            return {
                "reply": denial_msg,
                "role": sys_role,
                "allowed": False
            }

        reply = answer_query(user_id, role, request.message, request.history, db)

        return {
            "reply": reply,
            "role": sys_role,
            "allowed": True
        }

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Chat route error: {e}")
        
        sys_role = "student"
        if "role" in locals() and role == "faculty":
            sys_role = "teacher"
        elif "role" in locals():
            sys_role = role
            
        return {
            "reply": "Service temporarily unavailable.",
            "role": sys_role,
            "allowed": True
        }


@router.get("/suggested/{role}")
def get_suggested_questions(role: str):
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
            "How many students are at risk?",
            "Which subject has lowest performance?",
            "How many assignments are pending submission?",
            "What should I focus on this week?"
        ],
        "admin": [
            "How many students are at risk institution-wide?",
            "Which department has lowest attendance?",
            "How many placement drives are open?",
            "Give me this week's academic summary.",
            "Which departments need immediate intervention?"
        ]
    }
    
    target_role = "teacher" if role == "faculty" else role
    return suggestions.get(target_role, [])
