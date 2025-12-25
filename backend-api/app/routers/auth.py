from datetime import timedelta
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.schemas.user import Token, User as UserSchema
from app.services.auth_service import AuthService, verify_password
from app.config import settings
from jose import JWTError, jwt

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/token")

from sqlalchemy import or_

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], db: AsyncSession = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        identifier: str = payload.get("sub")
        if identifier is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Check User (Username OR Email)
    result = await db.execute(select(User).where(or_(User.email == identifier, User.username == identifier)))
    user = result.scalars().first()
    
    if user:
        return user
        
    # If not User, check Merchant (UID) - reusing identifier
    # Note: Merchants login with UID as 'username', which becomes 'sub'
    # We need to query Merchant model too if User not found, 
    # BUT `get_current_user` return type hint is `User`.
    # As per previous code, it only returned User. 
    # If this token is for a Merchant, how does it work?
    # Based on `login_for_access_token`, Merchants get a token too.
    # We should probably check Merchant table too.
    
    # If not User, check Merchant (UID)
    from app.models.merchant import Merchant
    result_merchant = await db.execute(select(Merchant).where(Merchant.nfc_uid == identifier))
    merchant = result_merchant.scalars().first()
    
    if merchant:
         # Fetch Merchant's Market to set Scope (fix for Audit Logs location)
         from app.models.market import Market
         market_result = await db.execute(select(Market).where(Market.id == merchant.market_id))
         market = market_result.scalar_one_or_none()

         if market:
             merchant.scope_province = market.province
             merchant.scope_district = market.district
             merchant.scope_market_id = market.id
         
         # Duck typing for Merchant as User
         merchant.role = type('obj', (object,), {'value': 'MERCHANT'})
         merchant.username = merchant.nfc_uid
         return merchant

    # If not Merchant, check Agent (Agent Code)
    from app.models.agent import Agent
    result_agent = await db.execute(select(Agent).where(Agent.agent_code == identifier))
    agent = result_agent.scalars().first()
    
    if agent:
         # Fetch Agent's Market to set Scope
         from app.models.market import Market
         market_result = await db.execute(select(Market).where(Market.id == agent.assigned_market_id))
         market = market_result.scalar_one_or_none()

         # AGENTE role - distinct from FUNCIONARIO, scoped to market
         agent.role = type('obj', (object,), {'value': 'AGENTE'})
         agent.username = agent.agent_code
         agent.email = f"{agent.agent_code}@agent.local"
         
         # Populate scope from assigned market
         if market:
             agent.scope_province = market.province
             agent.scope_district = market.district
             agent.scope_market_id = market.id  # Market-level scope
         else:
             # Safety fallback: No market = No access
             agent.scope_province = None
             agent.scope_district = None
             agent.scope_market_id = None
              
         return agent

    raise credentials_exception

async def require_admin(current_user = Depends(get_current_user)):
    """Dependency that requires user to be ADMIN"""
    if current_user.role.value != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

from app.models.merchant import Merchant, MerchantStatus

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db)
):
    # 1. Try to find User by username OR email
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity, EventType, ActorType

    identifier = form_data.username
    if "@" in identifier:
        result = await db.execute(select(User).where(User.email == identifier))
    else:
        # Check if username column is populated, otherwise might fallback or fail
        result = await db.execute(select(User).where(User.username == identifier))
    
    user = result.scalars().first()
    
    if user:
        if not verify_password(form_data.password, user.password_hash):
            await AuditService.log_security_event(
                db, None, "LOGIN_FAILED", 
                f"Failed login attempt for user: {identifier}", 
                severity=Severity.LOW, 
                actor=user
            )
            # Need to commit the log even if we raise exception? 
            # Ideally yes, but depends on transaction management. 
            # If we rely on global Exception handler, it might rollback.
            # We should commit explicitly for security logs if possible, 
            # OR rely on a background task/separate session.
            # Here keeping it simple (might rollback if transaction shared - but get_db is session per request).
            # If we raise HTTPException, verify if FastAPI rolls back DB dependency. Usually yes.
            # Better approach: Commit the log before raising.
            await db.commit() 
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if user.status.value != "ATIVO":
             await AuditService.log_audit(
                db, user, "LOGIN_BLOCKED", "USER", 
                "User account is not active", severity=Severity.MEDIUM, event_type=EventType.ACCESS_VIOLATION
            )
             await db.commit()
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is not active"
            )
            
        role = user.role.value
        user_data = user.__dict__.copy()
        user_data.pop('password_hash', None)
        user_data['role'] = role # Ensure role is present
        
        # Use username as primary if available, else email
        identifier = user.username if user.username else user.email

        # Update Last Login
        user.last_login_at = func.now()
        
        # Log Success
        await AuditService.log_audit(
            db, user, "LOGIN_SUCCESS", "USER", 
            f"User logged in successfully via API", 
            entity_name=user.full_name,
            severity=Severity.INFO
        )
        
        await db.commit()

    else:
        # 2. Try to find Merchant by UID
        result = await db.execute(select(Merchant).where(Merchant.nfc_uid == form_data.username))
        merchant = result.scalars().first()
        
        if not merchant or not verify_password(form_data.password, merchant.password_hash):
             # Unknown user/merchant or bad password for merchant
             await AuditService.log_security_event(
                db, None, "LOGIN_FAILED", 
                f"Failed login attempt for unknown ID or Merchant: {form_data.username}", 
                severity=Severity.LOW
            )
             await db.commit()
             
             raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect UID or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        if merchant.status.value != "ATIVO":
             await db.commit() # Log check logic missing here but simplifying
             raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Merchant account is not active"
            )

        role = "MERCHANT"
        user_data = merchant.__dict__.copy()
        user_data.pop('password_hash', None)
        user_data['role'] = role
        user_data['email'] = merchant.nfc_uid # Use UID as email/identifier for compatibility
        
        identifier = merchant.nfc_uid
        
        # Log Success Merchant
        await AuditService.log_audit(
            db, None, "LOGIN_SUCCESS", "MERCHANT", 
            f"Merchant logged in successfully", 
            entity_id=merchant.id,
            entity_name=merchant.full_name,
            actor_type_override=ActorType.MERCHANT,
            severity=Severity.INFO
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": identifier, "role": role}, expires_delta=access_token_expires
    )
    
    # Filter out internal SQLAlchemy state
    if "_sa_instance_state" in user_data:
        del user_data["_sa_instance_state"]
        
    return {"access_token": access_token, "token_type": "bearer", "user": user_data}

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    return current_user

# ============================================================
# POS DEVICE LOGIN - Terminal-Agent Binding
# ============================================================
from pydantic import BaseModel
from typing import Optional
from app.models.pos_device import POSDevice
from app.models.agent import Agent
from app.models.market import Market

class POSLoginRequest(BaseModel):
    username: str
    password: str
    device_serial: str  # Required for POS login

class POSLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    device: dict

@router.post("/pos-login", response_model=POSLoginResponse)
async def pos_device_login(
    credentials: POSLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login for POS devices with device-agent binding validation.
    - Validates device is registered and ATIVO
    - Validates agent credentials
    - Validates device is assigned to the logging agent
    - Updates device last_seen timestamp
    """
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity, EventType, ActorType
    
    device_serial = credentials.device_serial.strip().upper()
    
    # 1. Validate Device Exists
    device_result = await db.execute(
        select(POSDevice).where(POSDevice.serial_number == device_serial)
    )
    device = device_result.scalar_one_or_none()
    
    if not device:
        await AuditService.log_security_event(
            db, None, "POS_LOGIN_UNREGISTERED_DEVICE",
            f"Login attempt from unregistered device: {device_serial}",
            severity=Severity.HIGH
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Dispositivo [{device_serial}] não registrado no sistema. Contacte o Administrador."
        )
    
    # 2. Validate Device Status
    if device.status.value != "ATIVO":
        await AuditService.log_security_event(
            db, None, "POS_LOGIN_DEVICE_BLOCKED",
            f"Login attempt from {device.status.value} device: {device_serial}",
            severity=Severity.MEDIUM,
            actor_province=device.province,
            actor_district=device.district
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Dispositivo {device.status.value}. Contacte o administrador."
        )
    
    # 3. Validate Agent Credentials (using username = agent_code)
    agent_result = await db.execute(
        select(Agent).where(Agent.agent_code == credentials.username)
    )
    agent = agent_result.scalar_one_or_none()
    
    if not agent or not verify_password(credentials.password, agent.pin_hash):
        await AuditService.log_security_event(
            db, None, "POS_LOGIN_FAILED",
            f"Failed agent login on device {device_serial}: {credentials.username}",
            severity=Severity.MEDIUM,
            actor_province=device.province,
            actor_district=device.district
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de agente ou senha incorretos"
        )
    
    # 4. Validate Agent Status
    if agent.status.value != "ATIVO":
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Conta de agente {agent.status.value}"
        )
    
    # 5. Validate Device-Agent Binding
    if device.assigned_agent_id is None:
        await AuditService.log_security_event(
            db, None, "POS_LOGIN_UNASSIGNED_DEVICE",
            f"Login attempt on unassigned device {device_serial} by agent {agent.agent_code}",
            severity=Severity.MEDIUM,
            actor_province=device.province,
            actor_district=device.district
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este dispositivo não está atribuído a nenhum agente. Contacte o administrador."
        )
    
    if device.assigned_agent_id != agent.id:
        await AuditService.log_security_event(
            db, None, "POS_LOGIN_WRONG_AGENT",
            f"Agent {agent.agent_code} (ID:{agent.id}) tried to login on device assigned to agent ID:{device.assigned_agent_id}",
            severity=Severity.HIGH,
            actor_province=device.province,
            actor_district=device.district
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Este dispositivo está atribuído a outro agente."
        )
    
    # 6. All validations passed - Update device last_seen
    device.last_seen = func.current_timestamp()
    
    # 7. Get Agent's Market for scope
    market_result = await db.execute(select(Market).where(Market.id == agent.assigned_market_id))
    market = market_result.scalar_one_or_none()
    
    # 8. Build user data for token
    agent_data = {
        "id": agent.id,
        "agent_code": agent.agent_code,
        "full_name": agent.full_name,
        "phone_number": agent.phone_number,
        "role": "AGENTE",
        "status": agent.status.value,
        "assigned_market_id": agent.assigned_market_id,
        "scope_province": market.province if market else None,
        "scope_district": market.district if market else None,
        "scope_market_id": market.id if market else None,
        "market_name": market.name if market else None,
    }
    
    device_data = {
        "id": device.id,
        "serial_number": device.serial_number,
        "model": device.model,
        "status": device.status.value,
        "province": device.province,
        "district": device.district,
    }
    
    # 9. Log Success
    await AuditService.log_audit(
        db, None, "POS_LOGIN_SUCCESS", "AGENT",
        f"Agent {agent.agent_code} logged in on device {device_serial}",
        entity_id=agent.id,
        entity_name=agent.full_name,
        actor_type_override=ActorType.AGENT,
        severity=Severity.INFO,
        actor_province=device.province,
        actor_district=device.district
    )
    await db.commit()
    
    # 10. Generate Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": agent.agent_code, "role": "AGENTE", "device_id": device.id},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": agent_data,
        "device": device_data
    }
