from sqlalchemy import Column, BigInteger, String, Enum, TIMESTAMP, func
from app.database import Base
from pydantic import EmailStr
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"
    FUNCIONARIO = "FUNCIONARIO"
    SUPERVISOR = "SUPERVISOR"

class UserStatus(str, enum.Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    INATIVO = "INATIVO"

class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    
    full_name = Column(String(200), nullable=False)
    username = Column(String(50), unique=True, nullable=True) # Added username
    email = Column(String(150), unique=True, nullable=False)
    phone_number = Column(String(20), nullable=True)
    
    password_hash = Column(String(255), nullable=False)
    
    role = Column(Enum(UserRole), nullable=False)
    
    # Geographical Scopes for RBAC
    scope_province = Column(String(100), nullable=True)
    scope_district = Column(String(100), nullable=True) # For Supervisors
    
    status = Column(Enum(UserStatus), default=UserStatus.ATIVO)
    
    last_login_at = Column(TIMESTAMP, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.current_timestamp())
