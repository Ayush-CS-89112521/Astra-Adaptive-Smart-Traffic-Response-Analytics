import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollNarrative — 3-act scroll story: Chaos → Prediction → Simulation
 * Each act is a full-height section with a sticky visual + scrolling text.
 */

const ACTS = [
  {
    id: 'chaos',
    tag: 'Phase 01 — Detection',
    headline: 'From Chaos to Clarity',
    body: 'An operator logs a traffic incident with location, event type, and vehicle details. ASTRA immediately classifies operational severity, identifies the spatial cluster the incident falls in, and retrieves structurally similar historical events — turning raw incident data into actionable intelligence.',
    color: '#c2652a',
    visual: 'chaos',
  },
  {
    id: 'predict',
    tag: 'Phase 02 — Prediction',
    headline: 'Predict Traffic Impact Before It Happens',
    body: 'A CatBoost classifier predicts incident severity and road closure probability from spatial, temporal, and operational features. Validated at 99.8% Macro F1 across 15-fold cross-validation on the Bengaluru incident dataset — before the situation has time to escalate.',
    color: '#c2652a',
    visual: 'predict',
  },
  {
    id: 'simulate',
    tag: 'Phase 03 — Simulation',
    headline: 'Simulate Operational Outcomes',
    body: 'Before any officer is deployed, ASTRA runs hundreds of diversion simulations on a live road-topology graph. Operators see cascading effects across all corridors — and choose the optimal response.',
    color: '#c2652a',
    visual: 'simulate',
  },
];

/* ─── Chaos Visual: Expanding disruption grid ─── */
function ChaosVisual({ active }) {
  const nodes = Array.from({ length: 25 }, (_, i) => i);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 300 300" className="w-72 h-72">
        {/* Grid lines */}
        {[60, 120, 180, 240].map(x => (
          <line key={`v${x}`} x1={x} y1={20} x2={x} y2={280} stroke="rgba(194,101,42,0.12)" strokeWidth="1" />
        ))}
        {[60, 120, 180, 240].map(y => (
          <line key={`h${y}`} x1={20} y1={y} x2={280} y2={y} stroke="rgba(194,101,42,0.12)" strokeWidth="1" />
        ))}
        {/* Nodes at intersections */}
        {[60, 120, 180, 240].map(x =>
          [60, 120, 180, 240].map(y => {
            const isHot = (x === 120 && y === 120) || (x === 180 && y === 180) || (x === 120 && y === 180);
            return (
              <g key={`${x}${y}`}>
                <circle cx={x} cy={y} r={isHot ? 6 : 3}
                  fill={isHot ? '#c2652a' : 'rgba(194,101,42,0.3)'}
                  style={{ filter: isHot ? 'drop-shadow(0 0 4px rgba(194,101,42,0.7))' : 'none' }}
                />
                {isHot && active && (
                  <>
                    <circle cx={x} cy={y} r={6} fill="none" stroke="#c2652a" strokeWidth="1.5"
                      style={{ animation: 'congestionPulse 2s ease-out infinite', transformOrigin: `${x}px ${y}px` }}
                    />
                    <circle cx={x} cy={y} r={6} fill="none" stroke="#c2652a" strokeWidth="1"
                      style={{ animation: 'congestionPulse 2s ease-out 0.7s infinite', transformOrigin: `${x}px ${y}px` }}
                    />
                  </>
                )}
              </g>
            );
          })
        )}
        {/* Alert lines (disrupted roads) */}
        {active && (
          <>
            <line x1={120} y1={60} x2={120} y2={120} stroke="#c2652a" strokeWidth="3" strokeLinecap="round"
              style={{ animation: 'fadeUpIn 0.5s 0.3s both' }} />
            <line x1={120} y1={120} x2={180} y2={120} stroke="#c2652a" strokeWidth="3" strokeLinecap="round"
              style={{ animation: 'fadeUpIn 0.5s 0.5s both' }} />
            <line x1={180} y1={120} x2={180} y2={180} stroke="rgba(194,101,42,0.5)" strokeWidth="2"
              strokeDasharray="6 4" style={{ animation: 'fadeUpIn 0.5s 0.7s both' }} />
          </>
        )}
      </svg>
      {active && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
          {['HIGH SEVERITY', '3 CLUSTERS', 'ACTIVE'].map((label, i) => (
            <span key={i} className="px-2 py-1 bg-primary/10 border border-primary/20 rounded text-[9px] font-bold text-primary uppercase tracking-wider"
              style={{ animation: `fadeUpIn 0.5s ${0.4 + i * 0.15}s both` }}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Predict Visual: Heatmap road network ─── */
function PredictVisual({ active }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 320 320" className="w-80 h-80">
        {/* Road network paths */}
        <path d="M40 160 Q160 80 280 160" fill="none" stroke="rgba(194,101,42,0.15)" strokeWidth="8" strokeLinecap="round" />
        <path d="M160 40 Q200 160 160 280" fill="none" stroke="rgba(194,101,42,0.15)" strokeWidth="8" strokeLinecap="round" />
        <path d="M40 100 L280 100" stroke="rgba(194,101,42,0.1)" strokeWidth="6" />
        <path d="M40 220 L280 220" stroke="rgba(194,101,42,0.1)" strokeWidth="6" />

        {/* Active road highlights */}
        {active && (
          <>
            <path d="M40 160 Q160 80 280 160" fill="none" stroke="#c2652a" strokeWidth="3" strokeLinecap="round"
              strokeDasharray="600" strokeDashoffset="600"
              style={{ animation: 'routeDraw 1.2s cubic-bezier(0.16,1,0.3,1) 0.3s forwards' }} />
            <path d="M160 40 Q200 160 160 280" fill="none" stroke="rgba(194,101,42,0.6)" strokeWidth="2.5"
              strokeDasharray="500" strokeDashoffset="500"
              style={{ animation: 'routeDraw 1.2s cubic-bezier(0.16,1,0.3,1) 0.6s forwards' }} />
          </>
        )}

        {/* Hotspot zones */}
        {active && [
          { cx: 160, cy: 140, r: 30, op: 0.15, delay: 0.4 },
          { cx: 200, cy: 100, r: 20, op: 0.1, delay: 0.6 },
          { cx: 130, cy: 190, r: 22, op: 0.12, delay: 0.8 },
        ].map((h, i) => (
          <circle key={i} cx={h.cx} cy={h.cy} r={h.r} fill={`rgba(194,101,42,${h.op})`}
            stroke="rgba(194,101,42,0.25)" strokeWidth="1"
            style={{ animation: `fadeUpIn 0.5s ${h.delay}s both` }} />
        ))}

        {/* Confidence badge */}
        {active && (
          <g style={{ animation: 'fadeUpIn 0.6s 1s both' }}>
            <rect x="100" y="125" width="120" height="30" rx="6" fill="white" fillOpacity="0.9" />
            <text x="160" y="143" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#c2652a" fontFamily="Manrope">
              SEVERITY: HIGH · 97.5% CONF
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/* ─── Simulate Visual: Congestion propagation + alternatives ─── */
function SimulateVisual({ active }) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <svg viewBox="0 0 320 320" className="w-80 h-80">
        {/* Base road network */}
        <path d="M40 160 L280 160" stroke="rgba(194,101,42,0.12)" strokeWidth="10" strokeLinecap="round" />
        <path d="M160 40 L160 280" stroke="rgba(194,101,42,0.12)" strokeWidth="10" strokeLinecap="round" />
        <path d="M40 80 Q160 80 280 160" stroke="rgba(194,101,42,0.08)" strokeWidth="6" fill="none" />
        <path d="M40 240 Q160 240 280 160" stroke="rgba(194,101,42,0.08)" strokeWidth="6" fill="none" />

        {/* Incident */}
        {active && (
          <g style={{ animation: 'incidentAppear 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both' }}>
            <circle cx="160" cy="160" r="12" fill="#ef4444" opacity="0.9" />
            <path d="M160 152v10M160 164v2" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* Road closure overlay */}
        {active && (
          <rect x="100" y="153" width="60" height="14" rx="2" fill="rgba(239,68,68,0.25)"
            style={{ animation: 'fadeUpIn 0.4s 0.7s both' }} />
        )}

        {/* Scenario A — main detour (highlighted) */}
        {active && (
          <path d="M100 160 Q100 80 160 80 Q220 80 220 160" fill="none" stroke="#c2652a" strokeWidth="3.5"
            strokeLinecap="round" strokeDasharray="400" strokeDashoffset="400"
            style={{ animation: 'routeDraw 1s cubic-bezier(0.16,1,0.3,1) 1s forwards' }} />
        )}

        {/* Scenario B — alt route */}
        {active && (
          <path d="M100 160 Q100 240 160 240 Q220 240 220 160" fill="none" stroke="rgba(194,101,42,0.4)"
            strokeWidth="2" strokeLinecap="round" strokeDasharray="400" strokeDashoffset="400"
            style={{ animation: 'routeDraw 1s cubic-bezier(0.16,1,0.3,1) 1.3s forwards' }} />
        )}

        {/* Scenario labels */}
        {active && (
          <>
            <g style={{ animation: 'fadeUpIn 0.4s 1.8s both' }}>
              <rect x="192" y="70" width="54" height="18" rx="4" fill="#c2652a" />
              <text x="219" y="82" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="Manrope">ROUTE A</text>
            </g>
            <g style={{ animation: 'fadeUpIn 0.4s 2.0s both' }}>
              <rect x="192" y="238" width="54" height="18" rx="4" fill="rgba(194,101,42,0.3)" />
              <text x="219" y="250" textAnchor="middle" fontSize="9" fill="#c2652a" fontWeight="bold" fontFamily="Manrope">ROUTE B</text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

/* ─── Act Component ─── */
function Act({ act, index }) {
  const ref     = useRef(null);
  const [active, setActive]   = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); setActive(true); }
        else { setActive(false); }
      },
      { threshold: 0.35 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const Visual = act.visual === 'chaos' ? ChaosVisual
               : act.visual === 'predict' ? PredictVisual
               : SimulateVisual;

  const isReverse = index % 2 !== 0;

  return (
    <div
      ref={ref}
      className={`py-24 px-12 md:px-24 flex flex-col ${isReverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-16 ${index % 2 === 0 ? 'bg-surface' : 'bg-surface-container-low'} border-b border-outline-variant/30`}
    >
      {/* Text */}
      <div className={`flex-1 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '0ms' }}>
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">{act.tag}</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-light text-on-background mb-5 leading-tight">
          {act.headline}
        </h2>
        <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
          {act.body}
        </p>
      </div>

      {/* Visual */}
      <div
        className={`flex-1 flex items-center justify-center section-fade ${visible ? 'visible' : ''}`}
        style={{ transitionDelay: '150ms', minHeight: '320px' }}
      >
        <div className="w-full max-w-sm h-80 bg-surface-container rounded-3xl border border-outline-variant/40 overflow-hidden shadow-sm relative">
          {/* Scan line decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              style={{ animation: 'scanLine 4s linear infinite', top: '0%' }} />
          </div>
          <Visual active={active} />
        </div>
      </div>
    </div>
  );
}

export default function ScrollNarrative() {
  return (
    <div>
      {ACTS.map((act, i) => <Act key={act.id} act={act} index={i} />)}
    </div>
  );
}
