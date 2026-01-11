
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
        print("Checking for merchants with invalid 'merchant_type'...")
        try:
            # Query all merchant types to see what's actually stored
            result = await conn.execute(text("SELECT id, full_name, merchant_type FROM merchants"))
            rows = result.fetchall()
            
            invalid_count = 0
            for row in rows:
                m_id, name, m_type = row
                # Check if matches one of the valid enum values
                if m_type not in ('FIXO', 'AMBULANTE', 'CIDADAO'):
                    print(f"INVALID RECORD -> ID: {m_id}, Name: {name}, Type: '{m_type}' (Raw: {repr(m_type)})")
                    invalid_count += 1
            
            if invalid_count == 0:
                print("No invalid merchant_type values found via Python check.")
            else:
                print(f"Found {invalid_count} invalid records.")

        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
