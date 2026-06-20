"""
app/api/v1/auth.py
ASTRA — Token issuance endpoint for development / demo use.

POST /auth/token → returns a signed JWT for a given user + role.

NOTE: In production, this endpoint should be protected or replaced
by an external identity provider. For the Gridlock 2.0 demo, it
allows the evaluator to generate valid tokens without a UI login flow.
"""

from datetime import timedelta
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.core.auth import create_access_token
from app.core.audit_logger import log_login_attempt

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

_VALID_ROLES = {"traffic_operator", "supervisor", "administrator"}

# Demo credentials — hardcoded for competition prototype ONLY
# Replace with a real user store in production
_DEMO_USERS = {
    "operator@astra.demo": {"password": "AstraOps2024!", "role": "traffic_operator"},
    "supervisor@astra.demo": {"password": "AstraSup2024!", "role": "supervisor"},
    "admin@astra.demo": {"password": "AstraAdm2024!", "role": "administrator"},
}


class TokenRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    expires_in_minutes: int


@router.post("/token", response_model=TokenResponse, summary="Obtain JWT access token")
async def get_token(body: TokenRequest):
    user = _DEMO_USERS.get(body.username)
    if not user or user["password"] != body.password:
        log_login_attempt(user=body.username, success=False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    log_login_attempt(user=body.username, success=True)
    token = create_access_token(subject=body.username, role=user["role"])
    from app.config import settings
    return TokenResponse(
        access_token=token,
        role=user["role"],
        expires_in_minutes=settings.JWT_EXPIRE_MINUTES,
    )
