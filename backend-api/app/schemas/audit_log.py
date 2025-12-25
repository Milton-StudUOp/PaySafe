from pydantic import BaseModel, Json
from typing import Optional, Any, Dict
from datetime import datetime
from app.models.audit_log import ActorType, Severity, EventType

class AuditLogBase(BaseModel):
    action: Optional[str] = None
    entity: Optional[str] = None
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None  # Use str to handle legacy empty strings
    event_type: Optional[str] = None  # Use str to handle legacy empty strings
    
    actor_type: Optional[str] = None  # Use str to handle legacy empty strings
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    actor_province: Optional[str] = None
    actor_district: Optional[str] = None
    
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_method: Optional[str] = None
    request_path: Optional[str] = None
    
    # JSON fields
    # In Pydantic V2, Json[Any] or simple Dict usually works depending on DB driver. 
    # SQLAlchemy AsyncPG returns dict for JSONB/JSON.
    before_data: Optional[Dict[str, Any]] = None
    after_data: Optional[Dict[str, Any]] = None
    
    correlation_id: Optional[str] = None
    session_id: Optional[str] = None

class AuditLog(AuditLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Alias for creation (if needed by other parts, though mostly internal)
class AuditLogCreate(AuditLogBase):
    pass
