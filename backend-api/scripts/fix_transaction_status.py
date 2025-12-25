import sys
import os
sys.path.append(os.getcwd())
import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_transaction_status():
    async with engine.begin() as conn:
        print("Fixing invalid transaction statuses (empty strings -> FALHOU)...")
        try:
             # Find how many
             result = await conn.execute(text("SELECT COUNT(*) FROM transactions WHERE status = '' OR status IS NULL"))
             count = result.scalar()
             print(f"Found {count} invalid records.")
             
             if count > 0:
                 await conn.execute(text("UPDATE transactions SET status = 'FALHOU' WHERE status = '' OR status IS NULL"))
                 await conn.commit()
                 print("Fixed invalid records.")
             else:
                 print("No invalid records found.")
                 
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_transaction_status())
