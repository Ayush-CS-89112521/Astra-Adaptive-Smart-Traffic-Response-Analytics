"""
app/api/v1/health.py
ASTRA — Health monitoring, telemetry, and Prometheus exposition endpoints.
"""

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

from app.core.metrics import (
    get_average_latency,
    get_p95_latency,
    get_cache_hit_rate,
    get_redis_status,
    get_worker_count,
    get_prometheus_metrics,
)
from app.core.task_tracker import BackgroundTaskTracker

router = APIRouter(prefix="/api/v1", tags=["Health"])


@router.get("/health", summary="Liveness check")
async def health_liveness():
    return {"status": "ok", "service": "ASTRA Backend v1"}


@router.get("/health/models", summary="ML model readiness")
async def health_models(request: Request):
    state = request.app.state
    loaded = {
        "severity_model": state.severity_model is not None,
        "closure_model": state.closure_model is not None,
        "pca_transformer": state.pca_transformer is not None,
        "faiss_index": state.faiss_index is not None,
        "similarity_db": state.similarity_db is not None,
        "spatial_clusters": state.cluster_index is not None,
        "historical_priors": state.historical_priors is not None,
        "shap_reference": state.shap_reference is not None,
        "rules": state.rules is not None,
    }
    all_ok = all(loaded.values())
    return {"status": "ok" if all_ok else "degraded", "models": loaded}


@router.get("/health/routing", summary="Routing engine readiness")
async def health_routing(request: Request):
    state = request.app.state
    graph_ready = state.road_graph is not None and state.road_graph.number_of_nodes() > 0
    return {
        "status": "ok" if graph_ready else "degraded",
        "nodes": state.road_graph.number_of_nodes() if graph_ready else 0,
        "edges": state.road_graph.number_of_edges() if graph_ready else 0,
    }


@router.get("/health/search", summary="FAISS similarity engine readiness")
async def health_search(request: Request):
    state = request.app.state
    index_ready = state.faiss_index is not None
    return {
        "status": "ok" if index_ready else "degraded",
        "vectors_indexed": int(state.faiss_index.ntotal) if index_ready else 0,
    }


@router.get("/health/performance", summary="Performance latency telemetry")
async def health_performance():
    from app.core.metrics import _WS_CONNECTIONS
    return {
        "status": "ok",
        "avg_latency_ms": round(get_average_latency(), 2),
        "p95_latency_ms": round(get_p95_latency(), 2),
        "websocket_connections": _WS_CONNECTIONS,
    }


@router.get("/health/cache", summary="Caching engine telemetry")
async def health_cache():
    return {
        "provider": "memory",
        "connected": True,
        "redis_available": False,
        "fallback_active": False,
    }


@router.get("/health/workers", summary="FastAPI worker scaling telemetry")
async def health_workers():
    return {
        "status": "ok",
        "worker_count": get_worker_count(),
    }


@router.get("/health/tasks", summary="Background tasks metadata and queue state")
async def health_tasks():
    tasks = BackgroundTaskTracker.get_all_tasks()
    active = [t for t in tasks if t["status"] == "pending"]
    failed = [t for t in tasks if t["status"] == "failed"]
    completed = [t for t in tasks if t["status"] == "completed"]
    return {
        "status": "ok",
        "active_tasks_count": len(active),
        "failed_tasks_count": len(failed),
        "completed_tasks_count": len(completed),
        "tasks": tasks,
    }


@router.get("/metrics", summary="Prometheus exporter endpoint")
async def prometheus_metrics():
    return PlainTextResponse(get_prometheus_metrics())
