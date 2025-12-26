from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models.location import Province as ProvinceModel, Municipality as MunicipalityModel
from app.schemas.location import (
    Province, ProvinceCreate, ProvinceUpdate, ProvinceWithMunicipalities,
    Municipality, MunicipalityCreate, MunicipalityUpdate
)

router = APIRouter(prefix="/locations", tags=["Locations"])


# ==================== PROVINCES ====================

@router.get("/provinces", response_model=List[Province])
async def list_provinces(db: AsyncSession = Depends(get_db)):
    """List all provinces"""
    result = await db.execute(select(ProvinceModel).order_by(ProvinceModel.name))
    return result.scalars().all()


@router.get("/provinces/{province_id}", response_model=ProvinceWithMunicipalities)
async def get_province(province_id: int, db: AsyncSession = Depends(get_db)):
    """Get a province with its municipalities"""
    result = await db.execute(
        select(ProvinceModel)
        .options(selectinload(ProvinceModel.municipalities))
        .where(ProvinceModel.id == province_id)
    )
    province = result.scalar_one_or_none()
    if not province:
        raise HTTPException(status_code=404, detail="Província não encontrada")
    return province


@router.post("/provinces", response_model=Province, status_code=201)
async def create_province(data: ProvinceCreate, db: AsyncSession = Depends(get_db)):
    """Create a new province"""
    # Check if province already exists
    existing = await db.execute(
        select(ProvinceModel).where(
            (ProvinceModel.name == data.name) | (ProvinceModel.code == data.code)
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Província com este nome ou código já existe")
    
    province = ProvinceModel(**data.model_dump())
    db.add(province)
    await db.commit()
    await db.refresh(province)
    return province


@router.put("/provinces/{province_id}", response_model=Province)
async def update_province(province_id: int, data: ProvinceUpdate, db: AsyncSession = Depends(get_db)):
    """Update a province"""
    result = await db.execute(select(ProvinceModel).where(ProvinceModel.id == province_id))
    province = result.scalar_one_or_none()
    if not province:
        raise HTTPException(status_code=404, detail="Província não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(province, key, value)
    
    await db.commit()
    await db.refresh(province)
    return province


@router.delete("/provinces/{province_id}", status_code=204)
async def delete_province(province_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a province and all its municipalities"""
    result = await db.execute(select(ProvinceModel).where(ProvinceModel.id == province_id))
    province = result.scalar_one_or_none()
    if not province:
        raise HTTPException(status_code=404, detail="Província não encontrada")
    
    await db.delete(province)
    await db.commit()
    return None


# ==================== MUNICIPALITIES ====================

@router.get("/municipalities", response_model=List[Municipality])
async def list_municipalities(
    province_id: Optional[int] = Query(None, description="Filter by province ID"),
    db: AsyncSession = Depends(get_db)
):
    """List municipalities, optionally filtered by province"""
    query = select(MunicipalityModel)
    if province_id:
        query = query.where(MunicipalityModel.province_id == province_id)
    query = query.order_by(MunicipalityModel.name)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/municipalities/{municipality_id}", response_model=Municipality)
async def get_municipality(municipality_id: int, db: AsyncSession = Depends(get_db)):
    """Get a municipality by ID"""
    result = await db.execute(
        select(MunicipalityModel).where(MunicipalityModel.id == municipality_id)
    )
    municipality = result.scalar_one_or_none()
    if not municipality:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    return municipality


@router.post("/municipalities", response_model=Municipality, status_code=201)
async def create_municipality(data: MunicipalityCreate, db: AsyncSession = Depends(get_db)):
    """Create a new municipality"""
    # Verify province exists
    province_result = await db.execute(
        select(ProvinceModel).where(ProvinceModel.id == data.province_id)
    )
    if not province_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Província não encontrada")
    
    municipality = MunicipalityModel(**data.model_dump())
    db.add(municipality)
    await db.commit()
    await db.refresh(municipality)
    return municipality


@router.put("/municipalities/{municipality_id}", response_model=Municipality)
async def update_municipality(
    municipality_id: int, 
    data: MunicipalityUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Update a municipality"""
    result = await db.execute(
        select(MunicipalityModel).where(MunicipalityModel.id == municipality_id)
    )
    municipality = result.scalar_one_or_none()
    if not municipality:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # If changing province, verify it exists
    if "province_id" in update_data:
        province_result = await db.execute(
            select(ProvinceModel).where(ProvinceModel.id == update_data["province_id"])
        )
        if not province_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Província não encontrada")
    
    for key, value in update_data.items():
        setattr(municipality, key, value)
    
    await db.commit()
    await db.refresh(municipality)
    return municipality


@router.delete("/municipalities/{municipality_id}", status_code=204)
async def delete_municipality(municipality_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a municipality"""
    result = await db.execute(
        select(MunicipalityModel).where(MunicipalityModel.id == municipality_id)
    )
    municipality = result.scalar_one_or_none()
    if not municipality:
        raise HTTPException(status_code=404, detail="Município não encontrado")
    
    await db.delete(municipality)
    await db.commit()
    return None
