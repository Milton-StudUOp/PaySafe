from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, and_
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.audit_log import AuditLog, ActorType, Severity, EventType
from app.schemas.audit_log import AuditLog as AuditLogSchema
from app.routers.auth import get_current_user
from app.models.user import User as UserModel

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

@router.get("/", response_model=List[AuditLogSchema])
async def list_audit_logs(
    skip: int = 0, 
    limit: int = 50,
    search: Optional[str] = None,
    severity: Optional[Severity] = None,
    event_type: Optional[EventType] = None,
    actor_type: Optional[ActorType] = None,
    action: Optional[str] = None,
    entity: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    actor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # RBAC: Only ADMIN or AUDITOR can view logs
    allowed_roles = ["ADMIN", "AUDITOR"]
    if current_user.role.value not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only Admins and Auditors can view audit logs."
        )

    query = select(AuditLog)

    # Filters
    if search:
        # Free text search on description, actor name, or entity
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.description.ilike(search_filter),
                AuditLog.actor_name.ilike(search_filter),
                AuditLog.entity.ilike(search_filter),
                AuditLog.action.ilike(search_filter)
            )
        )
    
    if severity:
        query = query.where(AuditLog.severity == severity)
        
    if event_type:
        query = query.where(AuditLog.event_type == event_type)
        
    if actor_type:
        query = query.where(AuditLog.actor_type == actor_type)
        
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)

    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))
        
    if entity:
        query = query.where(AuditLog.entity.ilike(f"%{entity}%"))
        
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
        
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    # Order by newest first
    query = query.order_by(desc(AuditLog.created_at))
    
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


import csv
import io
from fastapi.responses import StreamingResponse

@router.get("/export", response_class=StreamingResponse)
async def export_audit_logs(
    search: Optional[str] = None,
    severity: Optional[Severity] = None,
    event_type: Optional[EventType] = None,
    actor_type: Optional[ActorType] = None,
    action: Optional[str] = None,
    entity: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    actor_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """Export audit logs to CSV file"""
    # RBAC
    allowed_roles = ["ADMIN", "AUDITOR"]
    if current_user.role.value not in allowed_roles:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    query = select(AuditLog)
    
    # Apply filters
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            or_(
                AuditLog.description.ilike(search_filter),
                AuditLog.actor_name.ilike(search_filter),
                AuditLog.entity.ilike(search_filter),
                AuditLog.action.ilike(search_filter)
            )
        )
    if severity: query = query.where(AuditLog.severity == severity)
    if event_type: query = query.where(AuditLog.event_type == event_type)
    if actor_type: query = query.where(AuditLog.actor_type == actor_type)
    if actor_id: query = query.where(AuditLog.actor_id == actor_id)
    if action: query = query.where(AuditLog.action.ilike(f"%{action}%"))
    if entity: query = query.where(AuditLog.entity.ilike(f"%{entity}%"))
    if start_date: query = query.where(AuditLog.created_at >= start_date)
    if end_date: query = query.where(AuditLog.created_at <= end_date)

    query = query.order_by(desc(AuditLog.created_at)).limit(10000) # Limit export to 10k for safety
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "ID", "Data/Hora", "Severidade", "Tipo Evento", 
        "Tipo Ator", "ID Ator", "Nome Ator", "Role Ator", "Jurisdição Ator",
        "Ação", "Entidade", "ID Entidade", "Descrição", "IP", "User Agent"
    ])
    
    for log in logs:
        writer.writerow([
            log.id,
            log.created_at.isoformat(),
            log.severity.value,
            log.event_type.value,
            log.actor_type.value,
            log.actor_id,
            log.actor_name,
            log.actor_role,
            f"{log.actor_province}/{log.actor_district}" if log.actor_province else "",
            log.action,
            log.entity,
            log.entity_id,
            log.description,
            log.ip_address,
            log.user_agent
        ])
        
    output.seek(0)
    
    filename = f"audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    response = StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response


@router.get("/{log_id}", response_model=AuditLogSchema)
async def get_audit_log(
    log_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # RBAC
    allowed_roles = ["ADMIN", "AUDITOR"]
    if current_user.role.value not in allowed_roles:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(status_code=404, detail="Audit Log not found")
        
    return log

@router.get("/entity/{entity_type}/{entity_id}", response_model=List[AuditLogSchema])
async def get_entity_audit_logs(
    entity_type: str,
    entity_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # RBAC
    allowed_roles = ["ADMIN", "AUDITOR"]
    if current_user.role.value not in allowed_roles:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    query = select(AuditLog)\
        .where(AuditLog.entity == entity_type)\
        .where(AuditLog.entity_id == entity_id)\
        .order_by(desc(AuditLog.created_at))\
        .offset(skip)\
        .limit(limit)
        
    result = await db.execute(query)
    return result.scalars().all()
