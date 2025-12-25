from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
import secrets
import string

from app.database import get_db
from app.models import User as UserModel
from app.schemas import User, UserCreate, UserUpdate
from app.services.auth_service import get_password_hash
from app.routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[User])
async def list_users(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(UserModel)
    
    if role and role != "ALL":
        query = query.where(UserModel.role == role)
        
    if status and status != "ALL":
        query = query.where(UserModel.status == status)
        
    if search:
        query = query.where(or_(
            UserModel.full_name.ilike(f"%{search}%"),
            UserModel.email.ilike(f"%{search}%"),
            UserModel.phone_number.ilike(f"%{search}%")
        ))
        
    query = query.order_by(UserModel.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: UserCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check if email exists
    result = await db.execute(select(UserModel).where(UserModel.email == user.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        data = user.model_dump(exclude={"password"})
        data["password_hash"] = get_password_hash(user.password)
        
        db_user = UserModel(**data)
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        # Audit log
        from app.services.audit_service import AuditService
        await AuditService.log_audit(
            db, current_user, "CREATE_USER", "USER",
            f"Utilizador criado: {db_user.full_name} ({db_user.email})",
            entity_id=db_user.id,
            after_data={"full_name": db_user.full_name, "email": db_user.email, "role": str(db_user.role)}
        )
        await db.commit()
        
        return db_user
    except Exception as e:
        await db.rollback()
        if "IntegrityError" in str(type(e)) or "Duplicate entry" in str(e):
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists."
            )
        raise e

@router.post("/{user_id}/reset-password", response_model=dict)
async def reset_password(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    temp_password = "".join(secrets.choice(alphabet) for _ in range(12))
    
    user.password_hash = get_password_hash(temp_password)
    await db.commit()
    
    # Audit log
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity, EventType
    await AuditService.log_audit(
        db, current_user, "RESET_PASSWORD", "USER",
        f"Palavra-passe resetada para: {user.full_name}",
        entity_id=user.id,
        severity=Severity.MEDIUM,
        event_type=EventType.SECURITY
    )
    await db.commit()
    
    return {"temp_password": temp_password}

@router.post("/me/change-password", response_model=dict)
async def change_my_password(
    current_password: str,
    new_password: str,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Permite que qualquer utilizador autenticado altere a sua própria senha.
    Requer a senha actual para verificação.
    """
    from app.services.auth_service import AuthService
    
    # Verify current password
    if not AuthService.verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Senha actual incorrecta"
        )
    
    # Validate new password (minimum 6 characters)
    if len(new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ter pelo menos 6 caracteres"
        )
    
    # Update password
    current_user.password_hash = get_password_hash(new_password)
    await db.commit()
    
    # Audit log
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity, EventType
    await AuditService.log_audit(
        db, current_user, "CHANGE_OWN_PASSWORD", "USER",
        f"Utilizador alterou a própria senha: {current_user.full_name}",
        entity_id=current_user.id,
        severity=Severity.MEDIUM,
        event_type=EventType.SECURITY
    )
    await db.commit()
    
    return {"message": "Senha alterada com sucesso"}


@router.post("/{user_id}/block", response_model=User)
async def block_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from app.schemas.user import UserStatus
    old_status = user.status
    user.status = UserStatus.SUSPENSO
    
    await db.commit()
    await db.refresh(user)
    
    # Audit log
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity, EventType
    await AuditService.log_audit(
        db, current_user, "BLOCK_USER", "USER",
        f"Utilizador bloqueado: {user.full_name}",
        entity_id=user.id,
        before_data={"status": str(old_status)},
        after_data={"status": "SUSPENSO"},
        severity=Severity.HIGH,
        event_type=EventType.SECURITY
    )
    await db.commit()
    
    return user

@router.post("/{user_id}/activate", response_model=User)
async def activate_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    from app.schemas.user import UserStatus
    old_status = user.status
    user.status = UserStatus.ATIVO
    
    await db.commit()
    await db.refresh(user)
    
    # Audit log
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "ACTIVATE_USER", "USER",
        f"Utilizador activado: {user.full_name}",
        entity_id=user.id,
        before_data={"status": str(old_status)},
        after_data={"status": "ATIVO"}
    )
    await db.commit()
    
    return user

@router.get("/{user_id}", response_model=User)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: int, 
    user_update: UserUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Capture before data
    before_data = {"full_name": user.full_name, "email": user.email, "role": str(user.role)}
    
    update_data = user_update.model_dump(exclude_unset=True, exclude={"password"})
    if user_update.password:
        update_data["password_hash"] = get_password_hash(user_update.password)
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    await db.commit()
    await db.refresh(user)
    
    # Audit log
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UPDATE_USER", "USER",
        f"Utilizador actualizado: {user.full_name}",
        entity_id=user.id,
        before_data=before_data,
        after_data={"full_name": user.full_name, "email": user.email, "role": str(user.role)}
    )
    await db.commit()
    
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_name = user.full_name
    user_email = user.email
    
    await db.delete(user)
    await db.commit()
    
    # Audit log
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    await AuditService.log_audit(
        db, current_user, "DELETE_USER", "USER",
        f"Utilizador eliminado: {user_name} ({user_email})",
        entity_id=user_id,
        before_data={"full_name": user_name, "email": user_email},
        severity=Severity.HIGH
    )
    await db.commit()

