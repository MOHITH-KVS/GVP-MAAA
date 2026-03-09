from sqlalchemy import create_engine, inspect
import sys

DATABASE_URL = "postgresql://postgres:31012025@127.0.0.1:5432/gvp_ maaa"

try:
    engine = create_engine(DATABASE_URL)
    inspector = inspect(engine)
    columns = inspector.get_columns("external_event_submissions")
    print("Columns in external_event_submissions:")
    for col in columns:
        print(f"- {col['name']} ({col['type']})")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
