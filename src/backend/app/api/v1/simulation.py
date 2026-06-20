"""
app/api/v1/simulation.py
ASTRA — WebSocket simulation endpoint for streaming step-by-step incident response analysis.
"""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, Request
from pydantic import ValidationError

from app.core.auth import verify_ws_token, get_current_user
from app.core.websocket_manager import ws_manager
from app.core.audit_logger import log_event
from app.core.rate_limit import limiter
from app.schemas.event_request import EventRequest
from app.engines.severity_engine import predict_severity
from app.engines.closure_engine import predict_closure
from app.engines.similarity_engine import search_similar
from app.engines.spatial_engine import find_nearest_cluster
from app.engines.routing_engine import compute_diversion
from app.engines.recommendation_engine import generate_recommendation

router = APIRouter(prefix="/api/v1/predictions", tags=["Simulation"])
ws_router = APIRouter(tags=["Simulation"])


@router.post(
    "/simulate",
    summary="Run full simulation predictions via REST",
)
@limiter.limit("60/minute")
async def simulate_prediction_endpoint(
    request: Request,
    body: EventRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    REST endpoint to execute the full operational simulation pipeline synchronously.
    """
    state = request.app.state
    loop = asyncio.get_running_loop()

    # 1. Predict Severity
    severity_res = await loop.run_in_executor(
        state.ml_executor,
        predict_severity,
        state.severity_model,
        body,
    )
    severity = severity_res["severity"]
    confidence = severity_res["confidence"]

    # 2. Predict Closure Probability
    closure_res = await loop.run_in_executor(
        state.ml_executor,
        predict_closure,
        state.closure_model,
        body,
        state.historical_priors,
    )
    closure_prob = closure_res["closure_probability"]

    # 3. FAISS Similarity Search
    similarity_res = await loop.run_in_executor(
        state.ml_executor,
        search_similar,
        body,
        state.encoder,
        state.pca_transformer,
        state.faiss_index,
        state.similarity_db,
        3,
    )

    # 4. Nearest Cluster Risk Query
    nearest_cluster = find_nearest_cluster(body.latitude, body.longitude, state.cluster_index)
    risk_score = nearest_cluster["risk_score"] if nearest_cluster else 0.0

    # 5. Compute Diversion Route
    diversion_res = await loop.run_in_executor(
        state.ml_executor,
        compute_diversion,
        state.road_graph,
        body.latitude,
        body.longitude,
        closure_prob,
    )

    # 6. Generate Rule Recommendations
    recommendation_res = generate_recommendation(
        rules=state.rules,
        event_cause=body.event_cause,
        vehicle_type=body.vehicle_type or "unknown",
        severity=severity,
        closure_probability=closure_prob,
        risk_score=risk_score,
    )

    # 7. Compute Queue Length and Estimated Delay
    is_high = severity.lower() == "high"
    base_queue = 1000 if is_high else 200
    queue_length_meters = int(closure_prob * 2000 + base_queue)
    
    base_delay = 15.0 if is_high else 5.0
    estimated_delay_minutes = round(closure_prob * 30.0 + base_delay, 1)

    # Log operational audit event
    log_event(
        user=current_user.get("sub", "unknown"),
        role=current_user.get("role", "traffic_operator"),
        action="run_quick_predict",
        endpoint="/api/v1/predictions/simulate",
        result="success",
        detail={
            "event_cause": body.event_cause,
            "severity": severity,
            "closure_probability": closure_prob,
            "distance_km": diversion_res["distance_km"],
        }
    )

    return {
        "severity": severity,
        "confidence": confidence,
        "closure_probability": closure_prob,
        "queue_length_meters": queue_length_meters,
        "estimated_delay_minutes": estimated_delay_minutes,
        "route_geojson": diversion_res["route_geojson"],
        "congested_geojson": diversion_res.get("congested_geojson"),
        "distance_km": diversion_res["distance_km"],
        "estimated_time_minutes": diversion_res["estimated_time_minutes"],
        "penalty_applied": diversion_res["penalty_applied"],
        "similar_incidents": similarity_res,
        "recommendation": recommendation_res.model_dump()
    }


@ws_router.websocket("/ws/simulation")
async def websocket_simulation(
    websocket: WebSocket,
    token: str = Query(None),
):
    """
    WebSocket endpoint that streams a 7-step operational simulation sequence:
    1. INPUT_RECEIVED
    2. VALIDATION_COMPLETE
    3. SEVERITY_PREDICTED
    4. CLOSURE_PREDICTED
    5. SIMILAR_INCIDENTS
    6. DIVERSION_GENERATED
    7. RECOMMENDATIONS
    8. SIMULATION_COMPLETE
    """
    # 1. Authenticate query param
    if not token:
        await websocket.accept()
        await websocket.send_json({"step": "ERROR", "payload": {"error": "Missing token", "code": 4001}})
        await websocket.close(code=4001)
        return

    try:
        current_user = verify_ws_token(token)
    except Exception as e:
        await websocket.accept()
        await websocket.send_json({"step": "ERROR", "payload": {"error": f"Invalid token: {str(e)}", "code": 4001}})
        await websocket.close(code=4001)
        return

    user = current_user.get("sub", "unknown")
    role = current_user.get("role", "traffic_operator")

    session_id = await ws_manager.connect(websocket, user=user)
    
    # Start the heartbeat/idle check loop
    heartbeat_task = asyncio.create_task(ws_manager.run_heartbeat(session_id))

    try:
        while True:
            # Wait for text/JSON payload from client
            data = await websocket.receive_text()
            
            # Step 1: INPUT_RECEIVED
            await ws_manager.send_step(session_id, "INPUT_RECEIVED", {"raw_data": data})
            
            # Step 2: VALIDATION_COMPLETE
            try:
                parsed = json.loads(data)
                req = EventRequest(**parsed)
            except (json.JSONDecodeError, ValidationError) as err:
                await ws_manager.send_step(session_id, "ERROR", {"error": f"Validation failed: {str(err)}"})
                continue
            
            await ws_manager.send_step(session_id, "VALIDATION_COMPLETE", {"validated_input": req.model_dump()})

            state = websocket.app.state
            loop = asyncio.get_running_loop()

            # Step 3: SEVERITY_PREDICTED
            severity_res = await loop.run_in_executor(
                state.ml_executor,
                predict_severity,
                state.severity_model,
                req,
            )
            severity = severity_res["severity"]
            await ws_manager.send_step(session_id, "SEVERITY_PREDICTED", severity_res)

            # Step 4: CLOSURE_PREDICTED
            closure_res = await loop.run_in_executor(
                state.ml_executor,
                predict_closure,
                state.closure_model,
                req,
                state.historical_priors,
            )
            closure_prob = closure_res["closure_probability"]
            await ws_manager.send_step(session_id, "CLOSURE_PREDICTED", closure_res)

            # Step 5: SIMILAR_INCIDENTS
            similarity_res = await loop.run_in_executor(
                state.ml_executor,
                search_similar,
                req,
                state.encoder,
                state.pca_transformer,
                state.faiss_index,
                state.similarity_db,
                3,
            )
            await ws_manager.send_step(session_id, "SIMILAR_INCIDENTS", {"matches": similarity_res})

            # Query spatial clusters for risk score calculation
            nearest_cluster = find_nearest_cluster(req.latitude, req.longitude, state.cluster_index)
            risk_score = nearest_cluster["risk_score"] if nearest_cluster else 0.0

            # Step 6: DIVERSION_GENERATED
            diversion_res = await loop.run_in_executor(
                state.ml_executor,
                compute_diversion,
                state.road_graph,
                req.latitude,
                req.longitude,
                closure_prob,
            )
            await ws_manager.send_step(session_id, "DIVERSION_GENERATED", diversion_res)


            # Step 7: RECOMMENDATIONS
            recommendation_res = generate_recommendation(
                rules=state.rules,
                event_cause=req.event_cause,
                vehicle_type=req.vehicle_type or "unknown",
                severity=severity,
                closure_probability=closure_prob,
                risk_score=risk_score,
            )
            await ws_manager.send_step(
                session_id, 
                "RECOMMENDATIONS", 
                recommendation_res.model_dump()
            )

            # Step 8: SIMULATION_COMPLETE
            await ws_manager.send_step(session_id, "SIMULATION_COMPLETE", {"status": "success"})

            # Audit log success
            log_event(
                user=user,
                role=role,
                action="run_simulation",
                endpoint="/ws/simulation",
                result="success",
                detail={
                    "event_cause": req.event_cause,
                    "severity": severity,
                    "closure_probability": closure_prob,
                    "risk_score": risk_score
                }
            )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await ws_manager.send_error(session_id, f"Unexpected error in simulation flow: {str(e)}")
        except Exception:
            pass
    finally:
        # Clean up session
        heartbeat_task.cancel()
        ws_manager.disconnect(session_id)
