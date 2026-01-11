
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
        print("Updating 'merchant_type' ENUM to include 'CIDADAO'...")
        try:
            # Modify the column definition
            await conn.execute(text("ALTER TABLE merchants MODIFY COLUMN merchant_type ENUM('FIXO', 'AMBULANTE', 'CIDADAO') NOT NULL"))
            print("ENUM updated successfully.")
            
            # Verify the change
            result = await conn.execute(text("SHOW COLUMNS FROM merchants LIKE 'merchant_type'"))
            row = result.fetchone()
            if row:
                print(f"New Type: {row[1]}")
        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
