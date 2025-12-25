import asyncio
import sys
import os
from sqlalchemy import text

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

async def fix_final():
    try:
        async with engine.begin() as conn:
            print("Executing final status cleanup...")
            # Update anything that is NOT a valid enum value
            query = text("UPDATE transactions SET status = 'FALHOU' WHERE status NOT IN ('SUCESSO', 'FALHOU', 'PENDING', 'CANCELADO', 'TIMEOUT')")
            result = await conn.execute(query)
            print(f"Fixed {result.rowcount} transactions with invalid status.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_final())
