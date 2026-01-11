from fastapi import FastAPI, Depends # force reload
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from contextlib import asynccontextmanager
from app.config import settings
from app.routers import api_router
from app.database import get_db
from app.tasks import start_scheduler, stop_scheduler
from datetime import datetime
import platform
import sys
from app.logging_config import setup_logging
from app.middleware.rate_limit import RateLimitMiddleware

# Setup structured logging
setup_logging()

# App startup time for uptime calculation
APP_START_TIME = datetime.now()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events."""
    # Startup
    start_scheduler()
    yield
    # Shutdown
    stop_scheduler()


app = FastAPI(
    title="Paysafe POS API",
    description="API para sistema POS Paysafe (H10P/Sunmi)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Configuração CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*", # Permissive regex for LAN access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting (300 req/min)
app.add_middleware(RateLimitMiddleware, max_requests=300, window_seconds=60)

# Request Context Middleware - captures request for audit logging
from starlette.middleware.base import BaseHTTPMiddleware
from app.utils.request_context import set_request_context

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        set_request_context(request)
        response = await call_next(request)
        return response

app.add_middleware(RequestContextMiddleware)

# Serve APK files statically from backend
from fastapi.staticfiles import StaticFiles
import os

# Create static directory if not exists
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "static")
apk_dir = os.path.join(static_dir, "apk")
os.makedirs(apk_dir, exist_ok=True)

# Mount /apk route to serve files
app.mount("/static/apk", StaticFiles(directory=apk_dir), name="apk")

# Direct APK download endpoint with correct MIME type
from fastapi.responses import FileResponse

@app.get("/download/apk/{filename}")
async def download_apk(filename: str):
    """Download APK with correct MIME type to avoid ZIP conversion"""
    file_path = os.path.join(apk_dir, filename)
    if not os.path.exists(file_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="APK not found")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/vnd.android.package-archive"
    )


app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {"message": "Paysafe POS API Online", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/health/full")
async def health_check_full(db: AsyncSession = Depends(get_db)):
    """
    Advanced health check that verifies:
    - API status
    - Database connection
    - System information
    - Uptime
    """
    result = {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "uptime_seconds": int((datetime.now() - APP_START_TIME).total_seconds()),
        "system": {
            "python_version": sys.version.split()[0],
            "platform": platform.system(),
            "machine": platform.machine(),
        },
        "database": {
            "status": "unknown",
            "latency_ms": None
        }
    }
    
    # Test database connection
    try:
        start = datetime.now()
        await db.execute(text("SELECT 1"))
        latency = (datetime.now() - start).total_seconds() * 1000
        result["database"]["status"] = "connected"
        result["database"]["latency_ms"] = round(latency, 2)
    except Exception as e:
        result["database"]["status"] = "error"
        result["database"]["error"] = str(e)
        result["status"] = "degraded"
    
    return result

@app.get("/stats")
async def system_stats(db: AsyncSession = Depends(get_db)):
    """
    System statistics endpoint that returns:
    - Entity counts (merchants, agents, transactions, POS devices)
    - Connection pool status
    - API version and uptime
    """
    from app.models.merchant import Merchant
    from app.models.agent import Agent
    from app.models.transaction import Transaction
    from app.models.pos_device import POSDevice
    from app.models.market import Market
    from sqlalchemy import func, select
    from app.database import engine
    
    stats = {
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "uptime_seconds": int((datetime.now() - APP_START_TIME).total_seconds()),
        "entities": {},
        "pool": {}
    }
    
    try:
        # Count entities
        merchants = await db.execute(select(func.count(Merchant.id)))
        agents = await db.execute(select(func.count(Agent.id)))
        transactions = await db.execute(select(func.count(Transaction.id)))
        pos_devices = await db.execute(select(func.count(POSDevice.id)))
        markets = await db.execute(select(func.count(Market.id)))
        
        stats["entities"] = {
            "merchants": merchants.scalar() or 0,
            "agents": agents.scalar() or 0,
            "transactions": transactions.scalar() or 0,
            "pos_devices": pos_devices.scalar() or 0,
            "markets": markets.scalar() or 0,
        }
        
        # Connection pool stats
        pool = engine.pool
        stats["pool"] = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
        }
    except Exception as e:
        stats["error"] = str(e)
    
    return stats
