# WARNING: This will DELETE ALL DATA in the 'marks' table!
# Use only for development/testing. For production, use Alembic migrations.

from models import Base
from database import engine

# Drop the old 'marks' table (if it exists)
Base.metadata.drop_all(bind=engine, tables=[Base.metadata.tables['marks']])
print('Dropped old marks table.')

# Recreate the 'marks' table with the current model
Base.metadata.create_all(bind=engine, tables=[Base.metadata.tables['marks']])
print('Recreated marks table with new schema.')
