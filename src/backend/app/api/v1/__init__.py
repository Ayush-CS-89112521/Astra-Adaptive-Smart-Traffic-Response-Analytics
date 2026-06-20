"""
ASTRA API v1 Routers
"""
from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.predictions import router as predictions_router
from app.api.v1.similarity import router as similarity_router
from app.api.v1.hotspots import router as hotspots_router
from app.api.v1.routing import router as routing_router
from app.api.v1.explainability import router as explainability_router
from app.api.v1.simulation import router as simulation_router, ws_router as simulation_ws_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(predictions_router)
api_router.include_router(similarity_router)
api_router.include_router(hotspots_router)
api_router.include_router(routing_router)
api_router.include_router(explainability_router)
api_router.include_router(simulation_router)
api_router.include_router(simulation_ws_router)


