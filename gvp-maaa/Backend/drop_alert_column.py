import psycopg2
from database import DATABASE_URL
from urllib.parse import urlparse

result = urlparse(DATABASE_URL)
conn = psycopg2.connect(
    database=result.path[1:],
    user=result.username,
    password=result.password,
    host=result.hostname,
    port=result.port
)
conn.autocommit = True
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE alerts DROP COLUMN IF EXISTS reference_id;")
    print("Column `reference_id` dropped successfully.")
except Exception as e:
    print(f"Error dropping column: {e}")

cursor.close()
conn.close()
