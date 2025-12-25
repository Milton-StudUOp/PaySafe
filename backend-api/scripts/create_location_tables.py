"""
Migration script to create provinces and municipalities tables.
Run with: python -m scripts.create_location_tables
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine


async def create_tables():
    """Create provinces and municipalities tables"""
    async with engine.begin() as conn:
        # Check if tables exist
        result = await conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'provinces'"
        ))
        exists = result.scalar() > 0
        
        if exists:
            print("Tables already exist. Skipping creation.")
            return
        
        print("Creating provinces table...")
        await conn.execute(text("""
            CREATE TABLE provinces (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                code VARCHAR(10) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        
        print("Creating municipalities table...")
        await conn.execute(text("""
            CREATE TABLE municipalities (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                province_id BIGINT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
            )
        """))
        
        # Create index for faster lookups
        await conn.execute(text(
            "CREATE INDEX idx_municipalities_province ON municipalities(province_id)"
        ))
        
        print("✅ Location tables created successfully!")


if __name__ == "__main__":
    asyncio.run(create_tables())
