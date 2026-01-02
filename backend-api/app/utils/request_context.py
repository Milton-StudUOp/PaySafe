"""
Request Context Module
Provides global access to the current request for audit logging.
Uses contextvars to safely store request data per-request in async context.
"""
from contextvars import ContextVar
from typing import Optional
from fastapi import Request

# Context variable to store the current request
_request_context: ContextVar[Optional[Request]] = ContextVar('request_context', default=None)


def set_request_context(request: Request) -> None:
    """Store the current request in context. Called by middleware."""
    _request_context.set(request)


def get_request_context() -> Optional[Request]:
    """Get the current request from context. Returns None if not set."""
    return _request_context.get()


def get_client_ip() -> str:
    """Get client IP from current request context.
    
    Checks for common proxy headers first, then falls back to direct client IP.
    Returns '0.0.0.0' if no request context is available.
    """
    request = get_request_context()
    if not request:
        return "0.0.0.0"
    
    # Check for proxy headers (in order of preference)
    # X-Forwarded-For is the most common
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs, first one is the client
        return forwarded_for.split(",")[0].strip()
    
    # X-Real-IP is used by some proxies (nginx)
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    
    # Fall back to direct client IP
    if request.client:
        return request.client.host
    
    return "0.0.0.0"


def get_user_agent() -> Optional[str]:
    """Get user agent from current request context."""
    request = get_request_context()
    if not request:
        return None
    return request.headers.get("user-agent")


def get_request_method() -> Optional[str]:
    """Get HTTP method from current request context."""
    request = get_request_context()
    if not request:
        return None
    return request.method


def get_request_path() -> Optional[str]:
    """Get request path from current request context."""
    request = get_request_context()
    if not request:
        return None
    return str(request.url.path)
