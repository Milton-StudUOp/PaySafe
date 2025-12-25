"""Script to debug agent 20 data"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from sqlalchemy import select, text
import os
import json

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+aiomysql://paysafe:senha123@localhost/paysafe_db")

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check agent 20 exists
        result = await session.execute(text("SELECT * FROM agents WHERE id = 20"))
        agent_row = result.fetchone()
        
        if agent_row:
            print("=== AGENT 20 DATA ===")
            columns = result.keys()
            for col, val in zip(columns, agent_row):
                print(f"  {col}: {val}")
        else:
            print("Agent 20 NOT FOUND!")
            await engine.dispose()
            return
        
        # Check POS devices assigned to agent 20
        result = await session.execute(text("SELECT * FROM pos_devices WHERE assigned_agent_id = 20"))
        pos_devices = result.fetchall()
        
        print(f"\n=== POS DEVICES FOR AGENT 20 ({len(pos_devices)} total) ===")
        if pos_devices:
            columns = result.keys()
            for pos in pos_devices:
                print("---")
                for col, val in zip(columns, pos):
                    print(f"  {col}: {val}")
        else:
            print("  No POS devices assigned")
        
        # Check transactions for agent 20
        result = await session.execute(text("SELECT * FROM transactions WHERE agent_id = 20 LIMIT 5"))
        transactions = result.fetchall()
        
        print(f"\n=== TRANSACTIONS FOR AGENT 20 (showing max 5) ===")
        if transactions:
            columns = result.keys()
            for t in transactions:
                print("---")
                for col, val in zip(columns, t):
                    print(f"  {col}: {val}")
        else:
            print("  No transactions")
    
    await engine.dispose()
    print("\n=== DONE ===")

if __name__ == "__main__":
    asyncio.run(main())
