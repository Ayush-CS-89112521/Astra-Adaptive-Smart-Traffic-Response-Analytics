"""
app/core/task_tracker.py
ASTRA — Lightweight Background Task Reliability Layer.
Tracks task status, timeouts, and exposes operational metrics.
"""

import time
import logging
from threading import Lock
from app.core import cache
from app.core.cache import get_cache_namespace

logger = logging.getLogger("astra.task_tracker")

# In-memory backup store for task metadata
_TASK_METADATA_STORE = {}
_TASK_METADATA_LOCK = Lock()

# Timeout limit for SHAP explainability background task (e.g. 5 seconds)
TASK_TIMEOUT_SECONDS = 5.0


class BackgroundTaskTracker:
    @staticmethod
    def _get_key(task_id: str) -> str:
        # Versioned cache namespace for task metadata
        ns = get_cache_namespace("task_metadata")
        return f"{ns}:{task_id}"

    @classmethod
    def set_task_status(cls, task_id: str, status: str):
        """
        Record task status in the memory store.
        """
        now = time.time()
        metadata = {
            "task_id": task_id,
            "created_at": now,
            "status": status
        }
        with _TASK_METADATA_LOCK:
            _TASK_METADATA_STORE[task_id] = metadata

    @classmethod
    def get_task_status(cls, task_id: str) -> dict:
        """
        Retrieve task metadata and check for timeouts.
        If the task remains in 'pending' status longer than TASK_TIMEOUT_SECONDS,
        transition it to 'failed' and return the updated status.
        """
        with _TASK_METADATA_LOCK:
            metadata = _TASK_METADATA_STORE.get(task_id)
                
        if metadata is None:
            return None

        # Check for timeout / stale task
        now = time.time()
        if metadata["status"] == "pending" and (now - metadata["created_at"]) > TASK_TIMEOUT_SECONDS:
            logger.warning(f"Task {task_id} has timed out. Expiring task status to 'failed'.")
            metadata["status"] = "failed"
            cls.set_task_status(task_id, "failed")
            
        return metadata

    @classmethod
    def get_all_tasks(cls) -> list:
        """
        Scan and collect all tracked tasks to compute health stats.
        """
        tasks = []
        now = time.time()
        with _TASK_METADATA_LOCK:
            # Auto-expire stale tasks in memory
            for task_id, meta in list(_TASK_METADATA_STORE.items()):
                if meta["status"] == "pending" and (now - meta["created_at"]) > TASK_TIMEOUT_SECONDS:
                    meta["status"] = "failed"
                    _TASK_METADATA_STORE[task_id] = meta
                tasks.append(meta)
                
        return tasks
