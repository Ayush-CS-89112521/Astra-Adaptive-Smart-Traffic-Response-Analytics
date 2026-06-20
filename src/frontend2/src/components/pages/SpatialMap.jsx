import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SideNav } from '../layout/SideNav';
import { getHotspots, getPoliceStations, getNearestStation } from '../../api/hotspots';
import { getDiversion } from '../../api/routing';

// ---------------------------------------------------------------------------
// Fallback mock data (used when backend is offline)
// ---------------------------------------------------------------------------
const MOCK_CLUSTERS = [
  { cluster_id: 101, centroid_lat: 12.9784, centroid_lon: 77.6408, risk_score: 8.4, closure_rate: 0.75, event_count: 12 },
  { cluster_id: 102, centroid_lat: 12.9279, centroid_lon: 77.6271, risk_score: 9.2, closure_rate: 0.90, event_count: 18 },
  { cluster_id: 103, centroid_lat: 12.9591, centroid_lon: 77.5682, risk_score: 5.6, closure_rate: 0.40, event_count: 6 },
  { cluster_id: 104, centroid_lat: 13.0285, centroid_lon: 77.5896, risk_score: 7.1, closure_rate: 0.65, event_count: 9 },
];

const MOCK_STATIONS = [
  { id: 'BPS-01', name: 'Silk Board Traffic PS',       lat: 12.9176, lon: 77.6236, zone: 'South'   },
  { id: 'BPS-02', name: 'Cubbon Park Traffic PS',      lat: 12.9738, lon: 77.5960, zone: 'Central' },
  { id: 'BPS-03', name: 'Halasuru Traffic PS',         lat: 12.9748, lon: 77.6258, zone: 'East'    },
  { id: 'BPS-04', name: 'Indiranagar Traffic PS',      lat: 12.9719, lon: 77.6412, zone: 'East'    },
  { id: 'BPS-05', name: 'Whitefield Traffic PS',       lat: 12.9592, lon: 77.7474, zone: 'East'    },
  { id: 'BPS-06', name: 'Hebbal Traffic PS',           lat: 13.0355, lon: 77.5974, zone: 'North'   },
  { id: 'BPS-07', name: 'Yeshwanthpur Traffic PS',     lat: 13.0240, lon: 77.5490, zone: 'North'   },
  { id: 'BPS-08', name: 'Jayanagar Traffic PS',        lat: 12.9246, lon: 77.5833, zone: 'South'   },
  { id: 'BPS-09', name: 'Rajajinagar Traffic PS',      lat: 12.9987, lon: 77.5534, zone: 'West'    },
  { id: 'BPS-10', name: 'Electronic City Traffic PS',  lat: 12.8455, lon: 77.6603, zone: 'South'   },
  { id: 'BPS-11', name: 'Koramangala Traffic PS',      lat: 12.9352, lon: 77.6245, zone: 'South'   },
  { id: 'BPS-12', name: 'Marathahalli Traffic PS',     lat: 12.9591, lon: 77.7012, zone: 'East'    },
];

// Haversine for quick nearest-station fallback when API is offline
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestStationLocal(lat, lon, stations) {
  if (!stations.length) return null;
  let best = stations[0];
  let bestDist = haversineKm(lat, lon, best.lat, best.lon);
  for (const s of stations.slice(1)) {
    const d = haversineKm(lat, lon, s.lat, s.lon);
    if (d < bestDist) { best = s; bestDist = d; }
  }
  return { ...best, distance_km: Math.round(bestDist * 1000) / 1000 };
}

// ---------------------------------------------------------------------------
// Custom SVG DivIcons
// ---------------------------------------------------------------------------
const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="
    background:#ef4444;border:2px solid #fca5a5;border-radius:50%;
    width:14px;height:14px;box-shadow:0 0 8px #ef444480;
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const stationIcon = L.divIcon({
  className: '',
  html: `<div style="
    background: #1e3a8a;
    border: 2px solid #3b82f6;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 12px rgba(59, 130, 246, 0.8), inset 0 0 4px rgba(59, 130, 246, 0.5);
    color: #ffffff;
    font-family: sans-serif;
    font-size: 12px;
    font-weight: 900;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
  ">P</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SpatialMap() {
  const mapContainerRef  = useRef(null);
  const mapRef           = useRef(null);
  const geoJsonLayerRef  = useRef(null);
  const congestedGeoJsonLayerRef = useRef(null);
  const clustersLayerRef = useRef(null);
  const stationsLayerRef = useRef(null);
  const dispatchLineRef  = useRef(null);

  const [clusters, setClusters]               = useState([]);
  const [stations, setStations]               = useState([]);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [nearestStation, setNearestStation]   = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [showStations, setShowStations]       = useState(true);
  const [visible, setVisible]                 = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // Routing diversion form
  const [routingForm, setRoutingForm] = useState({
    event_lat:           12.9279,
    event_lon:           77.6271,
    closure_probability: 0.85,
    destination_lat:     12.9784,
    destination_lon:     77.6408,
  });
  const [routeInfo, setRouteInfo] = useState(null);

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([12.9716, 77.5946], 12);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    clustersLayerRef.current = L.layerGroup().addTo(map);
    stationsLayerRef.current = L.layerGroup().addTo(map);

    fetchAll();

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  // ── Toggle station layer visibility ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !stationsLayerRef.current) return;
    if (showStations) {
      stationsLayerRef.current.addTo(mapRef.current);
    } else {
      stationsLayerRef.current.remove();
    }
  }, [showStations]);

  // ── Fetch hotspots + stations ────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([fetchHotspots(), fetchStations()]);
    setLoading(false);
  };

  const fetchHotspots = async () => {
    try {
      const res = await getHotspots();
      const loaded = res.data?.clusters || MOCK_CLUSTERS;
      setClusters(loaded);
      renderClusters(loaded);
    } catch {
      setClusters(MOCK_CLUSTERS);
      renderClusters(MOCK_CLUSTERS);
    }
  };

  const fetchStations = async () => {
    try {
      const res = await getPoliceStations();
      const loaded = res.data?.stations || MOCK_STATIONS;
      setStations(loaded);
      renderStations(loaded);
    } catch {
      setStations(MOCK_STATIONS);
      renderStations(MOCK_STATIONS);
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderClusters = (clustersData) => {
    if (!clustersLayerRef.current) return;
    clustersLayerRef.current.clearLayers();

    clustersData.forEach((c) => {
      const isCritical = c.risk_score >= 7.0;
      const color = isCritical ? '#ef4444' : '#f97316';

      const circle = L.circle([c.centroid_lat, c.centroid_lon], {
        color,
        fillColor: color,
        fillOpacity: 0.25,
        radius: c.event_count * 35 + 200,
        weight: 1.5,
      });

      circle.bindPopup(`
        <div style="font-size:12px;line-height:1.6;min-width:160px">
          <strong style="color:#f97316">Hotspot #BGL-${c.cluster_id}</strong><br/>
          Risk Score: <b>${c.risk_score.toFixed(1)}/10</b><br/>
          Active Incidents: <b>${c.event_count}</b><br/>
          Congestion: <b>${(c.closure_rate * 100).toFixed(0)}%</b>
        </div>
      `);

      circle.on('click', () => handleClusterClick(c));
      clustersLayerRef.current.addLayer(circle);
    });
  };

  const renderStations = (stationsData) => {
    if (!stationsLayerRef.current) return;
    stationsLayerRef.current.clearLayers();

    stationsData.forEach((s) => {
      const marker = L.marker([s.lat, s.lon], { icon: stationIcon });
      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.6">
          <strong style="color:#60a5fa">🚔 ${s.name}</strong><br/>
          ID: <b>${s.id}</b> &nbsp;|&nbsp; Zone: <b>${s.zone}</b><br/>
          <span style="color:#94a3b8;font-size:10px">${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}</span>
        </div>
      `);
      stationsLayerRef.current.addLayer(marker);
    });
  };

  // ── Handle cluster click → find nearest station + update routing form destination ─────
  const handleClusterClick = async (cluster) => {
    setSelectedCluster(cluster);
    setNearestStation(null);

    // Remove any previous dispatch line if it exists
    if (dispatchLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(dispatchLineRef.current);
      dispatchLineRef.current = null;
    }

    // Find nearest station (try API first, fallback to local math)
    let station = null;
    try {
      const res = await getNearestStation(cluster.centroid_lat, cluster.centroid_lon);
      station = res.data?.nearest_station || null;
    } catch {
      station = findNearestStationLocal(cluster.centroid_lat, cluster.centroid_lon, stations.length ? stations : MOCK_STATIONS);
    }

    if (station) {
      setNearestStation(station);

      // Autofill routing form: Event origin is the cluster, Destination is the nearest Police Station
      setRoutingForm((prev) => ({
        ...prev,
        event_lat: cluster.centroid_lat,
        event_lon: cluster.centroid_lon,
        destination_lat: station.lat,
        destination_lon: station.lon,
      }));

      // Focus map view around the cluster centroid
      if (mapRef.current) {
        mapRef.current.setView([cluster.centroid_lat, cluster.centroid_lon], 13);
      }
    } else {
      // Fallback update without station coordinates
      setRoutingForm((prev) => ({
        ...prev,
        event_lat: cluster.centroid_lat,
        event_lon: cluster.centroid_lon,
      }));
    }
  };

  // ── Route diversion handler ──────────────────────────────────────────────
  const handleRoutingSubmit = async (e) => {
    e.preventDefault();
    if (!mapRef.current) return;

    setLoading(true);
    setRouteInfo(null);

    // Clear old layers
    if (geoJsonLayerRef.current) {
      mapRef.current.removeLayer(geoJsonLayerRef.current);
      geoJsonLayerRef.current = null;
    }
    if (congestedGeoJsonLayerRef.current) {
      mapRef.current.removeLayer(congestedGeoJsonLayerRef.current);
      congestedGeoJsonLayerRef.current = null;
    }

    try {
      const res = await getDiversion(routingForm);
      const data = res.data;
      const layers = [];

      // Render red congested road path
      if (data.congested_geojson) {
        const congestedLayer = L.geoJSON(data.congested_geojson, {
          style: { color: '#ef4444', weight: 5, opacity: 0.9 },
        }).addTo(mapRef.current);
        congestedGeoJsonLayerRef.current = congestedLayer;
        layers.push(congestedLayer);
      }

      // Render orange bypass diversion path
      if (data.route_geojson) {
        const routeLayer = L.geoJSON(data.route_geojson, {
          style: { color: '#f97316', weight: 4, opacity: 0.8, dashArray: '8, 4' },
        }).addTo(mapRef.current);
        geoJsonLayerRef.current = routeLayer;
        layers.push(routeLayer);
      }

      if (layers.length > 0) {
        const group = L.featureGroup(layers);
        mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
      }

      setRouteInfo({
        distance: data.distance_km,
        time: data.estimated_time_minutes,
        penaltyApplied: data.penalty_applied,
      });
    } catch {
      // Fallback mock route & congested path
      const start = [routingForm.event_lat, routingForm.event_lon];
      const end   = [routingForm.destination_lat || 12.9784, routingForm.destination_lon || 77.6408];
      
      const mockCongestedGeoJSON = {
        type: 'LineString',
        coordinates: [
          [start[1], start[0]],
          [start[1] + 0.002, start[0] + 0.002],
          [start[1] + 0.004, start[0] + 0.004],
        ],
      };

      const mockBypassGeoJSON = {
        type: 'LineString',
        coordinates: [
          [start[1], start[0]],
          [start[1] - 0.003, start[0] + 0.001],
          [end[1] - 0.005, end[0] + 0.005],
          [end[1], end[0]],
        ],
      };

      const congestedLayer = L.geoJSON(mockCongestedGeoJSON, {
        style: { color: '#ef4444', weight: 5, opacity: 0.9 },
      }).addTo(mapRef.current);
      congestedGeoJsonLayerRef.current = congestedLayer;

      const routeLayer = L.geoJSON(mockBypassGeoJSON, {
        style: { color: '#f97316', weight: 4, opacity: 0.8, dashArray: '8, 4' },
      }).addTo(mapRef.current);
      geoJsonLayerRef.current = routeLayer;

      const group = L.featureGroup([congestedLayer, routeLayer]);
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });

      setRouteInfo({ distance: 4.8, time: 14.5, penaltyApplied: true });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setRoutingForm((prev) => ({ ...prev, [name]: Number(value) }));
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 relative h-screen bg-[#1a1c1e]">

        {/* ── Top Header ── */}
        <header className={`absolute top-0 left-0 right-0 z-30 px-8 py-4 flex justify-between items-center pointer-events-none section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '0ms' }}>
          <div className="pointer-events-auto">
            <div className="bg-surface/90 map-overlay-blur px-5 py-2.5 rounded-full border border-outline-variant/40 shadow-md flex items-center gap-4">
              <span className="font-headline text-lg font-semibold text-primary">Spatial Intelligence</span>
              <div className="h-4 w-[1px] bg-outline-variant"></div>
              <div className="flex items-center gap-4 text-xs font-semibold text-on-surface-variant">
                <span className="flex items-center gap-1.5 text-on-surface-variant/70">
                  <span className="material-symbols-outlined text-[10px]">map</span>
                  Active Region: Bengaluru
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            {/* Toggle stations layer */}
            <button
              onClick={() => setShowStations((v) => !v)}
              title={showStations ? 'Hide Stations' : 'Show Stations'}
              className={`map-overlay-blur p-2.5 rounded-xl border shadow-sm flex items-center justify-center transition-colors ${
                showStations
                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                  : 'bg-surface/90 border-outline-variant/40 text-on-surface-variant hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-lg">local_police</span>
            </button>

            <button
              onClick={fetchAll}
              className="bg-surface/90 map-overlay-blur p-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
            </button>
          </div>
        </header>

        {/* ── Leaflet Map ── */}
        <div ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full" />

        {/* ── Bottom Bento Panel ── */}
        <section className={`absolute bottom-6 left-6 right-6 z-30 flex gap-4 pointer-events-none section-fade ${visible ? 'visible' : ''}`} style={{ height: '280px', transitionDelay: '100ms' }}>

          {/* Route Diversion Panel */}
          <div className="w-[37%] bg-surface/95 map-overlay-blur p-5 rounded-2xl border border-outline-variant/60 shadow-lg pointer-events-auto flex flex-col bento-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-base font-bold text-on-background">Route Diversion</h3>
              <span className="material-symbols-outlined text-primary text-lg">route</span>
            </div>

            <form onSubmit={handleRoutingSubmit} className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['event_lat',       'Block Lat'],
                  ['event_lon',       'Block Lon'],
                  ['destination_lat', 'Dest Lat'],
                  ['destination_lon', 'Dest Lon'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-0.5">{label}</label>
                    <input
                      type="number"
                      step="0.0001"
                      name={name}
                      value={routingForm[name]}
                      onChange={handleFormChange}
                      className="w-full bg-surface border border-outline-variant/40 rounded p-1.5 text-[13px] font-semibold text-on-background"
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-primary hover:bg-primary-container text-on-primary text-[12px] font-bold rounded uppercase tracking-wider transition-all mt-1"
              >
                {loading ? 'Computing...' : 'Calculate Diversion'}
              </button>
            </form>

            {routeInfo && (
              <div className="mt-2 pt-2 border-t border-outline-variant/30 text-[12px] space-y-1">
                <div className="flex justify-between"><span className="text-on-surface-variant">Distance</span><span className="font-bold font-mono">{routeInfo.distance.toFixed(1)} km</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">ETA</span><span className="font-bold font-mono">{routeInfo.time.toFixed(1)} min</span></div>
                <div className="flex justify-between"><span className="text-on-surface-variant">Penalty</span><span className="font-bold">{routeInfo.penaltyApplied ? '+2 min' : 'None'}</span></div>
              </div>
            )}
          </div>

          {/* Cluster + Nearest Station Panel */}
          <div className="w-[33%] bg-surface/95 map-overlay-blur p-5 rounded-2xl border border-outline-variant/60 shadow-lg pointer-events-auto flex flex-col bento-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-base font-bold text-on-background">Cluster Details</h3>
              <div className="flex items-center gap-1.5 bg-secondary-container px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                <span className="text-[11px] font-bold text-on-secondary-container">HDBSCAN</span>
              </div>
            </div>

            {selectedCluster ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                {/* Cluster stats */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                  <div className="flex justify-between col-span-2 border-b border-outline-variant/30 pb-1">
                    <span className="text-on-surface-variant">Cluster ID</span>
                    <span className="font-bold font-mono">#BGL-{selectedCluster.cluster_id}</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                    <span className="text-on-surface-variant">Risk Score</span>
                    <span className="font-bold text-red-400">{selectedCluster.risk_score.toFixed(1)}/10</span>
                  </div>
                  <div className="flex justify-between border-b border-outline-variant/30 pb-1">
                    <span className="text-on-surface-variant">Incidents</span>
                    <span className="font-bold text-amber-400">{selectedCluster.event_count}</span>
                  </div>
                  <div className="flex justify-between col-span-2 border-b border-outline-variant/30 pb-1">
                    <span className="text-on-surface-variant">Centroid</span>
                    <span className="font-bold font-mono text-[12px]">
                      {selectedCluster.centroid_lat.toFixed(4)}, {selectedCluster.centroid_lon.toFixed(4)}
                    </span>
                  </div>
                </div>

                {/* Nearest Station */}
                {nearestStation ? (
                  <div className="mt-3 pt-3 border-t border-outline-variant/30 bg-surface-container-high/40 rounded-xl p-3 border border-outline-variant/20">
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <div style={{
                        background: '#1e3a8a',
                        border: '1.5px solid #3b82f6',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: '900',
                        color: '#fff',
                        boxShadow: '0 0 6px rgba(59, 130, 246, 0.6)'
                      }}>P</div>
                      <span className="text-[12px] font-extrabold text-primary uppercase tracking-wider">Nearest Dispatch Unit</span>
                    </div>
                    <div className="text-[13px] space-y-1">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Station</span>
                        <span className="font-bold text-on-surface">{nearestStation.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Zone</span>
                        <span className="font-semibold text-on-surface-variant">{nearestStation.zone}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[12px] text-on-surface-variant/50 italic text-center animate-pulse">
                    Resolving nearest dispatch unit...
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-sm text-on-surface-variant/50 italic text-center gap-2">
                <span className="material-symbols-outlined text-2xl opacity-40">touch_app</span>
                Click a hotspot cluster on the map to inspect telemetry and resolve nearest dispatch unit
              </div>
            )}
          </div>

          {/* Network Summary */}
          <div className="w-[30%] bg-primary text-on-primary p-5 rounded-2xl border border-primary-container shadow-lg pointer-events-auto flex flex-col justify-start relative overflow-hidden bento-card">
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
            <div className="mb-4">
              <h3 className="font-headline text-base font-bold">Network Summary</h3>
              <p className="text-[11px] text-on-primary/70 mt-0.5 uppercase tracking-wider">Automated signal timing & path deviation</p>
            </div>

            <div className="space-y-2.5 text-[13px] flex-1">
              <div className="flex justify-between border-b border-on-primary/10 pb-1.5">
                <span>Active Clusters</span>
                <span className="font-bold font-mono">{clusters.length}</span>
              </div>
              <div className="flex justify-between border-b border-on-primary/10 pb-1.5">
                <span>Stations Online</span>
                <span className="font-bold font-mono">{stations.length}</span>
              </div>
              {nearestStation ? (
                <div className="flex justify-between border-b border-on-primary/10 pb-1.5 animate-fade-in">
                  <span>Last Dispatch</span>
                  <span className="font-bold font-mono text-[12px] bg-white/20 px-1.5 py-0.5 rounded">{nearestStation.id}</span>
                </div>
              ) : (
                <div className="text-[12px] text-on-primary/65 italic pt-1">
                  Select a cluster pointer to check dispatch
                </div>
              )}
            </div>
          </div>

        </section>
      </main>
    </div>
  );
}
