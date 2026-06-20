"""
app/api/v1/predictions.py
ASTRA — ML prediction endpoints.

POST /api/v1/predict/severity  → severity label + confidence
POST /api/v1/predict/closure   → road closure probability
"""

import asyncio
import time
from fastapi import APIRouter, Depends, Request

from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.core.audit_logger import log_event
from app.engines.severity_engine import predict_severity
from app.engines.closure_engine import predict_closure
from app.schemas.event_request import EventRequest
from app.schemas.prediction_response import SeverityResponse, ClosureResponse

router = APIRouter(prefix="/api/v1/predict", tags=["Predictions"])


@router.post(
    "/severity",
    response_model=SeverityResponse,
    summary="Predict traffic event severity",
)
@limiter.limit("60/minute")
async def predict_severity_endpoint(
    request: Request,
    body: EventRequest,
    current_user: dict = Depends(get_current_user),
):
    loop = asyncio.get_running_loop()
    t0 = time.perf_counter()
    result = await loop.run_in_executor(
        request.app.state.ml_executor,
        predict_severity,
        request.app.state.severity_model,
        body,
    )
    t1 = time.perf_counter()
    from app.core.metrics import record_inference_latency
    record_inference_latency((t1 - t0) * 1000.0)
    
    log_event(
        user=current_user["sub"],
        role=current_user["role"],
        action="predict_severity",
        endpoint="/api/v1/predict/severity",
        result="success",
        detail={"event_cause": body.event_cause, "severity": result["severity"]},
    )
    return SeverityResponse(**result)


@router.post(
    "/closure",
    response_model=ClosureResponse,
    summary="Predict road closure probability",
)
@limiter.limit("60/minute")
async def predict_closure_endpoint(
    request: Request,
    body: EventRequest,
    current_user: dict = Depends(get_current_user),
):
    loop = asyncio.get_running_loop()
    t0 = time.perf_counter()
    result = await loop.run_in_executor(
        request.app.state.ml_executor,
        predict_closure,
        request.app.state.closure_model,
        body,
        request.app.state.historical_priors,
    )
    t1 = time.perf_counter()
    from app.core.metrics import record_inference_latency
    record_inference_latency((t1 - t0) * 1000.0)
    
    log_event(
        user=current_user["sub"],
        role=current_user["role"],
        action="predict_closure",
        endpoint="/api/v1/predict/closure",
        result="success",
        detail={"event_cause": body.event_cause, "closure_probability": result["closure_probability"]},
    )
    return ClosureResponse(**result)

