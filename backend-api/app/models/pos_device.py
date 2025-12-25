from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class POSStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"
    BLOQUEADO = "BLOQUEADO"
    PENDENTE = "PENDENTE"

class ApprovalStatus(str, enum.Enum):
    APROVADO = "APROVADO"
    PENDENTE = "PENDENTE"
    REJEITADO = "REJEITADO"

class POSDevice(Base):
    __tablename__ = "pos_devices"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    serial_number = Column(String(100), unique=True, nullable=False)
    model = Column(String(100), nullable=True)
    assigned_agent_id = Column(BigInteger, ForeignKey("agents.id"), nullable=True)
    
    # Token do dispositivo (hash) - DEPRECATED: No longer used for auth
    api_key_hash = Column(String(255), nullable=True)
    status = Column(Enum(POSStatus), default=POSStatus.ATIVO)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.APROVADO)
    
    last_seen = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())

    # Location (Optional - Can be set manually or inherited)
    province = Column(String(50), nullable=True)
    district = Column(String(100), nullable=True)
    
    # Relationships
    assigned_agent = relationship("Agent", backref="pos_devices")
    transactions = relationship("Transaction", back_populates="pos_device")
