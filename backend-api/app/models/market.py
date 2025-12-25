from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, func
from app.database import Base
import enum

class MarketStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    INATIVO = "INATIVO"

class ApprovalStatus(str, enum.Enum):
    APROVADO = "APROVADO"
    PENDENTE = "PENDENTE"
    REJEITADO = "REJEITADO"
    CANCELADO = "CANCELADO"

class Market(Base):
    __tablename__ = "markets"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(150), nullable=False)
    province = Column(String(100), nullable=False)
    district = Column(String(100), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    status = Column(Enum(MarketStatus), default=MarketStatus.ATIVO)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.APROVADO)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
