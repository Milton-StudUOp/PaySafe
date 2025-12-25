from sqlalchemy import Column, BigInteger, DECIMAL, TIMESTAMP, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base

class Balance(Base):
    __tablename__ = "balances"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    merchant_id = Column(BigInteger, ForeignKey("merchants.id"), nullable=False)
    current_balance = Column(DECIMAL(14, 2), default=0.00)
    last_transaction_at = Column(TIMESTAMP, nullable=True)
    
    updated_at = Column(TIMESTAMP, server_default=func.current_timestamp(), onupdate=func.current_timestamp())
    
    # Relationships
    merchant = relationship("Merchant", backref="balance")
    
    # Unique constraint
    __table_args__ = (
        UniqueConstraint("merchant_id", name="uk_balance_merchant"),
    )
