from sqlalchemy import Column, BigInteger, String, TIMESTAMP, DECIMAL, CHAR, Integer, ForeignKey, JSON, Index, func
from sqlalchemy.orm import relationship
from app.database import Base

class Receipt(Base):
    __tablename__ = "receipts"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Código rastreável (ex: MKT12-2025-02-000123)
    receipt_code = Column(String(50), unique=True, nullable=False)
    
    transaction_id = Column(BigInteger, ForeignKey("transactions.id"), nullable=False)
    
    # Snapshot de contexto
    merchant_id = Column(BigInteger, ForeignKey("merchants.id"), nullable=True)
    agent_id = Column(BigInteger, ForeignKey("agents.id"), nullable=True)
    pos_id = Column(BigInteger, ForeignKey("pos_devices.id"), nullable=True)
    market_id = Column(BigInteger, ForeignKey("markets.id"), nullable=True)
    
    amount = Column(DECIMAL(12, 2), nullable=False)
    currency = Column(CHAR(3), default="MZN")
    
    issued_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    reprint_count = Column(Integer, default=0)
    last_printed_at = Column(TIMESTAMP, nullable=True)
    
    extra_data = Column(JSON, nullable=True)
    
    # Relationships
    transaction = relationship("Transaction", backref="receipts")
    merchant = relationship("Merchant", backref="receipts")
    agent = relationship("Agent", backref="receipts")
    pos_device = relationship("POSDevice", backref="receipts")
    market = relationship("Market", backref="receipts")
    
    # Indexes
    __table_args__ = (
        Index("idx_receipt_code", "receipt_code"),
        Index("idx_receipt_issued_at", "issued_at"),
    )
