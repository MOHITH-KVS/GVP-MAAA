from database import SessionLocal
import sys
from models import Event, Student, User, FacultySubject, Subject

db = SessionLocal()

s = db.query(Student).filter(Student.roll_no=='5221412096').first()
e1 = db.query(Event).get(1)
e2 = db.query(Event).get(2)

print(f"Student: yr={s.year}, sec={s.section}")
print(f"Event 1: {e1.title}, yr={e1.year}, sec={e1.section}")
print(f"Event 2: {e2.title}, yr={e2.year}, sec={e2.section}")
