from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, Date, ForeignKey, func, Integer, Numeric
from sqlalchemy.orm import relationship
from app.database import Base
import enum

class MerchantType(str, enum.Enum):
    FIXO = "FIXO"
    AMBULANTE = "AMBULANTE"
    CIDADAO = "CIDADAO"

class IdDocumentType(str, enum.Enum):
    BI = "BI"
    PASSAPORTE = "PASSAPORTE"
    DIRE = "DIRE"
    OUTRO = "OUTRO"

class MobileOperator(str, enum.Enum):
    VODACOM = "VODACOM"
    TMCEL = "TMCEL"
    MOVITEL = "MOVITEL"

class MerchantStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    BLOQUEADO = "BLOQUEADO"

class ApprovalStatus(str, enum.Enum):
    APROVADO = "APROVADO"
    PENDENTE = "PENDENTE"
    REJEITADO = "REJEITADO"

class PaymentStatus(str, enum.Enum):
    """Status de pagamento da taxa diária do comerciante."""
    REGULAR = "REGULAR"      # Pagamento em dia
    IRREGULAR = "IRREGULAR"  # Pagamento em atraso

class Merchant(Base):
    __tablename__ = "merchants"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    # Tipo de vendedor
    merchant_type = Column(Enum(MerchantType), nullable=False, default=MerchantType.FIXO)
    
    # Dados pessoais
    full_name = Column(String(200), nullable=False)
    id_document_type = Column(Enum(IdDocumentType), nullable=True)
    id_document_number = Column(String(50), nullable=True)
    id_document_expiry = Column(Date, nullable=True)
    
    # Contactos
    phone_number = Column(String(20), nullable=True)
    mobile_operator = Column(Enum(MobileOperator), nullable=True)
    
    # Negócio
    business_type = Column(String(100), nullable=False)
    business_name = Column(String(200), nullable=True)  # Nome Comercial
    market_id = Column(BigInteger, ForeignKey("markets.id"), nullable=True) # Nullable for CIDADAO
    
    # Localização (Para Cidadão sem Mercado)
    province = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    
    # Pagamentos móveis
    mpesa_number = Column(String(20), nullable=True)
    emola_number = Column(String(20), nullable=True)
    mkesh_number = Column(String(20), nullable=True)
    
    # Acesso ao portal
    password_hash = Column(String(255), nullable=True)
    last_login_at = Column(TIMESTAMP, nullable=True)
    
    # NFC
    nfc_uid = Column(String(100), unique=True, nullable=True)
    
    # Estado de atividade
    status = Column(Enum(MerchantStatus), default=MerchantStatus.ATIVO)
    approval_status = Column(Enum(ApprovalStatus), default=ApprovalStatus.APROVADO)
    
    # Estado de pagamento de taxa diária (10 MT/dia)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.REGULAR)
    last_fee_payment_date = Column(Date, nullable=True)  # Última data que pagou taxa
    billing_start_date = Column(Date, nullable=True)     # Data de início da cobrança (customizável)
    days_overdue = Column(Integer, default=0)  # Dias em atraso
    overdue_balance = Column(Numeric(10, 2), default=0.00) # Valor exato em atraso
    credit_balance = Column(Numeric(10, 2), default=0.00) # Valor excedente (crédito)
    
    # Datas
    registered_at = Column(TIMESTAMP, server_default=func.current_timestamp())
    
    # Relationships
    market = relationship("Market", backref="merchants")
    transactions = relationship("Transaction", back_populates="merchant")
    fee_payments = relationship("MerchantFeePayment", back_populates="merchant")

