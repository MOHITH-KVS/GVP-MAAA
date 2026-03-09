from database import engine, SessionLocal
from models import Base
import sqlalchemy as sa
from sqlalchemy.sql import text

def migrate():
    db = SessionLocal()
    try:
        db.execute(text("ALTER TABLE events ADD COLUMN venue VARCHAR(255)"))
        print("Added venue")
    except Exception as e:
        print("venue error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE events ADD COLUMN organizer VARCHAR(255)"))
        print("Added organizer")
    except Exception as e:
        print("organizer error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE events ADD COLUMN max_participants INTEGER"))
        print("Added max_participants")
    except Exception as e:
        print("max_participants error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE events ADD COLUMN registration_deadline TIMESTAMP"))
        print("Added registration_deadline")
    except Exception as e:
        print("registration_deadline error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE events ADD COLUMN external_registration_link VARCHAR"))
        print("Added external_registration_link")
    except Exception as e:
        print("external_registration_link error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE event_registrations ADD COLUMN attendance VARCHAR(50) DEFAULT 'absent'"))
        print("Added attendance")
    except Exception as e:
        print("attendance error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE event_registrations ADD COLUMN result VARCHAR(50)"))
        print("Added result")
    except Exception as e:
        print("result error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE event_registrations ADD COLUMN certificate_uploaded VARCHAR"))
        print("Added certificate_uploaded")
    except Exception as e:
        print("certificate_uploaded error:", e)
        db.rollback()

    try:
        db.execute(text("ALTER TABLE event_registrations ADD COLUMN faculty_verified BOOLEAN DEFAULT FALSE"))
        print("Added faculty_verified")
    except Exception as e:
        print("faculty_verified error:", e)
        db.rollback()

    db.commit()
    db.close()
    
    # Create the new table
    Base.metadata.create_all(bind=engine)
    print("Migration complete!")

if __name__ == "__main__":
    migrate()
