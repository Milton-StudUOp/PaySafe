from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    AUDITOR = "AUDITOR"
    FUNCIONARIO = "FUNCIONARIO"
    SUPERVISOR = "SUPERVISOR"

class UserStatus(str, Enum):
    ATIVO = "ATIVO"
    SUSPENSO = "SUSPENSO"
    INATIVO = "INATIVO"

class UserBase(BaseModel):
    full_name: str
    username: Optional[str] = None
    email: EmailStr
    phone_number: Optional[str] = None
    role: UserRole
    # Scopes
    scope_province: Optional[str] = None
    scope_district: Optional[str] = None
    status: UserStatus = UserStatus.ATIVO

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    role: Optional[UserRole] = None
    scope_province: Optional[str] = None
    scope_district: Optional[str] = None
    status: Optional[UserStatus] = None
    password: Optional[str] = None

class User(UserBase):
    id: int
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict | None = None

class TokenData(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = None
