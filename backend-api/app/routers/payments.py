from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field

from app.database import get_db
from app.routers.auth import get_current_user
from app.models import User as UserModel, Merchant, POSDevice, Market, Transaction, TransactionStatus, PaymentMethod
from app.services.payment_service import PaymentService
from app.services.audit_service import AuditService
from app.models.audit_log import EventType, Severity
import uuid
import logging

router = APIRouter(prefix="/payments", tags=["Payments"])
logger = logging.getLogger(__name__)

class PaymentRequest(BaseModel):
    merchant_id: int
    pos_id: Optional[int] = None
    amount: Decimal = Field(..., gt=0, description="Amount in MZN")
    mpesa_number: str = Field(..., pattern=r"^8[234567][0-9]{7}$", description="Customer Number (82/83/84/85/86/87)")
    observation: str
    payment_method: PaymentMethod = Field(default=PaymentMethod.MPESA)
    nfc_uid: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def initiate_payment(
    payment: PaymentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # 1. Security & Role Check
    allowed_roles = ["FUNCIONARIO", "AGENTE"]
    if current_user.role.value not in allowed_roles:
        await AuditService.log_audit(
            db, current_user, "PAYMENT_UNAUTHORIZED", "PAYMENT",
            f"Unauthorized payment attempt by {current_user.role}",
            severity=Severity.HIGH,
            event_type=EventType.SECURITY
        )
        raise HTTPException(status_code=403, detail="Only FUNCIONARIO or AGENTE can perform payments")
    
    # 2. Validate Entities
    # Merchant
    merchant = await db.get(Merchant, payment.merchant_id)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")

    # Check Merchant Status
    if merchant.status != "ATIVO":
         await AuditService.log_audit(
            db, current_user, "PAYMENT_BLOCKED", "PAYMENT",
            f"Payment blocked for {merchant.status} merchant {merchant.id}",
            severity=Severity.HIGH,
            event_type=EventType.SECURITY
        )
         raise HTTPException(status_code=403, detail=f"Merchant is {merchant.status}")
    
    # Jurisdiction Check
    # AGENTE: Can only charge merchants in their assigned market
    # FUNCIONARIO: Can charge merchants in their province (and district if scoped)
    market = await db.get(Market, merchant.market_id)
    if not market:
         raise HTTPException(status_code=400, detail="Merchant has no assigned market")
    
    if current_user.role.value == "AGENTE":
        # Market-level scope for Agents
        if hasattr(current_user, 'scope_market_id') and current_user.scope_market_id:
            if merchant.market_id != current_user.scope_market_id:
                await AuditService.log_audit(
                    db, current_user, "PAYMENT_JURISDICTION_FAIL", "PAYMENT",
                    f"Agent attempted to charge merchant {merchant.id} in market {merchant.market_id} (Agent market: {current_user.scope_market_id})",
                    severity=Severity.HIGH,
                    event_type=EventType.SECURITY
                )
                raise HTTPException(status_code=403, detail="Merchant outside your assigned market")
        else:
            # Agent without market assignment
            raise HTTPException(status_code=403, detail="No market assigned to your account")
    
    elif current_user.scope_province:
        # Province-level scope for FUNCIONARIO
        if market.province != current_user.scope_province:
             await AuditService.log_audit(
                db, current_user, "PAYMENT_JURISDICTION_FAIL", "PAYMENT",
                f"Attempt to charge merchant {merchant.id} in {market.province} (User scope: {current_user.scope_province})",
                severity=Severity.HIGH,
                event_type=EventType.SECURITY
            )
             raise HTTPException(status_code=403, detail="Merchant outside your jurisdiction")
        
        # If user has district scope, check that too
        if current_user.scope_district and market.district != current_user.scope_district:
            raise HTTPException(status_code=403, detail="Merchant outside your district scope")

    # POS (Optional for Web Payment)
    pos = None
    if payment.pos_id:
        pos = await db.get(POSDevice, payment.pos_id)
        if not pos:
            raise HTTPException(status_code=404, detail="POS not found")
        if pos.status != "ATIVO":
            raise HTTPException(status_code=400, detail="POS is not ACTIVE")

    # 3. Prepare Transaction
    tx_uuid = str(uuid.uuid4())
    reference = f"T{tx_uuid.replace('-', '')[:11].upper()}"
    
    # 4. Audit Attempt
    await AuditService.log_audit(
        db, current_user, "PAYMENT_ATTEMPT", "TRANSACTION",
        f"Initiating {payment.payment_method} for Merchant {merchant.full_name} ({payment.amount} MZN)",
        before_data=payment.model_dump(mode='json')
    )
    
    # 5. Call Payment Service
    service = PaymentService()
    
    # Create provisional transaction record (PENDING)
    transaction = Transaction(
        transaction_uuid=tx_uuid,
        merchant_id=merchant.id,
        pos_id=pos.id if pos else None,
        agent_id=current_user.id if hasattr(current_user, 'agent_code') else None,
        funcionario_id=current_user.id if hasattr(current_user, 'username') and not hasattr(current_user, 'agent_code') and not hasattr(current_user, 'nfc_uid') else None,
        amount=payment.amount,
        currency="MZN",
        payment_method=payment.payment_method,
        status=TransactionStatus.PENDING,
        payment_reference=reference, # Our reference
        mpesa_reference=None, # Filled later
        province=market.province, # Snapshot location
        district=market.district,
        request_payload={"msisdn": payment.mpesa_number, "obs": payment.observation, "method": payment.payment_method}
    )
    db.add(transaction)
    await db.commit() # Commit to get ID and ensure ID is reserved
    
    try:
        # EXECUTE PAYMENT
        # Determine strategy based on method
        if payment.payment_method == PaymentMethod.MPESA:
            result = service.process_c2b_payment(
                amount=float(payment.amount),
                reference=reference,
                customer_msisdn=payment.mpesa_number,
                third_party_reference=reference
            )
        elif payment.payment_method == PaymentMethod.DINHEIRO:
            # Cash Payment - Immediate Success, No SDK
            result = {
                "success": True,
                "body": {
                    "output_TransactionID": "CASH-" + tx_uuid[:8].upper(),
                    "output_ResponseDesc": "Pagamento em Dinheiro Registado"
                }
            }
        elif payment.payment_method in [PaymentMethod.EMOLA, PaymentMethod.MKESH]:
             # Placeholder for other mobile wallets
             # For now, let's Fail safely telling it's not integrated yet (or Mock if user wants, but request was specific to Cash)
             result = {"success": False, "error": f"{payment.payment_method} integration not active"}
        else:
             result = {"success": False, "error": "Invalid Payment Method"}

        
        # Update Transaction with Response
        transaction.response_payload = result
        
        if result.get("success"):
            transaction.status = TransactionStatus.SUCESSO
            # Extract M-Pesa ConversationID or TransactionID if available in body
            body = result.get("body", {})
            mpesa_ref = body.get("output_TransactionID") or body.get("input_TransactionReference")
            transaction.mpesa_reference = mpesa_ref
            
            # Update Balances (Implementation pending Balance model)
            
            # Log Success
            await AuditService.log_audit(
                db, current_user, "PAYMENT_SUCCESS", "TRANSACTION",
                f"Payment successful: {reference} - {payment.amount} MZN",
                entity_id=transaction.id,
                severity=Severity.INFO
            )
            
        else:
            transaction.status = TransactionStatus.FALHOU
            await AuditService.log_audit(
                db, current_user, "PAYMENT_FAILED", "TRANSACTION",
                f"Payment failed: {result.get('error')}",
                entity_id=transaction.id,
                severity=Severity.MEDIUM
            )

        await db.commit()
        await db.refresh(transaction)
        
        return transaction

    except Exception as e:
        await db.rollback() # Rollback if DB error, but transaction might have happened at gateway!
        # This is a critical edge case. Optimally we check status.
        logger.error(f"Critical System Error during payment: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal System Error during payment processing")
