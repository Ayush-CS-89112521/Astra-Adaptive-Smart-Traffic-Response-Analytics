import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SideNav } from '../layout/SideNav';

export default function SimulationMap() {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const congestedLayerRef = useRef(null);

  const [simData, setSimData] = useState(null);
  const [visible, setVisible] = useState(false);

  // Load simulation data from localStorage
  useEffect(() => {
    setVisible(true);
    const rawData = localStorage.getItem('astra_active_simulation');
    if (rawData) {
      try {
        setSimData(JSON.parse(rawData));
      } catch (err) {
        console.error('Error parsing simulation data:', err);
      }
    }
  }, []);

  // Set up Map when simData is loaded
  useEffect(() => {
    if (!simData || !mapContainerRef.current) return;

    const { form, activeResults } = simData;
    const centerLat = Number(form?.latitude) || 12.9716;
    const centerLon = Number(form?.longitude) || 77.5946;

    // Initialize map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([centerLat, centerLon], 14);
    mapRef.current = map;

    // CartoDB Dark Matter tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    // Custom incident origin icon (Red pulse)
    const incidentMarkup = `
      <div style="position: relative; width: 24px; height: 24px;">
        <div style="
          position: absolute; top: 0; left: 0; width: 24px; height: 24px;
          background: #ef4444; border: 2.5px solid #ffffff; border-radius: 50%;
          box-shadow: 0 0 16px #ef4444; z-index: 10;
        "></div>
        <div style="
          position: absolute; top: -8px; left: -8px; width: 40px; height: 40px;
          border: 2px solid #ef4444; border-radius: 50%;
          animation: pulse 1.8s infinite ease-out; opacity: 0;
        "></div>
      </div>
    `;

    const originIcon = L.divIcon({
      className: '',
      html: incidentMarkup,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    // Add marker for incident origin
    L.marker([centerLat, centerLon], { icon: originIcon })
      .bindPopup(`
        <div style="font-size:12px; line-height: 1.5; color: #1a1c1e;">
          <strong style="color: #ef4444;">🚨 Incident Origin</strong><br/>
          Corridor: <b>${form?.corridor || 'Unknown'}</b><br/>
          Type: <span style="text-transform: capitalize;"><b>${form?.event_type || 'Unplanned'}</b></span>
        </div>
      `)
      .addTo(map);

    // Plot Congested Segment (Solid Red Path)
    // Try using congested_geojson if returned, otherwise fallback to local mock path around center
    let congestedGeoJSON = activeResults?.congested_geojson;
    if (!congestedGeoJSON) {
      congestedGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [centerLon - 0.0015, centerLat - 0.001],
            [centerLon, centerLat],
            [centerLon + 0.0015, centerLat + 0.001],
          ],
        },
      };
    }

    const congestedLayer = L.geoJSON(congestedGeoJSON, {
      style: { color: '#ef4444', weight: 6, opacity: 0.95 },
    }).addTo(map);
    congestedLayerRef.current = congestedLayer;

    // Plot Optimal Bypass Route (Dashed Orange Path)
    let routeGeoJSON = activeResults?.route_geojson;
    if (!routeGeoJSON) {
      routeGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [centerLon - 0.0015, centerLat - 0.001],
            [centerLon - 0.0025, centerLat + 0.002],
            [centerLon + 0.0005, centerLat + 0.0035],
            [centerLon + 0.0015, centerLat + 0.001],
          ],
        },
      };
    }

    const routeLayer = L.geoJSON(routeGeoJSON, {
      style: { color: '#f97316', weight: 5, opacity: 0.85, dashArray: '10, 6' },
    }).addTo(map);
    routeLayerRef.current = routeLayer;

    // Fit map bounds to show both the incident and route
    const group = L.featureGroup([congestedLayer, routeLayer]);
    map.fitBounds(group.getBounds(), { padding: [80, 80] });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [simData]);

  // Handle case where no simulation is loaded yet
  if (!simData) {
    return (
      <div className="flex min-h-screen bg-surface">
        <SideNav />
        <main className="flex-1 ml-64 flex flex-col justify-center items-center p-8 bg-[#1a1c1e]">
          <div className="max-w-md w-full bg-surface-container-low border border-outline-variant/60 rounded-3xl p-8 text-center shadow-lg bento-card">
            <span className="material-symbols-outlined text-6xl text-primary mb-4 animate-bounce">
              rebase_edit
            </span>
            <h2 className="font-headline text-2xl font-bold text-on-background mb-2">
              No Active Simulation
            </h2>
            <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
              You must run a traffic incident simulation on the console first before the route map can be analyzed.
            </p>
            <button
              onClick={() => navigate('/app/simulate')}
              className="py-3 px-6 bg-primary hover:bg-primary-container text-on-primary text-sm font-bold rounded-xl uppercase tracking-wider transition-all"
            >
              Go to Simulation Console
            </button>
          </div>
        </main>
      </div>
    );
  }

  const { form, activeResults } = simData;

  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 relative h-screen bg-[#1a1c1e] overflow-hidden">
        
        {/* Top Floating Badge */}
        <header className={`absolute top-0 left-0 right-0 z-30 px-8 py-4 flex justify-between items-center pointer-events-none section-fade ${visible ? 'visible' : ''}`}>
          <div className="pointer-events-auto">
            <div className="bg-surface/90 map-overlay-blur px-5 py-2.5 rounded-full border border-outline-variant/40 shadow-md flex items-center gap-4">
              <span className="font-headline text-lg font-semibold text-primary">Simulation Bypass Intelligence</span>
              <div className="h-4 w-[1px] bg-outline-variant"></div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant/80">
                <span className="material-symbols-outlined text-sm text-tertiary">warning</span>
                Incident Map Simulation
              </span>
            </div>
          </div>
        </header>

        {/* Leaflet Map container */}
        <div ref={mapContainerRef} className="absolute inset-0 z-10 w-full h-full" />

        {/* Floating Side Info Panel (Driver/Routing Focus) */}
        <section className={`absolute bottom-6 left-6 right-6 z-30 flex gap-4 pointer-events-none section-fade ${visible ? 'visible' : ''}`} style={{ height: '240px', transitionDelay: '100ms' }}>
          
          {/* Driver Routing Statistics */}
          <div className="w-[50%] bg-surface/95 map-overlay-blur p-5 rounded-2xl border border-outline-variant/60 shadow-lg pointer-events-auto flex flex-col bento-card">
            <div className="flex items-center justify-between mb-3 border-b border-outline-variant/30 pb-2">
              <div>
                <h3 className="font-headline text-base font-bold text-on-background">Optimal Diversion Route</h3>
                <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-widest mt-0.5">Driver Navigation Directive</p>
              </div>
              <span className="material-symbols-outlined text-primary text-xl">directions_car</span>
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1">
              {/* Route distance */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Bypass Distance</span>
                <span className="text-3xl font-headline font-bold text-primary mt-1">
                  {activeResults?.distance_km ? `${activeResults.distance_km} km` : 'Calculated'}
                </span>
              </div>

              {/* Transit time */}
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Estimated Transit Duration</span>
                <span className="text-3xl font-headline font-bold text-primary mt-1">
                  {activeResults?.estimated_time_minutes ? `${activeResults.estimated_time_minutes} mins` : 'Calculated'}
                </span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-on-surface-variant flex justify-between items-center">
              <span>Routing Mode: <b>{activeResults?.penalty_applied ? 'Detour Congestion Avoidance' : 'Standard Speed Path'}</b></span>
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[9px] font-extrabold uppercase">
                {activeResults?.penalty_applied ? 'Detour Active' : 'Optimal'}
              </span>
            </div>
          </div>

          {/* Grid Lock Telemetry */}
          <div className="w-[50%] bg-surface/95 map-overlay-blur p-5 rounded-2xl border border-outline-variant/60 shadow-lg pointer-events-auto flex flex-col bento-card">
            <div className="flex items-center justify-between mb-3 border-b border-outline-variant/30 pb-2">
              <div>
                <h3 className="font-headline text-base font-bold text-on-background">Grid Impact Assessment</h3>
                <p className="text-[10px] text-on-surface-variant/80 uppercase tracking-widest mt-0.5">Congestion & Impedance metrics</p>
              </div>
              <span className="material-symbols-outlined text-tertiary text-xl font-bold">bolt</span>
            </div>

            <div className="grid grid-cols-3 gap-3 flex-1">
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Estimated Delay</span>
                <span className="text-xl font-headline font-bold text-tertiary block mt-1">
                  {activeResults?.estimated_delay_minutes ? `${activeResults.estimated_delay_minutes}m` : '0.0m'}
                </span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Queue Length</span>
                <span className="text-xl font-headline font-bold text-on-background block mt-1">
                  {activeResults?.queue_length_meters ? `${activeResults.queue_length_meters}m` : '0m'}
                </span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider block">Closure Prob.</span>
                <span className="text-xl font-headline font-bold text-on-background block mt-1">
                  {activeResults?.closure_probability ? `${Math.round(activeResults.closure_probability * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center text-[11px] text-on-surface-variant">
              <span>Primary Block: <b className="text-red-400">{form?.corridor || 'Active Segment'}</b></span>
              <span className="text-on-surface-variant/70">Severity: <b className="uppercase text-tertiary">{activeResults?.severity || 'Medium'}</b></span>
            </div>
          </div>

        </section>
      </main>
      
      {/* Dynamic Keyframes for pulse animation */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
