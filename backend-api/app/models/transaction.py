from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, func, ForeignKey, Numeric, JSON
from sqlalchemy.orm import relationship
from app.database import Base
import enum
import uuid

class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCESSO = "SUCESSO"
    FALHOU = "FALHOU"
    CANCELADO = "CANCELADO"
    TIMEOUT = "TIMEOUT"

class PaymentMethod(str, enum.Enum):
    DINHEIRO = "DINHEIRO"
    MPESA = "MPESA"
    EMOLA = "EMOLA"
    MKESH = "MKESH"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    transaction_uuid = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    
    # Amount
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(3), default="MZN")
    
    # Method & Status
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.PENDING)
    
    # References
    mpesa_reference = Column(String(100), nullable=True) # From M-Pesa
    payment_reference = Column(String(100), nullable=True) # Internal/Other
    
    # Entities
    merchant_id = Column(BigInteger, ForeignKey("merchants.id"), nullable=False)
    pos_id = Column(BigInteger, ForeignKey("pos_devices.id"), nullable=True)
    agent_id = Column(BigInteger, ForeignKey("agents.id"), nullable=True)
    funcionario_id = Column(BigInteger, ForeignKey("users.id"), nullable=True) # User who initiated
    
    # Location Snapshot (for audit/reports even if entities move)
    province = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    
    # Offline Sync Audit Fields
    # Stores original client-generated values for offline payments
    offline_transaction_uuid = Column(String(36), nullable=True)  # UUID generated on POS device
    offline_payment_reference = Column(String(100), nullable=True)  # Reference generated on POS device
    offline_created_at = Column(TIMESTAMP, nullable=True)  # Original timestamp from offline payment
    
    # Audit/Technical
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(JSON, nullable=True)
    
    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Rels
    merchant = relationship("Merchant", back_populates="transactions")
    pos_device = relationship("POSDevice", back_populates="transactions")
    agent = relationship("Agent", back_populates="transactions")
    funcionario = relationship("User") 
