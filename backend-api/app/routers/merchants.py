from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from pydantic import BaseModel

from app.database import get_db
from app.models import Merchant as MerchantModel
from app.schemas import Merchant, MerchantCreate, MerchantUpdate
from app.schemas.jurisdiction_change_request import ApprovalStatus
from app.services.auth_service import get_password_hash

router = APIRouter(prefix="/merchants", tags=["Merchants"])

from app.models import Market as MarketModel
from app.routers.auth import get_current_user
from app.models.user import User as UserModel

@router.get("/", response_model=List[Merchant])
async def list_merchants(
    skip: int = 0, 
    limit: int = 100, 
    province: Optional[str] = None,
    district: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    query = select(MerchantModel).join(MarketModel, MerchantModel.market_id == MarketModel.id)
    
    # 0. Search Filter (Global)
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                MerchantModel.full_name.ilike(search_term),
                MerchantModel.nfc_uid.ilike(search_term),
                MerchantModel.phone_number.ilike(search_term),
                MerchantModel.id_document_number.ilike(search_term)
            )
        )
    
    # 1. Admin/Client Side Filters
    if province:
        query = query.where(MarketModel.province == province)
    if district:
        query = query.where(MarketModel.district.ilike(f"%{district}%"))

    # 2. RBAC Location Scoping (Enforced)
    # AGENTE: Most restricted - only their assigned market
    if current_user.role.value == "AGENTE":
        if hasattr(current_user, 'scope_market_id') and current_user.scope_market_id:
            query = query.where(MerchantModel.market_id == current_user.scope_market_id)
        else:
            # SAFETY: Agent without market = no access
            query = query.where(MerchantModel.id == -1)
    
    elif current_user.role.value == "SUPERVISOR":
        if current_user.scope_district:
            query = query.where(MarketModel.district == current_user.scope_district)
        else:
            # SAFETY: If supervisor has no district, they see NOTHING.
            query = query.where(MerchantModel.id == -1) 

    elif current_user.role.value == "FUNCIONARIO":
        # FUNCIONARIO must have province scope
        if current_user.scope_province:
            query = query.where(MarketModel.province == current_user.scope_province)
            # Additionally, if district is set, filter by district too (exact VLOOKUP match)
            if current_user.scope_district:
                query = query.where(MarketModel.district == current_user.scope_district)
        else:
            # SAFETY: If employee has no province, they see NOTHING.
            query = query.where(MerchantModel.id == -1)
            
    elif current_user.role.value in ["ADMIN", "AUDITOR"]:
        pass # Explicitly allow
        
    else:
        # DEFAULT DENY FOR ANY OTHER ROLE
        query = query.where(MerchantModel.id == -1)

    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

@router.post("/", response_model=Merchant, status_code=status.HTTP_201_CREATED)
async def create_merchant(
    merchant: MerchantCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    try:
        data = merchant.model_dump(exclude={"password", "requester_notes"})
        
        # Backend Sanitization
        optional_fields = ["nfc_uid", "phone_number", "id_document_number", "mpesa_number", "emola_number", "mkesh_number"]
        for field in optional_fields:
            if field in data and data[field] == "":
                data[field] = None

        # Check Duplicates
        if data.get("phone_number"):
            existing_phone = await db.execute(select(MerchantModel).where(MerchantModel.phone_number == data["phone_number"]))
            if existing_phone.scalar_one_or_none():
                 raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um comerciante com este número de telefone.")

        if data.get("nfc_uid"):
            existing_nfc = await db.execute(select(MerchantModel).where(MerchantModel.nfc_uid == data["nfc_uid"]))
            if existing_nfc.scalar_one_or_none():
                 raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Já existe um comerciante com este NFC UID.")

        if merchant.password:
            data["password_hash"] = get_password_hash(merchant.password)
            
        # Jurisdiction Logic
        from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
        from app.models.jurisdiction_change_request import RequestType
        from app.models import Market as MarketModel
        
        market_res = await db.execute(select(MarketModel).where(MarketModel.id == merchant.market_id))
        target_market = market_res.scalar_one_or_none()
        if not target_market:
             raise HTTPException(status_code=404, detail="Market not found")
        
        is_admin = current_user.role.value == "ADMIN"
        
        requested_province = target_market.province
        user_province = current_user.scope_province
        
        out_of_jurisdiction = False
        if not is_admin and requested_province and user_province:
            if requested_province != user_province:
                out_of_jurisdiction = True
        
        if out_of_jurisdiction:
            data["approval_status"] = ApprovalStatus.PENDENTE
            
            db_merchant = MerchantModel(**data)
            db.add(db_merchant)
            await db.commit()
            await db.refresh(db_merchant)
            
            # Create JCR
            jcr = JurisdictionChangeRequest(
                entity_type=EntityType.MERCHANT,
                entity_id=db_merchant.id,
                current_province=user_province,
                current_district=current_user.scope_district,
                requested_province=requested_province,
                requested_district=target_market.district,
                requested_by_user_id=current_user.id,
                request_type=RequestType.CREATE,
                requester_notes=merchant.requester_notes
            )
            db.add(jcr)
            
            # Audit using Service
            from app.services.audit_service import AuditService
            from app.models.audit_log import Severity
            
            await AuditService.log_audit(
                db, current_user, "REQUEST_JURISDICTION_CHANGE", "MERCHANT",
                f"Requested Merchant creation in {requested_province} (user jurisdiction: {user_province})",
                entity_id=db_merchant.id,
                severity=Severity.MEDIUM,
                after_data=data
            )
            
            await db.commit()
            return db_merchant
        
        db_merchant = MerchantModel(**data)
        db.add(db_merchant)
        await db.commit()
        await db.refresh(db_merchant)
        
        # Audit Creation
        from app.services.audit_service import AuditService
        await AuditService.log_audit(
            db, current_user, "CREATE_MERCHANT", "MERCHANT",
            f"Comerciante criado: {db_merchant.full_name} ({db_merchant.nfc_uid})",
            entity_id=db_merchant.id,
            after_data=data
        )
        await db.commit()
        
        return db_merchant
        
    except Exception as e:
        await db.rollback()
        if "IntegrityError" in str(type(e)) or "Duplicate entry" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Conflict Error: {str(e)}"
            )
        raise e

# Quick registration for ambulantes (no NFC, minimal data)
class AmbulanteCreate(BaseModel):
    full_name: str
    market_id: int
    phone_number: Optional[str] = None
    mpesa_number: Optional[str] = None

@router.post("/ambulante", response_model=Merchant, status_code=status.HTTP_201_CREATED)
async def create_ambulante(
    ambulante: AmbulanteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    """
    Quick registration for ambulante (street vendor) merchants.
    Requires only name and market_id. No NFC, no KYC documents.
    Auto-approved and set to ATIVO status.
    """
    # Validate market exists and is in agent's jurisdiction
    market_res = await db.execute(select(MarketModel).where(MarketModel.id == ambulante.market_id))
    target_market = market_res.scalar_one_or_none()
    if not target_market:
        raise HTTPException(status_code=404, detail="Market not found")
    
    # Jurisdiction check for AGENTE
    if current_user.role.value == "AGENTE":
        if hasattr(current_user, 'scope_market_id') and current_user.scope_market_id:
            if ambulante.market_id != current_user.scope_market_id:
                raise HTTPException(status_code=403, detail="Market outside your jurisdiction")
        else:
            raise HTTPException(status_code=403, detail="No market assigned to your account")
    elif current_user.role.value == "FUNCIONARIO":
        if current_user.scope_province and target_market.province != current_user.scope_province:
            raise HTTPException(status_code=403, detail="Market outside your jurisdiction")
    
    # Create ambulante merchant with minimal data
    db_merchant = MerchantModel(
        merchant_type="AMBULANTE",
        full_name=ambulante.full_name,
        business_type="AMBULANTE",
        market_id=ambulante.market_id,
        phone_number=ambulante.phone_number,
        mpesa_number=ambulante.mpesa_number or ambulante.phone_number,
        nfc_uid=None,  # Ambulantes don't have NFC cards
        status="ATIVO",
        approval_status=ApprovalStatus.APROVADO
    )
    
    try:
        db.add(db_merchant)
        await db.commit()
        await db.refresh(db_merchant)
        
        # Audit
        from app.services.audit_service import AuditService
        await AuditService.log_audit(
            db, current_user, "CREATE_AMBULANTE", "MERCHANT",
            f"Ambulante quick-registered: {db_merchant.full_name} in market {target_market.name}",
            entity_id=db_merchant.id
        )
        await db.commit()
        
        return db_merchant
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating ambulante: {str(e)}")


@router.get("/{merchant_id}", response_model=Merchant)
async def get_merchant(
    merchant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_merchant_jurisdiction
    
    # IDOR Protection: Validate jurisdiction
    merchant = await check_merchant_jurisdiction(merchant_id, current_user, db)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Map balance fields manually because Pydantic expects flat structure but ORM has nested
    current_balance = 0.0
    last_tx = None
    
    if merchant.balance:
        if isinstance(merchant.balance, list) and len(merchant.balance) > 0:
            bal = merchant.balance[0]
            current_balance = bal.current_balance
            last_tx = bal.last_transaction_at
        elif not isinstance(merchant.balance, list):
            current_balance = merchant.balance.current_balance
            last_tx = merchant.balance.last_transaction_at
            
    setattr(merchant, "current_balance", current_balance)
    setattr(merchant, "last_transaction_at", last_tx)
    
    # Enrich with market_name, province, district
    if merchant.market_id:
        from app.models import Market as MarketModel
        market_result = await db.execute(select(MarketModel).where(MarketModel.id == merchant.market_id))
        market = market_result.scalar_one_or_none()
        if market:
            setattr(merchant, "market_name", market.name)
            setattr(merchant, "market_province", market.province)
            setattr(merchant, "market_district", market.district)
    
    return merchant

@router.get("/nfc/{nfc_uid}", response_model=Merchant)
async def get_merchant_by_nfc(
    nfc_uid: str, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    result = await db.execute(select(MerchantModel).where(MerchantModel.nfc_uid == nfc_uid))
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant with this NFC not found")
        
    # IDOR / Jurisdiction Check for NFC
    from app.services.jurisdiction_service import check_merchant_jurisdiction
    
    # We reuse similar logic but since we already have the merchant object, 
    # we can just validate it. check_merchant_jurisdiction fetches it by ID,
    # but let's reuse it for consistency or just implement the check here.
    # To be safe and consistent, let's call the service with the ID we found.
    
    valid_merchant = await check_merchant_jurisdiction(merchant.id, current_user, db, log_attempt=False)
    if not valid_merchant:
         # Hide existence if out of jurisdiction? Or 403? 
         # 404 is safer to prevent probing.
         raise HTTPException(status_code=404, detail="Merchant with this NFC not found")
         
    return valid_merchant

@router.put("/{merchant_id}", response_model=Merchant)
async def update_merchant(
    merchant_id: int,
    merchant_update: MerchantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_merchant_jurisdiction
    from app.models import JurisdictionChangeRequest, ApprovalStatus, EntityType, AuditLog, ActorType
    from app.models import Market as MarketModel
    
    # IDOR Protection: Validate jurisdiction before allowing update
    merchant = await check_merchant_jurisdiction(merchant_id, current_user, db, log_attempt=False)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # RULE 1: Block all updates if entity has pending approval
    if merchant.approval_status == "PENDENTE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este registro possui uma solicitação de alteração pendente de aprovação. Nenhuma alteração pode ser feita até que o administrador aprove ou rejeite o pedido atual."
        )
    
    # Check if Market Changed
    new_market_id = merchant_update.market_id
    
    jurisdiction_change = False
    requested_province = None
    requested_district = None
    
    # Get Current Market
    curr_market_res = await db.execute(select(MarketModel).where(MarketModel.id == merchant.market_id))
    curr_market = curr_market_res.scalar_one_or_none()
    current_province = curr_market.province if curr_market else "Unknown"
    
    if new_market_id and new_market_id != merchant.market_id:
        target_market_res = await db.execute(select(MarketModel).where(MarketModel.id == new_market_id))
        target_market = target_market_res.scalar_one_or_none()
        if not target_market:
            raise HTTPException(status_code=404, detail="Target Market not found")
            
        requested_province = target_market.province
        requested_district = target_market.district
        
        is_admin = current_user.role.value == "ADMIN"
        user_province = current_user.scope_province
        
        if not is_admin and requested_province and user_province:
            if requested_province != user_province:
                jurisdiction_change = True

    update_data = merchant_update.model_dump(exclude_unset=True, exclude={"password", "requester_notes"})
    if merchant_update.password:
        update_data["password_hash"] = get_password_hash(merchant_update.password)
        
    # Capture Old Data
    old_data = {
        "full_name": merchant.full_name,
        "nfc_uid": merchant.nfc_uid,
        "market_id": merchant.market_id,
        "status": merchant.status.value if hasattr(merchant.status, 'value') else merchant.status
    }

    if jurisdiction_change:
        # Don't apply market_id change - apply to entity but mark as pending
        pending_market_id = update_data.pop("market_id", None)
        
        # Apply others
        for key, value in update_data.items():
            setattr(merchant, key, value)
            
        merchant.approval_status = ApprovalStatus.PENDENTE
        
        # Apply the market_id change (entity is in new market but pending)
        if pending_market_id:
            merchant.market_id = pending_market_id
        
        jcr = JurisdictionChangeRequest(
            entity_type=EntityType.MERCHANT,
            entity_id=merchant.id,
            current_province=current_province,
            current_district=curr_market.district if curr_market else None,
            requested_province=requested_province,
            requested_district=requested_district,
            requested_by_user_id=current_user.id,
            requester_notes=merchant_update.requester_notes
        )
        db.add(jcr)
        
        # Audit using Service
        from app.services.audit_service import AuditService
        from app.models.audit_log import Severity
        
        await AuditService.log_audit(
            db, current_user, "REQUEST_JURISDICTION_CHANGE", "MERCHANT",
            f"Requested market change to {requested_province} (user jurisdiction: {user_province})",
            entity_id=merchant.id,
            severity=Severity.MEDIUM,
            before_data=old_data,
            after_data=update_data
        )
        
        await db.commit()
        await db.refresh(merchant)
        return merchant

    for key, value in update_data.items():
        setattr(merchant, key, value)
    
    # Audit Update
    from app.services.audit_service import AuditService
    await AuditService.log_audit(
        db, current_user, "UPDATE_MERCHANT", "MERCHANT",
        f"Updated merchant details",
        entity_id=merchant.id,
        before_data=old_data,
        after_data=update_data
    )

    await db.commit()
    await db.refresh(merchant)
    return merchant

@router.delete("/{merchant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_merchant(
    merchant_id: int, 
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user)
):
    from app.services.jurisdiction_service import check_merchant_jurisdiction
    
    # IDOR Protection: Validate jurisdiction before allowing delete
    merchant = await check_merchant_jurisdiction(merchant_id, current_user, db)
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Only ADMIN can delete
    if current_user.role.value != "ADMIN":
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Audit Delete
    from app.services.audit_service import AuditService
    from app.models.audit_log import Severity
    
    await AuditService.log_audit(
        db, current_user, "DELETE_MERCHANT", "MERCHANT",
        f"Deleted merchant: {merchant.name} ({merchant.nfc_uid})",
        entity_id=merchant.id,
        severity=Severity.HIGH,
        before_data={"name": merchant.name, "nfc_uid": merchant.nfc_uid, "id": merchant.id}
    )

    await db.delete(merchant)
    await db.commit()
