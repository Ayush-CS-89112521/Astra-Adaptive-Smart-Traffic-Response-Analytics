"""
app/config.py
ASTRA Backend — centralised settings loaded from environment / .env file.
All other modules import `settings` from here; never read os.environ directly.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend root directory (parent of app/)
_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BASE_DIR / ".env")


class Settings:
    # ------------------------------------------------------------------ #
    #  JWT
    # ------------------------------------------------------------------ #
    JWT_SECRET: str = os.getenv("JWT_SECRET", "CHANGE_ME_IN_PRODUCTION")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

    # ------------------------------------------------------------------ #
    #  Environment
    # ------------------------------------------------------------------ #
    API_ENV: str = os.getenv("API_ENV", "development")

    @property
    def is_production(self) -> bool:
        return self.API_ENV == "production"

    # ------------------------------------------------------------------ #
    #  ML Model Paths
    # ------------------------------------------------------------------ #
    ML_MODELS_PATH: Path = Path(
        os.getenv("ML_MODELS_PATH", str(_BASE_DIR / "../ml/models"))
    ).resolve()

    # ------------------------------------------------------------------ #
    #  CORS
    # ------------------------------------------------------------------ #
    @property
    def allowed_origins(self) -> list[str]:
        raw = os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:5173",
        )
        return [o.strip() for o in raw.split(",") if o.strip()]

    # ------------------------------------------------------------------ #
    #  Logging
    # ------------------------------------------------------------------ #
    LOG_DIR: Path = Path(os.getenv("LOG_DIR", str(_BASE_DIR / "logs"))).resolve()

    # ------------------------------------------------------------------ #
    #  Bengaluru Geographic Bounds (used by Pydantic validators)
    # ------------------------------------------------------------------ #
    LAT_MIN: float = 12.80
    LAT_MAX: float = 13.27
    LON_MIN: float = 77.30
    LON_MAX: float = 77.77



    # ------------------------------------------------------------------ #
    #  WebSocket Session Controls
    # ------------------------------------------------------------------ #
    WS_IDLE_TIMEOUT_SECONDS: int = 300    # 5 minutes
    WS_MAX_SESSION_SECONDS: int = 1800    # 30 minutes
    WS_HEARTBEAT_SECONDS: int = 30


# Singleton — all modules import this
settings = Settings()
