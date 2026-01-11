
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
        print("Starting schema migration for CIDADAO support...")
        
        # 1. Add province column
        try:
            result = await conn.execute(text("SHOW COLUMNS FROM merchants LIKE 'province'"))
            if result.fetchone():
                print("Column 'province' already exists.")
            else:
                print("Adding column 'province'...")
                await conn.execute(text("ALTER TABLE merchants ADD COLUMN province VARCHAR(100) NULL"))
                print("Column 'province' added.")
        except Exception as e:
            print(f"Error checking/adding province: {e}")

        # 2. Add district column
        try:
            result = await conn.execute(text("SHOW COLUMNS FROM merchants LIKE 'district'"))
            if result.fetchone():
                print("Column 'district' already exists.")
            else:
                print("Adding column 'district'...")
                await conn.execute(text("ALTER TABLE merchants ADD COLUMN district VARCHAR(100) NULL"))
                print("Column 'district' added.")
        except Exception as e:
            print(f"Error checking/adding district: {e}")

        # 3. Modify market_id to be Nullable
        try:
            print("Modifying 'market_id' to be NULLABLE...")
            # MySQL syntax
            await conn.execute(text("ALTER TABLE merchants MODIFY market_id BIGINT NULL")) 
            print("'market_id' modified successfully.")
        except Exception as e:
            print(f"Error modifying market_id: {e}")

    await engine.dispose()
    print("Migration finished.")

if __name__ == "__main__":
    asyncio.run(main())
