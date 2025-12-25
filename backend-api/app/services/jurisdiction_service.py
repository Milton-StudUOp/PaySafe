"""
Jurisdiction Service - Centralized access control for entity-level authorization.

This service implements IDOR (Insecure Direct Object Reference) protection by
validating that users can only access entities within their geographic jurisdiction.

Rules:
- ADMIN: Full access to all entities
- AUDITOR: Read-only access to all entities (GET only)
- Provincial/District Managers: Access only to entities in their scope
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, Literal

from app.models import (
    Agent as AgentModel,
    Merchant as MerchantModel,
    POSDevice as POSDeviceModel,
    Market as MarketModel,
    AuditLog,
    ActorType
)
from app.models.user import User as UserModel


EntityType = Literal["AGENT", "MERCHANT", "POS", "MARKET"]


def _is_admin(user: UserModel) -> bool:
    """Check if user has ADMIN role."""
    if not hasattr(user, 'role'):
        return False
    return user.role.value == "ADMIN"


def _is_auditor(user: UserModel) -> bool:
    """Check if user has AUDITOR role."""
    if not hasattr(user, 'role'):
        return False
    return user.role.value == "AUDITOR"


def _check_jurisdiction_match(
    entity_province: Optional[str],
    entity_district: Optional[str],
    user: UserModel
) -> bool:
    """
    Check if entity's jurisdiction matches user's scope.
    
    Rules:
    - If user has no scope_province set, deny access (safety)
    - Province must match
    - If user has scope_district set, district must also match
    """
    user_province = user.scope_province
    user_district = user.scope_district
    
    # User without province scope cannot access anything
    if not user_province:
        return False
    
    # Province must match
    if entity_province != user_province:
        return False
    
    # If user has district scope, district must match too
    if user_district:
        if entity_district != user_district:
            return False
    
    return True


async def log_unauthorized_access(
    user: UserModel,
    entity_type: str,
    entity_id: int,
    db: AsyncSession
) -> None:
    """Log unauthorized access attempt for security auditing."""
    audit = AuditLog(
        actor_type=ActorType.ADMIN,
        actor_id=user.id,
        action="UNAUTHORIZED_ENTITY_ACCESS_ATTEMPT",
        entity=entity_type,
        entity_id=entity_id,
        description=f"User {user.id} ({user.email}) attempted to access {entity_type} {entity_id} outside jurisdiction ({user.scope_province}/{user.scope_district})"
    )
    db.add(audit)
    await db.commit()


async def check_agent_jurisdiction(
    agent_id: int,
    user: UserModel,
    db: AsyncSession,
    log_attempt: bool = True
) -> Optional[AgentModel]:
    """
    Fetch agent and validate user has jurisdiction access.
    
    Returns:
        Agent if accessible, None otherwise (caller should raise 404)
    """
    # Fetch agent with relationships
    result = await db.execute(
        select(AgentModel)
        .options(selectinload(AgentModel.pos_devices))
        .where(AgentModel.id == agent_id)
    )
    agent = result.scalar_one_or_none()
    
    if not agent:
        return None
    
    # ADMIN/AUDITOR have full access
    if _is_admin(user) or _is_auditor(user):
        return agent

    # Self-lookup: Allow agent to access their own data
    if hasattr(user, 'id') and user.id == agent_id:
        # Check if this is an agent (role FUNCIONARIO)
        if hasattr(user, 'role') and user.role.value == 'FUNCIONARIO':
            return agent
    
    # Get agent's jurisdiction from their assigned market
    if agent.assigned_market_id:
        market_result = await db.execute(
            select(MarketModel).where(MarketModel.id == agent.assigned_market_id)
        )
        market = market_result.scalar_one_or_none()
        if market:
            if _check_jurisdiction_match(market.province, market.district, user):
                return agent
    
    # Access denied - log and return None
    if log_attempt:
        await log_unauthorized_access(user, "AGENT", agent_id, db)
    
    return None


async def check_merchant_jurisdiction(
    merchant_id: int,
    user: UserModel,
    db: AsyncSession,
    log_attempt: bool = True
) -> Optional[MerchantModel]:
    """
    Fetch merchant and validate user has jurisdiction access.
    Jurisdiction is inherited from the merchant's market.
    
    Returns:
        Merchant if accessible, None otherwise (caller should raise 404)
    """
    result = await db.execute(
        select(MerchantModel)
        .options(selectinload(MerchantModel.balance))
        .where(MerchantModel.id == merchant_id)
    )
    merchant = result.scalar_one_or_none()
    
    if not merchant:
        return None
    
    # Self-lookup: Allow merchant to access their own data
    # When a merchant logs in, the "user" object is actually the Merchant model (duck typing)
    # We check if the user's ID matches the merchant being accessed
    if hasattr(user, 'id') and user.id == merchant_id:
        # Check if this is a merchant (not a User) by checking for merchant-specific field
        if hasattr(user, 'nfc_uid') or hasattr(user, 'merchant_type'):
            return merchant
    
    # ADMIN/AUDITOR have full access
    if _is_admin(user) or _is_auditor(user):
        return merchant
    
    # AGENTE: Market-level only
    if hasattr(user, 'role') and user.role.value == "AGENTE":
        if hasattr(user, 'scope_market_id') and user.scope_market_id:
            if merchant.market_id == user.scope_market_id:
                return merchant
        # Agent doesn't have access to this merchant
        if log_attempt:
            await log_unauthorized_access(user, "MERCHANT", merchant_id, db)
        return None
    
    # Get jurisdiction from merchant's market
    if merchant.market_id:
        market_result = await db.execute(
            select(MarketModel).where(MarketModel.id == merchant.market_id)
        )
        market = market_result.scalar_one_or_none()
        if market:
            if _check_jurisdiction_match(market.province, market.district, user):
                return merchant
    
    # Access denied
    if log_attempt:
        await log_unauthorized_access(user, "MERCHANT", merchant_id, db)
    
    return None


async def check_pos_jurisdiction(
    pos_id: int,
    user: UserModel,
    db: AsyncSession,
    log_attempt: bool = True
) -> Optional[POSDeviceModel]:
    """
    Fetch POS device and validate user has jurisdiction access.
    POS has direct province/district fields.
    
    Returns:
        POSDevice if accessible, None otherwise (caller should raise 404)
    """
    result = await db.execute(
        select(POSDeviceModel).where(POSDeviceModel.id == pos_id)
    )
    pos = result.scalar_one_or_none()
    
    if not pos:
        return None
    
    # ADMIN/AUDITOR have full access
    if _is_admin(user) or _is_auditor(user):
        return pos
    
    # Check direct jurisdiction fields
    if _check_jurisdiction_match(pos.province, pos.district, user):
        return pos
    
    # Access denied
    if log_attempt:
        await log_unauthorized_access(user, "POS", pos_id, db)
    
    return None


async def check_market_jurisdiction(
    market_id: int,
    user: UserModel,
    db: AsyncSession,
    log_attempt: bool = True
) -> Optional[MarketModel]:
    """
    Fetch market and validate user has jurisdiction access.
    Market has direct province/district fields.
    
    Returns:
        Market if accessible, None otherwise (caller should raise 404)
    """
    result = await db.execute(
        select(MarketModel).where(MarketModel.id == market_id)
    )
    market = result.scalar_one_or_none()
    
    if not market:
        return None
    
    # ADMIN/AUDITOR have full access
    if _is_admin(user) or _is_auditor(user):
        return market
    
    # Check direct jurisdiction fields
    if _check_jurisdiction_match(market.province, market.district, user):
        return market
    
    # Access denied
    if log_attempt:
        await log_unauthorized_access(user, "MARKET", market_id, db)
    
    return None
