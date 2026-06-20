"""
app/engines/similarity_engine.py
ASTRA — FAISS-based incident similarity search.

Pipeline (must mirror training):
  description → SentenceTransformer (all-MiniLM-L6-v2) → 384-D embedding
              → PCA (pca_transformer.joblib, 384→20)
              → L2 normalise → FAISS IndexFlatIP inner-product search
              → top-K metadata from similarity_db.joblib
"""

import numpy as np
from typing import Optional

from sentence_transformers import SentenceTransformer
import faiss

from app.schemas.event_request import EventRequest

# SentenceTransformer model name — must match training
_ENCODER_MODEL = "all-MiniLM-L6-v2"


from app.core.cache import cache_get, cache_set


def _encode_and_reduce(
    description: str,
    encoder: SentenceTransformer,
    pca,
) -> np.ndarray:
    """
    Encode text → 384-D → PCA 20-D → L2-normalised float32 vector.
    Returns shape (1, 20).
    """
    cached = cache_get("embeddings", description)
    if cached is not None:
        return cached.copy()

    emb = encoder.encode([description], convert_to_numpy=True)     # (1, 384)
    emb_reduced = pca.transform(emb)                               # (1, 20)
    norm = np.linalg.norm(emb_reduced, axis=1, keepdims=True)
    norm = np.where(norm == 0, 1.0, norm)                          # avoid div-by-zero
    emb_norm = (emb_reduced / norm).astype(np.float32)            # (1, 20)

    cache_set("embeddings", description, emb_norm, ttl=3600)
    return emb_norm


def search_similar(
    req: EventRequest,
    encoder: SentenceTransformer,
    pca,
    faiss_index: faiss.Index,
    similarity_db,
    top_k: int = 5,
) -> list[dict]:
    """
    Find top-K most similar historical incidents.

    Args:
        req:           Validated EventRequest (uses req.description)
        encoder:       Loaded SentenceTransformer
        pca:           Loaded PCA transformer (joblib)
        faiss_index:   Loaded FAISS IndexFlatIP
        similarity_db: DataFrame loaded from similarity_db.joblib
                       columns: description, event_cause, priority_encoded, closure_encoded
        top_k:         Number of neighbours to return

    Returns:
        List of dicts with keys: event_cause, severity, closure_probability, score
    """
    description = req.description.strip() or req.event_cause
    cache_key = (description, top_k)

    cached_matches = cache_get("similarity", cache_key)
    if cached_matches is not None:
        return cached_matches

    query_vec = _encode_and_reduce(description, encoder, pca)

    # Inner product search on L2-normalised vectors = cosine similarity
    scores, indices = faiss_index.search(query_vec, top_k)

    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0:
            continue  # FAISS returns -1 for unfilled slots
        row = similarity_db.iloc[idx]
        results.append({
            "event_cause": str(row.get("event_cause", "unknown")),
            "severity": "High" if int(row.get("priority_encoded", 0)) == 1 else "Low",
            "closure_probability": float(row.get("closure_encoded", 0)),
            "score": round(float(score), 4),
        })

    cache_set("similarity", cache_key, results, ttl=3600)

    return results
