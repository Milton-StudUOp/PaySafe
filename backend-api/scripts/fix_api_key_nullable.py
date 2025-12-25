"""Script to alter pos_devices table to make api_key_hash nullable"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://paysafe:senha123@localhost/paysafe_db")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE pos_devices MODIFY COLUMN api_key_hash VARCHAR(255) NULL"))
        print("SUCCESS: api_key_hash column is now nullable")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
