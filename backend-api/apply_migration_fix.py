import asyncio
from sqlalchemy import text
from app.database import engine

async def apply_migration():
    async with engine.begin() as conn:
        try:
            print("Checking if column 'overdue_balance' exists...")
            # Check if column exists (MySQL specific)
            result = await conn.execute(text("SHOW COLUMNS FROM merchants LIKE 'overdue_balance'"))
            if result.fetchone():
                print("Column 'overdue_balance' already exists.")
            else:
                print("Adding column 'overdue_balance'...")
                await conn.execute(text("ALTER TABLE merchants ADD COLUMN overdue_balance DECIMAL(10, 2) DEFAULT 0.00"))
                print("Column added successfully.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(apply_migration())
