from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, Text, Index, func, JSON
from app.database import Base
import enum

class ActorType(str, enum.Enum):
    ADMIN = "ADMIN"
    FUNCIONARIO = "FUNCIONARIO"
    SUPERVISOR = "SUPERVISOR"
    AUDITOR = "AUDITOR"
    AGENT = "AGENT"
    MERCHANT = "MERCHANT"
    SYSTEM = "SYSTEM"
    UNKNOWN = "UNKNOWN"

class Severity(str, enum.Enum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class EventType(str, enum.Enum):
    NORMAL = "NORMAL"
    SECURITY = "SECURITY"
    FRAUD = "FRAUD"
    ACCESS_VIOLATION = "ACCESS_VIOLATION"
    SYSTEM_ERROR = "SYSTEM_ERROR"

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Quem
    actor_type = Column(Enum(ActorType), nullable=True)
    actor_id = Column(BigInteger, nullable=True)
    actor_name = Column(String(200), nullable=True)
    actor_role = Column(String(50), nullable=True)
    
    # Onde (Jurisdição)
    actor_province = Column(String(100), nullable=True)
    actor_district = Column(String(100), nullable=True)
    
    # O que
    action = Column(String(100), nullable=True)
    entity = Column(String(100), nullable=True)
    entity_id = Column(BigInteger, nullable=True)
    entity_name = Column(String(255), nullable=True)
    
    # Detalhes
    description = Column(Text, nullable=True)
    
    # Antes e Depois (Forense)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    
    # Origem Técnica
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_method = Column(String(10), nullable=True)
    request_path = Column(Text, nullable=True)
    
    # Classificação
    severity = Column(Enum(Severity), nullable=True, default=Severity.INFO)
    event_type = Column(Enum(EventType), nullable=True, default=EventType.NORMAL)
    
    # Correlação
    correlation_id = Column(String(36), nullable=True)
    session_id = Column(String(100), nullable=True)
    
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Indexes
    __table_args__ = (
        Index("idx_audit_actor", "actor_type", "actor_id"),
        Index("idx_audit_entity", "entity", "entity_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_severity", "severity"),
        Index("idx_audit_event_type", "event_type"),
        Index("idx_audit_created_at", "created_at"),
    )
