from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# Province Schemas
class ProvinceBase(BaseModel):
    name: str
    code: str


class ProvinceCreate(ProvinceBase):
    pass


class ProvinceUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None


class Province(ProvinceBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProvinceWithMunicipalities(Province):
    municipalities: List["Municipality"] = []


# Municipality Schemas
class MunicipalityBase(BaseModel):
    name: str
    province_id: int


class MunicipalityCreate(MunicipalityBase):
    pass


class MunicipalityUpdate(BaseModel):
    name: Optional[str] = None
    province_id: Optional[int] = None


class Municipality(MunicipalityBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MunicipalityWithProvince(Municipality):
    province: Optional[Province] = None


# Update forward references
ProvinceWithMunicipalities.model_rebuild()
