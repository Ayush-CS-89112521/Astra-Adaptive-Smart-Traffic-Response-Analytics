"""
tests/test_reliability.py
ASTRA — Reliability and Operations Unit & Integration Tests.
Verifies cache versioning isolation, rolling deployment cache safety, and background task tracker functionality.
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core import cache, task_tracker
from app.core.cache import cache_get, cache_set, get_cache_namespace
from app.core.task_tracker import BackgroundTaskTracker

@pytest.fixture(scope="module")
def client():
    from tests.test_astra_backend import _make_mock_state
    mock_state = _make_mock_state()
    with TestClient(app) as c:
        for key, val in mock_state.items():
            setattr(c.app.state, key, val)
        yield c

def test_cache_versioning_model_isolation():
    """
    Prove that if a model hash changes, old cache entries become inaccessible.
    """
    # Setup initial cache namespace & value
    cache_name = "severity"
    key = ("test_feature_val",)
    
    # Store initial model hash
    original_hashes = cache._MODEL_HASHES.copy()
    
    try:
        cache._MODEL_HASHES[cache_name] = "hash_v1"
        cache_set(cache_name, key, "result_v1")
        
        # Verify it can be read
        assert cache_get(cache_name, key) == "result_v1"
        
        # Change the hash (simulating model file update)
        cache._MODEL_HASHES[cache_name] = "hash_v2"
        
        # Verify v1 cache cannot be read by v2
        assert cache_get(cache_name, key) is None
    finally:
        # Restore hashes
        cache._MODEL_HASHES = original_hashes

def test_cache_versioning_rolling_deployment():
    """
    Prove that rolling deployments (different BUILD_IDs) do not share stale cache entries.
    """
    cache_name = "closure"
    key = ("payload_abc",)
    
    original_build_id = cache._BUILD_ID
    
    try:
        # Deploy V1
        cache._BUILD_ID = "build_v1"
        cache_set(cache_name, key, "result_v1")
        assert cache_get(cache_name, key) == "result_v1"
        
        # Deploy V2 (Rolling deployment)
        cache._BUILD_ID = "build_v2"
        assert cache_get(cache_name, key) is None
        
        # Write V2 cache
        cache_set(cache_name, key, "result_v2")
        assert cache_get(cache_name, key) == "result_v2"
        
        # Revert to V1, should read V1 value
        cache._BUILD_ID = "build_v1"
        assert cache_get(cache_name, key) == "result_v1"
    finally:
        cache._BUILD_ID = original_build_id

def test_task_tracker_lifecycle_and_timeout():
    """
    Verify the BackgroundTaskTracker lifecycle, state transitions, and timeout expiration.
    """
    task_id = "test_task_xyz_123"
    
    # Register pending task
    BackgroundTaskTracker.set_task_status(task_id, "pending")
    status_info = BackgroundTaskTracker.get_task_status(task_id)
    assert status_info["status"] == "pending"
    assert status_info["task_id"] == task_id
    
    # Complete task
    BackgroundTaskTracker.set_task_status(task_id, "completed")
    status_info = BackgroundTaskTracker.get_task_status(task_id)
    assert status_info["status"] == "completed"
    
    # Simulate a stuck pending task with a mocked old timestamp
    stuck_task_id = "stuck_task_abc"
    BackgroundTaskTracker.set_task_status(stuck_task_id, "pending")
    
    # Manually modify the created_at timestamp to be in the past (older than 5.0 seconds)
    with task_tracker._TASK_METADATA_LOCK:
        task_tracker._TASK_METADATA_STORE[stuck_task_id]["created_at"] = time.time() - 6.0
            
    # Fetch status, verifying it auto-expires to "failed"
    status_info = BackgroundTaskTracker.get_task_status(stuck_task_id)
    assert status_info["status"] == "failed"

def test_health_tasks_endpoint(client):
    """
    Verify GET /health/tasks reports active, failed, and expired tasks.
    """
    # Create some dummy tasks
    BackgroundTaskTracker.set_task_status("t1", "pending")
    BackgroundTaskTracker.set_task_status("t2", "completed")
    BackgroundTaskTracker.set_task_status("t3", "failed")
    
    # Force t1 to be expired/stuck
    with task_tracker._TASK_METADATA_LOCK:
        task_tracker._TASK_METADATA_STORE["t1"]["created_at"] = time.time() - 10.0

    r = client.get("/health/tasks")
    assert r.status_code == 200
    data = r.json()
    assert "active_tasks_count" in data
    assert "failed_tasks_count" in data
    assert "completed_tasks_count" in data
    
    # t1 should be counted as expired/failed because we queried it/scanned it
    assert data["failed_tasks_count"] >= 2


def test_cache_memory_mode_works():
    """Proves that Memory mode works."""
    from app.core import cache
    cache.initialize_cache()
    
    assert cache._USE_REDIS is False
    assert cache._redis_client is None
    
    cache.cache_set("severity", ("key2",), "val2")
    assert cache.cache_get("severity", ("key2",)) == "val2"
