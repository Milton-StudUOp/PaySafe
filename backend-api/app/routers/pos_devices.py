from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import POSDevice as POSDeviceModel
from app.schemas import POSDevice, POSDeviceCreate, POSDeviceUpdate
from app.services.auth_service import get_password_hash

router = APIRouter(prefix="/pos-devices", tags=["POS Devices"])

from app.routers.auth import get_current_user
from app.models.user import User as UserModel
from app.models import Agent as AgentModel, Market as MarketModel

@router.get("/", response_model=List[POSDevice])
async def list_pos_devices(
    skip: int = 0, 
    limit: int = 100, 
    province: Optional[str] = None,
    district: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = select(POSDeviceModel).outerjoin(AgentModel, POSDeviceModel.assigned_agent_id == AgentModel.id).outerjoin(MarketModel, AgentModel.assigned_market_id == MarketModel.id).options(
        selectinload(POSDeviceModel.assigned_agent).selectinload(AgentModel.assigned_market)
    )

    from sqlalchemy import or_

    # 1. Explicit Filters
    if province:
        # Show if POS has this province OR (POS has no province AND Market has this province)
        # Simplified: Just match either. If POS is Maputo, it shows. If Market is Maputo, it shows.
        query = query.where(
            or_(
                POSDeviceModel.province == province,
                MarketModel.province == province
            )
        )
    if district:
        query = query.where(
            or_(
                POSDeviceModel.district.ilike(f"%{district}%"),
                MarketModel.district.ilike(f"%{district}%")
            )
        )

    # RBAC Location Scoping
    if current_user.role.value == "SUPERVISOR":
         if current_user.scope_district:
            query = query.where(
                or_(
                    POSDeviceModel.district == current_user.scope_district,
                    MarketModel.district == current_user.scope_district
                )
            )
            
    elif current_user.role.value == "FUNCIONARIO":
        if current_user.scope_province:
            query = query.where(
                or_(
                    POSDeviceModel.province == current_user.scope_province,
                    MarketModel.province == current_user.scope_province
                )
            )

    result = await db.execute(query.offset(skip).limit(limit))
    pos_devices = result.scalars().all()

    # Populate flattened fields for Pydantic
    # Populate flattened fields for Pydantic (Logic: Use manual location if set, else inherit from agent->market)
    for pos in pos_devices:
        # Check if manual location is missing
        manual_bg_province = pos.province
        manual_bg_district = pos.district
        
        inherited_province = None
        inherited_district = None

        if pos.assigned_agent and pos.assigned_agent.assigned_market:
             inherited_province = pos.assigned_agent.assigned_market.province
             inherited_district = pos.assigned_agent.assigned_market.district
        
        # If manual is null, use inherited
        if not manual_bg_province:
            # We use setattr because Pydantic model response relies on these attributes being present on the ORM object
            # effectively "patching" the object for the response model if it's missing in DB
            setattr(pos, "province", inherited_province)
        
        if not manual_bg_district:
            setattr(pos, "district", inherited_district)

    return pos_devices

@router.post("/", response_model=POSDevice, status_code=status.HTTP_201_CREATED)
async def create_pos_device(
    pos_device: POSDeviceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
    
    data = pos_device.model_dump(exclude={"requester_notes"})
    
    # Check if user is ADMIN (can create anywhere)
    is_admin = current_user.role.value == "ADMIN"
    
    # Determine if creation is outside user's jurisdiction
    requested_province = pos_device.province
    user_province = current_user.scope_province
    
    out_of_jurisdiction = False
    if not is_admin and requested_province and user_province:
        if requested_province != user_province:
            out_of_jurisdiction = True
    
    if out_of_jurisdiction:
        # Create POS in user's jurisdiction but mark as pending
        data["province"] = user_province  # Force to user's jurisdiction
        data["district"] = current_user.scope_district  # Force district too
        data["approval_status"] = ApprovalStatus.PENDENTE
        
        db_pos = POSDeviceModel(**data)
        db.add(db_pos)
        await db.commit()
        await db.refresh(db_pos)
        
        # Create jurisdiction change request
        from app.models.jurisdiction_change_request import RequestType
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.POS,
            entity_id=db_pos.id,
            current_province=user_province,
            current_district=current_user.scope_district,
            requested_province=requested_province,
            requested_district=pos_device.district,
            requested_by_user_id=current_user.id,
            request_type=RequestType.CREATE,
            requester_notes=pos_device.requester_notes
        )
        db.add(jcr)
        
        # Audit log using Service
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "POS",
            f"Requested POS creation in {requested_province} (user jurisdiction: {user_province})",
            entity_id=db_pos.id,
            severity=Severity.MEDIUM,
            after_data=data
        )
        
        await db.commit()
        
        # Return the POS but with a signal that it's pending
        return db_pos
    
    # Normal creation (within jurisdiction or ADMIN)
    db_pos = POSDeviceModel(**data)
    db.add(db_pos)
    await db.commit()
    await db.refresh(db_pos)
    
    # Audit Creation
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "CREATE_POS", "POS",
        f"POS criado: {db_pos.serial_number}",
        entity_id=db_pos.id,
        after_data=data
    )
    await db.commit()
    
    return db_pos

@router.get("/{pos_id}", response_model=POSDevice)
async def get_pos_device(
    pos_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_pos_jurisdiction
    
    # IDOR Protection: Validate jurisdiction
    pos = await check_pos_jurisdiction(pos_id, current_user, db)
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    # Calculate Stats
    from app.models import Transaction
    from sqlalchemy import func, and_
    from datetime import datetime
    
    today = datetime.now().date()
    month_start = today.replace(day=1)
    
    revenue_today = await db.scalar(
        select(func.sum(Transaction.amount))
        .where(and_(
            Transaction.pos_id == pos_id,
            func.date(Transaction.created_at) == today,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    count_today = await db.scalar(
        select(func.count(Transaction.id))
        .where(and_(
            Transaction.pos_id == pos_id,
            func.date(Transaction.created_at) == today,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    revenue_month = await db.scalar(
        select(func.sum(Transaction.amount))
        .where(and_(
            Transaction.pos_id == pos_id,
            func.date(Transaction.created_at) >= month_start,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    ticket_avg = await db.scalar(
        select(func.avg(Transaction.amount))
        .where(and_(
            Transaction.pos_id == pos_id,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    pos.total_collected_today = revenue_today or 0.0
    pos.transactions_count_today = count_today or 0
    pos.total_collected_month = revenue_month or 0.0
    pos.ticket_average = ticket_avg or 0.0
    
    return pos

@router.get("/serial/{serial_number}", response_model=POSDevice)
async def get_pos_by_serial(serial_number: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(POSDeviceModel).where(POSDeviceModel.serial_number == serial_number))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    return pos

@router.put("/{pos_id}", response_model=POSDevice)
async def update_pos_device(
    pos_id: int,
    pos_update: POSDeviceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_pos_jurisdiction
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
    
    # IDOR Protection: Validate jurisdiction before allowing update
    pos = await check_pos_jurisdiction(pos_id, current_user, db, log_attempt=False)
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    # RULE 1: Block all updates if entity has pending approval
    if pos.approval_status == "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este registro possui uma solicitação de alteração pendente de aprovação. Nenhuma alteração pode ser feita até que o administrador aprove ou rejeite o pedido atual."
        )
    update_data = pos_update.model_dump(exclude_unset=True, exclude={"requester_notes"})
    
    # Check if user is ADMIN
    is_admin = current_user.role.value == "ADMIN"
    
    # Check if trying to change province or district (municipality) and if out of jurisdiction
    new_province = update_data.get("province")
    new_district = update_data.get("district")
    current_province = pos.province
    current_district = pos.district
    user_jurisdiction_province = current_user.scope_province
    user_jurisdiction_district = current_user.scope_district
    
    jurisdiction_change = False
    
    if not is_admin:
        # Province change outside user's province jurisdiction
        if new_province and user_jurisdiction_province:
            if new_province != user_jurisdiction_province and new_province != current_province:
                jurisdiction_change = True
        
        # Municipality (district) change - requires approval for any change to different municipality
        if new_district and current_district:
            if new_district != current_district:
                jurisdiction_change = True
    
    if jurisdiction_change:
        # Don't apply province/district changes - create pending request
        pending_province = update_data.pop("province", None)
        pending_district = update_data.pop("district", None)
        
        # Apply other updates normally
        for key, value in update_data.items():
            setattr(pos, key, value)
        
        # Mark as pending
        pos.approval_status = ApprovalStatus.PENDENTE
        
        # Create jurisdiction change request
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.POS,
            entity_id=pos.id,
            current_province=current_province,
            current_district=current_district,
            requested_province=pending_province,
            requested_district=pending_district,
            requested_by_user_id=current_user.id,
            requester_notes=pos_update.requester_notes
        )
        db.add(jcr)
        
        # Audit log using Service for IP capture
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "POS",
            f"Requested province change from {current_province} to {pending_province}",
            entity_id=pos.id,
            severity=Severity.MEDIUM
        )
        
        await db.commit()
        await db.refresh(pos)
        return pos
    
    # Capture Old Data
    old_data = {
        "status": pos.status.value if hasattr(pos.status, 'value') else pos.status,
        "serial_number": pos.serial_number,
        "province": pos.province,
        "district": pos.district
    }

    if jurisdiction_change:
        # Don't apply province/district changes - create pending request
        pending_province = update_data.pop("province", None)
        pending_district = update_data.pop("district", None)
        
        # Apply other updates normally
        for key, value in update_data.items():
            setattr(pos, key, value)
        
        # Mark as pending
        pos.approval_status = ApprovalStatus.PENDENTE
        
        # Create jurisdiction change request
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.POS,
            entity_id=pos.id,
            current_province=current_province,
            current_district=current_district,
            requested_province=pending_province,
            requested_district=pending_district,
            requested_by_user_id=current_user.id,
            requester_notes=pos_update.requester_notes
        )
        db.add(jcr)
        
        # Audit log using Service
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "POS",
            f"Requested province change from {current_province} to {pending_province}",
            entity_id=pos.id,
            severity=Severity.MEDIUM,
            before_data=old_data,
            after_data=update_data
        )
        
        await db.commit()
        await db.refresh(pos)
        return pos
    
    # Normal update (within jurisdiction or ADMIN)
    for key, value in update_data.items():
        setattr(pos, key, value)
    
    # Audit Update
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UPDATE_POS", "POS",
        f"Updated POS details",
        entity_id=pos.id,
        before_data=old_data,
        after_data=update_data
    )

    await db.commit()
    await db.refresh(pos)
    return pos

@router.delete("/{pos_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pos_device(
    pos_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_pos_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing delete
    pos = await check_pos_jurisdiction(pos_id, current_user, db)
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    # Only ADMIN can delete
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    # Audit Delete
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "DELETE_POS", "POS",
        f"Deleted POS: {pos.serial_number}",
        entity_id=pos.id,
        severity=Severity.HIGH,
        before_data={"serial_number": pos.serial_number, "id": pos.id}
    )

    await db.delete(pos)
    await db.commit()

@router.post("/{pos_id}/assign/{agent_id}")
async def assign_pos_device(
    pos_id: int, 
    agent_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check POS
    result_pos = await db.execute(select(POSDeviceModel).where(POSDeviceModel.id == pos_id))
    pos = result_pos.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
        
    # Check Agent
    from app.models import Agent
    result_agent = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result_agent.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Assign
    pos.assigned_agent_id = agent_id
    
    # Audit Assign
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "ASSIGN_POS", "POS",
        f"Assigned POS {pos.serial_number} to Agent {agent.agent_code}",
        entity_id=pos.id,
        after_data={"assigned_agent_id": agent_id}
    )
    
    await db.commit()
    await db.refresh(pos)
    return pos

@router.post("/{pos_id}/unassign")
async def unassign_pos_device(
    pos_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(POSDeviceModel).where(POSDeviceModel.id == pos_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    pos.assigned_agent_id = None
    
    # Audit Unassign
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UNASSIGN_POS", "POS",
        f"Unassigned POS {pos.serial_number}",
        entity_id=pos.id
    )
    
    await db.commit()
    await db.refresh(pos)
    return pos

@router.post("/{pos_id}/block", response_model=POSDevice)
async def block_pos_device(
    pos_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(POSDeviceModel).where(POSDeviceModel.id == pos_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    from app.models.pos_device import POSStatus
    pos.status = POSStatus.BLOQUEADO
    
    # Audit Block
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    await AuditService.log_audit(
        db, current_user, "BLOCK_POS", "POS",
        f"Blocked POS {pos.serial_number}",
        entity_id=pos.id,
        severity=Severity.HIGH
    )
    
    await db.commit()
    await db.refresh(pos)
    return pos

@router.post("/{pos_id}/unblock", response_model=POSDevice)
async def unblock_pos_device(
    pos_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(POSDeviceModel).where(POSDeviceModel.id == pos_id))
    pos = result.scalar_one_or_none()
    if not pos:
        raise HTTPException(status_code=404, detail="POS Device not found")
    
    from app.models.pos_device import POSStatus
    pos.status = POSStatus.ATIVO
    
    # Audit Unblock
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UNBLOCK_POS", "POS",
        f"Unblocked POS {pos.serial_number}",
        entity_id=pos.id
    )
    
    await db.commit()
    await db.refresh(pos)
    return pos
