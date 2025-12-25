rom typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.models.transacao import Transacao
from app.models.user import User
from app.schemas.transacao import Transacao as TransacaoSchema, TransacaoCreate, TransacaoUpdate
from app.services.payment_service import PaymentService
from app.routers.auth import get_current_user

router = APIRouter()
payment_service = PaymentService()

@router.post("/", response_model=TransacaoSchema)
async def create_transacao(
    transacao_in: TransacaoCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db)
):
    # 1. Create local transaction record
    new_transacao = Transacao(
        amount=transacao_in.amount,
        currency=transacao_in.currency,
        payment_method=transacao_in.payment_method,
        nfc_uid=transacao_in.nfc_uid,
        status="PENDING",
        supermercado_id=transacao_in.supermercado_id,
        cobrador_id=transacao_in.cobrador_id,
        device_id=transacao_in.device_id,
        external_ref=f"PAYS-{transacao_in.supermercado_id}-{transacao_in.amount}" # Simple logic
    )
    db.add(new_transacao)
    await db.commit()
    await db.refresh(new_transacao)
    
    # 2. Call Payment Gateway if method is M-PESA (example logic)
    if transacao_in.payment_method == "MPESA":
        # Simulate or Call real
        # In real logic you might want to do this async or background task
        msisdn = "258841234567" # Should come from request
        payment_result = payment_service.process_payment(
            amount=new_transacao.amount,
            reference=new_transacao.external_ref,
            customer_msisdn=msisdn
        )
        
        new_transacao.portal_response = payment_result
        if payment_result.get("success"):
             new_transacao.status = "COMPLETED" # Or WAITING_CONFIRMATION
        else:
             new_transacao.status = "FAILED"
             
        await db.commit()
        await db.refresh(new_transacao)
        
    return new_transacao

@router.get("/", response_model=List[TransacaoSchema])
async def list_transacoes(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: Annotated[User, Depends(get_current_user)] = None
):
    result = await db.execute(select(Transacao).offset(skip).limit(limit))
    return result.scalars().all()
