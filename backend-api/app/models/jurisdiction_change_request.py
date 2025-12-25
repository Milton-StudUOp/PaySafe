from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class EntityType(str, enum.Enum):
    MARKET = "MARKET"
    MERCHANT = "MERCHANT"
    AGENT = "AGENT"
    POS = "POS"

class ApprovalStatus(str, enum.Enum):
    PENDENTE = "PENDENTE"
    APROVADO = "APROVADO"
    REJEITADO = "REJEITADO"
    CANCELADO = "CANCELADO"

class RequestType(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"

class JurisdictionChangeRequest(Base):
    __tablename__ = "jurisdiction_change_requests"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    entity_type = Column(Enum(EntityType), nullable=False)
    entity_id = Column(BigInteger, nullable=False)
    
    # Current jurisdiction (before change)
    current_province = Column(String(100), nullable=True)
    current_district = Column(String(100), nullable=True)
    
    # Requested jurisdiction (after change)
    requested_province = Column(String(100), nullable=False)
    requested_district = Column(String(100), nullable=True)
    
    # Who requested
    requested_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    requested_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Status
    status = Column(Enum(ApprovalStatus), default=ApprovalStatus.PENDENTE)
    
    # Requester justification
    requester_notes = Column(Text, nullable=True)  # User's reason for the request
    request_type = Column(Enum(RequestType), default=RequestType.UPDATE)  # CREATE or UPDATE
    
    # Admin review
    reviewed_by_admin_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(TIMESTAMP, nullable=True)
    review_notes = Column(Text, nullable=True)  # Admin's response/rejection reason
    
    # Relationships
    requested_by = relationship("User", foreign_keys=[requested_by_user_id], backref="jurisdiction_requests")
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_admin_id])
