
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
        print("Inspecting 'merchants' table structure...")
        try:
            # SHOW COLUMNS gives type info which usually includes ENUM values
            result = await conn.execute(text("SHOW COLUMNS FROM merchants LIKE 'merchant_type'"))
            row = result.fetchone()
            if row:
                print(f"Column: {row[0]}")
                print(f"Type: {row[1]}")
            else:
                print("Column 'merchant_type' not found.")
        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
