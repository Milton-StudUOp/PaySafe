"""
App Updates Router - Remote APK update management for POS devices.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, Field

from app.database import get_db
from app.models import AppVersion, AppUpdateEvent

router = APIRouter(prefix="/app", tags=["App Updates"])


# ========== Schemas ==========

class AppVersionResponse(BaseModel):
    """Response for version check endpoint."""
    latest_version: str = Field(..., description="Latest available version")
    min_required_version: str = Field(..., description="Minimum version required to operate")
    apk_url: Optional[str] = Field(None, description="URL to download the APK")
    sha256: Optional[str] = Field(None, description="SHA256 hash for integrity check")
    file_size_bytes: Optional[int] = Field(None, description="APK file size in bytes")
    force_update: bool = Field(False, description="If true, app must update before use")
    release_notes: Optional[str] = Field(None, description="What's new in this version")


class UpdateEventRequest(BaseModel):
    """Request body for logging update events."""
    pos_id: Optional[int] = None
    device_serial: Optional[str] = None
    old_version: str
    new_version: str
    event_type: str = Field(..., description="CHECK_UPDATE, DOWNLOAD_START, DOWNLOAD_COMPLETE, INSTALL_SUCCESS, INSTALL_FAILED")
    status: str = Field(..., description="SUCCESS, FAILED, IN_PROGRESS")
    error_message: Optional[str] = None


class UpdateEventResponse(BaseModel):
    """Response for update event logging."""
    success: bool
    event_id: int


# ========== Endpoints ==========

@router.get("/version", response_model=AppVersionResponse)
async def get_app_version(db: AsyncSession = Depends(get_db)):
    """
    Get the latest app version information.
    POS devices should call this endpoint to check for updates.
    """
    # Get the latest active version
    result = await db.execute(
        select(AppVersion)
        .where(AppVersion.is_active == True)
        .order_by(desc(AppVersion.version_code))
        .limit(1)
    )
    version = result.scalar_one_or_none()
    
    if not version:
        # No version configured - return safe defaults
        return AppVersionResponse(
            latest_version="1.0.0",
            min_required_version="1.0.0",
            force_update=False,
            release_notes="No updates available"
        )
    
    return AppVersionResponse(
        latest_version=version.version,
        min_required_version=version.min_required_version,
        apk_url=version.apk_url,
        sha256=version.sha256_hash,
        file_size_bytes=version.file_size_bytes,
        force_update=version.force_update,
        release_notes=version.release_notes
    )


@router.post("/update-event", response_model=UpdateEventResponse)
async def log_update_event(
    event: UpdateEventRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Log an app update event for audit purposes.
    POS devices should call this at each stage of the update process.
    """
    # Get client IP
    client_ip = request.client.host if request.client else None
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    
    # Get user agent
    user_agent = request.headers.get("User-Agent", "")[:255]
    
    # Create audit event
    update_event = AppUpdateEvent(
        pos_id=event.pos_id,
        device_serial=event.device_serial,
        old_version=event.old_version,
        new_version=event.new_version,
        event_type=event.event_type,
        status=event.status,
        error_message=event.error_message,
        ip_address=client_ip,
        user_agent=user_agent
    )
    
    db.add(update_event)
    await db.commit()
    await db.refresh(update_event)
    
    return UpdateEventResponse(
        success=True,
        event_id=update_event.id
    )


@router.get("/version/check/{current_version}")
async def check_update_required(
    current_version: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Quick check if update is required for a specific version.
    Returns simple status for fast decision making.
    """
    # Get latest version info
    result = await db.execute(
        select(AppVersion)
        .where(AppVersion.is_active == True)
        .order_by(desc(AppVersion.version_code))
        .limit(1)
    )
    version = result.scalar_one_or_none()
    
    if not version:
        return {
            "update_required": False,
            "update_available": False,
            "force_update": False
        }
    
    # Parse versions for comparison
    def parse_version(v: str) -> tuple:
        try:
            parts = v.replace("v", "").split(".")
            return tuple(int(p) for p in parts[:3])
        except:
            return (0, 0, 0)
    
    current = parse_version(current_version)
    latest = parse_version(version.version)
    minimum = parse_version(version.min_required_version)
    
    update_available = current < latest
    update_required = current < minimum
    
    return {
        "current_version": current_version,
        "latest_version": version.version,
        "min_required_version": version.min_required_version,
        "update_available": update_available,
        "update_required": update_required,
        "force_update": version.force_update and update_required
    }
