"""
app/api/v1/hotspots.py
ASTRA — Spatial hotspot intelligence endpoints.

GET /api/v1/hotspots                         → all clusters with risk scores
GET /api/v1/hotspots/stations                → all police station locations
GET /api/v1/hotspots/nearest-station         → nearest police station to (lat, lon)
"""

from fastapi import APIRouter, Depends, Query, Request, HTTPException

from app.core.auth import get_current_user
from app.schemas.prediction_response import HotspotsResponse
from app.engines.spatial_engine import (
    BENGALURU_POLICE_STATIONS,
    find_nearest_station,
)

router = APIRouter(prefix="/api/v1", tags=["Hotspots"])


@router.get(
    "/hotspots",
    response_model=HotspotsResponse,
    summary="Get all spatial hotspot clusters",
)
async def get_hotspots(
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    """
    Returns all HDBSCAN-derived hotspot clusters with centroids and risk scores.
    Clusters are sorted by risk_score descending.
    """
    cluster_index = request.app.state.cluster_index or []
    return HotspotsResponse(clusters=cluster_index, total=len(cluster_index))


@router.get(
    "/hotspots/stations",
    summary="Get all Bengaluru traffic police station locations",
)
async def get_police_stations(
    current_user: dict = Depends(get_current_user),
):
    """
    Returns the static registry of 12 major Bengaluru traffic police stations
    with their GPS coordinates and zone assignments.
    """
    return {
        "stations": BENGALURU_POLICE_STATIONS,
        "total": len(BENGALURU_POLICE_STATIONS),
    }


@router.get(
    "/hotspots/nearest-station",
    summary="Find nearest police station to incident coordinates",
)
async def get_nearest_station(
    lat: float = Query(..., ge=12.5, le=13.5, description="Incident latitude"),
    lon: float = Query(..., ge=77.0, le=78.0, description="Incident longitude"),
    current_user: dict = Depends(get_current_user),
):
    """
    Given an incident (lat, lon), returns the nearest Bengaluru traffic police
    station from the in-memory registry using Haversine distance.
    """
    station = find_nearest_station(lat, lon)
    if station is None:
        raise HTTPException(status_code=503, detail="Police station registry unavailable.")
    return {"nearest_station": station}
