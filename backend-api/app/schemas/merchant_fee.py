from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from enum import Enum

class PaymentStatus(str, Enum):
    REGULAR = "REGULAR"
    IRREGULAR = "IRREGULAR"

class FeePaymentCreate(BaseModel):
    """Request para registrar pagamento de taxa."""
    amount: float = 10.0  # Taxa padrão 10 MT
    payment_method: Optional[str] = "DINHEIRO"
    notes: Optional[str] = None

class FeePaymentResponse(BaseModel):
    """Resposta após registrar pagamento de taxa."""
    id: int
    merchant_id: int
    amount: float
    payment_date: datetime
    paid_by_user_id: Optional[int] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class FeeStatusResponse(BaseModel):
    """Status de pagamento do comerciante."""
    merchant_id: int
    merchant_name: str
    payment_status: PaymentStatus
    last_fee_payment_date: Optional[date] = None
    days_overdue: int = 0
    daily_fee_amount: float = 10.0

class SetRegularRequest(BaseModel):
    """Request do admin para marcar comerciante como regular."""
    notes: Optional[str] = None

class IrregularMerchantResponse(BaseModel):
    """Comerciante irregular na lista."""
    id: int
    full_name: str
    phone_number: Optional[str] = None
    market_name: Optional[str] = None
    days_overdue: int
    last_fee_payment_date: Optional[date] = None
    payment_status: PaymentStatus

class FeeSummaryResponse(BaseModel):
    """Resumo de pagamentos de taxa."""
    total_merchants: int
    regular_count: int
    irregular_count: int
    total_collected_today: float
    total_overdue_amount: float  # Aproximado: irregular_count * 10 * avg_days_overdue
