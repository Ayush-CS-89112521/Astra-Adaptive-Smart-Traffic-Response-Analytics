"""
app/core/rate_limit.py
ASTRA — SlowAPI limiter configuration.
Import `limiter` and `_rate_limit_exceeded_handler` in main.py.
"""

import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Single limiter instance — keyed by client IP
# Enabled by default, can be disabled for load testing via DISABLE_RATE_LIMIT=true
enabled = os.getenv("DISABLE_RATE_LIMIT", "false").lower() != "true"
limiter = Limiter(key_func=get_remote_address, enabled=enabled)


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 response matching ASTRA error envelope."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "detail": f"Too many requests. Limit: {exc.limit.limit}",
            "retry_after_seconds": exc.limit.limit.get_expiry(),
        },
    )

