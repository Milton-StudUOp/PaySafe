from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from typing import List
from datetime import datetime

from app.database import get_db
from app.models import Receipt as ReceiptModel, Transaction as TransactionModel, Merchant, Agent, POSDevice, Market
from app.schemas import Receipt, ReceiptCreate, ReceiptReprint, ReceiptLookup

router = APIRouter(prefix="/receipts", tags=["Receipts"])

def generate_receipt_code(market_id: int, sequence: int) -> str:
    """Generate receipt code: MKT{market_id}-{year}-{month}-{sequence:06d}"""
    now = datetime.now()
    return f"MKT{market_id:02d}-{now.year}-{now.month:02d}-{sequence:06d}"

@router.get("/", response_model=List[Receipt])
async def list_receipts(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ReceiptModel).order_by(ReceiptModel.issued_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()

@router.post("/", response_model=Receipt, status_code=status.HTTP_201_CREATED)
async def create_receipt(receipt: ReceiptCreate, db: AsyncSession = Depends(get_db)):
    # Get count for sequence
    result = await db.execute(select(func.count(ReceiptModel.id)))
    count = result.scalar() or 0
    
    data = receipt.model_dump()
    data["receipt_code"] = generate_receipt_code(receipt.market_id or 1, count + 1)
    
    db_receipt = ReceiptModel(**data)
    db.add(db_receipt)
    await db.commit()
    await db.refresh(db_receipt)
    return db_receipt

@router.get("/lookup/{receipt_code}", response_model=ReceiptLookup)
async def lookup_receipt(receipt_code: str, db: AsyncSession = Depends(get_db)):
    """Lookup receipt by code with full details for auditing"""
    result = await db.execute(
        select(ReceiptModel).where(ReceiptModel.receipt_code == receipt_code)
    )
    receipt = result.scalar_one_or_none()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    # Get related data
    merchant_name = None
    merchant_type = None
    agent_name = None
    market_name = None
    pos_serial = None
    
    if receipt.merchant_id:
        m_result = await db.execute(select(Merchant).where(Merchant.id == receipt.merchant_id))
        merchant = m_result.scalar_one_or_none()
        if merchant:
            merchant_name = merchant.full_name
            merchant_type = merchant.merchant_type.value if merchant.merchant_type else None
    
    if receipt.agent_id:
        a_result = await db.execute(select(Agent).where(Agent.id == receipt.agent_id))
        agent = a_result.scalar_one_or_none()
        if agent:
            agent_name = agent.full_name
    
    if receipt.market_id:
        mk_result = await db.execute(select(Market).where(Market.id == receipt.market_id))
        market = mk_result.scalar_one_or_none()
        if market:
            market_name = market.name
    
    if receipt.pos_id:
        p_result = await db.execute(select(POSDevice).where(POSDevice.id == receipt.pos_id))
        pos = p_result.scalar_one_or_none()
        if pos:
            pos_serial = pos.serial_number
    
    return ReceiptLookup(
        receipt_code=receipt.receipt_code,
        amount=receipt.amount,
        currency=receipt.currency,
        issued_at=receipt.issued_at,
        reprint_count=receipt.reprint_count,
        merchant_name=merchant_name,
        merchant_type=merchant_type,
        agent_name=agent_name,
        market_name=market_name,
        pos_serial=pos_serial,
    )

@router.post("/reprint", response_model=Receipt)
async def reprint_receipt(data: ReceiptReprint, db: AsyncSession = Depends(get_db)):
    """Mark receipt as reprinted"""
    result = await db.execute(
        select(ReceiptModel).where(ReceiptModel.receipt_code == data.receipt_code)
    )
    receipt = result.scalar_one_or_none()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    receipt.reprint_count += 1
    receipt.last_printed_at = datetime.now()
    
    await db.commit()
    await db.refresh(receipt)
    return receipt
