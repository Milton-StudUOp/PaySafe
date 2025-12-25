import asyncio
import sys
import os

# Add parent dir to path to import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.transaction import Transaction, TransactionStatus
from sqlalchemy import select, or_

async def fix_empty_statuses():
    async with SessionLocal() as session:
        print("Checking for transactions with invalid statuses...")
        
        # Find transactions where status is NULL or empty string or not in enum
        # Note: In Python/SQLAlchemy, we might just query all and filter in python if DB restrictions are loose
        result = await session.execute(select(Transaction))
        transactions = result.scalars().all()
        
        count = 0
        valid_statuses = [s.value for s in TransactionStatus]
        
        for tx in transactions:
            if tx.status not in valid_statuses:
                print(f"Fixing Transaction {tx.transaction_uuid} | Invalid Status: '{tx.status}' -> FALHOU")
                tx.status = TransactionStatus.FALHOU
                count += 1
                
        if count > 0:
            await session.commit()
            print(f"Successfully fixed {count} transactions.")
        else:
            print("No invalid transactions found.")

if __name__ == "__main__":
    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(fix_empty_statuses())
