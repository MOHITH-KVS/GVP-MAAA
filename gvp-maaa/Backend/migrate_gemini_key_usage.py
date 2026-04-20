"""
Migration script to create gemini_key_usage table for tracking API key quotas
Run this once to initialize the table in your database
"""
import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import create_engine

# Load environment variables
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

# Get database URL
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost/gvp_db"
)

# Create engine and tables
from models import Base, GeminiKeyUsage

try:
    engine = create_engine(DATABASE_URL)
    
    # Create table if not exists
    Base.metadata.create_all(engine)
    print("✅ gemini_key_usage table created successfully!")
    
except Exception as e:
    print(f"❌ Migration failed: {e}")
    import traceback
    traceback.print_exc()
