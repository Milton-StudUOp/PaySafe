from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base


class AppVersion(Base):
    """Model for tracking APK versions and update metadata."""
    __tablename__ = "app_versions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    version = Column(String(20), nullable=False, unique=True, index=True)
    version_code = Column(Integer, nullable=False)  # Android versionCode
    min_required_version = Column(String(20), nullable=False)  # Minimum version to operate
    apk_filename = Column(String(255), nullable=False)  # Filename on server
    apk_url = Column(String(500), nullable=True)  # Full download URL (generated)
    sha256_hash = Column(String(64), nullable=False)  # SHA256 hash for integrity
    file_size_bytes = Column(Integer, nullable=True)  # APK file size
    release_notes = Column(Text, nullable=True)  # What's new
    force_update = Column(Boolean, default=False)  # Block app if not updated
    is_active = Column(Boolean, default=True)  # Currently available
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AppUpdateEvent(Base):
    """Audit log for app update events on POS devices."""
    __tablename__ = "app_update_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    pos_id = Column(Integer, nullable=True, index=True)  # POS device ID
    device_serial = Column(String(100), nullable=True)  # Device serial number
    old_version = Column(String(20), nullable=False)
    new_version = Column(String(20), nullable=False)
    event_type = Column(String(50), nullable=False)  # CHECK_UPDATE, DOWNLOAD_START, DOWNLOAD_COMPLETE, INSTALL_SUCCESS, INSTALL_FAILED
    status = Column(String(20), nullable=False)  # SUCCESS, FAILED, IN_PROGRESS
    error_message = Column(Text, nullable=True)  # Failure reason if any
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
