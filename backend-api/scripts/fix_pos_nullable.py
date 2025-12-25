import sys
import os
sys.path.append(os.getcwd())
import asyncio
from sqlalchemy import text
from app.database import engine

async def fix_schema():
    async with engine.begin() as conn:
        print("Altering transactions table to make pos_id nullable...")
        # MySQL/MariaDB syntax
        try:
             await conn.execute(text("ALTER TABLE transactions MODIFY COLUMN pos_id BIGINT NULL;"))
             print("Success: pos_id is now NULLABLE.")
             
             print("Altering transactions table to make agent_id nullable...")
             await conn.execute(text("ALTER TABLE transactions MODIFY COLUMN agent_id BIGINT NULL;"))
             print("Success: agent_id is now NULLABLE.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_schema())
