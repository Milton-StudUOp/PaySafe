from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime
from app.database import get_db
from app.models import Market as MarketModel
from app.models import Merchant, Agent, POSDevice, Transaction
from app.schemas import Market, MarketCreate, MarketUpdate

router = APIRouter(prefix="/markets", tags=["Markets"])

from app.routers.auth import get_current_user
from app.models.user import User as UserModel

@router.get("/", response_model=List[Market])
async def list_markets(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = select(MarketModel)

    # RBAC Location Scoping
    # AGENTE: Only their assigned market
    if current_user.role.value == "AGENTE":
        if hasattr(current_user, 'scope_market_id') and current_user.scope_market_id:
            query = query.where(MarketModel.id == current_user.scope_market_id)
        else:
            # Safety: No market assigned = no access
            query = query.where(MarketModel.id == -1)
            
    elif current_user.role.value == "SUPERVISOR":
        if current_user.scope_district:
            query = query.where(MarketModel.district == current_user.scope_district)
    
    elif current_user.role.value == "FUNCIONARIO":
        if current_user.scope_province:
            query = query.where(MarketModel.province == current_user.scope_province)
    
    # We need to compute counts for the list view.
    # To be efficient, we can use subqueries or just load basic info.
    # For now, let's fetch markets normaly and maybe just let the frontend separate fetch?
    # NO, requirements say "Listar quantos comerciantes existem".
    # Let's try to attach counts.
    
    # Simple approach: Fetch markets, then loop (N+1 but simple) or complex Group By.
    # Given the scale (hundreds of markets?), aggregation is better.
    
    # For now, keeping it simple: just list markets. The user can view details for heavy stats.
    # OR, we can add simple counts.
    
    # Let's iterate and add counts effectively.
    result = await db.execute(query.offset(skip).limit(limit))
    markets = result.scalars().all()
    
    # Enrich with counts (looping for now, optimize later if slow)
    for m in markets:
        # Merchants
        m_count = await db.scalar(
            select(func.count(Merchant.id)).where(Merchant.market_id == m.id)
        )
        # Agents
        a_count = await db.scalar(
            select(func.count(Agent.id)).where(Agent.assigned_market_id == m.id)
        )
        
        m.merchants_count = m_count or 0
        m.agents_count = a_count or 0
        
    return markets

@router.get("/approved-active/", response_model=List[Market])
async def list_approved_active_markets(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns only markets with status=ATIVO AND approval_status=APROVADO.
    Used for dropdown selections in forms to ensure users can only select valid markets.
    """
    from app.models.market import MarketStatus, ApprovalStatus
    
    query = select(MarketModel).where(
        and_(
            MarketModel.status == MarketStatus.ATIVO,
            MarketModel.approval_status == ApprovalStatus.APROVADO
        )
    )
    
    # RBAC Location Scoping
    # AGENTE: Only their assigned market
    if current_user.role.value == "AGENTE":
        if hasattr(current_user, 'scope_market_id') and current_user.scope_market_id:
            query = query.where(MarketModel.id == current_user.scope_market_id)
        else:
            # Safety: No market assigned = no access
            query = query.where(MarketModel.id == -1)
            
    elif current_user.role.value == "SUPERVISOR":
        if current_user.scope_district:
            query = query.where(MarketModel.district == current_user.scope_district)
    
    elif current_user.role.value == "FUNCIONARIO":
        if current_user.scope_province:
            query = query.where(MarketModel.province == current_user.scope_province)
    
    result = await db.execute(query)
    markets = result.scalars().all()
    
    return markets


@router.post("/", response_model=Market, status_code=status.HTTP_201_CREATED)
async def create_market(
    market: MarketCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    # Check for duplicate Name + Province
    existing = await db.execute(
        select(MarketModel).where(
            and_(
                MarketModel.name == market.name,
                MarketModel.province == market.province
            )
        )
    )
    if existing.scalars().first():
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe um mercado '{market.name}' nesta província ({market.province})."
        )

    # Jurisdiction Logic
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
    from app.models.jurisdiction_change_request import RequestType
    
    # Check if user is ADMIN (can create anywhere)
    is_admin = current_user.role.value == "ADMIN"
    
    requested_province = market.province
    user_province = current_user.scope_province
    
    out_of_jurisdiction = False
    if not is_admin and requested_province and user_province:
        if requested_province != user_province:
            out_of_jurisdiction = True
            
    if out_of_jurisdiction:
        # Create Market in user's jurisdiction but mark as pending
        # Force to user's jurisdiction to ensure visibility
        market_data = market.model_dump(exclude={'requester_notes'})
        requester_notes = market.requester_notes
        market_data["province"] = user_province
        if current_user.scope_district:
            market_data["district"] = current_user.scope_district
            
        market_data["approval_status"] = ApprovalStatus.PENDENTE
        
        # Check for duplicates in forced location
        existing = await db.execute(
            select(MarketModel).where(
                and_(
                    MarketModel.name == market_data["name"],
                    MarketModel.province == market_data["province"]
                )
            )
        )
        if existing.scalars().first():
             raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Já existe um mercado '{market.name}' na sua jurisdição atual ({market_data['province']})."
            )

        db_market = MarketModel(**market_data)
        db.add(db_market)
        await db.commit()
        await db.refresh(db_market)
        
        # Create jurisdiction change request
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.MARKET,
            entity_id=db_market.id,
            current_province=user_province,
            current_district=current_user.scope_district,
            requested_province=requested_province,
            requested_district=market.district,
            requested_by_user_id=current_user.id,
            request_type=RequestType.CREATE,
            requester_notes=requester_notes
        )
        db.add(jcr)
        
        # Audit log using Service
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "MARKET",
            f"Requested Market creation in {requested_province} (user jurisdiction: {user_province})",
            entity_id=db_market.id,
            severity=Severity.MEDIUM,
            after_data=market_data
        )
        
        await db.commit()
        return db_market

    # Normal Creation
    market_data = market.model_dump(exclude={'requester_notes'})
    db_market = MarketModel(**market_data)
    db.add(db_market)
    await db.commit()
    await db.refresh(db_market)
    
    # Audit Creation
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "CREATE_MARKET", "MARKET",
        f"Mercado criado: {db_market.name} ({db_market.province})",
        entity_id=db_market.id,
        after_data=market_data
    )
    await db.commit()
    
    return db_market

@router.get("/{market_id}", response_model=Market)
async def get_market(
    market_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_market_jurisdiction
    
    # IDOR Protection: Validate jurisdiction
    market = await check_market_jurisdiction(market_id, current_user, db)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Calculate Stats
    merchants_all = await db.scalar(
        select(func.count(Merchant.id)).where(Merchant.market_id == market_id)
    )
    merchants_active = await db.scalar(
        select(func.count(Merchant.id))
        .where(and_(Merchant.market_id == market_id, Merchant.status == 'ATIVO'))
    )
    
    agents_count = await db.scalar(
        select(func.count(Agent.id)).where(Agent.assigned_market_id == market_id)
    )
    
    pos_count = await db.scalar(
        select(func.count(POSDevice.id))
        .join(Agent, POSDevice.assigned_agent_id == Agent.id)
        .where(and_(Agent.assigned_market_id == market_id, POSDevice.status == 'ATIVO'))
    )
    
    today = datetime.now().date()
    month_start = today.replace(day=1)
    
    revenue_today = await db.scalar(
        select(func.sum(Transaction.amount))
        .join(Merchant, Transaction.merchant_id == Merchant.id)
        .where(and_(
            Merchant.market_id == market_id,
            func.date(Transaction.created_at) == today,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    revenue_month = await db.scalar(
        select(func.sum(Transaction.amount))
        .join(Merchant, Transaction.merchant_id == Merchant.id)
        .where(and_(
            Merchant.market_id == market_id,
            func.date(Transaction.created_at) >= month_start,
            Transaction.status == 'SUCESSO'
        ))
    )
    
    market.merchants_count = merchants_all or 0
    market.active_merchants_count = merchants_active or 0
    market.agents_count = agents_count or 0
    market.pos_count = pos_count or 0
    market.total_collected_today = revenue_today or 0.0
    market.total_collected_month = revenue_month or 0.0
    
    return market

@router.put("/{market_id}", response_model=Market)
async def update_market(
    market_id: int, 
    market_update: MarketUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_market_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing update
    market = await check_market_jurisdiction(market_id, current_user, db, log_attempt=False)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # RULE 1: Block all updates if entity has pending approval
    if market.approval_status == "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este registro possui uma solicitação de alteração pendente de aprovação. Nenhuma alteração pode ser feita até que o administrador aprove ou rejeite o pedido atual."
        )
    
    # Jurisdiction Logic for Update
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType

    # Check for duplicate Name + Province for OTHER markets
    # Logic moved to after we determine final province (requested or pending)
    # But for "out of jurisdiction" flow, we don't change province yet.
    
    update_data = market_update.model_dump(exclude_unset=True, exclude={"requester_notes"})
    
    is_admin = current_user.role.value == "ADMIN"
    new_province = update_data.get("province")
    current_province = market.province
    user_jurisdiction = current_user.scope_province
    
    jurisdiction_change = False
    if not is_admin and new_province and user_jurisdiction:
        if new_province != user_jurisdiction and new_province != current_province:
            jurisdiction_change = True
            
    if jurisdiction_change:
        # Don't apply province/district changes - create pending request
        pending_province = update_data.pop("province", None)
        pending_district = update_data.pop("district", None)
        
        # Apply other updates normally
        for key, value in update_data.items():
            setattr(market, key, value)
            
        # Mark as pending
        market.approval_status = ApprovalStatus.PENDENTE
        
        # Create JCR
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.MARKET,
            entity_id=market.id,
            current_province=current_province,
            current_district=market.district,
            requested_province=pending_province,
            requested_district=pending_district,
            requested_by_user_id=current_user.id,
            requester_notes=market_update.requester_notes
        )
        db.add(jcr)
        
        # Audit using Service
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "MARKET",
            f"Requested province change from {current_province} to {pending_province}",
            entity_id=market.id,
            severity=Severity.MEDIUM,
            before_data={"province": current_province, "id": market.id},
            after_data=update_data
        )
        
        await db.commit()
        await db.refresh(market)
        return market
    
    # Capture Old Data before loop
    old_data = {
        "name": market.name,
        "province": market.province,
        "district": market.district,
        "neighborhood": market.neighborhood
    }

    # Normal Update
    for key, value in update_data.items():
        setattr(market, key, value)
    
    # Check for duplicate Name + Province (only if name or province changed)
    # This check runs against the *new* state applied to the object (but not committed yet if using setattr)
    # Actually setattr updates the object in session.
    # existing check matches object in DB? No, query matches DB rows.
    # We need to check if ANY Other market has (new_name, new_province)
    
    check_name = market.name
    check_province = market.province
    
    existing = await db.execute(
        select(MarketModel).where(
            and_(
                MarketModel.name == check_name,
                MarketModel.province == check_province,
                MarketModel.id != market_id
            )
        )
    )
    if existing.scalars().first():
         await db.rollback() # Rollback implicit changes to session object
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Já existe outro mercado '{check_name}' nesta província."
        )
    
    # Audit Update
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UPDATE_MARKET", "MARKET",
        f"Updated market details",
        entity_id=market.id,
        before_data=old_data,
        after_data=update_data
    )

    await db.commit()
    await db.refresh(market)
    return market

@router.delete("/{market_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_market(
    market_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_market_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing delete
    market = await check_market_jurisdiction(market_id, current_user, db)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Only ADMIN can delete
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Audit Delete
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "DELETE_MARKET", "MARKET",
        f"Deleted market: {market.name} ({market.province})",
        entity_id=market.id,
        severity=Severity.HIGH,
        before_data={"name": market.name, "province": market.province, "id": market.id}
    )

    await db.delete(market)
    await db.commit()

@router.get("/{market_id}/chart/revenue")
async def get_market_revenue_chart(
    market_id: int,
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_market_jurisdiction
    from datetime import timedelta
    
    # Validation
    market = await check_market_jurisdiction(market_id, current_user, db, log_attempt=False)
    if not market:
        raise HTTPException(status_code=404, detail="Market not found")
        
    start_date = datetime.now().date() - timedelta(days=days)
    
    # Helper to generate date range
    def daterange(start_date, end_date):
        for n in range(int((end_date - start_date).days) + 1):
            yield start_date + timedelta(n)

    stmt = (
        select(
            func.date(Transaction.created_at).label("date"),
            func.sum(Transaction.amount).label("revenue")
        )
        .join(Merchant, Transaction.merchant_id == Merchant.id)
        .where(
            and_(
                Merchant.market_id == market_id,
                func.date(Transaction.created_at) >= start_date,
                Transaction.status == 'SUCESSO'
            )
        )
        .group_by(func.date(Transaction.created_at))
        .order_by("date")
    )
    
    result = await db.execute(stmt)
    rows = result.all()
    
    # Fill gaps
    data_map = {row.date: row.revenue for row in rows}
    final_data = []
    
    for single_date in daterange(start_date, datetime.now().date()):
        final_data.append({
            "date": single_date.isoformat(),
            "revenue": data_map.get(single_date, 0.0)
        })
        
    return final_data
