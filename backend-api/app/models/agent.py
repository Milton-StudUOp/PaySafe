from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class AgentStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    INATIVO = "INATIVO"

class ApprovalStatus(str, enum.Enum):
    APROVADO = "APROVADO"
    PENDENTE = "PENDENTE"
    REJEITADO = "REJEITADO"

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    agent_code = Column(String(50), unique=True, nullable=False)
    full_name = Column(String(200), nullable=False)
    phone_number = Column(String(20), nullable=False)
    
    # PIN de acesso ao POS (hash)
    pin_hash = Column(String(255), nullable=False)
    last_login_at = Column(TIMESTAMP, nullable=True)
    
    # Mercado e região
    assigned_market_id = Column(BigInteger, ForeignKey("markets.id"), nullable=True)
    assigned_region = Column(String(100), nullable=True)
    
    status = Column(Enum(AgentStatus), default=AgentStatus.ATIVO)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.APROVADO)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationships
    assigned_market = relationship("Market", backref="agents")
    transactions = relationship("Transaction", back_populates="agent")
