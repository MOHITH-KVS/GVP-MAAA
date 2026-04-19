from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Any
import traceback
import time

from auth import get_current_user
from database import get_db
router = APIRouter(prefix="/chat", tags=["RAG Chatbot"])


def map_response_mode(source: str) -> str:
    src = (source or "").lower()
    if src in {"verified_data", "fallback"}:
        return "verified_data"
    if src in {"gemini", "langchain", "cache", "legacy"}:
        return "live_ai"
    return "live_ai"


def infer_mode_from_text(reply_text: str) -> Optional[str]:
    lower = str(reply_text or "").lower()
    if "verified dashboard data" in lower or "ai-generated wording is temporarily unavailable" in lower:
        return "verified_data"
    return None

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


def chunk_text(text: str, chunk_size: int = 40):
    for index in range(0, len(text), chunk_size):
        yield text[index:index + chunk_size]

@router.post("/message")
async def chat_message(
    request: ChatRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import traceback
    request_start = time.time()
    try:
        # ── Resolve user identity ─────────────────────────────────
        if isinstance(current_user, dict):
            user_id = current_user.get("user_id", 1)
            role    = current_user.get("role", "student")
        else:
            user_id = getattr(current_user, 'user_id', 1)
            role    = getattr(current_user, 'role', 'student')

        query = str(request.message or "")
        request_payload = request.dict()
        force_live_ai = bool(request_payload.get("force_live_ai", False))
        print(f"[REQUEST] user={user_id} query='{query}'")
        print(f"[CHAT] role={role} user_id={user_id} msg={request.message[:60]}")

        # ── Access control ────────────────────────────────────────
        try:
            from rag.query_router import is_query_allowed
            allowed, denial = is_query_allowed(request.message, role)
            if not allowed:
                return {"reply": denial, "role": role, "allowed": False}
        except Exception:
            pass   # if query_router is missing, skip check

        history = normalize_history(request.history or [])

        # ── Run LangGraph RAG pipeline ──────────────────────────
        role_lower = str(role).lower()
        reply_source = "unknown"
        try:
            from rag.graph_pipeline import run_rag_pipeline
            pipeline_result = run_rag_pipeline(
                user_id=int(user_id),
                role=role_lower,
                question=request.message,
                history=history[-6:],
                db=db,
                include_meta=True,
                force_live_ai=force_live_ai,
            )
            if isinstance(pipeline_result, dict):
                reply = pipeline_result.get("answer")
                reply_source = str(pipeline_result.get("source") or "unknown")
            else:
                reply = pipeline_result
        except Exception:
            traceback.print_exc()
            reply = None
            reply_source = "error"

        if not reply or len(str(reply).strip()) < 3:
            reply = ("I couldn't find specific data for that. "
                     "Please check your dashboard.")
            reply_source = "error"

        response_mode = map_response_mode(reply_source)
        inferred_mode = infer_mode_from_text(str(reply))
        if inferred_mode:
            response_mode = inferred_mode

        print(f"[CHAT] reply={str(reply)}")
        print(f"[CHAT] source={reply_source} mode={response_mode}")
        print(f"[TOTAL TIME] {time.time() - request_start:.2f}s")

        def stream_response():
            full_text = str(reply)
            for chunk in chunk_text(full_text):
                yield chunk

        return StreamingResponse(
            stream_response(),
            media_type="text/plain; charset=utf-8",
            headers={
                "X-Response-Mode": response_mode,
                "X-Response-Source": reply_source,
            }
        )

    except Exception as e:
        traceback.print_exc()
        print(f"[ERROR] {str(e)}")
        print(f"[CHAT ERROR] {e}")
        print(f"[TOTAL TIME] {time.time() - request_start:.2f}s")
        return JSONResponse(
            status_code=200,
            content={
                "reply": "I'm having trouble accessing your data. Please try again.",
                "role":    "unknown",
                "allowed": True,
                "mode": "verified_data",
                "source": "error",
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
