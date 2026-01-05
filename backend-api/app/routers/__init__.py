from fastapi import APIRouter

from .auth import router as auth_router
from .markets import router as markets_router
from .merchants import router as merchants_router
from .agents import router as agents_router
from .pos_devices import router as pos_devices_router
from .transactions import router as transactions_router
from .receipts import router as receipts_router
from .audit_logs import router as audit_logs_router
from .users import router as users_router
from .reports import router as reports_router
from .approvals import router as approvals_router
from .locations import router as locations_router
from .payments import router as payments_router
from .merchant_fees import router as merchant_fees_router
from .app_updates import router as app_updates_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(markets_router)
api_router.include_router(merchants_router)
api_router.include_router(agents_router)
api_router.include_router(pos_devices_router)
api_router.include_router(transactions_router)
api_router.include_router(receipts_router)
api_router.include_router(audit_logs_router)
api_router.include_router(users_router)
api_router.include_router(reports_router)
api_router.include_router(approvals_router)
api_router.include_router(locations_router)
api_router.include_router(payments_router)
api_router.include_router(merchant_fees_router)
api_router.include_router(app_updates_router)


