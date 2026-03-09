import psycopg2
import sys

# Try to connect with and without the space
db_name = "gvp_ maaa"
conn_str = f"dbname='{db_name}' user='postgres' password='31012025' host='127.0.0.1' port='5432'"

sql_commands = [
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(100);",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS certificate_file TEXT;",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS proof_file TEXT;"
]

try:
    print(f"Connecting to database: {db_name}")
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    with conn.cursor() as cur:
        for cmd in sql_commands:
            print(f"Executing: {cmd}")
            cur.execute(cmd)
    print("Migration successful.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
finally:
    if 'conn' in locals() and conn:
        conn.close()
