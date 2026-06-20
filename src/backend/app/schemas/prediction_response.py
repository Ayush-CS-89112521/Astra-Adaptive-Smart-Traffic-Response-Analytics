"""
app/schemas/prediction_response.py
ASTRA — Response schemas for ML prediction endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional


class SeverityResponse(BaseModel):
    severity: str = Field(..., examples=["High"])
    confidence: float = Field(..., ge=0.0, le=1.0, examples=[0.97])


class ClosureResponse(BaseModel):
    closure_probability: float = Field(..., ge=0.0, le=1.0, examples=[0.63])


class SimilarIncident(BaseModel):
    event_cause: str
    severity: str
    closure_probability: float
    score: float = Field(..., description="FAISS similarity score (higher = more similar)")


class SimilarityResponse(BaseModel):
    matches: list[SimilarIncident]
    query_description: Optional[str] = None


class HotspotCluster(BaseModel):
    cluster_id: int
    centroid_lat: float
    centroid_lon: float
    risk_score: float = Field(..., ge=0.0, le=10.0)
    closure_rate: float = Field(..., ge=0.0, le=1.0)
    event_count: int


class HotspotsResponse(BaseModel):
    clusters: list[HotspotCluster]
    total: int


class NearestClusterResponse(BaseModel):
    cluster_id: int
    risk_score: float
    closure_rate: float
    distance_km: float


class DiversionResponse(BaseModel):
    route_geojson: dict
    congested_geojson: Optional[dict] = None
    distance_km: float
    estimated_time_minutes: float
    penalty_applied: bool


class ExplainabilityResponse(BaseModel):
    prediction: str
    confidence: float
    top_factors: list[dict]
    model: str = Field(..., examples=["severity_model"])
    status: Optional[str] = Field(default="success", description="Status of SHAP calculation: 'success' or 'pending'")
