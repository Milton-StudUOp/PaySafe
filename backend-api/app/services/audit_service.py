import json
from datetime import datetime, date
from typing import Optional, Any, Dict, List
from enum import Enum as PyEnum
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog, ActorType, Severity, EventType
from app.models.user import User as UserModel
import traceback

def _serialize_for_json(data: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Convert non-JSON-serializable types (date, datetime, Enum) to strings."""
    if data is None:
        return None
    result = {}
    for key, value in data.items():
        if isinstance(value, (datetime, date)):
            result[key] = value.isoformat()
        elif isinstance(value, PyEnum):
            result[key] = value.value
        elif isinstance(value, dict):
            result[key] = _serialize_for_json(value)
        else:
            result[key] = value
    return result

class AuditService:
    @staticmethod
    async def log_audit(
        db: AsyncSession,
        actor: Optional[UserModel],
        action: str,
        entity: str,
        description: str,
        entity_id: Optional[int] = None,
        entity_name: Optional[str] = None,
        before_data: Optional[Dict[str, Any]] = None,
        after_data: Optional[Dict[str, Any]] = None,
        severity: Severity = Severity.INFO,
        event_type: EventType = EventType.NORMAL,
        request: Optional[Request] = None,
        actor_type_override: Optional[ActorType] = None,
        correlation_id: Optional[str] = None,
        actor_province: Optional[str] = None,
        actor_district: Optional[str] = None,
    ):
        """
        Centralized method to log audit events with full forensic context.
        """
        
        # 1. Determine Actor
        actor_type = ActorType.UNKNOWN
        actor_id = None
        actor_name = "Unknown"
        actor_role = "None"
        # Use passed values as default, override if actor has them
        final_province = actor_province
        final_district = actor_district
        
        if actor:
            actor_id = actor.id
            actor_name = actor.full_name
            
            # Handle both User and Merchant actors (Merchant doesn't have scope_province/scope_district)
            # Prioritize actor's scope if available
            if hasattr(actor, 'scope_province') and actor.scope_province:
                final_province = actor.scope_province
            if hasattr(actor, 'scope_district') and actor.scope_district:
                final_district = actor.scope_district
            
            # Check if actor is a Merchant (duck typing)
            if hasattr(actor, 'nfc_uid') or hasattr(actor, 'merchant_type'):
                actor_type = ActorType.MERCHANT
                actor_role = "MERCHANT"
                # Try to get location from Merchant's market if not set in scope
                if not final_province and hasattr(actor, 'market') and actor.market:
                     final_province = actor.market.province
                     final_district = actor.market.district
            elif hasattr(actor, 'role'):
                actor_role = actor.role.value if hasattr(actor.role, 'value') else str(actor.role)
                # Map actor type from role
                if actor.role.value == "ADMIN":
                    actor_type = ActorType.ADMIN
                elif actor.role.value == "AUDITOR":
                    actor_type = ActorType.AUDITOR
                elif actor.role.value == "SUPERVISOR":
                    actor_type = ActorType.SUPERVISOR
                elif actor.role.value == "FUNCIONARIO":
                    actor_type = ActorType.FUNCIONARIO
                elif actor.role.value == "AGENT":
                    actor_type = ActorType.AGENT
                elif actor.role.value == "MERCHANT":
                    actor_type = ActorType.MERCHANT
                else:
                    actor_type = ActorType.UNKNOWN
            else:
                actor_role = "Unknown"
                actor_type = ActorType.UNKNOWN
        elif actor_type_override:
             actor_type = actor_type_override
             actor_name = actor_type_override.value
        
        # 2. Extract Request Context - use passed request or get from context
        from app.utils.request_context import get_client_ip, get_user_agent, get_request_method, get_request_path, get_request_context
        
        # Try to use passed request first, fall back to context
        effective_request = request or get_request_context()
        
        if effective_request:
            # Use request directly if available
            if effective_request.client:
                ip_address = effective_request.client.host
            else:
                ip_address = get_client_ip()
            
            # Check for proxy headers
            forwarded_for = effective_request.headers.get("x-forwarded-for")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            real_ip = effective_request.headers.get("x-real-ip")
            if real_ip:
                ip_address = real_ip.strip()
                
            user_agent = effective_request.headers.get("user-agent")
            req_method = effective_request.method
            req_path = str(effective_request.url.path)
        else:
            # No request available at all - use context helpers as last resort
            ip_address = get_client_ip()
            user_agent = get_user_agent()
            req_method = get_request_method()
            req_path = get_request_path()
            
        # 3. Create Log Entry
        log_entry = AuditLog(
            actor_type=actor_type,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_role=actor_role,
            actor_province=final_province,
            actor_district=final_district,
            
            action=action,
            entity=entity,
            entity_id=entity_id,
            entity_name=entity_name,
            description=description,
            
            before_data=_serialize_for_json(before_data),
            after_data=_serialize_for_json(after_data),
            
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=req_method,
            request_path=req_path,
            
            severity=severity,
            event_type=event_type,
            correlation_id=correlation_id
        )
        
        db.add(log_entry)
        # Note: Caller is responsible for commit, or we can auto-commit if needed.
        # Ideally, audit should be part of the transaction.
        
    @staticmethod
    async def log_security_event(
        db: AsyncSession,
        request: Request,
        action: str,
        description: str,
        severity: Severity = Severity.HIGH,
        actor: Optional[UserModel] = None,
        entity: str = "SYSTEM",
        entity_id: Optional[int] = None,
        entity_name: Optional[str] = None,
        actor_province: Optional[str] = None,
        actor_district: Optional[str] = None
    ):
        """
        Shortcut for security events (Unauthorized access, etc)
        """
        await AuditService.log_audit(
            db=db,
            actor=actor,
            action=action,
            entity=entity,
            entity_id=entity_id,
            description=description,
            severity=severity,
            event_type=EventType.SECURITY,
            request=request,
            actor_type_override=ActorType.SYSTEM if not actor else None,
            actor_province=actor_province,
            actor_district=actor_district
        )
