"""
Script to add offline audit columns to transactions table.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def add_offline_columns():
    print("Connecting to database...")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    async with engine.begin() as conn:
        # Check if columns already exist
        result = await conn.execute(text("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'transactions' 
            AND COLUMN_NAME = 'offline_transaction_uuid'
        """))
        existing = result.fetchone()
        
        if existing:
            print("[OK] Columns already exist - no migration needed")
            return
        
        print("Adding offline audit columns...")
        
        # Add the columns
        await conn.execute(text("""
            ALTER TABLE transactions
            ADD COLUMN offline_transaction_uuid VARCHAR(36) NULL,
            ADD COLUMN offline_payment_reference VARCHAR(100) NULL,
            ADD COLUMN offline_created_at TIMESTAMP NULL
        """))
        
        print("[OK] Migration completed successfully!")
        print("   - Added: offline_transaction_uuid")
        print("   - Added: offline_payment_reference")
        print("   - Added: offline_created_at")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(add_offline_columns())
