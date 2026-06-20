"""
app/core/cache.py
ASTRA — Thread-safe In-Memory caching manager.
Supports dynamic model file hashing and production-grade cache versioning.
"""

import os
import logging
import hashlib
from pathlib import Path
from threading import Lock

logger = logging.getLogger("astra.cache")

# Shared module-level variables
_USE_REDIS = False
_redis_client = None

# Local thread-safe cache store
_IN_MEMORY_CACHES = {}
_IN_MEMORY_LOCK = Lock()

# Cache versioning parameters
_API_VERSION = "1.0.0"
_BUILD_ID = os.getenv("BUILD_ID", "production_build_001")
_MODEL_HASHES = {}


def initialize_cache():
    """
    Dynamically initializes the cache provider.
    Always uses in-memory cache.
    """
    global _USE_REDIS, _redis_client
    _USE_REDIS = False
    _redis_client = None
    logger.info("CACHE_PROVIDER=memory")
    print("CACHE_PROVIDER=memory", flush=True)


def is_redis_active() -> bool:
    """Returns False since Redis has been removed."""
    return False


def _compute_md5_hash(filepath: Path) -> str:
    """Computes the first 8 characters of MD5 checksum of a file."""
    if not filepath.exists():
        logger.warning(f"Model file not found for hashing: {filepath}")
        return "not_found"
    try:
        hasher = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        h = hasher.hexdigest()[:8]
        logger.info(f"Computed model hash for {filepath.name}: {h}")
        return h
    except Exception as e:
        logger.error(f"Failed to compute model hash for {filepath.name}: {e}")
        return "hash_error"


def get_cache_namespace(cache_name: str) -> str:
    """
    Generates a versioned cache namespace matching:
    astra:{API_version}:{model_hash}:{build_id}:{cache_name}
    """
    # Lazily calculate model hashes at runtime if empty
    if not _MODEL_HASHES:
        from app.config import settings
        model_dir = settings.ML_MODELS_PATH
        _MODEL_HASHES["severity"] = _compute_md5_hash(model_dir / "severity_model.cbm")
        _MODEL_HASHES["closure"] = _compute_md5_hash(model_dir / "closure_model.cbm")
        _MODEL_HASHES["explain"] = _MODEL_HASHES["severity"]
        _MODEL_HASHES["similarity"] = _compute_md5_hash(model_dir / "similarity_index.faiss")
        _MODEL_HASHES["routing"] = "grid_v1"
        _MODEL_HASHES["embeddings"] = "st_v1"
        _MODEL_HASHES["task_metadata"] = "tracker_v1"

    mhash = _MODEL_HASHES.get(cache_name, "static")
    return f"astra:{_API_VERSION}:{mhash}:{_BUILD_ID}:{cache_name}"


def cache_get(cache_name: str, key: tuple):
    """
    Retrieve value from cache by name and key.
    Returns None if cache miss.
    """
    ns = get_cache_namespace(cache_name)
    with _IN_MEMORY_LOCK:
        cache = _IN_MEMORY_CACHES.setdefault(ns, {})
        val = cache.get(key)
        from app.core.metrics import record_cache_hit, record_cache_miss
        if val is not None:
            record_cache_hit()
        else:
            record_cache_miss()
        return val


def cache_set(cache_name: str, key: tuple, value, ttl: int = 3600):
    """
    Write value to cache.
    Evicts oldest elements if in-memory cache grows past 1000 items.
    """
    ns = get_cache_namespace(cache_name)
    with _IN_MEMORY_LOCK:
        cache = _IN_MEMORY_CACHES.setdefault(ns, {})
        if len(cache) >= 1000:
            cache.pop(next(iter(cache)))
        cache[key] = value
