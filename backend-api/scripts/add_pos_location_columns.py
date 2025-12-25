import asyncio
from sqlalchemy import text
from app.database import engine

async def add_pos_location_columns():
    async with engine.begin() as conn:
        print("Checking/Adding province and district columns to pos_devices table...")
        
        # Check if columns exist (simplified check by just trying to add and ignoring specific error or better: explicit check)
        # Using separate statements for safety/clarity.
        
        try:
            await conn.execute(text("ALTER TABLE pos_devices ADD COLUMN province VARCHAR(50) NULL"))
            print("Added province column.")
        except Exception as e:
            # If column exists, it might fail. In MySQL, "Duplicate column name".
            print(f"Province column might already exist: {e}")

        try:
            await conn.execute(text("ALTER TABLE pos_devices ADD COLUMN district VARCHAR(100) NULL"))
            print("Added district column.")
        except Exception as e:
            print(f"District column might already exist: {e}")
            
    print("Done.")

if __name__ == "__main__":
    asyncio.run(add_pos_location_columns())
