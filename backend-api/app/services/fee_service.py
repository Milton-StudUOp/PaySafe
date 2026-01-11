from datetime import date
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import Merchant, PaymentStatus, MerchantFeePayment, Transaction, TransactionStatus
from app.tasks.scheduled_tasks import DAILY_FEE_AMOUNT, FEE_START_DATE

async def validate_merchant_payment_status(merchant: Merchant, db: AsyncSession) -> Merchant:
    """
    Real-time validation of merchant payment status.
    Calculates expected fees vs total paid (Direct Fees + Sales Transactions).
    
    Logic: Total Paid = Sum(FeePayments) + Sum(Transactions where status=SUCESSO)
    """
    
    today = date.today()
    
    # Exemption for CIDADAO
    if merchant.merchant_type == "CIDADAO":
        return merchant
    
    # 1. Determine effective billing start date
    reg_date = merchant.registered_at.date() if merchant.registered_at else today
    
    # Priority: Admin Override > Reg Date
    billing_start_date = merchant.billing_start_date or reg_date
    
    # If billing start date is in future, no fees yet
    if billing_start_date > today:
        days_billed = 0
    else:
        # Inclusive of today (Dia 01 a Dia 03 = 3 dias = 30 MT)
        days_billed = (today - billing_start_date).days + 1
    
    # Safety
    if days_billed < 0:
        days_billed = 0
            
    expected_amount = round(days_billed * DAILY_FEE_AMOUNT, 2)
    
    # 2. Get total paid (Direct Fees)
    fee_result = await db.execute(
        select(func.sum(MerchantFeePayment.amount))
        .where(MerchantFeePayment.merchant_id == merchant.id)
    )
    direct_fees = float(fee_result.scalar() or 0.0)
    
    # 3. Get total collected via Transactions (M-Pesa, etc)
    # User clarification: 'Transactions' table represents Fee Payments to the municipality.
    # It is NOT merchant sales revenue.
    tx_result = await db.execute(
        select(func.sum(Transaction.amount))
        .where(
            Transaction.merchant_id == merchant.id,
            Transaction.status == TransactionStatus.SUCESSO
        )
    )
    transaction_payments = float(tx_result.scalar() or 0.0)
    
    total_paid = round(direct_fees + transaction_payments, 2)
    
    # 4. Compare with epsilon for float safety
    balance = total_paid - expected_amount
    
    status_changed = False
    
    # Debug log (optional, remove later if spammy)
    # print(f"DEBUG: Merchant {merchant.id} | Days: {days_billed} | Exp: {expected_amount} | Paid: {total_paid} | Balance: {balance}")

    if balance >= -0.01: # Allow 0.01 float error margin
        # REGULAR (Possivelmente com crédito)
        credit_amount = balance if balance > 0 else 0.00
        
        if (merchant.payment_status != PaymentStatus.REGULAR or 
            float(merchant.overdue_balance or 0.0) != 0.00 or
            float(merchant.credit_balance or 0.0) != credit_amount):
            
            merchant.payment_status = PaymentStatus.REGULAR
            merchant.days_overdue = 0
            merchant.overdue_balance = 0.00
            merchant.credit_balance = credit_amount
            status_changed = True
    else:
        # IRREGULAR
        overdue_amount = abs(balance)
        new_days_overdue = math.ceil(overdue_amount / DAILY_FEE_AMOUNT)
        
        if (merchant.payment_status != PaymentStatus.IRREGULAR or 
            merchant.days_overdue != new_days_overdue or
            float(merchant.overdue_balance or 0.0) != overdue_amount):
            
            merchant.payment_status = PaymentStatus.IRREGULAR
            merchant.days_overdue = new_days_overdue
            merchant.overdue_balance = overdue_amount
            merchant.credit_balance = 0.00
            status_changed = True
            
    # If status changed, commit it so subsequent reads are fast
    if status_changed:
        db.add(merchant)
        await db.commit()
        await db.refresh(merchant)
        
    return merchant
