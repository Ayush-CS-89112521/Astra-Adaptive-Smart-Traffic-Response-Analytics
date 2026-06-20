"""
app/api/v1/routing.py
ASTRA — Diversion route generation endpoint.

POST /api/v1/routing/diversion → GeoJSON diversion route
"""

import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.core.audit_logger import log_event
from app.engines.routing_engine import compute_diversion
from app.schemas.prediction_response import DiversionResponse
from app.config import settings

router = APIRouter(prefix="/api/v1/routing", tags=["Routing"])


class RoutingRequest(BaseModel):
    event_lat: float = Field(..., ge=settings.LAT_MIN, le=settings.LAT_MAX)
    event_lon: float = Field(..., ge=settings.LON_MIN, le=settings.LON_MAX)
    closure_probability: float = Field(..., ge=0.0, le=1.0)
    destination_lat: Optional[float] = Field(default=None, ge=settings.LAT_MIN, le=settings.LAT_MAX)
    destination_lon: Optional[float] = Field(default=None, ge=settings.LON_MIN, le=settings.LON_MAX)


from app.core.cache import cache_get, cache_set


def _get_cache_key(body: RoutingRequest) -> tuple:
    # Round coordinates to 5 decimal places (approx. 1 meter accuracy) for stable caching
    return (
        round(body.event_lat, 5),
        round(body.event_lon, 5),
        round(body.closure_probability, 3),
        round(body.destination_lat, 5) if body.destination_lat is not None else None,
        round(body.destination_lon, 5) if body.destination_lon is not None else None,
    )


@router.post(
    "/diversion",
    response_model=DiversionResponse,
    summary="Compute diversion route around a blocked segment",
)
@limiter.limit("20/minute")
async def get_diversion(
    request: Request,
    body: RoutingRequest,
    current_user: dict = Depends(get_current_user),
):
    key = _get_cache_key(body)
    cached_res = cache_get("routing", key)
    if cached_res is not None:
        log_event(
            user=current_user["sub"],
            role=current_user["role"],
            action="compute_diversion_cached",
            endpoint="/api/v1/routing/diversion",
            result="success",
            detail={
                "origin": [body.event_lat, body.event_lon],
                "closure_prob": body.closure_probability,
                "distance_km": cached_res.distance_km,
            },
        )
        return cached_res

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        request.app.state.ml_executor,
        compute_diversion,
        request.app.state.road_graph,
        body.event_lat,
        body.event_lon,
        body.closure_probability,
        body.destination_lat,
        body.destination_lon,
    )
    log_event(
        user=current_user["sub"],
        role=current_user["role"],
        action="compute_diversion",
        endpoint="/api/v1/routing/diversion",
        result="success",
        detail={
            "origin": [body.event_lat, body.event_lon],
            "closure_prob": body.closure_probability,
            "distance_km": result["distance_km"],
        },
    )
    resp = DiversionResponse(**result)
    cache_set("routing", key, resp, ttl=3600)
    return resp

