from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
from decimal import Decimal

class ReceiptBase(BaseModel):
    transaction_id: int
    merchant_id: Optional[int] = None
    agent_id: Optional[int] = None
    pos_id: Optional[int] = None
    market_id: Optional[int] = None
    amount: Decimal
    currency: str = "MZN"

class ReceiptCreate(ReceiptBase):
    pass

class ReceiptReprint(BaseModel):
    receipt_code: str

class Receipt(ReceiptBase):
    id: int
    receipt_code: str
    issued_at: datetime
    reprint_count: int
    last_printed_at: Optional[datetime] = None
    extra_data: Optional[dict] = None

    class Config:
        from_attributes = True

class ReceiptLookup(BaseModel):
    receipt_code: str
    amount: Decimal
    currency: str
    issued_at: datetime
    reprint_count: int
    merchant_name: Optional[str] = None
    merchant_type: Optional[str] = None
    agent_name: Optional[str] = None
    market_name: Optional[str] = None
    pos_serial: Optional[str] = None


class ReceiptVerification(BaseModel):
    """Response for QR code verification"""
    is_valid: bool
    status: str  # "VALID", "INVALID_SIGNATURE", "NOT_FOUND", "SUSPICIOUS"
    message: str
    receipt_code: Optional[str] = None
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    issued_at: Optional[datetime] = None
    reprint_count: Optional[int] = None
    merchant_name: Optional[str] = None
    agent_name: Optional[str] = None
    market_name: Optional[str] = None
    warning: Optional[str] = None  # e.g., "Reimpresso 3 vezes"

