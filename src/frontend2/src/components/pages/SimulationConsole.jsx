import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SideNav } from '../layout/SideNav';
import { TopBar } from '../layout/TopBar';
import { runSimulation } from '../../api/predictions';
import { useSimulationWS } from '../../hooks/useSimulationWS';


const DEFAULT_FORM = {
  event_type: 'unplanned',
  event_cause: 'vehicle_breakdown',
  latitude: 12.9716,
  longitude: 77.5946,
  description: '',
  vehicle_type: 'car',
  corridor: 'Outer Ring Road',
  hour: new Date().getHours(),
};

const CORRIDORS = [
  'Outer Ring Road',
  'Hosur Road',
  'Sarjapur Road',
  'Old Madras Road',
  'Bannerghatta Road',
  'Mysore Road',
  'Tumkur Road',
  'Bellary Road',
];

const CORRIDOR_COORDINATES = {
  'Outer Ring Road': [12.9279, 77.6271],
  'Hosur Road': [12.9038, 77.6360],
  'Sarjapur Road': [12.9184, 77.6708],
  'Old Madras Road': [12.9904, 77.6710],
  'Bannerghatta Road': [12.8956, 77.5985],
  'Mysore Road': [12.9538, 77.5410],
  'Tumkur Road': [13.0298, 77.5407],
  'Bellary Road': [13.0359, 77.5975],
};

const EVENT_TYPES = [
  { value: 'unplanned', label: 'Unplanned Incident (Accident, breakdown)' },
  { value: 'planned', label: 'Planned Event (Marathon, VIP Movement)' },
];

const CAUSES = [
  { value: 'vehicle_breakdown', label: 'Vehicle Breakdown' },
  { value: 'accident', label: 'Road Accident' },
  { value: 'flooding', label: 'Water Logging / Flooding' },
  { value: 'roadworks', label: 'Active Roadworks' },
  { value: 'spillage', label: 'Oil/Material Spillage' },
];

const VEHICLES = [
  { value: 'two_wheeler', label: 'Two-Wheeler' },
  { value: 'car', label: 'Car / SUV' },
  { value: 'auto', label: 'Auto Rickshaw' },
  { value: 'bus', label: 'BMTC / Private Bus' },
  { value: 'heavy_vehicle', label: 'Heavy Commercial Vehicle (HCV)' },
];

export default function SimulationConsole() {
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const { messages, status, error, connectAndRun, disconnect } = useSimulationWS();
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [quickResult, setQuickResult] = useState(null);
  const [activeResults, setActiveResults] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const isUpdatingFromMap = useRef(false);

  // Helper to round float coordinates to 4 decimal places
  const roundToFour = (num) => Math.round(num * 10000) / 10000;

  // Initialize Leaflet Map preview
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialLat = form.latitude || 12.9716;
    const initialLon = form.longitude || 77.5946;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      touchZoom: true,
      minZoom: 10,
      maxBounds: [[12.50, 77.00], [13.50, 78.10]],
      maxBoundsViscosity: 1.0
    });
    mapRef.current = map;

    // Dark theme matching tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20
    }).addTo(map);

    // Initial center on Bengaluru
    map.setView([initialLat, initialLon], 12);

    // Custom theme-colored SVG marker icon (Safety Orange fill with White outline for high contrast)
    const customIcon = L.divIcon({
      html: `
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#f97316" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
      `,
      className: 'custom-theme-marker !bg-transparent !border-none',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    // Create marker with custom icon
    const marker = L.marker([initialLat, initialLon], {
      draggable: true,
      icon: customIcon
    }).addTo(map);
    markerRef.current = marker;

    // Marker drag behavior
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      isUpdatingFromMap.current = true;
      setForm((prev) => ({
        ...prev,
        latitude: roundToFour(pos.lat),
        longitude: roundToFour(pos.lng)
      }));
      setTimeout(() => {
        isUpdatingFromMap.current = false;
      }, 50);
    });

    // Map click behavior to move marker and update input coordinates
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      isUpdatingFromMap.current = true;
      setForm((prev) => ({
        ...prev,
        latitude: roundToFour(lat),
        longitude: roundToFour(lng)
      }));
      setTimeout(() => {
        isUpdatingFromMap.current = false;
      }, 50);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync state changes from input fields back to the Leaflet map preview (keeping map frame static)
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || isUpdatingFromMap.current) return;

    const lat = Number(form.latitude);
    const lon = Number(form.longitude);

    if (!isNaN(lat) && !isNaN(lon) && lat >= 12.00 && lat <= 14.00 && lon >= 76.50 && lon <= 78.50) {
      markerRef.current.setLatLng([lat, lon]);
    }
  }, [form.latitude, form.longitude]);

  // Aggregate WebSocket streamed messages progressively into activeResults
  useEffect(() => {
    if (messages.length === 0) {
      if (!quickResult) {
        setActiveResults(null);
      }
      return;
    }

    const results = {};
    messages.forEach((msg) => {
      if (msg.step === 'VALIDATION_COMPLETE') {
        results.validated_input = msg.payload?.validated_input;
      } else if (msg.step === 'SEVERITY_PREDICTED') {
        results.severity = msg.payload?.severity;
        results.confidence = msg.payload?.confidence;
      } else if (msg.step === 'CLOSURE_PREDICTED') {
        results.closure_probability = msg.payload?.closure_probability;
      } else if (msg.step === 'SIMILAR_INCIDENTS') {
        results.similar_incidents = msg.payload?.matches;
      } else if (msg.step === 'DIVERSION_GENERATED') {
        results.route_geojson = msg.payload?.route_geojson;
        results.congested_geojson = msg.payload?.congested_geojson;
        results.distance_km = msg.payload?.distance_km;
        results.estimated_time_minutes = msg.payload?.estimated_time_minutes;
        results.penalty_applied = msg.payload?.penalty_applied;
      } else if (msg.step === 'RECOMMENDATIONS') {
        results.recommendation = msg.payload;
      }
    });

    if (results.severity && results.closure_probability !== undefined) {
      const isHigh = results.severity.toLowerCase() === 'high';
      const baseQueue = isHigh ? 1000 : 200;
      results.queue_length_meters = Math.round(results.closure_probability * 2000 + baseQueue);
      
      const baseDelay = isHigh ? 15.0 : 5.0;
      results.estimated_delay_minutes = Math.round((results.closure_probability * 30.0 + baseDelay) * 10) / 10;
    }

    setActiveResults(results);
  }, [messages, quickResult]);

  // Save active simulation state to localStorage
  useEffect(() => {
    if (activeResults) {
      localStorage.setItem('astra_active_simulation', JSON.stringify({
        activeResults,
        form
      }));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('astra_simulation_change'));
    }
  }, [activeResults, form]);

  // No route drawing layer needed as map is strictly for coordinates location pointer


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = {
        ...prev,
        [name]: name === 'latitude' || name === 'longitude' || name === 'hour'
          ? (value === '' ? '' : Number(value))
          : value
      };
      if (name === 'corridor' && CORRIDOR_COORDINATES[value]) {
        const [lat, lon] = CORRIDOR_COORDINATES[value];
        updated.latitude = lat;
        updated.longitude = lon;
      }
      return updated;
    });
  };

  const handleReset = () => {
    setForm({ ...DEFAULT_FORM });
    setTerminalLogs([]);
    setQuickResult(null);
    setActiveResults(null);
    localStorage.removeItem('astra_active_simulation');
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('astra_simulation_change'));
    disconnect();
    if (mapRef.current) {
      mapRef.current.setView([12.9716, 77.5946], 12);
    }
  };

  const validateCoordinates = () => {
    const lat = Number(form.latitude);
    const lon = Number(form.longitude);
    if (isNaN(lat) || lat < 12.00 || lat > 14.00) {
      return `Latitude must be within the Bengaluru region [12.00, 14.00]. Got: ${form.latitude}`;
    }
    if (isNaN(lon) || lon < 76.50 || lon > 78.50) {
      return `Longitude must be within the Bengaluru region [76.50, 78.50]. Got: ${form.longitude}`;
    }
    return null;
  };

  const formatTerminalPayload = (payload) => {
    if (!payload) return '';
    try {
      const cleanPayload = JSON.parse(JSON.stringify(payload));
      if (cleanPayload.route_geojson) {
        const coords = cleanPayload.route_geojson.geometry?.coordinates || [];
        cleanPayload.route_geojson = {
          type: cleanPayload.route_geojson.type || 'Feature',
          geometry: {
            type: cleanPayload.route_geojson.geometry?.type || 'LineString',
            coordinates: `[LineString path: ${coords.length} coordinates hidden]`
          },
          properties: cleanPayload.route_geojson.properties || {}
        };
      }
      return JSON.stringify(cleanPayload, null, 2);
    } catch (err) {
      return JSON.stringify(payload, null, 2);
    }
  };

  const executeQuickPredict = async (e) => {
    e.preventDefault();
    disconnect();
    setQuickResult(null);
    setActiveResults(null);

    const valError = validateCoordinates();
    if (valError) {
      setTerminalLogs([
        { timestamp: new Date().toLocaleTimeString(), message: `[VALIDATION ERROR] ${valError}`, type: 'error' }
      ]);
      return;
    }

    setTerminalLogs([
      { timestamp: new Date().toLocaleTimeString(), message: '[SYSTEM] Initiating HTTP Quick Predict...', type: 'info' }
    ]);

    try {
      const res = await runSimulation(form);
      setQuickResult(res.data);
      setActiveResults(res.data);
      setTerminalLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: `[SUCCESS] Severity: ${res.data.severity} | Confidence: ${(res.data.confidence * 100).toFixed(1)}%`, type: 'success' },
        { timestamp: new Date().toLocaleTimeString(), message: `[METRICS] Queue Length: ${res.data.queue_length_meters}m | Est. Delay: ${res.data.estimated_delay_minutes} mins`, type: 'detail' }
      ]);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || 'Quick Predict failed';
      setTerminalLogs((prev) => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: `[ERROR] ${errMsg}`, type: 'error' }
      ]);
    }
  };

  const executeLiveSimulation = (e) => {
    e.preventDefault();
    setQuickResult(null);
    setActiveResults(null);

    const valError = validateCoordinates();
    if (valError) {
      setTerminalLogs([
        { timestamp: new Date().toLocaleTimeString(), message: `[VALIDATION ERROR] ${valError}`, type: 'error' }
      ]);
      return;
    }

    connectAndRun(form);
  };


  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden">
        <TopBar title="Simulation Console" breadcrumbs={['Incident Simulation', 'Console']} />

        <div className="flex-1 p-8 grid grid-cols-12 gap-6 overflow-y-auto custom-scrollbar">
          {/* Left Panel: 7-cols Incident intake Form */}
          <form className={`col-span-12 lg:col-span-7 space-y-6 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '0ms' }}>
            {/* Spatial mapping card */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm bento-card">
              <h3 className="font-headline text-lg font-bold text-on-background mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span> Spatial Mapping
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleInputChange}
                    min="12.80"
                    max="13.27"
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleInputChange}
                    min="77.30"
                    max="77.77"
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary focus:border-primary"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Primary Corridor</label>
                  <select
                    name="corridor"
                    value={form.corridor}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary focus:border-primary"
                  >
                    {CORRIDORS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Operational Metrics Card */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm bento-card">
              <h3 className="font-headline text-lg font-bold text-on-background mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">traffic</span> Operational Metrics
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Event Type</label>
                  <select
                    name="event_type"
                    value={form.event_type}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary"
                  >
                    {EVENT_TYPES.map((et) => (
                      <option key={et.value} value={et.value}>{et.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Primary Cause</label>
                  <select
                    name="event_cause"
                    value={form.event_cause}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary"
                  >
                    {CAUSES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Primary Vehicle Involved</label>
                  <select
                    name="vehicle_type"
                    value={form.vehicle_type}
                    onChange={handleInputChange}
                    className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary"
                  >
                    {VEHICLES.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Contextual Card */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm bento-card">
              <h3 className="font-headline text-lg font-bold text-on-background mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span> Temporal Context
              </h3>
              <div className="max-w-xs">
                <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-2">Hour of Day (0-23)</label>
                <input
                  type="number"
                  name="hour"
                  value={form.hour}
                  onChange={handleInputChange}
                  className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary"
                  min="0"
                  max="23"
                />
              </div>
            </div>

            {/* Semantic Description */}
            <div className="bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm bento-card">
              <h3 className="font-headline text-lg font-bold text-on-background mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">chat_bubble</span> Semantic Incident Description
              </h3>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows="3"
                placeholder="Describe the incident to query similar patterns via FAISS similarity search..."
                className="w-full bg-surface border border-outline-variant/50 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4 items-center">
              <button
                type="submit"
                onClick={executeLiveSimulation}
                className="flex-1 bg-primary hover:bg-primary-container text-on-primary py-3 rounded-lg text-xs font-bold shadow-md hover:-translate-y-0.5 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                disabled={status === 'running'}
              >
                <span className="material-symbols-outlined text-base">play_arrow</span>
                Run Live Simulation
              </button>
              <button
                type="button"
                onClick={executeQuickPredict}
                className="bg-surface-container-high border border-outline-variant/70 text-on-surface py-3 px-6 rounded-lg text-xs font-bold shadow-sm hover:bg-secondary-container transition-all uppercase tracking-wider flex items-center justify-center gap-2"
                disabled={status === 'running'}
              >
                <span className="material-symbols-outlined text-base">bolt</span>
                Quick Predict
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="p-3 bg-surface-container-high border border-outline-variant/70 hover:bg-rose-100 hover:text-rose-700 text-on-surface-variant rounded-lg transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined">restart_alt</span>
              </button>
            </div>
          </form>

          {/* Right Panel: 5-cols Map + Terminal Console */}
          <div className={`col-span-12 lg:col-span-5 flex flex-col gap-6 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '150ms' }}>
            {/* Map Preview */}
            <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/60 shadow-sm relative overflow-hidden bento-card">
              <div className="absolute top-3 left-3 z-[1000] flex gap-2 pointer-events-none">
                <span className="px-2 py-0.5 bg-primary text-on-primary text-[9px] font-extrabold rounded-full">LIVE GRID</span>
                <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[9px] font-bold rounded-full border border-outline-variant/30">BENGALURU CENTRAL</span>
              </div>
              <div ref={mapContainerRef} className="w-full h-[18rem] rounded-xl overflow-hidden bg-[#1a1c1e] relative z-10" style={{ height: '18rem' }} />
            </div>


            {/* Dark Styled Simulation Terminal */}
            <div className="flex-1 bg-[#181615] rounded-2xl border border-[#302824] p-4 flex flex-col min-h-[350px] shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-[#302824] pb-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-on-surface-variant font-bold font-mono ml-2">SIMULATION_TERMINAL</span>
                </div>
                <div className="text-[10px] text-primary/80 font-bold font-mono">
                  {status === 'running' ? 'STREAMING...' : 'IDLE'}
                </div>
              </div>

              {/* Terminal Message Stream */}
              <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[11px] space-y-2 pr-1 max-h-[450px]">
                {terminalLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-on-surface-variant mr-2">[{log.timestamp}]</span>
                    <span className={
                      log.type === 'error' ? 'text-rose-400 font-bold' :
                      log.type === 'success' ? 'text-emerald-400 font-bold' :
                      log.type === 'detail' ? 'text-amber-200' : 'text-primary'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}

                {/* Live socket message streaming */}
                {messages.map((msg, idx) => (
                  <div key={`msg-${idx}`} className="leading-relaxed border-t border-[#302824]/30 pt-1">
                    <div className="flex justify-between items-center text-primary font-bold">
                      <span>&gt; {msg.step}</span>
                      <span className="text-[9px] text-on-surface-variant">READY</span>
                    </div>
                    {msg.payload && (
                      <pre className="text-amber-100/90 pl-3 mt-1 overflow-x-auto whitespace-pre-wrap">
                        {formatTerminalPayload(msg.payload)}
                      </pre>
                    )}
                  </div>
                ))}

                {status === 'running' && (
                  <div className="text-emerald-400 font-bold animate-pulse mt-2 flex items-center gap-1">
                    <span>█</span> Streaming data steps...
                  </div>
                )}

                {error && (
                  <div className="text-rose-400 font-bold mt-2">
                    [WS ERROR] {error}
                  </div>
                )}

                {terminalLogs.length === 0 && messages.length === 0 && !error && (
                  <div className="text-on-surface-variant/50 italic py-8 text-center">
                    Awaiting intake execution parameters...
                  </div>
                )}
              </div>

              {/* Step indicator */}
              {status === 'running' && (
                <div className="mt-3 bg-[#24201e] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-300"
                    style={{ width: `${(messages.length / 8) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Simulation Results Dashboard */}
          {activeResults && (
            <div className="col-span-12 mt-12 border-t border-outline-variant/40 pt-10 space-y-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-primary font-bold font-body">Operational Intelligence</span>
                  <h2 className="font-headline text-4xl font-normal text-on-background mt-1 leading-tight">
                    Incident Operational Assessment
                  </h2>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
                  <span className="text-[11px] font-bold text-on-surface-variant/80 uppercase tracking-widest font-body">
                    {status === 'running' ? 'Assessment in progress...' : 'Assessment Complete'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Predictive Risk Card */}
                <div className="bg-white p-6 rounded-xl border border-outline-variant/40 soft-shadow bento-card">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="font-headline text-xl font-bold text-on-background">Predictive Risk</h2>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${
                      activeResults.severity?.toLowerCase() === 'high' ? 'bg-tertiary/10 text-tertiary' : 'bg-primary/10 text-primary'
                    }`}>
                      {activeResults.severity || 'Medium'}
                    </span>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold font-body">Confidence Score</p>
                        <p className="text-3xl font-headline text-primary font-bold">{Math.round((activeResults.confidence || 0) * 100)}%</p>
                      </div>
                      <div className="w-16 h-16 relative">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" fill="none" r="16" stroke="#f2ece4" strokeWidth="4"></circle>
                          <circle
                            cx="18"
                            cy="18"
                            fill="none"
                            r="16"
                            stroke={activeResults.severity?.toLowerCase() === 'high' ? '#8c3c3c' : '#c2652a'}
                            strokeWidth="4"
                            strokeDasharray={`${Math.round((activeResults.confidence || 0) * 100)}, 100`}
                          ></circle>
                        </svg>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-container-low p-4 rounded-lg">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 font-body">Closure Prob.</p>
                        <p className="text-xl font-bold font-body">{Math.round((activeResults.closure_probability || 0) * 100)}%</p>
                      </div>
                      <div className="bg-surface-container-low p-4 rounded-lg">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 font-body">Current Queue</p>
                        <p className="text-xl font-bold font-body">{activeResults.queue_length_meters || 0} meters</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 border-t border-outline-variant/40 pt-4">
                      <div className="flex-1">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-1 font-body">Est. Delay</p>
                        <p className="text-3xl font-headline font-bold text-tertiary">{activeResults.estimated_delay_minutes || 0} mins</p>
                      </div>
                      <span className="material-symbols-outlined text-tertiary text-4xl">schedule</span>
                    </div>
                  </div>
                </div>

                {/* Routing Card */}
                {activeResults.route_geojson ? (
                  <div className="bg-primary text-on-primary p-6 rounded-xl soft-shadow flex flex-col justify-start relative overflow-hidden bento-card">
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined text-sm">directions_alt</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 font-body">
                          {activeResults.penalty_applied ? 'Diversion Active' : 'Standard Route'}
                        </span>
                      </div>
                      <h3 className="text-4xl font-headline font-bold">{activeResults.distance_km} km</h3>
                      <p className="text-sm opacity-90 font-body mt-1">{activeResults.estimated_time_minutes} mins transit duration</p>

                      <div className="mt-8 pt-6 border-t border-white/20 space-y-3 text-xs opacity-95">
                        <div className="flex justify-between items-center">
                          <span className="font-body opacity-80 uppercase tracking-widest text-[9px]">Affected Corridor</span>
                          <span className="font-bold font-body">{form.corridor}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-body opacity-80 uppercase tracking-widest text-[9px]">Origin Location</span>
                          <span className="font-mono text-[11px]">{form.latitude}, {form.longitude}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-body opacity-80 uppercase tracking-widest text-[9px]">Routing Mode</span>
                          <span className="font-bold font-body text-white bg-white/20 px-2.5 py-0.5 rounded text-[9px] uppercase tracking-widest">
                            {activeResults.penalty_applied ? 'Detour Applied' : 'Optimal Path'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-xl border border-outline-variant/40 soft-shadow flex items-center justify-center text-on-surface-variant/50 italic text-xs font-body">
                    No active diversion route generated.
                  </div>
                )}

                {/* Operational Directives Panel */}
                <div className="bg-white p-6 rounded-xl border border-outline-variant/40 soft-shadow bento-card">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h2 className="font-headline text-xl font-bold">Operational Directives</h2>
                      <p className="text-[10px] text-on-surface-variant font-body">Live deployment status for Incident</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest font-body">
                        {activeResults.recommendation?.escalation_level || 'LOW'}
                      </span>
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        activeResults.recommendation?.escalation_level?.toLowerCase() === 'critical' || activeResults.recommendation?.escalation_level?.toLowerCase() === 'high'
                          ? 'bg-tertiary' : 'bg-primary'
                      }`}></div>
                    </div>
                  </div>
                  {activeResults.recommendation ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container border border-outline-variant/40">
                          <span className="material-symbols-outlined text-primary mb-1 text-lg">person</span>
                          <p className="text-xl font-headline font-bold">{activeResults.recommendation.officers_required || 0}</p>
                          <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-body">Officers</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container border border-outline-variant/40">
                          <span className="material-symbols-outlined text-primary mb-1 text-lg">fence</span>
                          <p className="text-xl font-headline font-bold">{activeResults.recommendation.barricades_required || 0}</p>
                          <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-body">Barricades</p>
                        </div>
                        <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface-container border border-outline-variant/40">
                          <span className="material-symbols-outlined text-primary mb-1 text-lg">local_shipping</span>
                          <p className="text-xl font-headline font-bold">{activeResults.recommendation.tow_trucks_required || 0}</p>
                          <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-body">Trucks</p>
                        </div>
                      </div>
                      {activeResults.recommendation.actions && activeResults.recommendation.actions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-on-surface-variant mb-3 font-body">Command Checklist</p>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                            {activeResults.recommendation.actions.map((act, i) => (
                              <label key={i} className="flex items-center gap-3.5 p-3 bg-surface-container-low rounded-lg hover:bg-surface-container transition-colors cursor-pointer group select-none">
                                <input className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 cursor-pointer" type="checkbox"/>
                                <span className="text-xs font-medium text-on-surface leading-normal font-body">{act}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-8 text-on-surface-variant/50 italic text-xs font-body">
                      Awaiting model processing for recommendations...
                    </div>
                  )}
                </div>
              </div>

              {/* Historical Comparison */}
              {activeResults.similar_incidents && activeResults.similar_incidents.length > 0 && (
                <div className="bg-white p-8 rounded-xl border border-outline-variant/40 soft-shadow">
                  <h2 className="font-headline text-2xl font-bold mb-6">Historical Comparison</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activeResults.similar_incidents.map((inc, i) => (
                      <div key={i} className="space-y-6">
                        <div>
                          <div className="flex justify-between items-end mb-2 font-body">
                            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">FAISS Similarity Score</p>
                            <p className="font-headline text-xl text-primary font-bold">{inc.score.toFixed(4)}</p>
                          </div>
                          <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${inc.score * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="bg-surface-container-low p-5 rounded-xl border-l-4 border-primary">
                          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2 font-body">Matched Case</p>
                          <div className="flex items-start gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg text-primary flex items-center justify-center">
                              <span className="material-symbols-outlined text-lg">car_repair</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-on-background capitalize">{inc.event_cause.replace('_', ' ')}</p>
                              <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1 font-body">
                                Severity: <span className="font-semibold text-on-background">{inc.severity}</span> | Closure: <span className="font-semibold text-on-background">{Math.round(inc.closure_probability * 100)}%</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
