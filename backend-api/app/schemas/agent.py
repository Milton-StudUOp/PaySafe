from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
from .pos_device import POSDevice

class AgentStatus(str, Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    INATIVO = "INATIVO"

class AgentBase(BaseModel):
    agent_code: str
    full_name: str
    phone_number: str
    assigned_market_id: Optional[int] = None
    assigned_region: Optional[str] = None
    status: AgentStatus = AgentStatus.ATIVO

# Create schema - agent_code NOT included (auto-generated), market REQUIRED
class AgentCreate(BaseModel):
    full_name: str
    phone_number: str
    pin: str  # Will be hashed
    assigned_market_id: int  # REQUIRED - market determines province/district
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

# Update schema - market, full_name are required
class AgentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    assigned_market_id: Optional[int] = None
    assigned_region: Optional[str] = None
    status: Optional[AgentStatus] = None
    pin: Optional[str] = None
    requester_notes: Optional[str] = None  # Observation for jurisdiction change request

from .jurisdiction_change_request import ApprovalStatus

class Agent(AgentBase):
    id: int
    created_at: datetime
    last_login_at: Optional[datetime] = None
    
    # Stats
    total_collected_today: float = 0.0
    total_collected_month: float = 0.0
    transactions_count_today: int = 0
    
    # Enriched details
    market_name: Optional[str] = None
    
    # Relationships
    # Use ForwardRef or string if import causes issues, but here likely safe if POSDevice doesn't import Agent
    pos_devices: List['POSDevice'] = []

    approval_status: ApprovalStatus = ApprovalStatus.APROVADO

    class Config:
        from_attributes = True

class AgentLogin(BaseModel):
    agent_code: str
    pin: str
