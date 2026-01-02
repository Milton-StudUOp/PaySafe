from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import (
    JurisdictionChangeRequest as JCRModel,
    Market, Merchant, Agent, POSDevice,
    AuditLog, ActorType, ApprovalStatus, EntityType
)
from app.schemas.jurisdiction_change_request import (
    JurisdictionChangeRequest as JCRSchema,
    ApprovalAction
)
from app.routers.auth import get_current_user, require_admin
from app.models.user import User as UserModel

router = APIRouter(prefix="/approvals", tags=["Approvals"])

@router.get("/pending", response_model=List[JCRSchema])
async def list_pending_approvals(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """List all pending jurisdiction change requests (ADMIN only)"""
    result = await db.execute(
        select(JCRModel)
        .where(JCRModel.status == ApprovalStatus.PENDENTE)
        .order_by(JCRModel.requested_at.desc())
    )
    requests = result.scalars().all()
    
    # Enrich with user names and entity names
    enriched = []
    for req in requests:
        # Get requester name
        user_result = await db.execute(
            select(UserModel).where(UserModel.id == req.requested_by_user_id)
        )
        user = user_result.scalar_one_or_none()
        
        # Get entity name
        entity_name = None
        if req.entity_type == EntityType.MARKET:
            entity_result = await db.execute(select(Market).where(Market.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.name if entity else None
        elif req.entity_type == EntityType.MERCHANT:
            entity_result = await db.execute(select(Merchant).where(Merchant.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.full_name if entity else None
        elif req.entity_type == EntityType.AGENT:
            entity_result = await db.execute(select(Agent).where(Agent.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.full_name if entity else None
        elif req.entity_type == EntityType.POS:
            entity_result = await db.execute(select(POSDevice).where(POSDevice.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.serial_number if entity else None
        
        req.requested_by_name = user.full_name if user else "Unknown"
        req.entity_name = entity_name
        enriched.append(req)
    
    return enriched

@router.get("/history", response_model=List[JCRSchema])
async def list_approval_history(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """List all processed jurisdiction change requests (ADMIN only)"""
    result = await db.execute(
        select(JCRModel)
        .where(JCRModel.status != ApprovalStatus.PENDENTE)
        .order_by(JCRModel.reviewed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/my-requests", response_model=List[JCRSchema])
async def list_my_requests(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """List jurisdiction change requests made by the current user"""
    result = await db.execute(
        select(JCRModel)
        .where(JCRModel.requested_by_user_id == current_user.id)
        .order_by(JCRModel.requested_at.desc())
    )
    requests = result.scalars().all()
    
    # Enrich with entity names (simplified for user view)
    enriched = []
    for req in requests:
        entity_name = None
        if req.entity_type == EntityType.MARKET:
            entity_result = await db.execute(select(Market).where(Market.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.name if entity else None
        elif req.entity_type == EntityType.MERCHANT:
            entity_result = await db.execute(select(Merchant).where(Merchant.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.full_name if entity else None
        elif req.entity_type == EntityType.AGENT:
            entity_result = await db.execute(select(Agent).where(Agent.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.full_name if entity else None
        elif req.entity_type == EntityType.POS:
            entity_result = await db.execute(select(POSDevice).where(POSDevice.id == req.entity_id))
            entity = entity_result.scalar_one_or_none()
            entity_name = entity.serial_number if entity else None
        
        req.entity_name = entity_name
        req.requested_by_name = current_user.full_name
        enriched.append(req)
        
    return enriched

@router.post("/{request_id}/cancel")
async def cancel_request(
    request_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Cancel a pending jurisdiction change request (only by the user who created it)"""
    result = await db.execute(
        select(JCRModel).where(JCRModel.id == request_id)
    )
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    
    # Only the user who created the request can cancel it
    if req.requested_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Você não pode cancelar esta solicitação")
    
    if req.status != ApprovalStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Esta solicitação já foi processada")
    
    # Get entity and restore to previous state
    entity_model = None
    if req.entity_type == EntityType.MARKET:
        entity_model = Market
    elif req.entity_type == EntityType.MERCHANT:
        entity_model = Merchant
    elif req.entity_type == EntityType.AGENT:
        entity_model = Agent
    elif req.entity_type == EntityType.POS:
        entity_model = POSDevice
    
    entity_result = await db.execute(
        select(entity_model).where(entity_model.id == req.entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if entity:
        from app.models.jurisdiction_change_request import RequestType
        
        if hasattr(req, 'request_type') and req.request_type == RequestType.CREATE:
            # For CREATE cancellations: delete the entity entirely (it was never approved)
            await db.delete(entity)
        else:
            # For UPDATE cancellations: restore to original jurisdiction
            if req.current_province and hasattr(entity, 'province'):
                entity.province = req.current_province
            if req.current_district and hasattr(entity, 'district'):
                entity.district = req.current_district
            
            # Reset approval status to APROVADO (back to normal)
            entity.approval_status = ApprovalStatus.APROVADO
    
    # Mark request as CANCELADO (not REJEITADO)
    req.status = ApprovalStatus.CANCELADO
    req.reviewed_at = datetime.now()
    req.review_notes = "Cancelado pelo solicitante"
    
    # Audit log using AuditService for IP capture
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "CANCEL_JURISDICTION_CHANGE", req.entity_type.value,
        f"Request cancelled by requester. Reverted to {req.current_province}/{req.current_district}",
        entity_id=req.entity_id,
        severity=Severity.MEDIUM
    )
    
    await db.commit()
    
    return {"message": "Solicitação cancelada com sucesso", "request_id": request_id}

@router.post("/{request_id}/approve")
async def approve_request(
    request_id: int,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """Approve a jurisdiction change request (ADMIN only)"""
    result = await db.execute(
        select(JCRModel).where(JCRModel.id == request_id)
    )
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.status != ApprovalStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Get entity and update its location
    entity = None
    entity_model = None
    
    if req.entity_type == EntityType.MARKET:
        entity_model = Market
    elif req.entity_type == EntityType.MERCHANT:
        entity_model = Merchant
    elif req.entity_type == EntityType.AGENT:
        entity_model = Agent
    elif req.entity_type == EntityType.POS:
        entity_model = POSDevice
    
    entity_result = await db.execute(
        select(entity_model).where(entity_model.id == req.entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Apply changes
    entity.province = req.requested_province
    if hasattr(entity, 'district'):
        entity.district = req.requested_district
    entity.approval_status = ApprovalStatus.APROVADO
    
    # Update request
    req.status = ApprovalStatus.APROVADO
    req.reviewed_by_admin_id = current_user.id
    req.reviewed_at = datetime.now()
    req.review_notes = action.notes
    
    # Audit log using AuditService for IP capture
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "APPROVE_JURISDICTION_CHANGE", req.entity_type.value,
        f"Approved jurisdiction change to {req.requested_province}/{req.requested_district}",
        entity_id=req.entity_id,
        severity=Severity.HIGH
    )
    
    await db.commit()
    
    return {"message": "Aprovado com sucesso", "request_id": request_id}

@router.post("/{request_id}/reject")
async def reject_request(
    request_id: int,
    action: ApprovalAction,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """Reject a jurisdiction change request (ADMIN only)"""
    # Require notes for rejection
    if not action.notes or len(action.notes.strip()) == 0:
         raise HTTPException(status_code=400, detail="Motivo da rejeição é obrigatório")

    result = await db.execute(
        select(JCRModel).where(JCRModel.id == request_id)
    )
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if req.status != ApprovalStatus.PENDENTE:
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Get entity and reset approval status
    entity_model = None
    if req.entity_type == EntityType.MARKET:
        entity_model = Market
    elif req.entity_type == EntityType.MERCHANT:
        entity_model = Merchant
    elif req.entity_type == EntityType.AGENT:
        entity_model = Agent
    elif req.entity_type == EntityType.POS:
        entity_model = POSDevice
    
    entity_result = await db.execute(
        select(entity_model).where(entity_model.id == req.entity_id)
    )
    entity = entity_result.scalar_one_or_none()
    
    if entity:
        # Check if this was a CREATE or UPDATE request
        # If request_type is CREATE, delete the entity
        # If request_type is UPDATE, just set status to REJEITADO (keeping the entity)
        from app.models.jurisdiction_change_request import RequestType
        
        if hasattr(req, 'request_type') and req.request_type == RequestType.CREATE:
            # For CREATE rejections: delete the entity entirely
            await db.delete(entity)
        else:
            # For UPDATE rejections: restore to original jurisdiction and set REJEITADO
            # Restore original province/district if available
            if req.current_province:
                if hasattr(entity, 'province'):
                    entity.province = req.current_province
                if hasattr(entity, 'district') and req.current_district:
                    entity.district = req.current_district
            
            entity.approval_status = ApprovalStatus.REJEITADO
    
    # Update request
    req.status = ApprovalStatus.REJEITADO
    req.reviewed_by_admin_id = current_user.id
    req.reviewed_at = datetime.now()
    req.review_notes = action.notes
    
    # Audit log using AuditService for IP capture
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "REJECT_JURISDICTION_CHANGE", req.entity_type.value,
        f"Rejected jurisdiction change to {req.requested_province}/{req.requested_district}. Reason: {action.notes or 'N/A'}",
        entity_id=req.entity_id,
        severity=Severity.HIGH
    )
    
    await db.commit()
    
    return {"message": "Rejeitado", "request_id": request_id}

@router.get("/count")
async def get_pending_count(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_admin)
):
    """Get count of pending approvals (for badge display)"""
    count = await db.scalar(
        select(func.count(JCRModel.id))
        .where(JCRModel.status == ApprovalStatus.PENDENTE)
    )
    return {"pending_count": count or 0}
