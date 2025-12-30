"""
Scheduled Tasks for PaySafe
Runs background jobs like daily fee checks
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from datetime import date, datetime, timedelta
import logging
import math

from app.database import SessionLocal
from app.models import Merchant, PaymentStatus, MerchantFeePayment

logger = logging.getLogger(__name__)

# Daily fee amount in Meticais
DAILY_FEE_AMOUNT = 10.0

# Create scheduler instance
scheduler = AsyncIOScheduler()


async def check_daily_payments():
    """
    Scheduled job that runs at midnight (00:00).
    
    Logic:
    1. Calculate total expected amount = (days since registration until yesterday) * 10 MT
    2. Sum total payments made by merchant
    3. If Total Paid >= Expected -> REGULAR
    4. If Total Paid < Expected -> IRREGULAR (overdue by diff)
    """
    logger.info("🕐 Starting daily payment check job (Cumulative)...")
    
    async with SessionLocal() as db:
        try:
            today = date.today()
            yesterday = today - timedelta(days=1)
            
            # Get all active merchants
            result = await db.execute(
                select(Merchant).where(Merchant.status == "ATIVO")
            )
            merchants = result.scalars().all()
            
            regular_count = 0
            irregular_count = 0
            
            for merchant in merchants:
                # 1. Calculate Expected Amount
                # If registered_at is None, assume today (shouldn't happen for valid merchants)
                reg_date = merchant.registered_at.date() if merchant.registered_at else today
                
                # If registered after yesterday, they owe nothing yet for the period ending yesterday
                # (Fee applies after the day is completed? Or prepaid? Assuming post-paid or checks past days)
                # "since registration day until yesterday" implies:
                # If reg=Jan1, yesterday=Jan2. Days=2 (Jan1, Jan2). Expected = 20.
                
                if reg_date > yesterday:
                    days_billed = 0
                else:
                    days_billed = (yesterday - reg_date).days + 1
                
                expected_amount = days_billed * DAILY_FEE_AMOUNT
                
                # 2. Calculate Total Paid
                # Limit to payments made until today's execution (though unlikely they paid in future)
                payment_result = await db.execute(
                    select(func.sum(MerchantFeePayment.amount))
                    .where(MerchantFeePayment.merchant_id == merchant.id)
                )
                # scalar() returns None if no rows, likely 0 if rows but null sum? 
                # SQLAlchemy sum returns None if no matches usually.
                total_paid = payment_result.scalar() or 0.0
                total_paid = float(total_paid)
                
                # 3. Compare
                balance = total_paid - expected_amount
                
                if balance >= 0:
                    # ✅ REGULAR (Paid enough or in advance)
                    if merchant.payment_status != PaymentStatus.REGULAR:
                        merchant.payment_status = PaymentStatus.REGULAR
                        merchant.days_overdue = 0
                        logger.info(f"Merchant {merchant.id} became REGULAR (Paid: {total_paid}, Exp: {expected_amount})")
                    regular_count += 1
                else:
                    # ⚠️ IRREGULAR (Owes money)
                    merchant.payment_status = PaymentStatus.IRREGULAR
                    overdue_amount = abs(balance)
                    # Calculate days overdue based on missing amount
                    merchant.days_overdue = math.ceil(overdue_amount / DAILY_FEE_AMOUNT)
                    
                    logger.info(f"Merchant {merchant.id} marked IRREGULAR (Paid: {total_paid}, Exp: {expected_amount}, Overdue: {merchant.days_overdue} days)")
                    irregular_count += 1
            
            await db.commit()
            
            logger.info(f"✅ Daily payment check complete:")
            logger.info(f"   - Total merchants checked: {len(merchants)}")
            logger.info(f"   - Regular: {regular_count}")
            logger.info(f"   - Irregular: {irregular_count}")
            
        except Exception as e:
            logger.error(f"❌ Error in daily payment check: {e}")
            await db.rollback()
            raise


async def run_payment_check_now():
    """
    Manual trigger for payment check (for testing or admin use).
    """
    await check_daily_payments()


def start_scheduler():
    """
    Initialize and start the scheduler with all scheduled jobs.
    Call this from main.py on app startup.
    """
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return
    
    # Schedule daily payment check at midnight
    scheduler.add_job(
        check_daily_payments,
        CronTrigger(hour=0, minute=0),  # Run at 00:00 every day
        id="daily_payment_check",
        name="Daily Fee Payment Check",
        replace_existing=True,
        misfire_grace_time=3600  # Allow up to 1 hour delay if server was down
    )
    
    scheduler.start()
    logger.info("📅 Scheduler started - Daily payment check scheduled for 00:00")


def stop_scheduler():
    """
    Stop the scheduler gracefully.
    """
    if scheduler.running:
        scheduler.shutdown()
        logger.info("📅 Scheduler stopped")
