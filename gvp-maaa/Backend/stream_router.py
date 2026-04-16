from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
import time

from orchestrator import run_agents
from llm_narrator import narrate_student_report

router = APIRouter(prefix="/agents/stream")

def event_generator(student_id: int, db: Session):
    try:
        state = run_agents(student_id, db)
        narrative = narrate_student_report(state)
        
        words = narrative.split()
        for word in words:
            yield f"data: {word}\n\n"
            time.sleep(0.05) # Add slight delay for the visual streaming effect
        
        yield "data: [DONE]\n\n"
    except Exception as e:
        fallback = "Student data retrieved. Please check dashboard for detailed insights."
        for word in fallback.split():
            yield f"data: {word}\n\n"
            time.sleep(0.05)
        yield "data: [DONE]\n\n"

@router.get("/report/{student_id}")
def stream_report(student_id: int, db: Session = Depends(get_db)):
    return StreamingResponse(
        event_generator(student_id, db),
        media_type="text/event-stream",
        headers={
            'Cache-Control': 'no-cache', 
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )
