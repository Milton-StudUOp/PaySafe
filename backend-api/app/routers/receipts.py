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


# ==============================
# QR CODE VERIFICATION
# ==============================
import hmac
import hashlib
import os

# Secret key for HMAC - in production, use environment variable
QR_SECRET_KEY = os.getenv("QR_SECRET_KEY", "paysafe-qr-secret-2026")


def generate_qr_token(receipt_code: str) -> str:
    """Generate signed QR token: receipt_code|hmac_signature"""
    signature = hmac.new(
        QR_SECRET_KEY.encode(),
        receipt_code.encode(),
        hashlib.sha256
    ).hexdigest()[:16]  # Short signature for QR
    return f"{receipt_code}|{signature}"


def verify_qr_signature(receipt_code: str, signature: str) -> bool:
    """Verify HMAC signature"""
    expected = hmac.new(
        QR_SECRET_KEY.encode(),
        receipt_code.encode(),
        hashlib.sha256
    ).hexdigest()[:16]
    return hmac.compare_digest(signature, expected)


@router.get("/qr-token/{receipt_code}")
async def get_qr_token(receipt_code: str, db: AsyncSession = Depends(get_db)):
    """Generate QR token for a receipt (used by POS to generate QR)"""
    result = await db.execute(
        select(ReceiptModel).where(ReceiptModel.receipt_code == receipt_code)
    )
    receipt = result.scalar_one_or_none()
    
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    
    return {"qr_token": generate_qr_token(receipt_code)}


@router.get("/qr-token-by-uuid/{transaction_uuid}")
async def get_qr_token_by_uuid(transaction_uuid: str, db: AsyncSession = Depends(get_db)):
    """Generate QR token by transaction UUID - for POS and Web clients"""
    # Lookup transaction to get receipt
    from app.models import Transaction as TransactionModel
    result = await db.execute(
        select(TransactionModel).where(TransactionModel.transaction_uuid == transaction_uuid)
    )
    transaction = result.scalar_one_or_none()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Use TXN-{uuid} as receipt code for verification
    receipt_code = f"TXN-{transaction_uuid}"
    
    # Generate signed token (backend is source of truth for signature)
    return {
        "qr_token": generate_qr_token(receipt_code),
        "receipt_code": receipt_code
    }


@router.get("/debug-signature/{code}")
async def debug_signature(code: str):
    """Debug endpoint to show expected signature for a code"""
    expected_signature = hmac.new(
        QR_SECRET_KEY.encode(),
        code.encode(),
        hashlib.sha256
    ).hexdigest()[:16]
    
    return {
        "input_code": code,
        "secret_key": QR_SECRET_KEY,
        "expected_signature": expected_signature,
        "full_token": f"{code}|{expected_signature}"
    }


from app.schemas import ReceiptVerification

@router.get("/verify/{token}", response_model=ReceiptVerification)
async def verify_receipt_qr(token: str, db: AsyncSession = Depends(get_db)):
    """
    Verify receipt from QR code token.
    Token format: {receipt_code}|{signature}
    Supports both MKT format (receipt_code) and TXN-{uuid} format (transaction)
    """
    # Parse token
    if "|" not in token:
        return ReceiptVerification(
            is_valid=False,
            status="INVALID_FORMAT",
            message="Formato de QR Code inválido"
        )
    
    parts = token.split("|", 1)
    if len(parts) != 2:
        return ReceiptVerification(
            is_valid=False,
            status="INVALID_FORMAT",
            message="Formato de QR Code inválido"
        )
    
    receipt_code, signature = parts
    
    # Debug logging
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"QR Verify: code={receipt_code}, sig={signature}")
    
    # Verify signature (HMAC-SHA256)
    if not verify_qr_signature(receipt_code, signature):
        # Debug: show expected signature
        expected = hmac.new(
            QR_SECRET_KEY.encode(),
            receipt_code.encode(),
            hashlib.sha256
        ).hexdigest()[:16]
        logger.error(f"Signature mismatch! Got: {signature}, Expected: {expected}")
        
        return ReceiptVerification(
            is_valid=False,
            status="INVALID_SIGNATURE",
            message=f"⚠️ QR Code ADULTERADO! Este recibo pode ser fraudulento."
        )
    
    # Handle TXN-{uuid} format (from POS terminal)
    if receipt_code.startswith("TXN-"):
        transaction_uuid = receipt_code[4:]  # Remove "TXN-" prefix
        
        from app.models import Transaction as TransactionModel
        from sqlalchemy import or_
        
        # Search by BOTH transaction_uuid AND offline_transaction_uuid
        # This ensures offline payments remain verifiable after sync
        result = await db.execute(
            select(TransactionModel).where(
                or_(
                    TransactionModel.transaction_uuid == transaction_uuid,
                    TransactionModel.offline_transaction_uuid == transaction_uuid
                )
            )
        )
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            logger.warning(f"Transaction not found: uuid={transaction_uuid}")
            return ReceiptVerification(
                is_valid=False,
                status="NOT_FOUND",
                message="Transação não encontrada no sistema"
            )
        
        # Get related data from transaction
        merchant_name = None
        agent_name = None
        market_name = None
        
        if transaction.merchant_id:
            m_result = await db.execute(select(Merchant).where(Merchant.id == transaction.merchant_id))
            merchant = m_result.scalar_one_or_none()
            if merchant:
                merchant_name = merchant.full_name
                # Get market through merchant
                if merchant.market_id:
                    mk_result = await db.execute(select(Market).where(Market.id == merchant.market_id))
                    market = mk_result.scalar_one_or_none()
                    if market:
                        market_name = market.name
        
        if transaction.agent_id:
            a_result = await db.execute(select(Agent).where(Agent.id == transaction.agent_id))
            agent = a_result.scalar_one_or_none()
            if agent:
                agent_name = agent.full_name
        
        return ReceiptVerification(
            is_valid=True,
            status="VALID",
            message="✅ Recibo VÁLIDO e autêntico",
            receipt_code=receipt_code,
            amount=transaction.amount,
            currency=transaction.currency,
            issued_at=transaction.created_at,
            reprint_count=0,
            merchant_name=merchant_name,
            agent_name=agent_name,
            market_name=market_name,
            warning=None
        )
    
    # Handle MKT format (standard receipt code)
    result = await db.execute(
        select(ReceiptModel).where(ReceiptModel.receipt_code == receipt_code)
    )
    receipt = result.scalar_one_or_none()
    
    if not receipt:
        return ReceiptVerification(
            is_valid=False,
            status="NOT_FOUND",
            message="Recibo não encontrado no sistema"
        )
    
    # Get related data
    merchant_name = None
    agent_name = None
    market_name = None
    
    if receipt.merchant_id:
        m_result = await db.execute(select(Merchant).where(Merchant.id == receipt.merchant_id))
        merchant = m_result.scalar_one_or_none()
        if merchant:
            merchant_name = merchant.full_name
    
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
    
    # Check for suspicious reprints
    warning = None
    status = "VALID"
    if receipt.reprint_count > 2:
        warning = f"⚠️ Este recibo foi reimpresso {receipt.reprint_count} vezes"
        status = "SUSPICIOUS"
    
    return ReceiptVerification(
        is_valid=True,
        status=status,
        message="✅ Recibo VÁLIDO e autêntico",
        receipt_code=receipt.receipt_code,
        amount=receipt.amount,
        currency=receipt.currency,
        issued_at=receipt.issued_at,
        reprint_count=receipt.reprint_count,
        merchant_name=merchant_name,
        agent_name=agent_name,
        market_name=market_name,
        warning=warning
    )


