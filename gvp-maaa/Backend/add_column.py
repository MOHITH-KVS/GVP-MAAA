import psycopg2
from database import DATABASE_URL
from urllib.parse import urlparse

# DATABASE_URL = "postgresql://postgres:31012025@127.0.0.1:5432/gvp_ maaa"
result = urlparse(DATABASE_URL)
username = result.username
password = result.password
database = result.path[1:]
hostname = result.hostname
port = result.port

conn = psycopg2.connect(
    database=database,
    user=username,
    password=password,
    host=hostname,
    port=port
)
conn.autocommit = True
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE resource_access ADD COLUMN action_type VARCHAR(50) DEFAULT 'view';")
    print("Column `action_type` added successfully.")
except Exception as e:
    print(f"Error (column might already exist): {e}")

try:
    cursor.execute("UPDATE resource_access SET action_type = 'view' WHERE action_type IS NULL;")
    print("Existing records updated.")
except Exception as e:
    print(f"Error updating records: {e}")

cursor.close()
conn.close()
