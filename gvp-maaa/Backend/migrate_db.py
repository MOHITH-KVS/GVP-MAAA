from database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
try:
    print("Executing ALTER TABLE migration...")
    db.execute(text("ALTER TABLE event_attendance ADD COLUMN IF NOT EXISTS result VARCHAR;"))
    db.commit()
    print("Migration successful: Added 'result' column to 'event_attendance' table.")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
