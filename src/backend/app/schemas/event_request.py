"""
app/schemas/event_request.py
ASTRA — Pydantic input schema with strict Bengaluru geo-bounds validation.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional
from app.config import settings


class EventRequest(BaseModel):
    event_type: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Type of event: 'planned' or 'unplanned'",
        examples=["unplanned"],
    )
    event_cause: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Root cause of the event",
        examples=["vehicle_breakdown"],
    )
    latitude: float = Field(
        ...,
        ge=settings.LAT_MIN,
        le=settings.LAT_MAX,
        description="Latitude within Bengaluru bounds",
        examples=[12.9716],
    )
    longitude: float = Field(
        ...,
        ge=settings.LON_MIN,
        le=settings.LON_MAX,
        description="Longitude within Bengaluru bounds",
        examples=[77.5946],
    )
    description: str = Field(
        default="",
        max_length=1000,
        description="Free-text event description for similarity search",
    )

    vehicle_type: Optional[str] = Field(
        default=None,
        max_length=64,
        description="Type of vehicle involved (optional)",
        examples=["heavy_vehicle"],
    )
    corridor: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Road corridor name (optional)",
        examples=["Mysore Road"],
    )
    hour: Optional[int] = Field(
        default=None,
        ge=0,
        le=23,
        description="Hour of day (0-23). Auto-derived from server time if omitted.",
    )

    @model_validator(mode="after")
    def auto_fill_hour(self) -> "EventRequest":
        """If hour is not supplied, use the current server hour."""
        if self.hour is None:
            from datetime import datetime
            self.hour = datetime.now().hour
        return self
