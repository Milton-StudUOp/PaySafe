from sqlalchemy import Column, BigInteger, String, TIMESTAMP, ForeignKey, Numeric, Text
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

class MerchantFeePayment(Base):
    """Histórico de pagamentos de taxa diária dos comerciantes."""
    __tablename__ = "merchant_fee_payments"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    merchant_id = Column(BigInteger, ForeignKey("merchants.id"), nullable=False)
    
    # Detalhes do pagamento
    amount = Column(Numeric(10, 2), nullable=False, default=10.00)  # Taxa padrão: 10 MT
    payment_date = Column(TIMESTAMP, default=datetime.utcnow)  # Data/hora do pagamento
    
    # Quem registrou
    paid_by_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    # Método e observações
    payment_method = Column(String(50), nullable=True)  # DINHEIRO, MPESA, etc
    notes = Column(Text, nullable=True)
    
    # Relationships
    merchant = relationship("Merchant", back_populates="fee_payments")
    paid_by = relationship("User", backref="fee_payments_recorded")
