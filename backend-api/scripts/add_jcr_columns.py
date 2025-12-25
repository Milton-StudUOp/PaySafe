"""
Migration script to add requester_notes and request_type columns to jurisdiction_change_requests table.
Run this script once to update the database schema.
"""
import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate():
    async with engine.begin() as conn:
        # Add requester_notes column
        try:
            await conn.execute(text("""
                ALTER TABLE jurisdiction_change_requests 
                ADD COLUMN requester_notes TEXT NULL
            """))
            print("[OK] Added requester_notes column")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e).lower():
                print("[SKIP] requester_notes column already exists")
            else:
                print(f"[ERROR] Error adding requester_notes: {e}")
        
        # Add request_type column
        try:
            await conn.execute(text("""
                ALTER TABLE jurisdiction_change_requests 
                ADD COLUMN request_type ENUM('CREATE', 'UPDATE') DEFAULT 'UPDATE'
            """))
            print("[OK] Added request_type column")
        except Exception as e:
            if "Duplicate column" in str(e) or "already exists" in str(e).lower():
                print("[SKIP] request_type column already exists")
            else:
                print(f"[ERROR] Error adding request_type: {e}")

    print("\n[DONE] Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
