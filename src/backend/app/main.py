"""
app/main.py
ASTRA — Central FastAPI Application Entrypoint.
Registers middleware, rate-limiters, exception handlers, lifecycle events, and API routers.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
# Import torch and sentence_transformers first to prevent WinError 1114 DLL conflicts on Windows
import torch
from sentence_transformers import SentenceTransformer
import catboost
import faiss
import joblib
import json

from app.config import settings
from app.core.rate_limit import limiter, rate_limit_exceeded_handler
from app.core.audit_logger import log_event
from app.api.v1 import api_router
from app.engines.spatial_engine import build_cluster_index
from app.engines.routing_engine import build_road_graph
from app.engines.recommendation_engine import load_rules

# Setup basic stdout logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("astra.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events to load models, transformer assets, routing tables, and rules at startup
    and clean up resources at shutdown.
    """
    logger.info("Initializing ASTRA backend lifecycle...")
    
    # Initialize caching system dynamically (Redis in prod, memory fallback in dev)
    from app.core.cache import initialize_cache
    initialize_cache()
    
    import os
    from concurrent.futures import ThreadPoolExecutor
    max_ml_workers = min(4, os.cpu_count() or 4)
    logger.info("Creating dedicated ML ThreadPoolExecutor with %d workers...", max_ml_workers)
    app.state.ml_executor = ThreadPoolExecutor(max_workers=max_ml_workers, thread_name_prefix="ml_worker")
    
    logger.info("ML_MODELS_PATH is configured to: %s", settings.ML_MODELS_PATH)

    try:
        # 1. Load CatBoost Models
        logger.info("Loading CatBoost severity classification model...")
        severity_model = catboost.CatBoostClassifier()
        severity_model.load_model(str(settings.ML_MODELS_PATH / "severity_model.cbm"))
        app.state.severity_model = severity_model

        logger.info("Loading CatBoost closure prediction model...")
        closure_model = catboost.CatBoostClassifier()
        closure_model.load_model(str(settings.ML_MODELS_PATH / "closure_model.cbm"))
        app.state.closure_model = closure_model

        # 2. Load FAISS and NLP Embeddings
        logger.info("Loading FAISS PCA transformer...")
        app.state.pca_transformer = joblib.load(settings.ML_MODELS_PATH / "pca_transformer.joblib")

        logger.info("Loading FAISS index...")
        app.state.faiss_index = faiss.read_index(str(settings.ML_MODELS_PATH / "similarity_index.faiss"))

        logger.info("Loading similarity DB DataFrame...")
        app.state.similarity_db = joblib.load(settings.ML_MODELS_PATH / "similarity_db.joblib")

        logger.info("Initializing sentence-transformer (all-MiniLM-L6-v2)...")
        app.state.encoder = SentenceTransformer("all-MiniLM-L6-v2", device="cuda" if torch.cuda.is_available() else "cpu")

        # 3. Load Priors, SHAP References, and Rules
        logger.info("Loading historical priors...")
        app.state.historical_priors = joblib.load(settings.ML_MODELS_PATH / "historical_priors.joblib")

        logger.info("Loading SHAP reference data...")
        app.state.shap_reference = joblib.load(settings.ML_MODELS_PATH / "shap_reference.joblib")

        logger.info("Loading rule engine YAML files...")
        app.state.rules = load_rules()

        # 4. Load Spatial Clusters
        logger.info("Loading spatial clusters metadata...")
        with open(settings.ML_MODELS_PATH / "spatial_clusters_metadata.json", encoding="utf-8") as f:
            spatial_meta = json.load(f)
        app.state.cluster_index = build_cluster_index(spatial_meta)

        # 5. Build Routing NetworkX Graph
        logger.info("Building road network graph...")
        app.state.road_graph = build_road_graph()

        logger.info("ASTRA core initialization complete. Ready for requests.")
    except Exception as e:
        logger.critical("Failed to load models / assets during lifespan startup: %s", str(e), exc_info=True)
        # We set them to None to let /health/models report degraded state
        app.state.severity_model = None
        app.state.closure_model = None
        app.state.pca_transformer = None
        app.state.faiss_index = None
        app.state.similarity_db = None
        app.state.encoder = None
        app.state.historical_priors = None
        app.state.shap_reference = None
        app.state.rules = None
        app.state.cluster_index = None
        app.state.road_graph = None

    yield

    logger.info("ASTRA backend lifecycle shutting down.")
    logger.info("Shutting down ML ThreadPoolExecutor...")
    if hasattr(app.state, "ml_executor") and app.state.ml_executor:
        app.state.ml_executor.shutdown(wait=True)



# Create FastAPI application
app = FastAPI(
    title="ASTRA Backend",
    version="1.0.0",
    description="Backend API for Flipkart Gridlock 2.0 theme.",
    lifespan=lifespan,
)

# Attach rate limiter state to the application
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Configure CORS Middleware
# Restricting to specific origins for security compliance
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API routers
app.include_router(api_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Fallback handler to prevent raw stack traces from exposing system internals."""
    logger.error("Unhandled global exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_server_error",
            "detail": "An unexpected server error occurred." if settings.is_production else str(exc),
        },
    )
