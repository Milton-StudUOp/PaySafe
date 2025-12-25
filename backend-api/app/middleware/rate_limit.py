import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from collections import defaultdict, deque

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Dictionary to store request timestamps for each IP
        self.request_history = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        # Allow health and stats endpoints to bypass rate limit
        if request.url.path in ["/health", "/health/full", "/stats", "/metrics"]:
            return await call_next(request)
            
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        current_time = time.time()
        
        # Get history for this IP
        history = self.request_history[client_ip]
        
        # Remove requests older than the window
        while history and history[0] < current_time - self.window_seconds:
            history.popleft()
            
        # Check if limit exceeded
        if len(history) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Rate limit exceeded. Please try again later.",
                    "wait_seconds": int(self.window_seconds - (current_time - history[0]))
                }
            )
            
        # Add current request to history
        history.append(current_time)
        
        # Process request
        response = await call_next(request)
        
        # Add headers
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(self.max_requests - len(history))
        response.headers["X-RateLimit-Reset"] = str(int(current_time + self.window_seconds))
        
        return response
