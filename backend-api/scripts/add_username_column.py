import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Fallback/Default for this environment if .env is missing or issue
    DATABASE_URL = "mysql+aiomysql://root:password@localhost/paysafe_db"

async def add_column():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        try:
            print("Attempting to add 'username' column to 'users' table...")
            await conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(50) UNIQUE NULL AFTER full_name;"))
            print("Successfully added 'username' column.")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("Column 'username' already exists.")
            else:
                print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
