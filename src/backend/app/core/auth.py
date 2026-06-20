"""
app/core/auth.py
ASTRA — JWT authentication + RBAC dependency for FastAPI routes.

Design rules (per doctrine):
  - Offline JWT verification only (no external auth service calls)
  - python-jose handles signature + expiry
  - Role claims enforced here; no vendor SDK logic
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

# auto_error=False so we raise 401 (not 403) when Authorization header is absent
_bearer_scheme = HTTPBearer(auto_error=False)


# --------------------------------------------------------------------------- #
#  Token Creation (used only in /auth/token for demo / testing)
# --------------------------------------------------------------------------- #

def create_access_token(
    subject: str,
    role: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT.
    Args:
        subject:  Unique user identifier (e.g. "operator_001")
        role:     One of 'traffic_operator', 'supervisor', 'administrator'
        expires_delta: Override default TTL for testing.
    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    payload = {
        "sub": subject,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# --------------------------------------------------------------------------- #
#  Token Verification
# --------------------------------------------------------------------------- #

def _decode_token(token: str) -> dict:
    """
    Decode and validate a JWT.  Raises HTTPException on any failure.
    Returns the decoded payload dict on success.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise credentials_exception

    # Validate required claims
    if payload.get("sub") is None or payload.get("role") is None:
        raise credentials_exception

    return payload


# --------------------------------------------------------------------------- #
#  FastAPI Dependency: get_current_user
# --------------------------------------------------------------------------- #

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """
    Inject into any route that requires authentication.
    Returns the decoded token payload dict:
        {"sub": "operator_001", "role": "traffic_operator", "exp": ..., "iat": ...}
    Raises HTTP 401 (not 403) when Authorization header is absent.
    """
    if credentials is None:
        # HTTPBearer with auto_error=False yields None when header is missing
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _decode_token(credentials.credentials)


# --------------------------------------------------------------------------- #
#  RBAC Dependency Factory
# --------------------------------------------------------------------------- #

_ROLE_HIERARCHY = {
    "traffic_operator": 0,
    "supervisor": 1,
    "administrator": 2,
}


def require_role(minimum_role: str):
    """
    Dependency factory for role-based access control.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("administrator"))])

    Raises HTTP 403 if the caller's role is below the required level.
    """
    async def _check(current_user: dict = Depends(get_current_user)):
        caller_role = current_user.get("role", "")
        caller_level = _ROLE_HIERARCHY.get(caller_role, -1)
        required_level = _ROLE_HIERARCHY.get(minimum_role, 99)
        if caller_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{minimum_role}' or higher required.",
            )
        return current_user

    return _check


# --------------------------------------------------------------------------- #
#  WebSocket Token Verifier (query param — browsers cannot send WS headers)
# --------------------------------------------------------------------------- #

def verify_ws_token(token: str) -> dict:
    """
    Verify JWT passed as a WebSocket query parameter ?token=...
    Returns decoded payload or raises HTTPException (caught by WS handler).
    """
    return _decode_token(token)
