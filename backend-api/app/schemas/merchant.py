from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from enum import Enum

class MerchantType(str, Enum):
    FIXO = "FIXO"
    AMBULANTE = "AMBULANTE"

class IdDocumentType(str, Enum):
    BI = "BI"
    PASSAPORTE = "PASSAPORTE"
    DIRE = "DIRE"
    OUTRO = "OUTRO"

class MobileOperator(str, Enum):
    VODACOM = "VODACOM"
    TMCEL = "TMCEL"
    MOVITEL = "MOVITEL"

class MerchantStatus(str, Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    BLOQUEADO = "BLOQUEADO"

class PaymentStatus(str, Enum):
    """Status de pagamento da taxa diária (10 MT/dia)."""
    REGULAR = "REGULAR"      # Pagamento em dia
    IRREGULAR = "IRREGULAR"  # Pagamento em atraso

class MerchantBase(BaseModel):
    merchant_type: MerchantType = MerchantType.FIXO
    full_name: str
    id_document_type: Optional[IdDocumentType] = None
    id_document_number: Optional[str] = None
    id_document_expiry: Optional[date] = None
    phone_number: Optional[str] = None
    mobile_operator: Optional[MobileOperator] = None
    business_type: str
    business_name: Optional[str] = None  # Nome Comercial
    market_id: int
    mpesa_number: Optional[str] = None
    emola_number: Optional[str] = None
    mkesh_number: Optional[str] = None
    nfc_uid: Optional[str] = None
    status: MerchantStatus = MerchantStatus.ATIVO

class MerchantCreate(MerchantBase):
    password: Optional[str] = None
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

class MerchantUpdate(BaseModel):
    merchant_type: Optional[MerchantType] = None
    full_name: Optional[str] = None
    id_document_type: Optional[IdDocumentType] = None
    id_document_number: Optional[str] = None
    id_document_expiry: Optional[date] = None
    phone_number: Optional[str] = None
    mobile_operator: Optional[MobileOperator] = None
    business_type: Optional[str] = None
    business_name: Optional[str] = None  # Nome Comercial
    market_id: Optional[int] = None
    mpesa_number: Optional[str] = None
    emola_number: Optional[str] = None
    mkesh_number: Optional[str] = None
    nfc_uid: Optional[str] = None
    status: Optional[MerchantStatus] = None
    password: Optional[str] = None
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

from .jurisdiction_change_request import ApprovalStatus

class Merchant(MerchantBase):
    id: int
    registered_at: datetime
    last_login_at: Optional[datetime] = None
    current_balance: Optional[float] = 0.0
    last_transaction_at: Optional[datetime] = None
    market_name: Optional[str] = None  # Enriched from market
    market_province: Optional[str] = None  # Enriched from market
    market_district: Optional[str] = None  # Enriched from market

    approval_status: ApprovalStatus = ApprovalStatus.APROVADO
    
    # Payment status for daily fee (10 MT/day)
    payment_status: Optional[PaymentStatus] = None
    last_fee_payment_date: Optional[date] = None
    billing_start_date: Optional[date] = None
    days_overdue: Optional[int] = 0
    overdue_balance: Optional[float] = 0.00
    credit_balance: Optional[float] = 0.00

    class Config:
        from_attributes = True

# Alias for Merchant to fix import error in merchant_fees.py
MerchantResponse = Merchant