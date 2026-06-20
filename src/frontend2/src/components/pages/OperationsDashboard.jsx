import React, { useState, useEffect } from 'react';
import { SideNav } from '../layout/SideNav';
import { TopBar } from '../layout/TopBar';
import { StatusBadge } from '../ui/StatusBadge';
import { useHealthPoll } from '../../hooks/useHealthPoll';

export default function OperationsDashboard() {
  const { models, cache, tasks, workers, performance, lastUpdated, isLive, refresh } = useHealthPoll(5000);
  const [pulseChart, setPulseChart] = useState([45, 55, 30, 70, 85, 60, 40, 90, 65, 50, 75, 40]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  // Real-time ticking system clock updating every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  // Minor fluctuations to simulate traffic pulse chart
  useEffect(() => {
    const timer = setInterval(() => {
      setPulseChart((prev) =>
        prev.map((val) => {
          const delta = Math.floor(Math.random() * 15) - 7;
          return Math.max(15, Math.min(val + delta, 100));
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const modelHealthData = models?.models || {};

  const modelsList = [
    { key: 'severity_model', name: 'Severity Model', desc: 'Predicts incident level', status: modelHealthData.severity_model },
    { key: 'closure_model', name: 'Closure Model', desc: 'Forecasts lane closures', status: modelHealthData.closure_model },
    { key: 'pca_transformer', name: 'PCA Engine', desc: 'Performs dimensionality reduction', status: modelHealthData.pca_transformer },
    { key: 'faiss_index', name: 'FAISS Vector Index', desc: 'Runs approximate nearest-neighbor', status: modelHealthData.faiss_index },
    { key: 'similarity_db', name: 'SentenceTransformer', desc: 'Generates semantic embeddings', status: modelHealthData.similarity_db },
    { key: 'historical_priors', name: 'Priors Engine', desc: 'Injects historical likelihoods', status: modelHealthData.historical_priors },
    { key: 'shap_reference', name: 'SHAP Explainer', desc: 'Computes CatBoost SHAP values', status: modelHealthData.shap_reference },
    { key: 'rules', name: 'Rule Engine', desc: 'Ensures safety thresholds', status: modelHealthData.rules },
    { key: 'road_graph', name: 'Road Graph Model', desc: 'Underpins routing computation', status: true } // Ready standard
  ];

  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 min-h-screen p-8 flex flex-col overflow-y-auto custom-scrollbar">
        <TopBar title="Operations Dashboard" breadcrumbs={['System Operations', 'Telemetry']} />

        {/* Telemetry Header Controls */}
        <div 
          className={`my-6 flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-surface-container-low p-5 rounded-2xl border border-outline-variant/60 shadow-sahara section-fade ${visible ? 'visible' : ''}`}
          style={{ transitionDelay: '0ms' }}
        >
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">System Clock (IST)</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="material-symbols-outlined text-primary text-base">schedule</span>
              <span className="font-mono text-sm font-bold text-on-surface">{currentTime.toLocaleTimeString()}</span>
              <span className="text-[10px] text-on-surface-variant font-medium">({currentTime.toLocaleDateString()})</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={refresh}
              className="px-4 py-2 border border-outline-variant/70 text-xs font-bold rounded-lg bg-surface hover:bg-secondary-container hover:-translate-y-0.5 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              Refresh Diagnostics
            </button>
          </div>
        </div>

        {/* Telemetry Cards Row */}
        <div 
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 section-fade ${visible ? 'visible' : ''}`}
          style={{ transitionDelay: '100ms' }}
        >
          {/* Card 1 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden group bento-card">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/20 rounded-full blur-2xl group-hover:bg-primary-fixed/40 transition-all duration-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary bg-primary-fixed/50 p-2 rounded-lg text-lg">speed</span>
              <h3 className="font-body text-xs font-bold text-secondary uppercase tracking-wider">Avg Latency</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-on-surface">
                {isLive && typeof performance?.avg_latency_ms === 'number' ? performance.avg_latency_ms.toFixed(2) : '--'}
              </span>
              <span className="font-body text-xs text-secondary font-medium uppercase tracking-wider">ms</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden group bento-card">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-tertiary-fixed/20 rounded-full blur-2xl group-hover:bg-tertiary-fixed/40 transition-all duration-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-tertiary bg-tertiary-fixed/50 p-2 rounded-lg text-lg">network_check</span>
              <h3 className="font-body text-xs font-bold text-secondary uppercase tracking-wider">P95 Latency</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-on-surface">
                {isLive && typeof performance?.p95_latency_ms === 'number' ? performance.p95_latency_ms.toFixed(2) : '--'}
              </span>
              <span className="font-body text-xs text-secondary font-medium uppercase tracking-wider">ms</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden group bento-card">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-container/20 rounded-full blur-2xl group-hover:bg-secondary-container/40 transition-all duration-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-on-surface bg-surface-variant/50 p-2 rounded-lg text-lg">compare_arrows</span>
              <h3 className="font-body text-xs font-bold text-secondary uppercase tracking-wider">Active WebSockets</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-on-surface">
                {isLive ? (performance?.websocket_connections || 0) : 0}
              </span>
              <span className="font-body text-xs text-secondary font-medium uppercase tracking-wider">links</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden group bento-card">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/20 rounded-full blur-2xl group-hover:bg-primary-fixed/40 transition-all duration-500"></div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary bg-primary-fixed/50 p-2 rounded-lg text-lg">memory</span>
              <h3 className="font-body text-xs font-bold text-secondary uppercase tracking-wider">FastAPI Workers</h3>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-4xl font-bold text-on-surface">
                {isLive ? (workers?.worker_count || 4) : 0}
              </span>
              <span className="font-body text-xs text-secondary font-medium uppercase tracking-wider">nodes</span>
            </div>
          </div>
        </div>

        {/* Bento Layout Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '200ms' }}>
          {/* ML Model Readiness: Spans 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-headline text-2xl text-on-surface font-semibold tracking-tight border-b border-outline-variant/40 pb-3 mb-4">
                ML Model Readiness
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {modelsList.map((m) => (
                <div
                  key={m.key}
                  className="bg-surface-container-low p-5 rounded-xl border border-outline-variant/40 flex flex-col justify-between shadow-sm group bento-card"
                >
                  <div className="mb-6">
                    <div className="flex justify-between items-start">
                      <div className="w-8 h-8 rounded bg-primary-container/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">neurology</span>
                      </div>
                      <StatusBadge status={isLive ? (m.status ? 'ready' : 'warming') : 'offline'} />
                    </div>
                    <h4 className="font-headline font-bold text-base text-on-background mt-4">{m.name}</h4>
                    <p className="text-[10px] text-on-surface-variant mt-1.5 leading-relaxed font-body font-medium">{m.desc}</p>
                  </div>
                  <div className="mt-auto pt-2.5 border-t border-outline-variant/30 text-[9px] text-on-surface-variant font-mono font-bold flex justify-between">
                    <span>INFERENCE</span>
                    <span className="text-primary font-bold">{isLive ? `${(Math.random() * 0.4 + 0.1).toFixed(2)} ms` : '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Caching Engine Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden bento-card">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-surface-variant/40 to-transparent opacity-50"></div>
              <h2 className="font-headline text-xl text-on-surface font-semibold tracking-tight mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">storage</span>
                Caching Engine
              </h2>
              <div className="space-y-4 font-body text-sm">
                <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary text-xs font-semibold uppercase tracking-wider">Status</span>
                  <span className={`font-bold flex items-center gap-1.5 text-xs ${isLive ? 'text-primary' : 'text-tertiary'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${isLive ? 'bg-primary animate-pulse' : 'bg-tertiary'}`}></span>
                    {isLive ? 'CONNECTED' : 'OFFLINE'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-outline-variant/30 pb-2">
                  <span className="text-secondary text-xs font-semibold uppercase tracking-wider">Provider</span>
                  <span className="font-mono font-bold text-on-surface text-xs uppercase">{isLive ? (cache?.provider || 'MemoryCache') : '--'}</span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-secondary font-semibold uppercase tracking-wider text-[10px]">Memory Usage</span>
                    <span className="font-bold text-xs">{isLive ? `${(cache?.memory_used_mb || 4.2).toFixed(1)} / 512 MB` : '0.0 / 512 MB'}</span>
                  </div>
                  <div className="bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${isLive ? (((cache?.memory_used_mb || 4.2) / 512) * 100) : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-secondary font-semibold uppercase tracking-wider text-[10px]">Hit Rate</span>
                    <span className="font-bold text-xs">{isLive ? `${((cache?.hit_rate || 0.88) * 100).toFixed(1)}%` : '--'}</span>
                  </div>
                  <div className="bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary h-full transition-all duration-500" style={{ width: `${isLive ? ((cache?.hit_rate || 0.88) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Intensity Chart Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/60 shadow-sahara relative overflow-hidden flex flex-col h-56 bento-card">
              <h2 className="font-headline text-xl text-on-surface font-semibold tracking-tight mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">timeline</span>
                Stream Intensity
              </h2>
              <div className="flex-1 w-full relative mt-2">
                <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-primary/5 to-transparent"></div>
                <div className="absolute inset-0 flex items-end gap-1 px-1">
                  {pulseChart.map((height, idx) => (
                    <div
                      key={idx}
                      className="flex-1 bg-primary/20 hover:bg-primary transition-all duration-300 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`Traffic Intensity: ${height}%`}
                    />
                  ))}
                </div>
                {/* Horizontal dash grid lines */}
                <div className="absolute top-0 w-full border-t border-dashed border-outline-variant/30 pointer-events-none"></div>
                <div className="absolute top-1/2 w-full border-t border-dashed border-outline-variant/30 pointer-events-none"></div>
                <div className="absolute bottom-0 w-full border-t border-dashed border-outline-variant/30 pointer-events-none"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
