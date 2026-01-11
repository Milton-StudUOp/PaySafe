from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, func, or_
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta

from app.database import get_db
from app.models import Transaction as TransactionModel, Balance as BalanceModel, Merchant, Agent, POSDevice
from app.schemas import Transaction, TransactionCreate, TransactionUpdate
from sqlalchemy.orm import selectinload

from app.routers.auth import get_current_user
from app.models.user import User as UserSchema
from app.models import Market as MarketModel
from app.models.tax_config import TaxConfiguration

router = APIRouter(prefix="/transactions", tags=["Transactions"])



@router.get("/", response_model=List[Transaction])
async def list_transactions(
    skip: int = 0, 
    limit: int = 100,
    search: Optional[str] = None,
    status: Optional[str] = None,
    payment_method: Optional[str] = None,
    merchant_id: Optional[int] = None,
    agent_id: Optional[int] = None,
    pos_id: Optional[int] = None,
    market_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    province: Optional[str] = None,
    district: Optional[str] = None,
    tax_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user) # Using UserSchema or plain dict? get_current_user returns User model.
):
    from app.routers.auth import get_current_user # Need import if not global, but better global
    # Re-importing inside might be needed if I don't add top-level import. 
    # Let's add top level import in a separate tool call to be clean? 
    # Or just assume I'll add it.
    
    query = select(TransactionModel).options(
        selectinload(TransactionModel.merchant).selectinload(Merchant.market),
        selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
        selectinload(TransactionModel.funcionario),
        selectinload(TransactionModel.pos_device)
    ).join(Merchant, TransactionModel.merchant_id == Merchant.id).outerjoin(MarketModel, Merchant.market_id == MarketModel.id)
    
    # 1. Explicit Filters (check both market and merchant location for Cidadão)
    if province:
        query = query.where(or_(MarketModel.province == province, Merchant.province == province))
    if district:
        query = query.where(or_(MarketModel.district.ilike(f"%{district}%"), Merchant.district.ilike(f"%{district}%")))

    # RBAC Location Scoping
    # Check user role by role.value instead of duck typing
    user_role = getattr(getattr(current_user, 'role', None), 'value', None)
    
    # ADMIN / AUDITOR: Full access to all transactions
    if user_role in ["ADMIN", "AUDITOR"]:
        pass  # No filters applied - see everything
    
    elif user_role == "MERCHANT":
        # Merchant only sees their own transactions - CRITICAL SECURITY FILTER
        query = query.where(TransactionModel.merchant_id == current_user.id)
    
    elif user_role == "AGENTE":
        # Agent only sees transactions they processed
        query = query.where(TransactionModel.agent_id == current_user.id)
        
    elif user_role == "SUPERVISOR":
        if hasattr(current_user, 'scope_district') and current_user.scope_district:
            query = query.where(
                or_(
                    MarketModel.district == current_user.scope_district,
                    Merchant.district == current_user.scope_district
                )
            )
                
    elif user_role == "FUNCIONARIO":
        if hasattr(current_user, 'scope_province') and current_user.scope_province:
            query = query.where(
                or_(
                    MarketModel.province == current_user.scope_province,
                    Merchant.province == current_user.scope_province
                )
            )


    filters = []
    
    if status and status != "ALL":
        filters.append(TransactionModel.status == status)
        
    if payment_method and payment_method != "ALL":
        filters.append(TransactionModel.payment_method == payment_method)
        
    if merchant_id:
        filters.append(TransactionModel.merchant_id == merchant_id)
        
    if agent_id:
        filters.append(TransactionModel.agent_id == agent_id)
        
    if pos_id:
        filters.append(TransactionModel.pos_id == pos_id)
        
    if market_id:
        filters.append(Merchant.market_id == market_id)
        
    if start_date:
        filters.append(func.date(TransactionModel.created_at) >= start_date)
        
    if end_date:
        filters.append(func.date(TransactionModel.created_at) <= end_date)
    
    if tax_code:
        filters.append(TransactionModel.tax_code == tax_code)
        
    if search:
        filters.append(or_(
            TransactionModel.transaction_uuid.ilike(f"%{search}%"),
            TransactionModel.payment_reference.ilike(f"%{search}%"),
            TransactionModel.nfc_uid.ilike(f"%{search}%")
        ))

    if filters:
        query = query.where(and_(*filters))
        
    query = query.order_by(desc(TransactionModel.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    # Enrich merchant data with market information
    for tx in transactions:
        if tx.merchant and tx.merchant.market:
            tx.merchant.market_name = tx.merchant.market.name
            tx.merchant.market_province = tx.merchant.market.province
            tx.merchant.market_district = tx.merchant.market.district
    
    # Collect unique tax_codes to fetch names in batch
    tax_codes = set(tx.tax_code for tx in transactions if tx.tax_code)
    if tax_codes:
        tax_result = await db.execute(
            select(TaxConfiguration.code, TaxConfiguration.name)
            .where(TaxConfiguration.code.in_(tax_codes))
        )
        tax_map = {row.code: row.name for row in tax_result.all()}
        for tx in transactions:
            if tx.tax_code and tx.tax_code in tax_map:
                setattr(tx, 'tax_name', tax_map[tx.tax_code])
    
    return transactions

@router.get("/stats")
async def get_transaction_stats(
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """
    Returns KPIs for the Dashboard/Transactions page, scoped to the current user's jurisdiction.
    Applies same RBAC and location scoping as transaction listing.
    """
    today = datetime.now().date()
    month_start = today.replace(day=1)
    
    # Get user role
    user_role = getattr(getattr(current_user, 'role', None), 'value', None)
    
    # Build base query with joins for jurisdiction filtering
    # We need to join Market for SUPERVISOR (district) and FUNCIONARIO (province) filtering
    base_query = select(TransactionModel).join(
        Merchant, TransactionModel.merchant_id == Merchant.id
    ).join(MarketModel, Merchant.market_id == MarketModel.id)
    
    # Apply RBAC and jurisdiction filters
    jurisdiction_filters = []
    
    if user_role in ["ADMIN", "AUDITOR"]:
        pass  # No filters - see everything
    
    elif user_role == "MERCHANT":
        jurisdiction_filters.append(TransactionModel.merchant_id == current_user.id)
    
    elif user_role == "AGENTE":
        jurisdiction_filters.append(TransactionModel.agent_id == current_user.id)
    
    elif user_role == "SUPERVISOR":
        if hasattr(current_user, 'scope_district') and current_user.scope_district:
            jurisdiction_filters.append(MarketModel.district == current_user.scope_district)
    
    elif user_role == "FUNCIONARIO":
        if hasattr(current_user, 'scope_province') and current_user.scope_province:
            jurisdiction_filters.append(MarketModel.province == current_user.scope_province)
    
    # Helper functions for aggregations
    async def get_sum(extra_filters):
        final_filters = jurisdiction_filters + extra_filters
        q = select(func.sum(TransactionModel.amount)).select_from(TransactionModel).join(
            Merchant, TransactionModel.merchant_id == Merchant.id
        ).join(MarketModel, Merchant.market_id == MarketModel.id)
        if final_filters:
            q = q.where(and_(*final_filters))
        return (await db.scalar(q)) or 0.0

    async def get_count(extra_filters):
        final_filters = jurisdiction_filters + extra_filters
        q = select(func.count(TransactionModel.id)).select_from(TransactionModel).join(
            Merchant, TransactionModel.merchant_id == Merchant.id
        ).join(MarketModel, Merchant.market_id == MarketModel.id)
        if final_filters:
            q = q.where(and_(*final_filters))
        return (await db.scalar(q)) or 0
    
    # 1. Total Collected Today
    total_today = await get_sum([
        func.date(TransactionModel.created_at) == today,
        TransactionModel.status == 'SUCESSO'
    ])
    
    # 2. Total Collected Month
    total_month = await get_sum([
        func.date(TransactionModel.created_at) >= month_start,
        TransactionModel.status == 'SUCESSO'
    ])
    
    # 3. Tx Count Today
    count_today = await get_count([
        func.date(TransactionModel.created_at) == today
    ])
    
    # 4. Ticket Average (Month)
    count_month_success = await get_count([
         func.date(TransactionModel.created_at) >= month_start,
         TransactionModel.status == 'SUCESSO'
    ])
    ticket_avg = total_month / count_month_success if count_month_success > 0 else 0.0
    
    return {
        "total_collected_today": total_today,
        "total_collected_month": total_month,
        "transactions_count_today": count_today,
        "ticket_average_month": ticket_avg
    }



import csv
import io
from fastapi.responses import StreamingResponse

@router.get("/export", response_class=StreamingResponse)
async def export_transactions(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    tx_status: Optional[str] = Query(None, alias="status"),
    payment_method: Optional[str] = None,
    province: Optional[str] = None,
    district: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Export transactions to CSV with date period filter"""
    
    # RBAC: Only ADMIN, AUDITOR, SUPERVISOR can export
    user_role = getattr(getattr(current_user, 'role', None), 'value', None)
    allowed_roles = ["ADMIN", "AUDITOR", "SUPERVISOR", "FUNCIONARIO"]
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Access denied. Only authorized users can export transactions."
        )
    
    # Build query
    query = select(TransactionModel).options(
        selectinload(TransactionModel.merchant).selectinload(Merchant.market),
        selectinload(TransactionModel.agent),
        selectinload(TransactionModel.funcionario),
        selectinload(TransactionModel.pos_device)
    ).join(Merchant, TransactionModel.merchant_id == Merchant.id).join(MarketModel, Merchant.market_id == MarketModel.id)
    
    # Apply location scoping based on role
    if user_role == "SUPERVISOR":
        if hasattr(current_user, 'scope_district') and current_user.scope_district:
            query = query.where(MarketModel.district == current_user.scope_district)
    elif user_role == "FUNCIONARIO":
        if hasattr(current_user, 'scope_province') and current_user.scope_province:
            query = query.where(MarketModel.province == current_user.scope_province)
    
    # Apply filters
    filters = []
    if start_date:
        filters.append(func.date(TransactionModel.created_at) >= start_date)
    if end_date:
        filters.append(func.date(TransactionModel.created_at) <= end_date)
    if tx_status and tx_status != "ALL":
        filters.append(TransactionModel.status == tx_status)
    if payment_method and payment_method != "ALL":
        filters.append(TransactionModel.payment_method == payment_method)
    if province and province != "ALL":
        filters.append(MarketModel.province == province)
    if district:
        filters.append(MarketModel.district.ilike(f"%{district}%"))
    
    if filters:
        query = query.where(and_(*filters))
    
    query = query.order_by(desc(TransactionModel.created_at)).limit(50000)  # Safety limit
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    # Generate CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "UUID", "Data/Hora", "Valor (MZN)", "Status", "Método Pagamento",
        "Comerciante", "Doc. ID", "Mercado", "Província", "Distrito",
        "Agente/Funcionário", "POS", "Referência"
    ])
    
    for tx in transactions:
        merchant_name = tx.merchant.full_name if tx.merchant else ""
        merchant_doc_id = tx.merchant.id_document_number if tx.merchant else ""
        market_name = tx.merchant.market.name if tx.merchant and tx.merchant.market else ""
        market_province = tx.merchant.market.province if tx.merchant and tx.merchant.market else ""
        market_district = tx.merchant.market.district if tx.merchant and tx.merchant.market else ""
        agent_name = tx.agent.agent_code if tx.agent else (tx.funcionario.full_name if tx.funcionario else "")
        pos_serial = tx.pos_device.serial_number if tx.pos_device else ""
        
        writer.writerow([
            tx.transaction_uuid,
            tx.created_at.isoformat() if tx.created_at else "",
            f"{tx.amount:.2f}",
            tx.status.value if hasattr(tx.status, 'value') else tx.status,
            tx.payment_method.value if hasattr(tx.payment_method, 'value') else tx.payment_method,
            merchant_name,
            merchant_doc_id,
            market_name,
            market_province,
            market_district,
            agent_name,
            pos_serial,
            tx.payment_reference or ""
        ])
    
    output.seek(0)
    
    # Filename with date range
    date_suffix = ""
    if start_date and end_date:
        date_suffix = f"_{start_date.isoformat()}_to_{end_date.isoformat()}"
    elif start_date:
        date_suffix = f"_from_{start_date.isoformat()}"
    elif end_date:
        date_suffix = f"_until_{end_date.isoformat()}"
    
    filename = f"transacoes{date_suffix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    response = StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

@router.post("/", response_model=Transaction, status_code=status.HTTP_201_CREATED)
async def create_transaction(transaction: TransactionCreate, db: AsyncSession = Depends(get_db)):
    data = transaction.model_dump()
    
    # Use client-provided UUID if available (for offline sync), otherwise generate new one
    if transaction.client_transaction_uuid:
        data["transaction_uuid"] = transaction.client_transaction_uuid
    else:
        data["transaction_uuid"] = str(uuid.uuid4())
    
    # Parse offline_created_at from ISO string to datetime if present
    if data.get('offline_created_at') and isinstance(data['offline_created_at'], str):
        try:
            data['offline_created_at'] = datetime.fromisoformat(data['offline_created_at'].replace('Z', '+00:00'))
        except ValueError:
            data['offline_created_at'] = None
    
    # Remove fields not in TransactionModel
    data.pop('nfc_uid', None)
    data.pop('client_transaction_uuid', None)  # Remove before creating model
    
    db_tx = TransactionModel(**data)
    db.add(db_tx)
    
    # Update merchant balance if transaction is successful
    if transaction.status.value == "SUCESSO":
        result = await db.execute(
            select(BalanceModel).where(BalanceModel.merchant_id == transaction.merchant_id)
        )
        balance = result.scalar_one_or_none()
        
        if balance:
            balance.current_balance += transaction.amount
            balance.last_transaction_at = datetime.now() 
             # Note: db_tx.created_at might be None until commit/refresh if it's server_default. 
             # Using datetime.now() is safer here or flush first.
        else:
            new_balance = BalanceModel(
                merchant_id=transaction.merchant_id,
                current_balance=transaction.amount,
                last_transaction_at=datetime.now()
            )
            db.add(new_balance)
    
    await db.commit()
    
    # Reload with relationships to avoid lazy loading in async context
    result = await db.execute(
        select(TransactionModel)
        .where(TransactionModel.id == db_tx.id)
        .options(
            selectinload(TransactionModel.merchant),
            selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
            selectinload(TransactionModel.funcionario),
            selectinload(TransactionModel.pos_device)
        )
    )
    return result.scalar_one()

@router.get("/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: int, db: AsyncSession = Depends(get_db)):
    query = select(TransactionModel).where(TransactionModel.id == transaction_id).options(
        selectinload(TransactionModel.merchant),
        selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
        selectinload(TransactionModel.funcionario),
        selectinload(TransactionModel.pos_device)
    )
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return tx

@router.get("/uuid/{transaction_uuid}", response_model=Transaction)
async def get_transaction_by_uuid(
    transaction_uuid: str, 
    db: AsyncSession = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get a transaction by its UUID. Accessible to all authenticated users."""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Looking up transaction UUID: {transaction_uuid}")
    
    query = select(TransactionModel).where(TransactionModel.transaction_uuid == transaction_uuid).options(
        selectinload(TransactionModel.merchant).selectinload(Merchant.market),
        selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),  # Eagerly load nested relation
        selectinload(TransactionModel.funcionario),
        selectinload(TransactionModel.pos_device)
    )
    result = await db.execute(query)
    tx = result.scalar_one_or_none()
    
    if not tx:
        logger.warning(f"Transaction not found for UUID: {transaction_uuid}")
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Enrich merchant data with market information
    if tx.merchant and tx.merchant.market:
        tx.merchant.market_name = tx.merchant.market.name
        tx.merchant.market_province = tx.merchant.market.province
        tx.merchant.market_district = tx.merchant.market.district
    
    # Enrich with tax_name from TaxConfiguration
    if tx.tax_code:
        tax_result = await db.execute(
            select(TaxConfiguration.name).where(TaxConfiguration.code == tx.tax_code)
        )
        tax_name = tax_result.scalar_one_or_none()
        if tax_name:
            setattr(tx, 'tax_name', tax_name)
    
    logger.info(f"Found transaction ID {tx.id} for UUID: {transaction_uuid}")
    return tx

@router.get("/merchant/{merchant_id}", response_model=List[Transaction])
async def get_merchant_transactions(merchant_id: int, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TransactionModel)
        .where(TransactionModel.merchant_id == merchant_id)
        .order_by(TransactionModel.created_at.desc())
        .offset(skip).limit(limit)
        .options(
            selectinload(TransactionModel.merchant),
            selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
            selectinload(TransactionModel.pos_device),
            selectinload(TransactionModel.funcionario)
        )
    )
    return result.scalars().all()

@router.get("/agent/{agent_id}", response_model=List[Transaction])
async def get_agent_transactions(agent_id: int, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TransactionModel)
        .where(TransactionModel.agent_id == agent_id)
        .order_by(TransactionModel.created_at.desc())
        .offset(skip).limit(limit)
        .options(
             selectinload(TransactionModel.merchant),
             selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
             selectinload(TransactionModel.pos_device),
             selectinload(TransactionModel.funcionario)
        )
    )

    return result.scalars().all()

@router.put("/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: int, tx_update: TransactionUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TransactionModel).where(TransactionModel.id == transaction_id))
    tx = result.scalar_one_or_none()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    for key, value in tx_update.model_dump(exclude_unset=True).items():
        setattr(tx, key, value)
    
    await db.commit()
    
    # Reload with relationships to avoid lazy loading in async context
    result = await db.execute(
        select(TransactionModel)
        .where(TransactionModel.id == transaction_id)
        .options(
            selectinload(TransactionModel.merchant),
            selectinload(TransactionModel.agent).selectinload(Agent.pos_devices),
            selectinload(TransactionModel.funcionario),
            selectinload(TransactionModel.pos_device)
        )
    )
    return result.scalar_one()

