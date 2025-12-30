"""
Scheduled Tasks for PaySafe
Runs background jobs like daily fee checks
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import date, datetime, timedelta
import logging

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
    
    1. For each merchant, check if they paid today's fee
    2. If not paid, mark as IRREGULAR and increment days_overdue
    3. Log results for monitoring
    """
    logger.info("🕐 Starting daily payment check job...")
    
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
            newly_irregular = 0
            
            for merchant in merchants:
                # Check if merchant paid yesterday (since this runs at midnight)
                payment_result = await db.execute(
                    select(MerchantFeePayment)
                    .where(MerchantFeePayment.merchant_id == merchant.id)
                    .where(MerchantFeePayment.payment_date >= datetime.combine(yesterday, datetime.min.time()))
                    .where(MerchantFeePayment.payment_date < datetime.combine(today, datetime.min.time()))
                    .where(MerchantFeePayment.amount > 0)  # Exclude admin adjustments with 0
                )
                payment = payment_result.scalar_one_or_none()
                
                if payment:
                    # Merchant paid - ensure they're REGULAR
                    if merchant.payment_status != PaymentStatus.REGULAR:
                        merchant.payment_status = PaymentStatus.REGULAR
                        merchant.days_overdue = 0
                    regular_count += 1
                else:
                    # Merchant didn't pay - mark as IRREGULAR
                    if merchant.payment_status == PaymentStatus.REGULAR:
                        newly_irregular += 1
                    
                    merchant.payment_status = PaymentStatus.IRREGULAR
                    merchant.days_overdue = (merchant.days_overdue or 0) + 1
                    irregular_count += 1
            
            await db.commit()
            
            logger.info(f"✅ Daily payment check complete:")
            logger.info(f"   - Total merchants checked: {len(merchants)}")
            logger.info(f"   - Regular (paid): {regular_count}")
            logger.info(f"   - Irregular (unpaid): {irregular_count}")
            logger.info(f"   - Newly irregular today: {newly_irregular}")
            
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
