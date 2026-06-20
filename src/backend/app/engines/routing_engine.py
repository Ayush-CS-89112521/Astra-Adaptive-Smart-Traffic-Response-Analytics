"""
app/engines/routing_engine.py
ASTRA — Diversion route generation using NetworkX (MVP).

Strategy:
  1. Build a synthetic grid graph covering Bengaluru bbox at startup.
  2. When closure_probability > threshold, apply a high edge penalty
     to the blocked segment nearest to the event.
  3. Run Dijkstra shortest path from event → nearest destination.
  4. Return GeoJSON LineString + metadata.

MVP Note: This uses a synthetic grid for Round 2 demo purposes.
Future upgrade: Replace with OSM road network via osmnx + OSRM/Valhalla.
"""

import math
import logging
import requests
import networkx as nx
from typing import Optional

logger = logging.getLogger("astra.routing")

# Bengaluru bounding box
_LAT_MIN, _LAT_MAX = 12.80, 13.27
_LON_MIN, _LON_MAX = 77.30, 77.77

# Grid resolution (~1km cells)
_GRID_STEP = 0.009  # ~1km in degrees

# Closure penalty: a very high weight to force Dijkstra to avoid blocked segments
_CLOSURE_PENALTY = 1_000.0

# Closure probability threshold above which we apply a road penalty
_CLOSURE_THRESHOLD = 0.40


def build_road_graph() -> nx.Graph:
    """
    Build a synthetic grid road graph for Bengaluru.
    Nodes: (lat_rounded, lon_rounded) grid points
    Edges: horizontal and vertical neighbours, weighted by Haversine distance (km)
    """
    G = nx.Graph()

    lats = []
    lat = _LAT_MIN
    while lat <= _LAT_MAX:
        lats.append(round(lat, 4))
        lat = round(lat + _GRID_STEP, 4)

    lons = []
    lon = _LON_MIN
    while lon <= _LON_MAX:
        lons.append(round(lon, 4))
        lon = round(lon + _GRID_STEP, 4)

    # Add nodes
    for la in lats:
        for lo in lons:
            G.add_node((la, lo))

    # Add horizontal edges
    for la in lats:
        for i in range(len(lons) - 1):
            lo1, lo2 = lons[i], lons[i + 1]
            dist = _haversine_km(la, lo1, la, lo2)
            G.add_edge((la, lo1), (la, lo2), weight=dist)

    # Add vertical edges
    for lo in lons:
        for i in range(len(lats) - 1):
            la1, la2 = lats[i], lats[i + 1]
            dist = _haversine_km(la1, lo, la2, lo)
            G.add_edge((la1, lo), (la2, lo), weight=dist)

    return G


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _snap_to_grid(lat: float, lon: float) -> tuple[float, float]:
    """
    Snap an arbitrary coordinate to the nearest grid node.

    Anchors on _LAT_MIN / _LON_MIN so the result is always an exact graph node
    (avoids floating-point drift from dividing by _GRID_STEP without a base).
    """
    n_lat = round((lat - _LAT_MIN) / _GRID_STEP)
    n_lon = round((lon - _LON_MIN) / _GRID_STEP)
    snapped_lat = round(_LAT_MIN + n_lat * _GRID_STEP, 4)
    snapped_lon = round(_LON_MIN + n_lon * _GRID_STEP, 4)
    snapped_lat = max(_LAT_MIN, min(_LAT_MAX, snapped_lat))
    snapped_lon = max(_LON_MIN, min(_LON_MAX, snapped_lon))
    return snapped_lat, snapped_lon


def _nodes_to_geojson(path: list[tuple]) -> dict:
    """Convert a list of (lat, lon) tuples to a GeoJSON LineString."""
    coordinates = [[lon, lat] for lat, lon in path]  # GeoJSON is [lon, lat]
    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates,
        },
        "properties": {},
    }


def compute_diversion(
    road_graph: nx.Graph,
    event_lat: float,
    event_lon: float,
    closure_probability: float,
    destination_lat: Optional[float] = None,
    destination_lon: Optional[float] = None,
) -> dict:
    """
    Compute a diversion route.

    Args:
        road_graph:          Pre-built NetworkX grid graph
        event_lat/lon:       Origin of the blocked segment
        closure_probability: From the closure model; >= 0.40 triggers penalty
        destination_lat/lon: Target point; defaults to Bengaluru city centre if omitted

    Returns:
        {route_geojson, distance_km, estimated_time_minutes, penalty_applied}
    """
    if road_graph is None:
        raise ValueError("Road graph is not initialised — backend startup may have failed.")

    # Default destination: Bengaluru city centre (MG Road)
    if destination_lat is None:
        destination_lat = 12.9754
    if destination_lon is None:
        destination_lon = 77.6069
    # 1. Try OSRM Real-Road Route First
    try:
        url = f"http://13.126.54.230/route/v1/driving/{event_lon},{event_lat};{destination_lon},{destination_lat}?overview=full&geometries=geojson&alternatives=true"
        resp = requests.get(url, timeout=2.0)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("code") == "Ok" and data.get("routes"):
                routes = data["routes"]
                selected_route = routes[0]
                congested_geojson = None
                penalty_applied = False

                if closure_probability >= _CLOSURE_THRESHOLD:
                    penalty_applied = True
                    # If alternative routes are available, use the first alternative to bypass the blockage
                    if len(routes) > 1:
                        selected_route = routes[1]
                        congested_geojson = {
                            "type": "Feature",
                            "geometry": routes[0]["geometry"],
                            "properties": {},
                        }
                
                distance_km = round(selected_route["distance"] / 1000.0, 3)
                estimated_time = round(selected_route["duration"] / 60.0, 1)
                
                route_geojson = {
                    "type": "Feature",
                    "geometry": selected_route["geometry"],
                    "properties": {},
                }
                
                logger.info("Successfully calculated real-road diversion via OSRM.")
                return {
                    "route_geojson": route_geojson,
                    "congested_geojson": congested_geojson,
                    "distance_km": distance_km,
                    "estimated_time_minutes": estimated_time,
                    "penalty_applied": penalty_applied,
                }
    except Exception as e:
        logger.warning(f"OSRM routing failed: {e}. Falling back to synthetic grid graph.")

    # 2. Offline Fallback: Synthetic Grid Graph using NetworkX
    G = road_graph.copy()  # Work on a copy so penalties don't persist

    origin = _snap_to_grid(event_lat, event_lon)
    destination = _snap_to_grid(destination_lat, destination_lon)

    penalty_applied = False
    congested_geojson = None
    try:
        if closure_probability >= _CLOSURE_THRESHOLD:
            # Generate the default path (without closure penalty) to represent the congested route
            try:
                orig_path = nx.shortest_path(road_graph, source=origin, target=destination, weight="weight")
                congested_geojson = _nodes_to_geojson(orig_path)
            except Exception:
                pass

            # Apply penalty to edges adjacent to the blocked segment (origin node)
            for neighbour in list(G.neighbors(origin)):
                G[origin][neighbour]["weight"] += _CLOSURE_PENALTY
            penalty_applied = True

        path = nx.shortest_path(G, source=origin, target=destination, weight="weight")
    except (nx.NetworkXNoPath, nx.NodeNotFound, nx.NetworkXError):
        # Fallback: straight-line path between origin and destination
        path = [origin, destination]

    # Compute actual road distance along the selected path
    total_dist = sum(
        _haversine_km(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1])
        for i in range(len(path) - 1)
    )

    # Assume avg speed 25 km/h in congested urban traffic
    estimated_time = (total_dist / 25.0) * 60  # minutes

    return {
        "route_geojson": _nodes_to_geojson(path),
        "congested_geojson": congested_geojson,
        "distance_km": round(total_dist, 3),
        "estimated_time_minutes": round(estimated_time, 1),
        "penalty_applied": penalty_applied,
    }
