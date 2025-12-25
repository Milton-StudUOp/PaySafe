# Migration script to add business_name column to merchants table
# Run with: python scripts/add_merchant_business_name.py

import asyncio
import sys
sys.path.insert(0, '.')

from sqlalchemy import text
from app.database import engine

async def add_business_name_column():
    async with engine.begin() as conn:
        # Check if column exists
        result = await conn.execute(text("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'merchants' AND COLUMN_NAME = 'business_name'
        """))
        if result.scalar() > 0:
            print("Column 'business_name' already exists in merchants table.")
            return
        
        # Add business_name column
        await conn.execute(text("""
            ALTER TABLE merchants 
            ADD COLUMN business_name VARCHAR(200) NULL
        """))
        print("Added 'business_name' column to merchants table.")

if __name__ == "__main__":
    asyncio.run(add_business_name_column())
    print("Migration completed.")
