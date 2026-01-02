from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum

class PaymentMethod(str, Enum):
    DINHEIRO = "DINHEIRO"
    MPESA = "MPESA"
    EMOLA = "EMOLA"
    MKESH = "MKESH"

class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    SUCESSO = "SUCESSO"
    FALHOU = "FALHOU"
    CANCELADO = "CANCELADO"
    TIMEOUT = "TIMEOUT"

class TransactionBase(BaseModel):
    merchant_id: int
    agent_id: Optional[int] = None
    pos_id: Optional[int] = None
    funcionario_id: Optional[int] = None
    amount: Decimal
    currency: str = "MZN"
    payment_method: PaymentMethod
    payment_reference: Optional[str] = None
    mpesa_reference: Optional[str] = None
    nfc_uid: Optional[str] = None
    status: TransactionStatus = TransactionStatus.PENDING
    province: Optional[str] = None
    district: Optional[str] = None

class TransactionCreate(TransactionBase):
    # Optional: Client-provided UUID for offline transactions
    # If provided, backend will use this instead of generating a new one
    client_transaction_uuid: Optional[str] = None
    
    # Offline Sync Audit Fields
    offline_transaction_uuid: Optional[str] = None  # UUID generated on POS device
    offline_payment_reference: Optional[str] = None  # Reference generated on POS device
    offline_created_at: Optional[str] = None  # Original timestamp (ISO format)

class TransactionUpdate(BaseModel):
    status: Optional[TransactionStatus] = None
    payment_reference: Optional[str] = None
    mpesa_reference: Optional[str] = None
    response_payload: Optional[dict] = None

from .merchant import Merchant
from .agent import Agent
from .user import User

class Transaction(TransactionBase):
    id: int
    transaction_uuid: str
    created_at: datetime
    updated_at: datetime
    
    # Offline sync fields - returned so cache can match by offline UUID
    offline_transaction_uuid: Optional[str] = None
    offline_payment_reference: Optional[str] = None
    offline_created_at: Optional[datetime] = None
    
    # Relationships
    merchant: Optional[Merchant] = None
    agent: Optional[Agent] = None
    funcionario: Optional[User] = None

    @field_validator('status', mode='before', check_fields=False)
    @classmethod
    def parse_status(cls, v):
        if v == "" or v is None:
            return TransactionStatus.PENDING
        return v

    class Config:
        from_attributes = True
