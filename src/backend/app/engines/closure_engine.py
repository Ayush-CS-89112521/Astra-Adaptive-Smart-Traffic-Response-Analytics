"""
app/engines/closure_engine.py
ASTRA — Road closure probability prediction using the pre-loaded CatBoost model.

Closure model features (must match training exactly):
    ['latitude_clean', 'longitude_clean', 'geohash', 'corridor', 'police_station',
     'hour', 'day_of_week', 'event_cause', 'veh_type',
     'closure_rate_by_cause', 'closure_rate_by_corridor']

Categorical features:
    ['geohash', 'corridor', 'police_station', 'event_cause', 'veh_type']
"""

import pandas as pd
import pygeohash as pgh
from datetime import datetime
from catboost import CatBoostClassifier

from app.schemas.event_request import EventRequest

_CLOSURE_COLS = [
    "latitude_clean", "longitude_clean", "geohash", "corridor", "police_station",
    "hour", "day_of_week", "event_cause", "veh_type",
    "closure_rate_by_cause", "closure_rate_by_corridor",
]

_CAT_FEATURES = ["geohash", "corridor", "police_station", "event_cause", "veh_type"]


def _build_feature_row(req: EventRequest, historical_priors: dict) -> pd.DataFrame:
    """
    Build a single-row DataFrame for the closure model.
    historical_priors = {"cause_priors": {...}, "corridor_priors": {...}}
    """
    now = datetime.now()
    hour = req.hour if req.hour is not None else now.hour
    day_of_week = now.weekday()
    geohash = pgh.encode(req.latitude, req.longitude, precision=5)

    cause = str(req.event_cause).lower().strip()
    corridor = str(req.corridor or "Non-corridor").strip()

    # Look up historical prior rates; fall back to 0.2 if unseen cause/corridor
    cause_rate = historical_priors.get("cause_priors", {}).get(cause, 0.2)
    corridor_rate = historical_priors.get("corridor_priors", {}).get(corridor, 0.2)

    row = {
        "latitude_clean": float(req.latitude),
        "longitude_clean": float(req.longitude),
        "geohash": geohash,
        "corridor": corridor,
        "police_station": "unknown",
        "hour": int(hour),
        "day_of_week": int(day_of_week),
        "event_cause": cause,
        "veh_type": str(req.vehicle_type or "unknown").lower().strip(),
        "closure_rate_by_cause": float(cause_rate),
        "closure_rate_by_corridor": float(corridor_rate),
    }

    df = pd.DataFrame([row], columns=_CLOSURE_COLS)
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


def predict_closure(
    model: CatBoostClassifier,
    req: EventRequest,
    historical_priors: dict,
) -> dict:
    """
    Run road closure probability inference.

    Args:
        model:             Loaded CatBoostClassifier (app.state.closure_model)
        req:               Validated EventRequest
        historical_priors: Loaded from historical_priors.joblib

    Returns:
        {"closure_probability": float}
    """
    if model is None:
        raise ValueError("Closure model is not loaded")

    key = _get_cache_key(req)
    cached = cache_get("closure", key)
    if cached is not None:
        return cached

    df = _build_feature_row(req, historical_priors)
    proba = model.predict_proba(df)[0]
    # Class 1 = road closure required
    closure_prob = float(proba[1]) if len(proba) > 1 else float(proba[0])
    res = {"closure_probability": round(closure_prob, 4)}

    cache_set("closure", key, res, ttl=3600)

    return res
