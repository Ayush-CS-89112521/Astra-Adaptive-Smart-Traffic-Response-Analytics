"""
app/api/v1/explainability.py
ASTRA — SHAP-based model explainability endpoint.
Tracks background tasks using BackgroundTaskTracker to prevent infinite client polling.
"""

import hashlib
import logging
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, Request, BackgroundTasks

from app.core.auth import get_current_user
from app.core.audit_logger import log_event
from app.engines.severity_engine import _build_feature_row, _SEVERITY_COLS, _CAT_FEATURES
from app.schemas.event_request import EventRequest
from app.schemas.prediction_response import ExplainabilityResponse
from app.core.cache import cache_get, cache_set
from app.core.task_tracker import BackgroundTaskTracker

logger = logging.getLogger("astra.explainability")

router = APIRouter(prefix="/api/v1", tags=["Explainability"])


def _get_fuzzy_explain_cache_key(req: EventRequest) -> tuple:
    # Group hour into 4-hour blocks
    hour_bucket = (req.hour // 4) * 4 if req.hour is not None else 0
    # Round lat/lon to 3 decimal places (approx 110m)
    lat_bucket = round(req.latitude, 3)
    lon_bucket = round(req.longitude, 3)

    return (
        str(req.event_type).lower().strip(),
        str(req.event_cause).lower().strip(),
        lat_bucket,
        lon_bucket,
        str(req.vehicle_type or "").lower().strip(),
        str(req.corridor or "").strip(),
        hour_bucket,
    )


def _explain_prediction_bg(model, body: EventRequest, cache_key: tuple, task_id: str):
    """Executes native CatBoost SHAP explanation in a background task."""
    try:
        if model is None:
            BackgroundTaskTracker.set_task_status(task_id, "failed")
            return

        query_df = _build_feature_row(body)

        # Use native CatBoost SHAP (get_feature_importance) - extremely fast, identical to TreeExplainer
        from catboost import Pool
        pool = Pool(query_df, cat_features=_CAT_FEATURES)
        shap_values = model.get_feature_importance(pool, type='ShapValues')

        # Extract SHAP values (excluding the last column, which is base value)
        sv = shap_values[0, :-1]

        features = _SEVERITY_COLS
        shap_pairs = sorted(
            zip(features, sv.tolist()),
            key=lambda x: abs(x[1]),
            reverse=True,
        )

        top_factors = [
            {
                "feature": feat,
                "value": str(query_df.iloc[0][feat]),
                "shap_impact": round(impact, 4),
                "direction": "increases_severity" if impact > 0 else "decreases_severity",
            }
            for feat, impact in shap_pairs[:8]
        ]

        proba = model.predict_proba(query_df)[0]
        predicted_class = int(model.predict(query_df)[0])
        severity_label = "High" if predicted_class == 1 else "Low"
        confidence = float(max(proba))

        resp = ExplainabilityResponse(
            prediction=severity_label,
            confidence=round(confidence, 4),
            top_factors=top_factors,
            model="severity_model",
            status="success"
        )

        cache_set("explain", cache_key, resp, ttl=3600)
        BackgroundTaskTracker.set_task_status(task_id, "completed")
    except Exception as e:
        logger.error(f"Background SHAP task {task_id} failed: {e}", exc_info=True)
        BackgroundTaskTracker.set_task_status(task_id, "failed")


@router.post(
    "/explain",
    response_model=ExplainabilityResponse,
    summary="Explain severity prediction with SHAP feature importance",
)
async def explain_prediction(
    request: Request,
    body: EventRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    key = _get_fuzzy_explain_cache_key(body)
    
    # 1. Check direct cache first
    cached_res = cache_get("explain", key)
    if cached_res is not None:
        log_event(
            user=current_user["sub"],
            role=current_user["role"],
            action="explain_prediction_cached",
            endpoint="/api/v1/explain",
            result="success",
            detail={"severity": cached_res.prediction, "top_feature": cached_res.top_factors[0]["feature"] if cached_res.top_factors else None},
        )
        return cached_res

    # 2. Derive deterministic task ID based on the fuzzy cache key
    task_id = hashlib.md5(str(key).encode("utf-8")).hexdigest()

    # 3. Check BackgroundTaskTracker state
    task = BackgroundTaskTracker.get_task_status(task_id)
    if task is not None:
        if task["status"] == "failed":
            # Fail fast to prevent infinite polling in frontend
            return ExplainabilityResponse(
                prediction="N/A",
                confidence=0.0,
                top_factors=[],
                model="severity_model",
                status="failed"
            )
        elif task["status"] == "pending":
            # Still running in background
            from app.engines.severity_engine import predict_severity
            pred_res = predict_severity(request.app.state.severity_model, body)
            return ExplainabilityResponse(
                prediction=pred_res["severity"],
                confidence=pred_res["confidence"],
                top_factors=[],
                model="severity_model",
                status="pending"
            )

    # 4. First-time request: Start background job and track it
    state = request.app.state
    model = state.severity_model

    from app.engines.severity_engine import predict_severity
    pred_res = predict_severity(model, body)
    severity_label = pred_res["severity"]
    confidence = pred_res["confidence"]

    BackgroundTaskTracker.set_task_status(task_id, "pending")
    background_tasks.add_task(
        _explain_prediction_bg,
        model,
        body,
        key,
        task_id
    )

    log_event(
        user=current_user["sub"],
        role=current_user["role"],
        action="explain_prediction_pending",
        endpoint="/api/v1/explain",
        result="success",
        detail={"severity": severity_label},
    )

    return ExplainabilityResponse(
        prediction=severity_label,
        confidence=confidence,
        top_factors=[],
        model="severity_model",
        status="pending"
    )
