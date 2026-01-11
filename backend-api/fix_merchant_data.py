
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
        print("Fixing invalid merchant data...")
        try:
            # Fix record ID 102 - assume it's meant to be CIDADAO given the recent context,
            # or 'FIXO' as a fallback. Given the user context "Create Cidadão", it's likely a failed Cidadão creation
            # that inserted an empty string before the enum was updated.
            # Let's verify if market_id is NULL. If so, it's definitely CIDADAO.
            
            result = await conn.execute(text("SELECT market_id FROM merchants WHERE id = 102"))
            market_id = result.scalar()
            
            new_type = 'CIDADAO' if market_id is None else 'FIXO'
            print(f"Merchant 102 has market_id: {market_id}. Setting type to {new_type}.")
            
            await conn.execute(text(f"UPDATE merchants SET merchant_type = '{new_type}' WHERE id = 102"))
            print("Update executed.")
            
            # Verify
            result = await conn.execute(text("SELECT merchant_type FROM merchants WHERE id = 102"))
            print(f"New type for ID 102: {result.scalar()}")

        except Exception as e:
            print(f"Error: {e}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
