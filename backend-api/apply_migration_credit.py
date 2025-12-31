import asyncio
from sqlalchemy import text
from app.database import SessionLocal

async def apply_fix():
    print("Starting migration...")
    async with SessionLocal() as db:
        try:
            # Check if column exists
            check_sql = text("SHOW COLUMNS FROM merchants LIKE 'credit_balance'")
            result = await db.execute(check_sql)
            column = result.fetchone()
            
            if not column:
                print("Adding credit_balance column...")
                await db.execute(text("ALTER TABLE merchants ADD COLUMN credit_balance DECIMAL(10, 2) DEFAULT 0.00"))
                await db.commit()
                print("Migration applied successfully!")
            else:
                print("Column credit_balance already exists.")
                
        except Exception as e:
            print(f"Error: {e}")
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(apply_fix())
