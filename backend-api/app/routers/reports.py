from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, case
from typing import List, Optional
from datetime import date, datetime, timedelta

from app.database import get_db
from sqlalchemy import or_
from app.models import (
    Transaction as TransactionModel,
    Merchant as MerchantModel,
    Agent as AgentModel,
    POSDevice as POSDeviceModel,
    Market as MarketModel,
    User as UserModel
)
from app.routers.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])

def apply_jurisdiction_filter(query, user: UserModel, market_model=MarketModel, merchant_model=None):
    """
    Applies jurisdiction filters (province/district) based on user scope.
    Supports both Market-based and Merchant-based location filtering for Cidadão.
    """
    # Admin without specific scope sees all
    if user.role.value == "ADMIN" and not user.scope_province:
        return query
    
    if user.scope_province:
        if merchant_model:
            # Check both market and merchant location for Cidadão support
            query = query.where(
                or_(
                    market_model.province == user.scope_province,
                    merchant_model.province == user.scope_province
                )
            )
        else:
            query = query.where(market_model.province == user.scope_province)
    
    if user.scope_district:
        if merchant_model:
            query = query.where(
                or_(
                    market_model.district == user.scope_district,
                    merchant_model.district == user.scope_district
                )
            )
        else:
            query = query.where(market_model.district == user.scope_district)
        
    return query

@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    today = datetime.now().date()
    
    # Base joins for Transaction queries to enable filtering
    tx_base_query = (
        select(TransactionModel)
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
    )
    
    # Revenue Today
    revenue_query = apply_jurisdiction_filter(
        select(func.sum(TransactionModel.amount))
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(
            func.date(TransactionModel.created_at) == today,
            TransactionModel.status == 'SUCESSO'
        ),
        current_user,
        MarketModel,
        MerchantModel
    )
    revenue_today = await db.scalar(revenue_query) or 0.0

    # Tx Today
    tx_query = apply_jurisdiction_filter(
        select(func.count(TransactionModel.id))
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(func.date(TransactionModel.created_at) == today),
        current_user,
        MarketModel,
        MerchantModel
    )
    tx_today = await db.scalar(tx_query) or 0

    # Average Ticket
    avg_ticket = (revenue_today / tx_today) if tx_today > 0 else 0

    # Paying Merchants Today
    paying_merchants_query = apply_jurisdiction_filter(
        select(func.count(func.distinct(TransactionModel.merchant_id)))
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(
            func.date(TransactionModel.created_at) == today,
            TransactionModel.status == 'SUCESSO'
        ),
        current_user,
        MarketModel,
        MerchantModel
    )
    paying_merchants = await db.scalar(paying_merchants_query) or 0

    # Actives - AGENTS
    # Join with Market to filter
    active_agents_query = apply_jurisdiction_filter(
        select(func.count(AgentModel.id))
        .join(MarketModel, AgentModel.assigned_market_id == MarketModel.id, isouter=True) # Use outer to include agents without market BUT if fitler applied they will be excluded unless scope is None
        .where(AgentModel.status == 'ATIVO'),
        current_user
    )
    active_agents = await db.scalar(active_agents_query) or 0

    # Actives - POS
    # Count POS devices based on their own status, using their own province/district
    # for jurisdiction filtering (not agent assignment)
    active_pos_base = select(func.count(POSDeviceModel.id)).where(POSDeviceModel.status == 'ATIVO')
    
    # Apply jurisdiction filter based on POS device's own location
    if current_user.role.value != "ADMIN" or current_user.scope_province:
        if current_user.scope_province:
            active_pos_base = active_pos_base.where(POSDeviceModel.province == current_user.scope_province)
        if current_user.scope_district:
            active_pos_base = active_pos_base.where(POSDeviceModel.district == current_user.scope_district)
    
    active_pos = await db.scalar(active_pos_base) or 0

    # Actives - MERCHANTS (include Cidadão without market)
    active_merchants_query = apply_jurisdiction_filter(
        select(func.count(MerchantModel.id))
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(MerchantModel.status == 'ATIVO'),
        current_user,
        MarketModel,
        MerchantModel
    )
    active_merchants = await db.scalar(active_merchants_query) or 0

    return {
        "revenue_today": revenue_today,
        "tx_count_today": tx_today,
        "avg_ticket": avg_ticket,
        "paying_merchants_today": paying_merchants,
        "active_agents": active_agents,
        "active_pos": active_pos,
        "active_merchants": active_merchants
    }

@router.get("/markets")
async def get_market_reports(
    days: Optional[int] = 30, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns revenue and stats grouped by Market.
    Optional: Filter by last X days (default 30).
    """
    filters = [TransactionModel.status == 'SUCESSO']
    if days:
        start_date = datetime.now().date() - timedelta(days=days)
        filters.append(func.date(TransactionModel.created_at) >= start_date)

    stmt = (
        select(
            MarketModel.name,
            MarketModel.province,
            func.count(func.distinct(MerchantModel.id)).label("merchants_count"),
            func.count(TransactionModel.id).label("tx_count"),
            func.sum(TransactionModel.amount).label("total_revenue")
        )
        .join(MerchantModel, MerchantModel.market_id == MarketModel.id, isouter=True)
        .join(TransactionModel, and_(
            TransactionModel.merchant_id == MerchantModel.id,
            *filters
        ), isouter=True)
        .group_by(MarketModel.id, MarketModel.name, MarketModel.province)
        .order_by(desc("total_revenue"))
    )
    
    stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "market": row.name,
            "province": row.province,
            "merchants_count": row.merchants_count,
            "tx_count": row.tx_count,
            "total_revenue": row.total_revenue or 0
        }
        for row in rows
    ]

@router.get("/agents")
async def get_agent_reports(
    days: Optional[int] = 30, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns KPIs per Agent: Revenue, Tx Count, Active POS.
    Optional: Filter by last X days.
    """
    try:
        filters = [TransactionModel.status == 'SUCESSO']
        if days:
            start_date = datetime.now().date() - timedelta(days=days)
            filters.append(func.date(TransactionModel.created_at) >= start_date)

        stmt = (
            select(
                AgentModel.agent_code, 
                AgentModel.full_name,
                AgentModel.status,
                MarketModel.name.label("market_name"),
                AgentModel.assigned_region,
                func.count(func.distinct(POSDeviceModel.id)).label("pos_count"),
                func.count(TransactionModel.id).label("tx_count"),
                func.coalesce(func.sum(TransactionModel.amount), 0).label("total_revenue")
            )
            .join(MarketModel, AgentModel.assigned_market_id == MarketModel.id, isouter=True)
            .join(POSDeviceModel, and_(POSDeviceModel.assigned_agent_id == AgentModel.id, POSDeviceModel.status == 'ATIVO'), isouter=True)
            .join(TransactionModel, and_(
                TransactionModel.agent_id == AgentModel.id,
                *filters
            ), isouter=True)
            .group_by(AgentModel.id, AgentModel.agent_code, AgentModel.full_name, AgentModel.status, MarketModel.name, AgentModel.assigned_region)
            .order_by(desc("total_revenue"))
        )
        
        stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel)
        
        result = await db.execute(stmt)
        rows = result.all()
        
        return [
            {
                "agent_name": row.full_name,
                "market_name": row.market_name or "N/A",
                "region": row.assigned_region,
                "pos_count": row.pos_count or 0,
                "tx_count": row.tx_count or 0,
                "total_revenue": float(row.total_revenue or 0)
            }
            for row in rows
        ]
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Agent reports error: {e}")
        import traceback
        traceback.print_exc()
        return []

@router.get("/pos_devices")
async def get_pos_reports(
    days: Optional[int] = 30, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns KPIs per POS Device: Usage, Errors, Connectivity.
    Optional: Filter by last X days.
    """
    filters = []
    if days:
        start_date = datetime.now().date() - timedelta(days=days)
        filters.append(func.date(TransactionModel.created_at) >= start_date)

    stmt = (
        select(
            POSDeviceModel.serial_number,
            POSDeviceModel.model,
            POSDeviceModel.status,
            POSDeviceModel.last_seen,
            AgentModel.full_name.label("assigned_agent_name"),
            MarketModel.name.label("market_name"),
            func.count(TransactionModel.id).label("tx_count"),
            func.sum(case((TransactionModel.status != 'SUCESSO', 1), else_=0)).label("error_count")
        )
        .join(AgentModel, POSDeviceModel.assigned_agent_id == AgentModel.id, isouter=True)
        .join(MarketModel, AgentModel.assigned_market_id == MarketModel.id, isouter=True)
        .join(TransactionModel, and_(
            TransactionModel.pos_id == POSDeviceModel.id,
            *filters
        ), isouter=True)
        .group_by(POSDeviceModel.id, POSDeviceModel.serial_number, POSDeviceModel.model, POSDeviceModel.status, POSDeviceModel.last_seen, AgentModel.full_name, MarketModel.name)
        .order_by(desc("tx_count"))
    )
    
    stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {
            "serial_number": row.serial_number,
            "model": row.model,
            "status": row.status.value if hasattr(row.status, 'value') else row.status,
            "last_seen": row.last_seen,
            "assigned_agent": row.assigned_agent_name or "N/A",
            "market_name": row.market_name or "N/A",
            "tx_count": row.tx_count or 0,
            "error_count": row.error_count or 0
        }
        for row in rows
    ]

@router.get("/chart/revenue")
async def get_revenue_chart(
    days: int = 30, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns daily revenue for the last X days
    """
    start_date = datetime.now().date() - timedelta(days=days)
    
    # Helper to generate date range
    def daterange(start_date, end_date):
        for n in range(int((end_date - start_date).days) + 1):
            yield start_date + timedelta(n)

    stmt = (
        select(
            func.date(TransactionModel.created_at).label("date"),
            func.sum(TransactionModel.amount).label("revenue")
        )
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(
            func.date(TransactionModel.created_at) >= start_date,
            TransactionModel.status == 'SUCESSO'
        )
        .group_by(func.date(TransactionModel.created_at))
        .order_by("date")
    )
    
    stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel, MerchantModel)
    
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

@router.get("/chart/hourly")
async def get_hourly_chart(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns transaction count grouped by hour for today
    """
    today = datetime.now().date()
    
    try:
        # Use extract for better compatibility across databases
        from sqlalchemy import extract
        
        stmt = (
            select(
                extract('hour', TransactionModel.created_at).label("hour"),
                func.count(TransactionModel.id).label("count")
            )
            .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
            .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
            .where(
                func.date(TransactionModel.created_at) == today,
                TransactionModel.status == 'SUCESSO'
            )
            .group_by(extract('hour', TransactionModel.created_at))
            .order_by("hour")
        )
        
        stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel, MerchantModel)
        
        result = await db.execute(stmt)
        rows = result.all()
        
        # Fill missing hours
        data = {int(row.hour): row.count for row in rows}
        return [
            {"hour": f"{h:02d}:00", "count": data.get(h, 0)}
            for h in range(6, 22)  # Show from 06:00 to 22:00
        ]
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Hourly chart error: {e}")
        # Return empty chart on error
        return [
            {"hour": f"{h:02d}:00", "count": 0}
            for h in range(6, 22)
        ]

@router.get("/chart/methods")
async def get_payment_methods_chart(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns transaction distribution by payment method for today
    """
    today = datetime.now().date()
    
    stmt = (
        select(
            TransactionModel.payment_method,
            func.count(TransactionModel.id).label("count")
        )
        .join(MerchantModel, TransactionModel.merchant_id == MerchantModel.id)
        .outerjoin(MarketModel, MerchantModel.market_id == MarketModel.id)
        .where(func.date(TransactionModel.created_at) == today)
        .group_by(TransactionModel.payment_method)
    )
    
    stmt = apply_jurisdiction_filter(stmt, current_user, MarketModel, MerchantModel)
    
    result = await db.execute(stmt)
    rows = result.all()
    
    return [
        {"name": row.payment_method, "value": row.count}
        for row in rows
    ]

@router.get("/alerts")
async def get_dashboard_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Returns improved alerts:
    - POS offline > X hours
    - Suspicious Agent behavior (mock)
    """
    alerts = []
    
    # Example 1: POS Offline > 24h
    yesterday = datetime.now() - timedelta(days=1)
    
    # POS Offline check
    offline_pos_stmt = (
        select(POSDeviceModel)
        .join(AgentModel, POSDeviceModel.assigned_agent_id == AgentModel.id, isouter=True)
        .join(MarketModel, AgentModel.assigned_market_id == MarketModel.id, isouter=True)
        .where(
            POSDeviceModel.status == 'ATIVO',
            POSDeviceModel.last_seen < yesterday
        )
        .limit(5)
    )
    
    offline_pos_stmt = apply_jurisdiction_filter(offline_pos_stmt, current_user, MarketModel)
    
    offline_pos = (await db.execute(offline_pos_stmt)).scalars().all()
    for pos in offline_pos:
        alerts.append({
            "type": "warning",
            "message": f"POS {pos.serial_number} offline há mais de 24h",
            "entity": "POS"
        })
        
    return alerts
