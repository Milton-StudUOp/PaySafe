import asyncio
import sys
import os
from sqlalchemy import text

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine

async def debug_status():
    try:
        async with engine.begin() as conn:
            print("Dumping Transaction Statuses...")
            result = await conn.execute(text("SELECT id, status, HEX(status) FROM transactions"))
            rows = result.fetchall()
            
            for row in rows:
                print(f"ID: {row[0]}, Status: '{row[1]}', Hex: {row[2]}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(debug_status())
