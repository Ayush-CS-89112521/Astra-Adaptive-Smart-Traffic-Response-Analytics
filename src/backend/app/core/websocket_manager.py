"""
app/core/websocket_manager.py
ASTRA — WebSocket connection pool with heartbeat, idle timeout, and session cap.

Controls (per implement_backend.md):
  - Idle timeout:           5 minutes
  - Max session duration:   30 minutes
  - Heartbeat interval:     30 seconds
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Dict

from fastapi import WebSocket

from app.config import settings


class _SessionMeta:
    """Metadata tracked per active WebSocket session."""

    def __init__(self, ws: WebSocket, user: str):
        self.ws = ws
        self.user = user
        self.connected_at = datetime.now(timezone.utc)
        self.last_activity = datetime.now(timezone.utc)


class WebSocketManager:
    """
    Manages the lifecycle of active WebSocket connections.

    Usage in routes:
        session_id = await ws_manager.connect(websocket, user="operator_001")
        await ws_manager.send_step(session_id, "SEVERITY_PREDICTED", {"severity": "High"})
        ws_manager.disconnect(session_id)
    """

    def __init__(self):
        self._sessions: Dict[str, _SessionMeta] = {}

    # ------------------------------------------------------------------ #
    #  Connection management
    # ------------------------------------------------------------------ #

    async def connect(self, websocket: WebSocket, user: str) -> str:
        """Accept the connection and register a new session. Returns session_id."""
        await websocket.accept()
        session_id = str(uuid.uuid4())
        self._sessions[session_id] = _SessionMeta(websocket, user)
        from app.core.metrics import increment_ws_connections
        increment_ws_connections()
        return session_id

    def disconnect(self, session_id: str) -> None:
        """Remove session from pool (does NOT close the socket — caller's responsibility)."""
        if session_id in self._sessions:
            self._sessions.pop(session_id, None)
            from app.core.metrics import decrement_ws_connections
            decrement_ws_connections()

    # ------------------------------------------------------------------ #
    #  Sending helpers
    # ------------------------------------------------------------------ #

    async def send_step(self, session_id: str, step: str, payload: dict) -> None:
        """
        Stream a single simulation step to the client.

        Message envelope:
        {
          "step":    "SEVERITY_PREDICTED",
          "payload": { ... }
        }
        """
        meta = self._sessions.get(session_id)
        if meta is None:
            return
        meta.last_activity = datetime.now(timezone.utc)
        message = json.dumps({"step": step, "payload": payload}, default=str)
        await meta.ws.send_text(message)

    async def send_error(self, session_id: str, error: str, code: int = 400) -> None:
        """Send a structured error frame then close the connection."""
        meta = self._sessions.get(session_id)
        if meta is None:
            return
        await meta.ws.send_text(
            json.dumps({"step": "ERROR", "payload": {"error": error, "code": code}})
        )
        await meta.ws.close(code=1008)  # 1008 = Policy Violation
        self.disconnect(session_id)

    # ------------------------------------------------------------------ #
    #  Heartbeat loop (run as background task per session)
    # ------------------------------------------------------------------ #

    async def run_heartbeat(self, session_id: str) -> None:
        """
        Sends periodic pings and enforces idle + max-session timeouts.
        Should be started with asyncio.create_task() after connect().
        """
        while session_id in self._sessions:
            await asyncio.sleep(settings.WS_HEARTBEAT_SECONDS)
            meta = self._sessions.get(session_id)
            if meta is None:
                break

            now = datetime.now(timezone.utc)
            idle_seconds = (now - meta.last_activity).total_seconds()
            total_seconds = (now - meta.connected_at).total_seconds()

            # Enforce max session duration
            if total_seconds > settings.WS_MAX_SESSION_SECONDS:
                await meta.ws.send_text(
                    json.dumps({"step": "SESSION_EXPIRED", "payload": {"reason": "max_session_reached"}})
                )
                await meta.ws.close(code=1001)
                self.disconnect(session_id)
                break

            # Enforce idle timeout
            if idle_seconds > settings.WS_IDLE_TIMEOUT_SECONDS:
                await meta.ws.send_text(
                    json.dumps({"step": "SESSION_EXPIRED", "payload": {"reason": "idle_timeout"}})
                )
                await meta.ws.close(code=1001)
                self.disconnect(session_id)
                break

            # Send heartbeat ping
            try:
                await meta.ws.send_text(json.dumps({"step": "HEARTBEAT", "payload": {}}))
            except Exception:
                self.disconnect(session_id)
                break


# Singleton — imported by main.py and simulation handler
ws_manager = WebSocketManager()
