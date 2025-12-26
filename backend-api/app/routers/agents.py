from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.database import get_db
from app.models import Agent as AgentModel
from app.schemas import Agent, AgentCreate, AgentUpdate, AgentLogin
from app.services.auth_service import get_password_hash, verify_password

router = APIRouter(prefix="/agents", tags=["Agents"])

from app.routers.auth import get_current_user
from app.models.user import User as UserModel
from app.models import Market as MarketModel

@router.get("/", response_model=List[Agent])
async def list_agents(
    skip: int = 0, 
    limit: int = 100, 
    province: Optional[str] = None,
    district: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = select(AgentModel).outerjoin(MarketModel, AgentModel.assigned_market_id == MarketModel.id).options(selectinload(AgentModel.pos_devices))

    # 1. Explicit Filters
    if province:
        query = query.where(MarketModel.province == province)
    if district:
        query = query.where(MarketModel.district.ilike(f"%{district}%"))

    # RBAC Location Scoping
    if current_user.role.value == "SUPERVISOR":
        if current_user.scope_district:
            query = query.where(MarketModel.district == current_user.scope_district)
    
    elif current_user.role.value == "FUNCIONARIO":
        if current_user.scope_province:
            query = query.where(MarketModel.province == current_user.scope_province)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Agent, status_code=status.HTTP_201_CREATED)
async def create_agent(
    agent: AgentCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        import random
        
        # Jurisdiction Logic
        from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
        from app.models.jurisdiction_change_request import RequestType
        from app.models import Market as MarketModel
        
        # Get market first (needed for code generation and jurisdiction check)
        market_res = await db.execute(select(MarketModel).where(MarketModel.id == agent.assigned_market_id))
        market = market_res.scalar_one_or_none()
        if not market:
            raise HTTPException(status_code=404, detail="Mercado não encontrado")
        
        # Auto-generate agent_code: AG + 3 first chars of province (uppercase, no accents) + 6 random digits
        province_prefix = market.province[:3].upper()
        # Remove accents for consistent codes
        import unicodedata
        province_prefix = unicodedata.normalize('NFD', province_prefix).encode('ascii', 'ignore').decode('ascii')
        
        while True:
            generated_code = "AG" + province_prefix + "".join([str(random.randint(0, 9)) for _ in range(6)])
            # Check if code already exists
            existing = await db.execute(select(AgentModel).where(AgentModel.agent_code == generated_code))
            if not existing.scalars().first():
                break
        
        data = agent.model_dump(exclude={"pin", "requester_notes"})
        data["agent_code"] = generated_code  # Set auto-generated code
        data["pin_hash"] = get_password_hash(agent.pin)
        
        is_admin = current_user.role.value == "ADMIN"
        
        # Determine jurisdiction based on assigned market
        requested_province = market.province
        user_province = current_user.scope_province
        
        out_of_jurisdiction = False
        if not is_admin and requested_province and user_province:
            if requested_province != user_province:
                out_of_jurisdiction = True
        
        if out_of_jurisdiction:
             data["approval_status"] = ApprovalStatus.PENDENTE
             
             db_agent = AgentModel(**data)
             db.add(db_agent)
             await db.commit()
             await db.refresh(db_agent)
             
             # Avoid lazy load error
             from sqlalchemy.orm.attributes import set_committed_value
             set_committed_value(db_agent, "pos_devices", [])
             
             # Create JCR
             jcr = JurisdictionChangeRequest(
                entity_type=EntityType.AGENT,
                entity_id=db_agent.id,
                current_province=user_province,
                current_district=current_user.scope_district,
                requested_province=requested_province,
                requested_district=market.district if market else None,
                requested_by_user_id=current_user.id,
                request_type=RequestType.CREATE,
                requester_notes=agent.requester_notes
            )
             db.add(jcr)
            
            # Audit using Service
             from app.services.audit_service import AuditService
             from app.models.audit_log import Severity
             
             await AuditService.log_audit(
                db, current_user, "REQUEST_JURISDICTION_CHANGE", "AGENT",
                f"Requested Agent creation in {requested_province} (user jurisdiction: {user_province})",
                entity_id=db_agent.id,
                severity=Severity.MEDIUM,
                after_data=data
            )
             
             await db.commit()
             return db_agent
        
        db_agent = AgentModel(**data)
        db.add(db_agent)
        await db.commit()
        await db.refresh(db_agent)
        
        # Avoid lazy load error by explicitly setting empty list for new agent using set_committed_value
        from sqlalchemy.orm.attributes import set_committed_value
        set_committed_value(db_agent, "pos_devices", [])
        
        # Audit Creation
        from app.services.audit_service import AuditService
        await AuditService.log_audit(
            db, current_user, "CREATE_AGENT", "AGENT",
            f"Agente criado: {db_agent.full_name} ({db_agent.agent_code})",
            entity_id=db_agent.id,
            after_data=data
        )
        await db.commit()
        
        return db_agent
    except Exception as e:
        await db.rollback()
        # Check for integrity error (duplicate entry)
        if "IntegrityError" in str(type(e)) or " Duplicate entry " in str(e):
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Agent code or phone number already exists."
            )
        raise e

@router.post("/login")
async def agent_login(login_data: AgentLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentModel).where(AgentModel.agent_code == login_data.agent_code)
    )
    agent = result.scalar_one_or_none()
    
    if not agent or not verify_password(login_data.pin, agent.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid agent code or PIN"
        )
    
    if agent.status != "ATIVO":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Agent account is not active"
        )
    
    # Generate JWT Token for Agent
    from datetime import timedelta
    from app.config import settings
    from app.services.auth_service import AuthService
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": agent.agent_code, "role": "FUNCIONARIO"}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "agent_id": agent.id, 
        "agent_code": agent.agent_code, 
        "full_name": agent.full_name,
        "user": {
             "id": agent.id,
             "role": "FUNCIONARIO",
             "full_name": agent.full_name,
             "email": agent.agent_code
        }
    }

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_agent_jurisdiction
    
    agent = await check_agent_jurisdiction(agent_id, current_user, db)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Eagerly load pos_devices to avoid lazy loading error
    result = await db.execute(
        select(AgentModel)
        .where(AgentModel.id == agent_id)
        .options(selectinload(AgentModel.pos_devices))
    )
    agent_with_pos = result.scalar_one_or_none()
    
    if not agent_with_pos:
        return agent
        
    # Calculate Real-Time Stats
    from datetime import datetime, time
    from sqlalchemy import func, and_
    from app.models.transaction import Transaction
    
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    month_start = datetime(now.year, now.month, 1)
    
    # 1. Today's stats
    today_stats = await db.execute(
        select(
            func.sum(Transaction.amount).label("total"),
            func.count(Transaction.id).label("count")
        ).where(
            and_(
                Transaction.agent_id == agent_id,
                Transaction.created_at >= today_start,
                Transaction.status == "SUCESSO"
            )
        )
    )
    today_row = today_stats.one()
    agent_with_pos.total_collected_today = float(today_row.total or 0)
    agent_with_pos.transactions_count_today = int(today_row.count or 0)
    
    # 2. Month's stats
    month_stats = await db.execute(
        select(func.sum(Transaction.amount))
        .where(
            and_(
                Transaction.agent_id == agent_id,
                Transaction.created_at >= month_start,
                Transaction.status == "SUCESSO"
            )
        )
    )
    agent_with_pos.total_collected_month = float(month_stats.scalar() or 0)
    
    return agent_with_pos

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: int, 
    agent_update: AgentUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_agent_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing update
    agent = await check_agent_jurisdiction(agent_id, current_user, db)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # RULE 1: Block all updates if entity has pending approval
    if agent.approval_status == "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este registro possui uma solicitação de alteração pendente de aprovação. Nenhuma alteração pode ser feita até que o administrador aprove ou rejeite o pedido atual."
        )
    # Check if Market Changed
    new_market_id = agent_update.assigned_market_id
    
    # Jurisdiction Logic
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
    from app.models import Market as MarketModel
    
    jurisdiction_change = False
    requested_province = None
    requested_district = None
    current_province = "Unknown" # Should fetch from current market logic if robust, but here we simplify
    
    if new_market_id and new_market_id != agent.assigned_market_id:
        # Get target market location
        target_market_res = await db.execute(select(MarketModel).where(MarketModel.id == new_market_id))
        target_market = target_market_res.scalar_one_or_none()
        if not target_market:
             raise HTTPException(status_code=404, detail="Target Market not found")
        
        requested_province = target_market.province
        requested_district = target_market.district
        
        # Get Current Market Location for context
        if agent.assigned_market_id:
            curr_market_res = await db.execute(select(MarketModel).where(MarketModel.id == agent.assigned_market_id))
            curr_market = curr_market_res.scalar_one_or_none()
            if curr_market:
                current_province = curr_market.province
        
        is_admin = current_user.role.value == "ADMIN"
        user_province = current_user.scope_province
        
        if not is_admin and requested_province and user_province:
            if requested_province != user_province:
                jurisdiction_change = True
    
    update_data = agent_update.model_dump(exclude_unset=True, exclude={"pin", "requester_notes"})
    if agent_update.pin:
        update_data["pin_hash"] = get_password_hash(agent_update.pin)
        
    # Capture Old Data for Diff
    old_data = {
        "full_name": agent.full_name,
        "phone_number": agent.phone_number,
        "assigned_market_id": agent.assigned_market_id,
        "status": agent.status.value if hasattr(agent.status, 'value') else agent.status,
    }
        
    if jurisdiction_change:
         # Apply changes including market_id
         for key, value in update_data.items():
            setattr(agent, key, value)
            
         agent.approval_status = ApprovalStatus.PENDENTE
         
         jcr = JurisdictionChangeRequest(
                entity_type=EntityType.AGENT,
                entity_id=agent.id,
                current_province=current_province,
                current_district=None,
                requested_province=requested_province,
                requested_district=requested_district,
                requested_by_user_id=current_user.id,
                requester_notes=agent_update.requester_notes
            )
         db.add(jcr)
         
         # Use AuditService
         from app.services.audit_service import AuditService
         from app.models.audit_log import Severity
         
         await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "AGENT",
            f"Requested agent market change to {requested_province} (user jurisdiction: {user_province})",
            entity_id=agent.id,
            severity=Severity.MEDIUM,
            before_data=old_data,
            after_data=update_data
        )
         
         await db.commit()
         return agent
    
    for key, value in update_data.items():
        setattr(agent, key, value)
    
    # Audit Update
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UPDATE_AGENT", "AGENT",
        f"Updated agent details",
        entity_id=agent.id,
        before_data=old_data,
        after_data=update_data
    )

    await db.commit()
    return agent

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(
    agent_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_agent_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing delete
    agent = await check_agent_jurisdiction(agent_id, current_user, db)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Only ADMIN can delete
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Audit Delete
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "DELETE_AGENT", "AGENT",
        f"Deleted agent: {agent.full_name} ({agent.agent_code})",
        entity_id=agent.id,
        severity=Severity.HIGH,
        before_data={"agent_code": agent.agent_code, "full_name": agent.full_name, "id": agent.id}
    )

    await db.delete(agent)
    await db.commit()

@router.post("/{agent_id}/reset-pin")
async def reset_agent_pin(agent_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(AgentModel).where(AgentModel.id == agent_id))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Generate a simple 6-digit PIN for display
    # In a real scenario, this should be sent via SMS/Email
    import random
    new_pin = f"{random.randint(100000, 999999)}"
    agent.pin_hash = get_password_hash(new_pin)
    
    await db.commit()
    # Return the new PIN so the admin can verify it (show once)
    return {"new_pin": new_pin}
