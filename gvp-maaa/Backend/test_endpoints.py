from database import SessionLocal
from models import Event, EventAttendance
from schemas import EventResponse
from datetime import date
try:
    db = SessionLocal()
    events = db.query(Event).all()
    today = date.today()
    for ev in events:
        print(f"Event parsing test for ID {ev.id}")
        
        # Test 1: Can we parse it directly?
        resp = EventResponse.from_orm(ev)
        
        # Adjust status locally as in the codebase
        if ev.event_date > today:
            resp.status = "Upcoming"
        elif ev.event_date == today:
            resp.status = "Ongoing"
        else:
            resp.status = "Completed"
            
        total = db.query(EventAttendance).filter(EventAttendance.event_id == ev.id).count()
        present = db.query(EventAttendance).filter(EventAttendance.event_id == ev.id, EventAttendance.status == "present").count()
        absent = total - present
        
        resp.total_students = total
        resp.present_count = present
        resp.absent_count = absent
        
        print("Success for", ev.id)
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
