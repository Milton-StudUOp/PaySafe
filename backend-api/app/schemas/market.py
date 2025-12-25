from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class MarketStatus(str, Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"

# Base for reading/response - district is optional for backward compatibility
class MarketBase(BaseModel):
    name: str
    province: str
    district: Optional[str] = None  # Optional in response for old records
    neighborhood: Optional[str] = None
    status: MarketStatus = MarketStatus.ATIVO

# Create schema - district is REQUIRED for new records
class MarketCreate(BaseModel):
    name: str
    province: str
    district: str  # REQUIRED for new records
    neighborhood: Optional[str] = None
    status: MarketStatus = MarketStatus.ATIVO
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

# Update schema - all fields required
class MarketUpdate(BaseModel):
    name: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    neighborhood: Optional[str] = None
    status: Optional[MarketStatus] = None
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

from .jurisdiction_change_request import ApprovalStatus

class Market(MarketBase):
    id: int
    created_at: datetime
    
    # Stats (Computed fields)
    merchants_count: int = 0
    active_merchants_count: int = 0
    agents_count: int = 0
    pos_count: int = 0

    total_collected_today: float = 0.0
    total_collected_month: float = 0.0

    approval_status: ApprovalStatus = ApprovalStatus.APROVADO

    class Config:
        from_attributes = True
