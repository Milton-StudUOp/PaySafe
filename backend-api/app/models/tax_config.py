from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum

class TaxCategory(str, enum.Enum):
    IMPOSTO = "IMPOSTO"
    TAXA = "TAXA"
    MULTA = "MULTA"
    OUTROS = "OUTROS"

class TaxConfiguration(Base):
    __tablename__ = "tax_configurations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False) # e.g. 'IPA', 'TAXA_MERCADO'
    name = Column(String(255), nullable=False)
    category = Column(Enum(TaxCategory), default=TaxCategory.TAXA, nullable=False)
    
    description = Column(Text, nullable=True)
    
    is_fixed_amount = Column(Boolean, default=True) # If true, user cannot change amount (unless admin override)
    default_amount = Column(Numeric(10, 2), nullable=True) # The fixed price or suggested price
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<TaxConfiguration {self.code}: {self.name}>"
