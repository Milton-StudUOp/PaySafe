
import asyncio
import sys
import os

# Add the parent directory to sys.path to allow imports from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings

async def main():
    print(f"Connecting to {settings.DATABASE_URL}...")
    engine = create_async_engine(settings.DATABASE_URL)
    
    async with engine.begin() as conn:
        print("Checking if column 'entity_name' exists in 'audit_logs'...")
        # Check if column exists
        try:
            # MySQL specific check
            result = await conn.execute(text("SHOW COLUMNS FROM audit_logs LIKE 'entity_name'"))
            if result.fetchone():
                print("Column 'entity_name' already exists.")
            else:
                print("Adding column 'entity_name'...")
                await conn.execute(text("ALTER TABLE audit_logs ADD COLUMN entity_name VARCHAR(255) NULL"))
                print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
