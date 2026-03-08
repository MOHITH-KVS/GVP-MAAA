from database import SessionLocal
from main import get_events, get_student_events
from models import Event, User

db = SessionLocal()

# Find an event
ev = db.query(Event).first()
if ev:
    print(f"Found event {ev.id} created by user {ev.created_by}")
    
    # Run get_events for this user
    try:
        events = get_events(current_user={"role": "faculty", "user_id": ev.created_by, "department_id": 1}, db=db)
        print(f"get_events returned {len(events)} events.")
        
        # Now try to serialize it like FastAPI does!
        from fastapi.encoders import jsonable_encoder
        json_data = jsonable_encoder(events)
        print("Successfully serialized to JSON")
    except Exception as e:
        import traceback
        traceback.print_exc()

else:
    print("No events in DB")
