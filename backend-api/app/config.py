import os
from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Paysafe POS"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    
    # Database
    DATABASE_URL: str
    
    # Portal SDK
    PORTAL_API_KEY: str
    PORTAL_PUBLIC_KEY: str
    PORTAL_ADDRESS: str
    PORTAL_PORT: int
    PORTAL_SSL: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        env_file_encoding = 'utf-8'
        extra = 'ignore'  # Ignore extra fields in .env

settings = Settings()


