from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum

class POSStatus(str, Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"
    BLOQUEADO = "BLOQUEADO"

class ApprovalStatus(str, Enum):
    APROVADO = "APROVADO"
    PENDENTE = "PENDENTE"
    REJEITADO = "REJEITADO"

# Base for response - fields optional for backward compatibility
class POSDeviceBase(BaseModel):
    serial_number: str
    model: Optional[str] = None
    assigned_agent_id: Optional[int] = None
    status: POSStatus = POSStatus.ATIVO
    province: Optional[str] = None
    district: Optional[str] = None

# Create schema - model, province, district REQUIRED
class POSDeviceCreate(BaseModel):
    serial_number: str
    model: str  # REQUIRED
    province: str  # REQUIRED
    district: str  # REQUIRED
    assigned_agent_id: Optional[int] = None
    status: POSStatus = POSStatus.ATIVO
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

# Update schema - model, province, district REQUIRED
class POSDeviceUpdate(BaseModel):
    serial_number: Optional[str] = None
    model: Optional[str] = None
    province: Optional[str] = None
    district: Optional[str] = None
    assigned_agent_id: Optional[int] = None
    status: Optional[POSStatus] = None
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

class POSDevice(BaseModel):
    id: int
    serial_number: str
    model: Optional[str] = None
    assigned_agent_id: Optional[int] = None
    status: Optional[str] = "ATIVO"  # Accept any string, handle empty gracefully
    created_at: datetime
    last_seen: Optional[datetime] = None
    approval_status: Optional[str] = "APROVADO"
    
    # Stats (Computed)
    total_collected_today: float = 0.0
    transactions_count_today: int = 0
    total_collected_month: float = 0.0
    ticket_average: float = 0.0

    # Location Info
    province: Optional[str] = None
    district: Optional[str] = None

    @field_validator('status', mode='before')
    @classmethod
    def handle_empty_status(cls, v):
        if v == '' or v is None:
            return 'ATIVO'
        return v

    @field_validator('approval_status', mode='before')
    @classmethod
    def handle_empty_approval_status(cls, v):
        if v == '' or v is None:
            return 'APROVADO'
        return v

    class Config:
        from_attributes = True
