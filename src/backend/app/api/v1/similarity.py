"""
app/api/v1/similarity.py
ASTRA — Historical incident similarity search endpoint.

POST /api/v1/similarity/search → top-K similar historical incidents
"""

import asyncio
from fastapi import APIRouter, Depends, Request

from app.core.auth import get_current_user
from app.core.rate_limit import limiter
from app.core.audit_logger import log_event
from app.engines.similarity_engine import search_similar
from app.schemas.event_request import EventRequest
from app.schemas.prediction_response import SimilarityResponse

router = APIRouter(prefix="/api/v1/similarity", tags=["Similarity"])


@router.post(
    "/search",
    response_model=SimilarityResponse,
    summary="Find historically similar incidents",
)
@limiter.limit("20/minute")
async def similarity_search(
    request: Request,
    body: EventRequest,
    top_k: int = 5,
    current_user: dict = Depends(get_current_user),
):
    state = request.app.state
    loop = asyncio.get_running_loop()
    matches = await loop.run_in_executor(
        state.ml_executor,
        search_similar,
        body,
        state.encoder,
        state.pca_transformer,
        state.faiss_index,
        state.similarity_db,
        min(top_k, 10),  # Hard cap at 10 results
    )
    log_event(
        user=current_user["sub"],
        role=current_user["role"],
        action="similarity_search",
        endpoint="/api/v1/similarity/search",
        result="success",
        detail={"query": body.description[:100], "matches_returned": len(matches)},
    )
    return SimilarityResponse(matches=matches, query_description=body.description)

