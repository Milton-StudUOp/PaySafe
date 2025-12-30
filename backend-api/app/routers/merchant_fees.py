"""
Merchant Fee Management API
Endpoints para gerenciar taxas diárias dos comerciantes (10 MT/dia)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import date, datetime

from app.database import get_db
from app.models import Merchant, MerchantFeePayment, PaymentStatus
from app.models.user import User as UserModel
from app.schemas.merchant_fee import (
    FeePaymentCreate, FeePaymentResponse, FeeStatusResponse,
    SetRegularRequest, IrregularMerchantResponse, FeeSummaryResponse, PaymentStatus as SchemaPaymentStatus
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/merchant-fees", tags=["Merchant Fees"])

DAILY_FEE_AMOUNT = 10.0  # 10 MT por dia


@router.get("/{merchant_id}/status", response_model=FeeStatusResponse)
async def get_fee_status(
    merchant_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Obter status de pagamento de taxa do comerciante."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Comerciante não encontrado")
    
    return FeeStatusResponse(
        merchant_id=merchant.id,
        merchant_name=merchant.full_name,
        payment_status=SchemaPaymentStatus(merchant.payment_status.value) if merchant.payment_status else SchemaPaymentStatus.REGULAR,
        last_fee_payment_date=merchant.last_fee_payment_date,
        days_overdue=merchant.days_overdue or 0,
        daily_fee_amount=DAILY_FEE_AMOUNT
    )


@router.post("/{merchant_id}/pay", response_model=FeePaymentResponse)
async def record_fee_payment(
    merchant_id: int,
    payment: FeePaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Registrar pagamento de taxa diária do comerciante."""
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Comerciante não encontrado")
    
    # Criar registro de pagamento
    fee_payment = MerchantFeePayment(
        merchant_id=merchant_id,
        amount=payment.amount or DAILY_FEE_AMOUNT,
        payment_date=datetime.utcnow(),
        paid_by_user_id=current_user.id,
        payment_method=payment.payment_method,
        notes=payment.notes
    )
    db.add(fee_payment)
    
    # Atualizar status do comerciante para REGULAR
    merchant.payment_status = PaymentStatus.REGULAR
    merchant.last_fee_payment_date = date.today()
    merchant.days_overdue = 0
    
    await db.commit()
    await db.refresh(fee_payment)
    
    return fee_payment


@router.put("/{merchant_id}/set-regular")
async def set_merchant_regular(
    merchant_id: int,
    request: SetRegularRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Admin marca comerciante como regular manualmente."""
    # Verificar permissão (apenas ADMIN, SUPERVISOR, FUNCIONARIO)
    allowed_roles = ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
    if current_user.role.value not in allowed_roles:
        raise HTTPException(status_code=403, detail="Sem permissão para esta ação")
    
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Comerciante não encontrado")
    
    # Atualizar status
    merchant.payment_status = PaymentStatus.REGULAR
    merchant.days_overdue = 0
    
    # Registrar como pagamento administrativo
    fee_payment = MerchantFeePayment(
        merchant_id=merchant_id,
        amount=0,  # Sem cobrança (ajuste administrativo)
        payment_date=datetime.utcnow(),
        paid_by_user_id=current_user.id,
        payment_method="ADMIN_ADJUSTMENT",
        notes=f"Ajuste administrativo: {request.notes or 'Marcado como regular pelo admin'}"
    )
    db.add(fee_payment)
    
    await db.commit()
    
    return {"message": f"Comerciante {merchant.full_name} foi marcado como REGULAR", "merchant_id": merchant_id}


@router.get("/irregular", response_model=List[IrregularMerchantResponse])
async def list_irregular_merchants(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Listar todos os comerciantes irregulares (em atraso)."""
    from app.models import Market
    
    result = await db.execute(
        select(Merchant, Market.name.label("market_name"))
        .join(Market, Merchant.market_id == Market.id)
        .where(Merchant.payment_status == PaymentStatus.IRREGULAR)
        .order_by(Merchant.days_overdue.desc())
        .offset(skip)
        .limit(limit)
    )
    
    merchants = []
    for row in result:
        merchant = row[0]
        market_name = row[1]
        merchants.append(IrregularMerchantResponse(
            id=merchant.id,
            full_name=merchant.full_name,
            phone_number=merchant.phone_number,
            market_name=market_name,
            days_overdue=merchant.days_overdue or 0,
            last_fee_payment_date=merchant.last_fee_payment_date,
            payment_status=SchemaPaymentStatus(merchant.payment_status.value)
        ))
    
    return merchants


@router.get("/summary", response_model=FeeSummaryResponse)
async def get_fee_summary(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Obter resumo de pagamentos de taxa."""
    # Contar totais
    total_result = await db.execute(select(func.count(Merchant.id)))
    total_merchants = total_result.scalar() or 0
    
    regular_result = await db.execute(
        select(func.count(Merchant.id)).where(Merchant.payment_status == PaymentStatus.REGULAR)
    )
    regular_count = regular_result.scalar() or 0
    
    irregular_result = await db.execute(
        select(func.count(Merchant.id)).where(Merchant.payment_status == PaymentStatus.IRREGULAR)
    )
    irregular_count = irregular_result.scalar() or 0
    
    # Total coletado hoje
    today = date.today()
    today_result = await db.execute(
        select(func.sum(MerchantFeePayment.amount))
        .where(func.date(MerchantFeePayment.payment_date) == today)
    )
    total_collected_today = today_result.scalar() or 0.0
    
    # Total em atraso (aproximado)
    overdue_result = await db.execute(
        select(func.sum(Merchant.days_overdue))
        .where(Merchant.payment_status == PaymentStatus.IRREGULAR)
    )
    total_days_overdue = overdue_result.scalar() or 0
    total_overdue_amount = float(total_days_overdue) * DAILY_FEE_AMOUNT
    
    return FeeSummaryResponse(
        total_merchants=total_merchants,
        regular_count=regular_count,
        irregular_count=irregular_count,
        total_collected_today=float(total_collected_today),
        total_overdue_amount=total_overdue_amount
    )


@router.get("/{merchant_id}/history", response_model=List[FeePaymentResponse])
async def get_fee_history(
    merchant_id: int,
    limit: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Obter histórico de pagamentos de taxa do comerciante."""
    result = await db.execute(
        select(MerchantFeePayment)
        .where(MerchantFeePayment.merchant_id == merchant_id)
        .order_by(MerchantFeePayment.payment_date.desc())
        .limit(limit)
    )
    
    return result.scalars().all()
