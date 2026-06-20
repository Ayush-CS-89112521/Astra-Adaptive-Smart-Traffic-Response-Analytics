"""
app/schemas/recommendation_response.py
ASTRA — Response schema for the operational recommendation engine.
"""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class EscalationLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RecommendationResponse(BaseModel):
    officers_required: int = Field(..., ge=0, description="Number of traffic officers to deploy")
    barricades_required: int = Field(..., ge=0, description="Number of barricades to place")
    tow_trucks_required: int = Field(..., ge=0, description="Number of tow trucks to dispatch")
    escalation_level: EscalationLevel = Field(..., description="Operational escalation tier")
    actions: list[str] = Field(
        default_factory=list,
        description="Human-readable action directives for the operator",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Additional context or caveats from the rule engine",
    )


class FullSimulationResponse(BaseModel):
    """Combined output of a full /ws/simulation run — also used for REST fallback."""
    severity: str
    confidence: float
    closure_probability: float
    nearest_cluster: dict
    similar_incidents: list[dict]
    diversion: Optional[dict]
    recommendations: RecommendationResponse
    explanation: Optional[dict] = None
