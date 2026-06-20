import React, { useState, useEffect } from 'react';
import { SideNav } from '../layout/SideNav';
import { TopBar } from '../layout/TopBar';
import { SHAPBar } from '../ui/SHAPBar';
import { requestExplanation } from '../../api/explainability';
import { getLivenessHealth } from '../../api/health';

const DEFAULT_INCIDENT = {
  event_type: 'unplanned',
  event_cause: 'vehicle_breakdown',
  latitude: 12.9279,
  longitude: 77.6271, // Silk Board bounds
  description: 'Multi-vehicle collision blocking two lanes at Silk Board Junction.',
  vehicle_type: 'heavy_vehicle',
  corridor: 'Hosur Road',
  hour: 18,
};

const DEFAULT_FACTORS = [
  { feature: 'event_type', value: 'unplanned', shap_impact: 0.2115, direction: 'increases_severity' },
  { feature: 'event_cause', value: 'vehicle_breakdown', shap_impact: 0.1824, direction: 'increases_severity' },
  { feature: 'geohash', value: 'tdxs1', shap_impact: 0.1293, direction: 'increases_severity' },
  { feature: 'vehicle_type', value: 'heavy_vehicle', shap_impact: 0.0811, direction: 'increases_severity' },
  { feature: 'hour', value: '18', shap_impact: -0.0412, direction: 'decreases_severity' },
  { feature: 'corridor', value: 'Hosur Road', shap_impact: -0.0519, direction: 'decreases_severity' },
  { feature: 'day_of_week', value: 'Saturday', shap_impact: -0.0225, direction: 'decreases_severity' },
  { feature: 'latitude', value: '12.9279', shap_impact: -0.0122, direction: 'decreases_severity' },
  { feature: 'longitude', value: '77.6271', shap_impact: 0.0034, direction: 'increases_severity' },
];

export default function DiagnosticsPanel() {
  const [factors, setFactors] = useState(DEFAULT_FACTORS);
  const [prediction, setPrediction] = useState('High');
  const [confidence, setConfidence] = useState(0.88);
  const [loadingState, setLoadingState] = useState('idle'); // idle | polling | success | failed
  const [modelName, setModelName] = useState('severity_model');
  const [visible, setVisible] = useState(false);
  const [isServerLive, setIsServerLive] = useState(false);

  useEffect(() => {
    setVisible(true);
    getLivenessHealth()
      .then(() => setIsServerLive(true))
      .catch(() => setIsServerLive(false));
  }, []);

  const runSHAPExplanation = async () => {
    setLoadingState('polling');
    let pollCount = 0;
    const maxPolls = 15;

    const executePoll = async () => {
      try {
        const res = await requestExplanation(DEFAULT_INCIDENT);
        const data = res.data;

        if (data.status === 'pending') {
          pollCount += 1;
          if (pollCount >= maxPolls) {
            setLoadingState('failed');
            return;
          }
          // Poll again in 2 seconds
          setTimeout(executePoll, 2000);
        } else if (data.status === 'failed') {
          setLoadingState('failed');
        } else {
          // Success! Update SHAP states
          setPrediction(data.prediction || 'High');
          setConfidence(data.confidence || 0.88);
          setModelName(data.model || 'severity_model');
          if (data.top_factors && data.top_factors.length > 0) {
            setFactors(data.top_factors);
          }
          setLoadingState('success');
        }
      } catch (err) {
        console.error('SHAP Request failed:', err);
        setLoadingState('failed');
      }
    };

    executePoll();
  };

  const maxImpact = Math.max(...factors.map((f) => Math.abs(f.shap_impact || 0.1)), 0.1);

  return (
    <div className="flex min-h-screen bg-surface">
      <SideNav />
      <main className="flex-1 ml-64 min-h-screen p-8 flex flex-col">
        <TopBar title="Diagnostics Panel" breadcrumbs={['System Diagnostics', 'SHAP Explainability']} />

        {/* Header summary info */}
        <div 
          className={`mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-6 rounded-2xl border border-outline-variant/60 shadow-sm mt-6 section-fade ${visible ? 'visible' : ''}`}
          style={{ transitionDelay: '0ms' }}
        >
          <div className="max-w-2xl">
            <h3 className="font-headline text-xl font-bold text-on-background">Model Decision Explainer</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed mt-1">
              Understand the reasoning behind ASTRA's severity predictions. This dashboard breaks down exactly which factors (like event type, location, or time) influenced the machine learning model's decision, giving operators full transparency.
            </p>
          </div>
          <button
            onClick={runSHAPExplanation}
            disabled={loadingState === 'polling' || !isServerLive}
            className={`px-5 py-3 rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-2 select-none uppercase tracking-wider ${
              loadingState === 'polling'
                ? 'bg-secondary-container text-on-secondary-container cursor-not-allowed'
                : !isServerLive
                ? 'bg-surface-container-highest border border-outline-variant text-on-surface-variant/40 cursor-not-allowed'
                : 'bg-primary hover:bg-primary-container text-on-primary hover:-translate-y-0.5'
            }`}
          >
            {loadingState === 'polling' ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Explaining...
              </>
            ) : !isServerLive ? (
              <>
                <span className="material-symbols-outlined text-base">cloud_off</span>
                Backend Offline
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">analytics</span>
                Request SHAP Explanation
              </>
            )}
          </button>
        </div>

        {/* Bento grid layout */}
        <div className="grid grid-cols-12 gap-6 items-start mt-6">
          {/* Left Panel: Status & Signature */}
          <div className={`col-span-12 lg:col-span-4 space-y-6 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '100ms' }}>
            {/* Diagnostics status card */}
            <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/30 sahara-shadow flex items-center justify-between bento-card">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  loadingState === 'polling' ? 'bg-primary/10 text-primary pulse-soft' :
                  !isServerLive ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-primary/10 text-primary'
                }`}>
                  <span className={`material-symbols-outlined text-2xl ${loadingState === 'polling' ? 'animate-spin' : ''}`}>
                    {loadingState === 'polling' ? 'sync' : !isServerLive ? 'warning' : 'check_circle'}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-lg font-semibold text-on-background">
                    {loadingState === 'polling' ? 'Analyzing Data...' : 
                     loadingState === 'failed' ? 'Analysis Failed' : 
                     !isServerLive ? 'Demonstration Mode' : 'Analysis Ready'}
                  </h3>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {loadingState === 'polling' ? 'Status: Generating explanation...' : 
                     loadingState === 'failed' ? 'Status: Unable to generate explanation.' : 
                     !isServerLive ? 'Status: Backend offline. Showing default metrics.' : 'Status: Live reasoning data available.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Model Signature Card */}
            <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/50 sahara-shadow flex flex-col justify-center bento-card">
              <div className="space-y-6">
                <div>
                  <div className="text-xs text-on-surface-variant mb-1 font-label uppercase tracking-widest font-body">Predictive Model</div>
                  <div className="font-headline text-2xl text-on-background">
                    {modelName === 'severity_model' ? 'Severity Classifier' : modelName}
                  </div>
                </div>
                <div className="flex justify-between items-center border-t border-outline-variant/30 pt-4">
                  <div>
                    <div className="text-xs text-on-surface-variant mb-1 font-label uppercase tracking-widest font-body">Prediction</div>
                    <div className="font-headline text-2xl text-tertiary font-bold flex items-center gap-2">
                      {prediction} Risk <span className="material-symbols-outlined text-tertiary text-lg">warning</span>
                    </div>
                  </div>
                  <div className="text-right border-l border-outline-variant/30 pl-6">
                    <div className="text-xs text-on-surface-variant mb-1 font-label uppercase tracking-widest font-body">Confidence</div>
                    <div className="font-headline text-2xl text-primary font-bold">{(confidence * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Force Plot / SHAP Waterfall */}
          <div className={`col-span-12 lg:col-span-8 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/60 sahara-shadow flex flex-col min-h-[500px] section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '200ms' }}>
            <div className="flex justify-between items-center mb-8 border-b border-outline-variant/30 pb-4">
              <h2 className="text-2xl font-headline font-semibold text-on-background">Force Plot / SHAP Waterfall</h2>
              <div className="flex gap-6 text-xs font-body">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary"></div>
                  <span className="text-on-surface-variant">Positive Impact (Increases Risk)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-tertiary"></div>
                  <span className="text-on-surface-variant">Negative Impact (Decreases Risk)</span>
                </div>
              </div>
            </div>

            {/* Waterfall Chart Frame */}
            {(() => {
              const BASE_VALUE = 0.4281;
              let runningSum = BASE_VALUE;
              const runningSums = [BASE_VALUE];
              factors.forEach((f) => {
                runningSum += f.shap_impact;
                runningSums.push(runningSum);
              });
              const outputValue = runningSum;

              // Derive min/max values dynamically and add 10% padding to prevent clipping
              const absoluteMin = Math.min(...runningSums, BASE_VALUE);
              const absoluteMax = Math.max(...runningSums, BASE_VALUE);
              const paddingVal = (absoluteMax - absoluteMin) * 0.1 || 0.15;
              const minVal = absoluteMin - paddingVal;
              const maxVal = absoluteMax + paddingVal;
              const range = maxVal - minVal;

              const getPct = (val) => {
                return ((val - minVal) / (range || 1)) * 100;
              };

              return (
                <div className="flex-grow flex flex-col justify-start relative pt-8 pb-10">
                  {/* Base Value Line */}
                  <div
                    className="absolute top-0 bottom-12 -translate-x-1/2 flex flex-col items-center pointer-events-none z-0"
                    style={{ left: `${getPct(BASE_VALUE)}%` }}
                  >
                    <span className="text-[10px] text-on-surface-variant bg-surface-variant/80 backdrop-blur-sm px-2 py-0.5 rounded font-bold font-body border border-outline-variant/40">
                      Base: {BASE_VALUE.toFixed(4)}
                    </span>
                    <div className="h-full w-px border-l border-dashed border-outline-variant/80 mt-1"></div>
                  </div>

                  {/* Output Value Line */}
                  <div
                    className="absolute top-0 bottom-12 -translate-x-1/2 flex flex-col items-center pointer-events-none z-0"
                    style={{ left: `${getPct(outputValue)}%` }}
                  >
                    <span className="text-[10px] font-bold text-primary bg-primary-container/20 backdrop-blur-sm border border-primary/30 px-2 py-0.5 rounded font-body">
                      Output: {outputValue.toFixed(4)}
                    </span>
                    <div className="h-full w-px border-l border-dashed border-primary/40 mt-1"></div>
                  </div>

                  {/* Scrollable Features list */}
                  <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar space-y-3 z-10 relative mt-6 mb-6">
                    {factors.map((f, idx) => {
                      const startValue = runningSums[idx];
                      const endValue = startValue + f.shap_impact;
                      const left = getPct(Math.min(startValue, endValue));
                      const width = (Math.abs(f.shap_impact) / (range || 1)) * 100;
                      const isPositive = f.shap_impact > 0;
                      const displayValue = (isPositive ? '+' : '') + f.shap_impact.toFixed(4);
                      const showLabelInside = width > 14;

                      return (
                        <div key={idx} className="flex items-center text-sm group hover:bg-surface-container-low/30 py-0.5 rounded transition-colors">
                          <div className="w-56 text-right pr-4 font-mono text-[11px] text-on-surface-variant truncate" title={`${f.feature} = ${f.value}`}>
                            <span className="font-semibold text-on-background">{f.feature}</span>
                            <span className="opacity-60">={f.value}</span>
                            <span className={`ml-1.5 font-bold text-[10px] ${isPositive ? 'text-primary' : 'text-tertiary'}`}>
                              ({displayValue})
                            </span>
                          </div>
                          <div className="flex-grow relative h-7 bg-surface-container-low/10 rounded border border-outline-variant/5">
                            <div
                              className={`absolute h-full flex items-center transition-all duration-500 ${
                                isPositive ? 'bg-primary rounded-r justify-end pr-2 text-white' : 'bg-tertiary rounded-l justify-start pl-2 text-white'
                              }`}
                              style={{
                                left: `${left}%`,
                                width: `${Math.max(width, 1.0)}%`,
                              }}
                            >
                              {showLabelInside && <span className="text-[9px] font-bold">{displayValue}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Axis Line */}
                  <div className="w-full h-px bg-outline-variant/60 mt-auto relative z-10">
                    {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => {
                      const val = minVal + tick * range;
                      return (
                        <div
                          key={tick}
                          className="absolute -bottom-5 -translate-x-1/2 text-[9px] text-on-surface-variant font-mono"
                          style={{ left: `${tick * 100}%` }}
                        >
                          {val.toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Operational Synthesis Card */}
        <div className={`mt-8 bg-primary-container/5 rounded-xl p-8 sahara-shadow border border-primary/20 flex gap-6 items-start section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '300ms' }}>
          <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-2xl">lightbulb</span>
          </div>
          <div>
            <h3 className="font-headline text-xl text-on-background mb-2 font-bold">Operational Synthesis</h3>
            <p className="text-on-surface-variant text-base leading-relaxed mb-4 font-body">
              Unplanned events and vehicle breakdowns are the main forces driving risk. The confluence of these factors during peak hours on heavy freight corridors significantly elevates the severity probability.
            </p>
            <div className="inline-flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/50 px-4 py-2.5 rounded-lg text-primary font-bold shadow-sm text-xs font-body">
              <span className="material-symbols-outlined text-sm">local_police</span>
              Recommendation: Deploy police response unit to mitigate.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
