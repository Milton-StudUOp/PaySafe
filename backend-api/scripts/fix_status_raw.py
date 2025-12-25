import asyncio
import sys
import os
from sqlalchemy import text

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

async def fix_raw():
    try:
        async with engine.begin() as conn:
            print("Executing raw SQL update...")
            # Update empty strings or NULL to 'FALHOU'
            # We strictly target cases that cause Pydantic validation errors
            result = await conn.execute(text("UPDATE transactions SET status = 'FALHOU' WHERE status = '' OR status IS NULL"))
            print(f"Updated {result.rowcount} rows.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_raw())
