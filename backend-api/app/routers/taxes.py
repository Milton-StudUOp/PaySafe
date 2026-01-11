from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.database import get_db
from app.models.tax_config import TaxConfiguration, TaxCategory
from app.schemas.tax_config import TaxConfiguration as TaxConfigSchema, TaxConfigurationUpdate, TaxConfigurationCreate

router = APIRouter(
    prefix="/taxes",
    tags=["taxes"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[TaxConfigSchema])
async def read_taxes(
    active_only: bool = True,
    category: Optional[TaxCategory] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of taxes.
    By default returns only active taxes (for Dropdowns).
    """
    query = select(TaxConfiguration)
    
    if active_only:
        query = query.where(TaxConfiguration.is_active == True)
        
    if category:
        query = query.where(TaxConfiguration.category == category)
        
    query = query.order_by(TaxConfiguration.name)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/admin/all", response_model=List[TaxConfigSchema])
async def read_all_taxes_admin(
    db: AsyncSession = Depends(get_db)
):
    """
    Get ALL taxes (active and inactive) for Admin UI.
    """
    query = select(TaxConfiguration).order_by(TaxConfiguration.code)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/admin/{tax_id}", response_model=TaxConfigSchema)
async def update_tax(
    tax_id: int,
    tax_update: TaxConfigurationUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update tax configuration (Price, Name, etc.)
    """
    query = select(TaxConfiguration).where(TaxConfiguration.id == tax_id)
    result = await db.execute(query)
    tax = result.scalars().first()
    
    if not tax:
        raise HTTPException(status_code=404, detail="Tax configuration not found")
        
    # Update fields
    update_data = tax_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tax, key, value)
        
    try:
        await db.commit()
        await db.refresh(tax)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    return tax

@router.post("/admin", response_model=TaxConfigSchema)
async def create_tax(
    tax: TaxConfigurationCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create new tax type
    """
    # Check code exists
    query = select(TaxConfiguration).where(TaxConfiguration.code == tax.code)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Tax code already exists")
        
    db_tax = TaxConfiguration(**tax.dict())
    db.add(db_tax)
    
    try:
        await db.commit()
        await db.refresh(db_tax)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
        
    return db_tax
