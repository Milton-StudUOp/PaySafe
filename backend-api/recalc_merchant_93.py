import asyncio
from sqlalchemy import select
from app.database import SessionLocal
from app.models import Merchant, PaymentStatus
from app.services.fee_service import validate_merchant_payment_status

async def check_merchant():
    async with SessionLocal() as db:
        # Try to find merchant by ID 93
        merchant = await db.get(Merchant, 29) # User screenshot showed #29 at bottom, user text said #93. Screenshot ID 29 is "Momade Momade" - Restaurant. But screenshot also shows a list starting 83..93. Line 93 is 'Irregular AMBULANTE'.
        # Let's search by name 'Irregular' or just look for the one in the screenshot.
        # Screenshot shows row #93 "Irregular AMBULANTE". Name is "Irregular".
        
        result = await db.execute(select(Merchant).where(Merchant.full_name.like("%Irregular%")))
        merchants = result.scalars().all()
        
        for m in merchants:
            print(f"Found Merchant ID: {m.id}, Name: {m.full_name}")
            print(f"Before: Status={m.payment_status}, Overdue={m.days_overdue}, Balance={m.overdue_balance}")
            
            # Run validation
            updated_merchant = await validate_merchant_payment_status(m, db)
            
            print(f"After: Status={updated_merchant.payment_status}, Overdue={updated_merchant.days_overdue}, Balance={updated_merchant.overdue_balance}")
            print("-" * 30)

if __name__ == "__main__":
    asyncio.run(check_merchant())
