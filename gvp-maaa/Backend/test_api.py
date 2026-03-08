import sys
import traceback
from database import SessionLocal
from main import get_events, get_student_events

db = SessionLocal()
print("--- Testing faculty get_events ---")
try:
    res = get_events(current_user={"role": "faculty", "user_id": 1, "department_id": 1}, db=db)
    print(f"Success! returned {len(res)} items")
except Exception as e:
    traceback.print_exc()

print("\n--- Testing student get_student_events ---")
try:
    res = get_student_events(current_user={"role": "student", "user_id": 3, "department_id": 1}, db=db)
    print(f"Success! returned {len(res)} items")
except Exception as e:
    traceback.print_exc()
