from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class EntityType(str, Enum):
    MARKET = "MARKET"
    MERCHANT = "MERCHANT"
    AGENT = "AGENT"
    POS = "POS"

class ApprovalStatus(str, Enum):
    PENDENTE = "PENDENTE"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"
    CANCELADO = "CANCELADO"

class RequestType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"

class JurisdictionChangeRequestBase(BaseModel):
    entity_type: Optional[str] = None  # Use str to handle legacy empty strings
    entity_id: Optional[int] = None
    requested_province: Optional[str] = None
    requested_district: Optional[str] = None

class JurisdictionChangeRequestCreate(JurisdictionChangeRequestBase):
    current_province: Optional[str] = None
    current_district: Optional[str] = None
    requester_notes: str  # Required: User must provide justification
    request_type: RequestType = RequestType.UPDATE

class JurisdictionChangeRequest(JurisdictionChangeRequestBase):
    id: int
    current_province: Optional[str] = None
    current_district: Optional[str] = None
    requested_by_user_id: int
    requested_at: datetime
    status: Optional[str] = None  # Use str to handle legacy empty strings
    reviewed_by_admin_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None
    requester_notes: Optional[str] = None
    request_type: Optional[str] = None  # Use str to handle legacy empty strings
    
    # Enriched fields for display
    requested_by_name: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    entity_name: Optional[str] = None

    class Config:
        from_attributes = True

class ApprovalAction(BaseModel):
    notes: Optional[str] = None
