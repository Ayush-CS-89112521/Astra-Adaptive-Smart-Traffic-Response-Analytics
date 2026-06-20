"""
tests/conftest.py
ASTRA — Pytest configuration and shared fixtures.
"""

import os
import pytest

# Set environment variables before any app imports occur
os.environ.setdefault("JWT_SECRET", "test-secret-astra-testing-only-32+")
os.environ.setdefault("API_ENV", "development")
os.environ.setdefault("ML_MODELS_PATH", ".")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
os.environ.setdefault("LOG_DIR", "./logs")
