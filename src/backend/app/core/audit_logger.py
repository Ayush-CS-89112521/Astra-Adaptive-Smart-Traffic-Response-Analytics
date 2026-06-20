"""
app/core/audit_logger.py
ASTRA — Structured JSON audit log writer.

Log format (one JSON object per line in logs/audit.jsonl):
{
  "timestamp": "2026-06-17T09:00:00Z",
  "user":      "operator_001",
  "role":      "traffic_operator",
  "action":    "predict_severity",
  "endpoint":  "/api/v1/predict/severity",
  "result":    "success",
  "detail":    {...}   # optional extra context
}
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.config import settings

# Ensure log directory exists
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
_AUDIT_FILE = settings.LOG_DIR / "audit.jsonl"

# Use a dedicated logger that writes to the audit file
_logger = logging.getLogger("astra.audit")
_logger.setLevel(logging.INFO)

# File handler — append mode
_fh = logging.FileHandler(_AUDIT_FILE, encoding="utf-8")
_fh.setFormatter(logging.Formatter("%(message)s"))
_logger.addHandler(_fh)
_logger.propagate = False  # Don't duplicate to root logger


def log_event(
    *,
    user: str,
    role: str,
    action: str,
    endpoint: str,
    result: str,
    detail: Optional[dict] = None,
) -> None:
    """
    Write one structured audit record.

    Args:
        user:     JWT subject (user ID)
        role:     JWT role claim
        action:   Short action identifier e.g. "predict_severity"
        endpoint: Full request path
        result:   "success" | "failure" | "error"
        detail:   Optional extra payload (inputs, error msg, etc.)
    """
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user": user,
        "role": role,
        "action": action,
        "endpoint": endpoint,
        "result": result,
    }
    if detail:
        record["detail"] = detail

    _logger.info(json.dumps(record, default=str))


def log_login_attempt(*, user: str, success: bool, ip: Optional[str] = None) -> None:
    """Convenience wrapper for login audit events."""
    log_event(
        user=user,
        role="unknown",
        action="login_attempt",
        endpoint="/auth/token",
        result="success" if success else "failure",
        detail={"ip": ip},
    )
