from sqlalchemy import create_engine, text
import sys

DATABASE_URL = "postgresql://postgres:31012025@127.0.0.1:5432/gvp_ maaa"

sql_commands = [
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(100);",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS certificate_file TEXT;",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS proof_file TEXT;"
]

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        for cmd in sql_commands:
            print(f"Executing: {cmd}")
            conn.execute(text(cmd))
            conn.commit()
    print("Migration successful.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
