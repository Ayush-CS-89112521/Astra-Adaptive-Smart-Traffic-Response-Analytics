"""
app/engines/severity_engine.py
ASTRA — Severity prediction using the pre-loaded CatBoost model.

Severity model features (must match training exactly):
    ['event_type', 'event_cause', 'veh_type', 'police_station',
     'geohash', 'corridor', 'hour', 'day_of_week',
     'latitude_clean', 'longitude_clean']

Categorical features:
    ['event_type', 'event_cause', 'veh_type', 'police_station', 'geohash', 'corridor']
"""

import pandas as pd
import pygeohash as pgh
from datetime import datetime
from catboost import CatBoostClassifier

from app.schemas.event_request import EventRequest

# Feature column order must exactly match the training pipeline
_SEVERITY_COLS = [
    "event_type", "event_cause", "veh_type", "police_station",
    "geohash", "corridor", "hour", "day_of_week",
    "latitude_clean", "longitude_clean",
]

_CAT_FEATURES = [
    "event_type", "event_cause", "veh_type", "police_station", "geohash", "corridor"
]

_LABEL_MAP = {0: "Low", 1: "High"}


def _build_feature_row(req: EventRequest) -> pd.DataFrame:
    """Convert an EventRequest into a single-row DataFrame matching training feature schema."""
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    day_of_week = now.weekday()  # 0=Monday … 6=Sunday

    geohash = pgh.encode(req.latitude, req.longitude, precision=5)

    row = {
        "event_type": str(req.event_type).lower().strip(),
        "event_cause": str(req.event_cause).lower().strip(),
        "veh_type": str(req.vehicle_type or "unknown").lower().strip(),
        "police_station": "unknown",          # Not available at inference time
        "geohash": geohash,
        "corridor": str(req.corridor or "Non-corridor").strip(),
        "hour": int(hour),
        "day_of_week": int(day_of_week),
        "latitude_clean": float(req.latitude),
        "longitude_clean": float(req.longitude),
    }

    df = pd.DataFrame([row], columns=_SEVERITY_COLS)
    for col in _CAT_FEATURES:
        df[col] = df[col].astype(str)
    return df


from app.core.cache import cache_get, cache_set

def _get_cache_key(req: EventRequest) -> tuple:
    return (
        str(req.event_type).lower().strip(),
        str(req.event_cause).lower().strip(),
        round(req.latitude, 5),
        round(req.longitude, 5),
        str(req.description).strip(),
        str(req.vehicle_type or "").lower().strip(),
        str(req.corridor or "").strip(),
        req.hour,
    )


def predict_severity(model: CatBoostClassifier, req: EventRequest) -> dict:
    """
    Run severity inference.

    Args:
        model: The loaded CatBoostClassifier (from app.state.severity_model)
        req:   Validated EventRequest

    Returns:
        {"severity": "High"|"Low", "confidence": float}
    """
    if model is None:
        raise ValueError("Severity model is not loaded")

    key = _get_cache_key(req)
    cached = cache_get("severity", key)
    if cached is not None:
        return cached

    df = _build_feature_row(req)
    proba = model.predict_proba(df)[0]   # shape: (n_classes,)
    predicted_class = int(model.predict(df)[0])
    confidence = float(max(proba))
    res = {
        "severity": _LABEL_MAP.get(predicted_class, str(predicted_class)),
        "confidence": round(confidence, 4),
    }

    cache_set("severity", key, res, ttl=3600)
    return res
