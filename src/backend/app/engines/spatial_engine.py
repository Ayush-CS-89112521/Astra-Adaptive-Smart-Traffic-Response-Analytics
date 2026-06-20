"""
app/engines/spatial_engine.py
ASTRA — Spatial hotspot intelligence using HDBSCAN cluster metadata.

Serves:
  - GET /api/v1/hotspots                      → all clusters with centroid + risk scores
  - GET /api/v1/hotspots/stations             → all police station locations
  - GET /api/v1/hotspots/nearest-station      → nearest station to a given (lat, lon)
  - POST /api/v1/predict/...                  → nearest cluster for a given (lat, lon)
"""

import json
import math
from typing import Optional


# ---------------------------------------------------------------------------
# Bengaluru Traffic Police Station Registry (in-memory, no DB required)
# Coordinates sourced from publicly listed station addresses.
# ---------------------------------------------------------------------------
BENGALURU_POLICE_STATIONS: list[dict] = [
    {"id": "BPS-01", "name": "Silk Board Traffic PS",        "lat": 12.9176, "lon": 77.6236, "zone": "South"},
    {"id": "BPS-02", "name": "Cubbon Park Traffic PS",       "lat": 12.9738, "lon": 77.5960, "zone": "Central"},
    {"id": "BPS-03", "name": "Halasuru Traffic PS",          "lat": 12.9748, "lon": 77.6258, "zone": "East"},
    {"id": "BPS-04", "name": "Indiranagar Traffic PS",       "lat": 12.9719, "lon": 77.6412, "zone": "East"},
    {"id": "BPS-05", "name": "Whitefield Traffic PS",        "lat": 12.9592, "lon": 77.7474, "zone": "East"},
    {"id": "BPS-06", "name": "Hebbal Traffic PS",            "lat": 13.0355, "lon": 77.5974, "zone": "North"},
    {"id": "BPS-07", "name": "Yeshwanthpur Traffic PS",      "lat": 13.0240, "lon": 77.5490, "zone": "North"},
    {"id": "BPS-08", "name": "Jayanagar Traffic PS",         "lat": 12.9246, "lon": 77.5833, "zone": "South"},
    {"id": "BPS-09", "name": "Rajajinagar Traffic PS",       "lat": 12.9987, "lon": 77.5534, "zone": "West"},
    {"id": "BPS-10", "name": "Electronic City Traffic PS",   "lat": 12.8455, "lon": 77.6603, "zone": "South"},
    {"id": "BPS-11", "name": "Koramangala Traffic PS",       "lat": 12.9352, "lon": 77.6245, "zone": "South"},
    {"id": "BPS-12", "name": "Marathahalli Traffic PS",      "lat": 12.9591, "lon": 77.7012, "zone": "East"},
]


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_cluster_index(spatial_clusters_meta: dict) -> list[dict]:
    """
    Convert raw cluster metadata JSON into a list of enriched cluster dicts.

    spatial_clusters_meta: loaded from spatial_clusters_metadata.json
    Keys per cluster: {total_incidents, closure_rate, high_severity_rate}
    Note: -1 key = noise points from HDBSCAN → excluded.

    Returns list of cluster dicts (sorted by risk score descending):
        [{cluster_id, centroid_lat, centroid_lon, risk_score, closure_rate, event_count}, ...]
    """
    clusters = []
    for cluster_id_str, meta in spatial_clusters_meta.items():
        cluster_id = int(cluster_id_str)
        if cluster_id == -1:
            continue  # Skip HDBSCAN noise points

        # Risk score = weighted combination of closure_rate and high_severity_rate (0–10)
        closure_rate = float(meta.get("closure_rate", 0.0))
        sev_rate = float(meta.get("high_severity_rate", 0.0))
        risk_score = round((0.6 * closure_rate + 0.4 * sev_rate) * 10, 2)

        # Load real centroid coordinates calculated during training pipeline run
        centroid_lat = float(meta.get("centroid_lat", 12.9716))
        centroid_lon = float(meta.get("centroid_lon", 77.5946))


        clusters.append({
            "cluster_id": cluster_id,
            "centroid_lat": centroid_lat,
            "centroid_lon": centroid_lon,
            "risk_score": risk_score,
            "closure_rate": round(closure_rate, 4),
            "event_count": int(meta.get("total_incidents", 0)),
        })

    clusters.sort(key=lambda c: c["risk_score"], reverse=True)
    return clusters


def find_nearest_cluster(
    lat: float,
    lon: float,
    cluster_index: list[dict],
) -> Optional[dict]:
    """
    Find the nearest cluster centroid to the given coordinates.

    Returns the closest cluster dict plus a distance_km field,
    or None if cluster_index is empty.
    """
    if not cluster_index:
        return None

    best = min(
        cluster_index,
        key=lambda c: _haversine_km(lat, lon, c["centroid_lat"], c["centroid_lon"]),
    )
    distance_km = _haversine_km(lat, lon, best["centroid_lat"], best["centroid_lon"])
    return {**best, "distance_km": round(distance_km, 3)}


def find_nearest_station(lat: float, lon: float) -> Optional[dict]:
    """
    Find the nearest Bengaluru traffic police station to the given coordinates.

    Uses Haversine distance against the static BENGALURU_POLICE_STATIONS registry.
    Returns station dict enriched with distance_km, or None if registry is empty.

    Example return:
        {
          "id": "BPS-11",
          "name": "Koramangala Traffic PS",
          "lat": 12.9352,
          "lon": 77.6245,
          "zone": "South",
          "distance_km": 0.842
        }
    """
    if not BENGALURU_POLICE_STATIONS:
        return None

    best = min(
        BENGALURU_POLICE_STATIONS,
        key=lambda s: _haversine_km(lat, lon, s["lat"], s["lon"]),
    )
    distance_km = _haversine_km(lat, lon, best["lat"], best["lon"])
    return {**best, "distance_km": round(distance_km, 3)}
