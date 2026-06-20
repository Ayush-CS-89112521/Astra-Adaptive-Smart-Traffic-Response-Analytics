"""
app/core/metrics.py
ASTRA — Structured Operational Metrics and Prometheus Export utility.
"""

import time
import os
import psutil
from threading import Lock
from app.core import cache

# Thread-safe telemetry store
_METRICS_LOCK = Lock()
_LATENCY_HISTORY = []
_WS_CONNECTIONS = 0
_CACHE_STATS = {"hits": 0, "misses": 0}


def record_cache_hit():
    with _METRICS_LOCK:
        _CACHE_STATS["hits"] += 1


def record_cache_miss():
    with _METRICS_LOCK:
        _CACHE_STATS["misses"] += 1


def record_inference_latency(ms: float):
    with _METRICS_LOCK:
        _LATENCY_HISTORY.append(ms)
        # Keep only last 1000 records
        if len(_LATENCY_HISTORY) > 1000:
            _LATENCY_HISTORY.pop(0)


def increment_ws_connections():
    global _WS_CONNECTIONS
    with _METRICS_LOCK:
        _WS_CONNECTIONS += 1


def decrement_ws_connections():
    global _WS_CONNECTIONS
    with _METRICS_LOCK:
        _WS_CONNECTIONS = max(0, _WS_CONNECTIONS - 1)


def get_cache_hit_rate() -> float:
    with _METRICS_LOCK:
        total = _CACHE_STATS["hits"] + _CACHE_STATS["misses"]
        if total == 0:
            return 100.0
        return (_CACHE_STATS["hits"] / total) * 100.0


def get_average_latency() -> float:
    with _METRICS_LOCK:
        if not _LATENCY_HISTORY:
            return 0.0
        return sum(_LATENCY_HISTORY) / len(_LATENCY_HISTORY)


def get_p95_latency() -> float:
    with _METRICS_LOCK:
        if not _LATENCY_HISTORY:
            return 0.0
        sorted_lats = sorted(_LATENCY_HISTORY)
        idx = int(len(sorted_lats) * 0.95)
        return sorted_lats[min(idx, len(sorted_lats) - 1)]


def get_redis_status() -> str:
    return "offline"


def get_worker_count() -> int:
    """Detect number of running uvicorn worker processes."""
    try:
        current_proc = psutil.Process(os.getpid())
        parent = current_proc.parent()
        if parent:
            # Count sibling processes with the same parent name
            siblings = [p for p in parent.children() if "python" in p.name().lower()]
            return len(siblings) if siblings else 1
        return 1
    except Exception:
        # Fallback to configured cpu count or workers
        return int(os.getenv("WEB_CONCURRENCY", "4"))


def get_prometheus_metrics() -> str:
    """
    Format active telemetry metrics in Prometheus exposition format.
    """
    with _METRICS_LOCK:
        hits = _CACHE_STATS["hits"]
        misses = _CACHE_STATS["misses"]
        ws = _WS_CONNECTIONS
        avg_lat = sum(_LATENCY_HISTORY) / len(_LATENCY_HISTORY) if _LATENCY_HISTORY else 0.0
        p95_lat = get_p95_latency()

    from app.core.task_tracker import BackgroundTaskTracker
    tasks = BackgroundTaskTracker.get_all_tasks()
    active_tasks = sum(1 for t in tasks if t["status"] == "pending")
    failed_tasks = sum(1 for t in tasks if t["status"] == "failed")
    
    redis_online = 0
    workers = get_worker_count()

    lines = [
        "# HELP astra_cache_hits_total Total cache hits",
        "# TYPE astra_cache_hits_total counter",
        f"astra_cache_hits_total {hits}",
        
        "# HELP astra_cache_misses_total Total cache misses",
        "# TYPE astra_cache_misses_total counter",
        f"astra_cache_misses_total {misses}",
        
        "# HELP astra_websocket_connections Current active WS connections",
        "# TYPE astra_websocket_connections gauge",
        f"astra_websocket_connections {ws}",
        
        "# HELP astra_inference_latency_avg_ms Average inference latency in milliseconds",
        "# TYPE astra_inference_latency_avg_ms gauge",
        f"astra_inference_latency_avg_ms {avg_lat:.2f}",
        
        "# HELP astra_inference_latency_p95_ms 95th percentile inference latency in milliseconds",
        "# TYPE astra_inference_latency_p95_ms gauge",
        f"astra_inference_latency_p95_ms {p95_lat:.2f}",
        
        "# HELP astra_background_tasks_active Current pending background explainability tasks",
        "# TYPE astra_background_tasks_active gauge",
        f"astra_background_tasks_active {active_tasks}",
        
        "# HELP astra_background_tasks_failed Total failed background explainability tasks",
        "# TYPE astra_background_tasks_failed counter",
        f"astra_background_tasks_failed_total {failed_tasks}",
        
        "# HELP astra_redis_online Redis connection status (1=online, 0=offline)",
        "# TYPE astra_redis_online gauge",
        f"astra_redis_online {redis_online}",
        
        "# HELP astra_worker_processes Number of running FastAPI worker processes",
        "# TYPE astra_worker_processes gauge",
        f"astra_worker_processes {workers}"
    ]
    return "\n".join(lines) + "\n"
