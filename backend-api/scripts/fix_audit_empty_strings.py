"""
Migration: Fix audit_logs empty string values
Converts empty strings to NULL for enum columns
"""
import asyncio
import aiomysql

async def run_migration():
    conn = await aiomysql.connect(
        host='localhost',
        port=3306,
        user='root',
        password='',
        db='paysafe',
        autocommit=True
    )
    
    async with conn.cursor() as cursor:
        # Convert empty strings to NULL for all problematic columns
        queries = [
            "UPDATE audit_logs SET actor_type = NULL WHERE actor_type = ''",
            "UPDATE audit_logs SET severity = NULL WHERE severity = ''",
            "UPDATE audit_logs SET event_type = NULL WHERE event_type = ''",
            "UPDATE audit_logs SET action = NULL WHERE action = ''",
            "UPDATE audit_logs SET entity = NULL WHERE entity = ''",
            "UPDATE audit_logs SET description = NULL WHERE description = ''",
            "UPDATE audit_logs SET ip_address = NULL WHERE ip_address = ''",
        ]
        
        for sql in queries:
            await cursor.execute(sql)
            print(f"Executed: {sql} - Rows affected: {cursor.rowcount}")
    
    conn.close()
    print("Migration completed!")

if __name__ == "__main__":
    asyncio.run(run_migration())
