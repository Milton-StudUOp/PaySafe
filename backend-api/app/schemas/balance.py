from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class BalanceBase(BaseModel):
    merchant_id: int
    current_balance: Decimal = Decimal("0.00")

class BalanceCreate(BalanceBase):
    pass

class BalanceUpdate(BaseModel):
    current_balance: Optional[Decimal] = None

class Balance(BalanceBase):
    id: int
    last_transaction_at: Optional[datetime] = None
    updated_at: datetime

    class Config:
        from_attributes = True
