import asyncio
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

async def update_schema():
    async with engine.begin() as conn:
        print("Checking for missing columns in 'users' table...")
        
        # Check if columns exist (using simple exception handling flow implies just trying to add them)
        # MySQL ALTER TABLE ADD COLUMN IF NOT EXISTS is valid in newer versions, 
        # but let's try standard ALTER and catch duplicate error.
        
        try:
            print("Adding 'scope_province' column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN scope_province VARCHAR(100) NULL"))
            print("Success.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'scope_province' already exists.")
            else:
                print(f"Error adding scope_province: {e}")

        try:
            print("Adding 'scope_district' column...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN scope_district VARCHAR(100) NULL"))
            print("Success.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'scope_district' already exists.")
            elif "Unknown column" not in str(e): # Ignore weird unknown column errors if column really exists
                 print(f"Error adding scope_district: {e}")
            else:
                 print(f"Error: {e}")

    await engine.dispose()
    print("Schema update completed.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(update_schema())
