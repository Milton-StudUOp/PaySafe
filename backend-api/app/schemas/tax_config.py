from pydantic import BaseModel, constr
from typing import Optional
from decimal import Decimal
from datetime import datetime
from app.models.tax_config import TaxCategory

class TaxConfigurationBase(BaseModel):
    code: constr(to_upper=True, min_length=2, max_length=50) # type: ignore
    name: str
    category: TaxCategory = TaxCategory.TAXA
    description: Optional[str] = None
    is_fixed_amount: bool = True
    default_amount: Optional[Decimal] = None
    is_active: bool = True

class TaxConfigurationCreate(TaxConfigurationBase):
    pass

class TaxConfigurationUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[TaxCategory] = None
    description: Optional[str] = None
    is_fixed_amount: Optional[bool] = None
    default_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None

class TaxConfigurationInDBBase(TaxConfigurationBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TaxConfiguration(TaxConfigurationInDBBase):
    pass
