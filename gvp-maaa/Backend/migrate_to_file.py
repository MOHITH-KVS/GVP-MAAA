import psycopg2
import sys
import os

# Redirect output to a file
log_file = "migration_log.txt"

def log(msg):
    with open(log_file, "a") as f:
        f.write(str(msg) + "\n")
    print(msg)

if os.path.exists(log_file):
    os.remove(log_file)

db_name = "gvp_ maaa"
conn_str = f"dbname='{db_name}' user='postgres' password='31012025' host='127.0.0.1' port='5432'"

sql_commands = [
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS achievement_type VARCHAR(100);",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS certificate_file TEXT;",
    "ALTER TABLE external_event_submissions ADD COLUMN IF NOT EXISTS proof_file TEXT;"
]

try:
    log(f"Connecting to database: {db_name}")
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    with conn.cursor() as cur:
        for cmd in sql_commands:
            log(f"Executing: {cmd}")
            cur.execute(cmd)
    log("Migration successful.")
except Exception as e:
    log(f"Error: {e}")
    sys.exit(1)
finally:
    if 'conn' in locals() and conn:
        conn.close()
