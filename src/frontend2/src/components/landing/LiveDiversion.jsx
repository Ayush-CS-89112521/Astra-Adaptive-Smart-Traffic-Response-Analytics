import React, { useEffect, useRef, useState } from 'react';

/**
 * LiveDiversion — The showcase section.
 * 6-step sequenced animation triggered on scroll into view.
 * Steps play one after another (not simultaneously).
 */

const STEPS = [
  { id: 1, label: 'Incident Detected',        icon: 'warning',        color: '#ef4444' },
  { id: 2, label: 'Road Closure Triggered',   icon: 'block',          color: '#f97316' },
  { id: 3, label: 'Congestion Propagating',   icon: 'traffic',        color: '#f97316' },
  { id: 4, label: 'ASTRA Activated',          icon: 'psychology',     color: '#c2652a' },
  { id: 5, label: 'Diversion Route Generated',icon: 'alt_route',      color: '#16a34a' },
  { id: 6, label: 'Resources Deployed',       icon: 'emergency_share',color: '#16a34a' },
];

export default function LiveDiversion() {
  const sectionRef = useRef(null);
  const [step,    setStep]    = useState(0);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setVisible(true);
          setStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [started]);

  // Sequential step reveal
  useEffect(() => {
    if (!started) return;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), 400 + i * 900)
    );
    return () => timers.forEach(clearTimeout);
  }, [started]);

  const resetDemo = () => {
    setStep(0);
    setStarted(false);
    setTimeout(() => setStarted(true), 100);
  };

  return (
    <section
      ref={sectionRef}
      className="py-28 px-12 md:px-24 bg-surface-container-low border-y border-outline-variant/30"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 section-fade ${visible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-px bg-primary" />
            <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">Phase 06 — Live Demo</span>
            <div className="w-8 h-px bg-primary" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-on-background leading-tight">
            Live Diversion Demonstration
          </h2>
          <p className="mt-4 text-on-surface-variant text-sm max-w-lg mx-auto leading-relaxed">
            Watch ASTRA respond to a road accident in real-time — from detection to full resource deployment.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Left: Road network visualization */}
          <div className={`section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '150ms' }}>
            <div className="relative bg-surface rounded-3xl border border-outline-variant/50 overflow-hidden shadow-md" style={{ height: '420px' }}>
              {/* Scan line */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent"
                  style={{ animation: 'scanLine 5s linear infinite', top: '0%' }} />
              </div>

              {/* Corner labels */}
              <div className="absolute top-3 left-3 z-10">
                <span className="text-[9px] font-bold text-primary/60 font-mono uppercase">GRID: BENGALURU CENTRAL</span>
              </div>
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary status-blink" />
                <span className="text-[9px] font-bold text-primary/60 font-mono uppercase">LIVE</span>
              </div>

              <svg viewBox="0 0 380 400" className="w-full h-full" style={{ padding: '24px' }}>
                {/* Background road network */}
                {/* Horizontal roads */}
                <line x1="20" y1="120" x2="360" y2="120" stroke="rgba(194,101,42,0.15)" strokeWidth="10" strokeLinecap="round"/>
                <line x1="20" y1="220" x2="360" y2="220" stroke="rgba(194,101,42,0.15)" strokeWidth="10" strokeLinecap="round"/>
                <line x1="20" y1="320" x2="360" y2="320" stroke="rgba(194,101,42,0.12)" strokeWidth="6" strokeLinecap="round"/>
                {/* Vertical roads */}
                <line x1="120" y1="20" x2="120" y2="380" stroke="rgba(194,101,42,0.15)" strokeWidth="10" strokeLinecap="round"/>
                <line x1="240" y1="20" x2="240" y2="380" stroke="rgba(194,101,42,0.15)" strokeWidth="10" strokeLinecap="round"/>
                {/* Diagonal connector */}
                <path d="M20 220 Q70 170 120 120" fill="none" stroke="rgba(194,101,42,0.1)" strokeWidth="6"/>
                <path d="M240 120 Q310 170 360 220" fill="none" stroke="rgba(194,101,42,0.1)" strokeWidth="6"/>

                {/* Intersection nodes */}
                {[[120,120],[120,220],[240,120],[240,220]].map(([x,y],i) => (
                  <circle key={i} cx={x} cy={y} r={5} fill="rgba(194,101,42,0.35)" />
                ))}

                {/* STEP 1: Incident marker at Silk Board (240, 220) */}
                {step >= 1 && (
                  <g style={{ animation: 'incidentAppear 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                    <circle cx="240" cy="220" r="14" fill="rgba(239,68,68,0.15)" />
                    <circle cx="240" cy="220" r="9"  fill="#ef4444" />
                    <path d="M240 213v9M240 225v2" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    <text x="258" y="215" fontSize="9" fill="#ef4444" fontWeight="bold" fontFamily="Manrope">INCIDENT</text>
                  </g>
                )}

                {/* STEP 2: Road closure overlay */}
                {step >= 2 && (
                  <g style={{ animation: 'fadeUpIn 0.5s forwards' }}>
                    <rect x="165" y="213" width="75" height="14" rx="3" fill="rgba(239,68,68,0.3)"
                      stroke="rgba(239,68,68,0.5)" strokeWidth="1" strokeDasharray="4 3"/>
                    <text x="203" y="223" textAnchor="middle" fontSize="8" fill="#ef4444" fontWeight="bold" fontFamily="Manrope">CLOSED</text>
                    {/* Cross marks */}
                    <text x="175" y="213" fontSize="12" fill="rgba(239,68,68,0.6)">✕</text>
                    <text x="220" y="213" fontSize="12" fill="rgba(239,68,68,0.6)">✕</text>
                  </g>
                )}

                {/* STEP 3: Congestion waves */}
                {step >= 3 && (
                  <g>
                    {[18, 32, 46].map((r, i) => (
                      <circle key={i} cx="240" cy="220" r={r} fill="none"
                        stroke="rgba(249,115,22,0.4)" strokeWidth="1.5"
                        style={{ animation: `congestionPulse 2s ease-out ${i * 0.4}s infinite`,
                                 transformOrigin: '240px 220px' }} />
                    ))}
                    {/* Traffic backing up */}
                    <line x1="120" y1="220" x2="165" y2="220" stroke="rgba(249,115,22,0.7)" strokeWidth="8"
                      strokeLinecap="round" style={{ animation: 'fadeUpIn 0.5s 0.3s both' }}/>
                    <line x1="240" y1="120" x2="240" y2="213" stroke="rgba(249,115,22,0.5)" strokeWidth="8"
                      strokeLinecap="round" style={{ animation: 'fadeUpIn 0.5s 0.5s both' }}/>
                  </g>
                )}

                {/* STEP 4: ASTRA activation badge */}
                {step >= 4 && (
                  <g style={{ animation: 'systemActivate 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                    <rect x="80" y="55" width="100" height="26" rx="6" fill="#c2652a"/>
                    <text x="130" y="72" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold" fontFamily="Manrope">⚡ ASTRA ACTIVE</text>
                  </g>
                )}

                {/* STEP 5: Diversion route */}
                {step >= 5 && (
                  <path
                    d="M120 220 L120 120 L240 120"
                    fill="none" stroke="#16a34a" strokeWidth="4"
                    strokeLinecap="round" strokeLinejoin="round"
                    strokeDasharray="400" strokeDashoffset="400"
                    style={{ animation: 'routeDraw 1s cubic-bezier(0.16,1,0.3,1) forwards' }}
                  />
                )}
                {step >= 5 && (
                  <g style={{ animation: 'fadeUpIn 0.5s 0.8s both' }}>
                    <rect x="140" y="90" width="90" height="20" rx="4" fill="rgba(22,163,74,0.1)"
                      stroke="rgba(22,163,74,0.4)" strokeWidth="1"/>
                    <text x="185" y="103" textAnchor="middle" fontSize="8.5" fill="#16a34a" fontWeight="bold" fontFamily="Manrope">DIVERSION: 1.7 KM</text>
                  </g>
                )}

                {/* STEP 6: Resources */}
                {step >= 6 && (
                  <g>
                    {/* Officers at key point */}
                    {[
                      { x: 110, y: 110, icon: '👮', label: '4 Officers' },
                      { x: 230, y: 100, icon: '🚧', label: '8 Barricades' },
                      { x: 200, y: 230, icon: '🚨', label: '1 Tow Truck' },
                    ].map((r, i) => (
                      <g key={i} style={{ animation: `fadeUpIn 0.5s ${i * 0.2}s both` }}>
                        <circle cx={r.x} cy={r.y} r={12} fill="rgba(22,163,74,0.12)"
                          stroke="rgba(22,163,74,0.35)" strokeWidth="1.5"/>
                        <text x={r.x} y={r.y + 4.5} textAnchor="middle" fontSize="10">{r.icon}</text>
                        <text x={r.x} y={r.y + 22} textAnchor="middle" fontSize="7.5" fill="#16a34a"
                          fontWeight="bold" fontFamily="Manrope">{r.label}</text>
                      </g>
                    ))}
                  </g>
                )}
              </svg>
            </div>

            {/* Reset button */}
            <button
              onClick={resetDemo}
              className="mt-4 w-full py-2.5 border border-outline-variant/50 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">replay</span>
              Replay Simulation
            </button>
          </div>

          {/* Right: Step tracker */}
          <div className={`space-y-3 section-fade ${visible ? 'visible' : ''}`} style={{ transitionDelay: '250ms' }}>
            <p className="text-[10px] text-on-surface-variant/60 uppercase tracking-wider font-bold mb-6">
              Incident Response Sequence
            </p>
            {STEPS.map((s, i) => {
              const isActive  = step === s.id;
              const isDone    = step > s.id;
              return (
                <div
                  key={s.id}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl border transition-all duration-500"
                  style={{
                    borderColor: isDone ? 'rgba(22,163,74,0.3)' : isActive ? 'rgba(194,101,42,0.45)' : 'rgba(216,208,200,0.25)',
                    background:  isDone ? 'rgba(22,163,74,0.05)' : isActive ? 'rgba(194,101,42,0.07)' : 'transparent',
                    opacity: step === 0 ? 0.35 : (isDone || isActive ? 1 : 0.38),
                    boxShadow: isActive ? '0 2px 14px rgba(194,101,42,0.10)' : 'none',
                  }}
                >
                  {/* Icon container */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-400"
                    style={{
                      background: isDone ? 'rgba(22,163,74,0.12)' : isActive ? 'rgba(194,101,42,0.13)' : 'rgba(216,208,200,0.18)',
                    }}
                  >
                    {isDone ? (
                      <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '20px' }}>check_circle</span>
                    ) : (
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '20px', color: isActive ? s.color : '#c8bfb4' }}
                      >
                        {s.icon}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <span
                      className="font-bold block leading-snug"
                      style={{
                        fontSize: '14px',
                        letterSpacing: '0.01em',
                        color: isDone ? '#16a34a' : isActive ? '#2c2218' : '#c0b8b0',
                      }}
                    >
                      {s.label}
                    </span>
                    {isActive && (
                      <div className="mt-2 h-0.5 bg-outline-variant/25 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full"
                          style={{ animation: 'stepProgress 0.85s linear forwards' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Completion summary */}
            {step >= 6 && (
              <div
                className="mt-6 p-5 bg-emerald-50 border border-emerald-200/60 rounded-2xl system-activate"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-emerald-600">verified</span>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Response Complete</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: '< 2ms',  label: 'Detect→Deploy' },
                    { val: '1.7 km', label: 'Diversion Route' },
                    { val: '4+8+1',  label: 'Resources' },
                  ].map((stat, i) => (
                    <div key={i} className="text-center">
                      <span className="font-headline text-lg font-bold text-emerald-700 block">{stat.val}</span>
                      <span className="text-[9px] text-emerald-600/80 font-bold uppercase tracking-wider">{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes stepProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes scanLine {
          0%   { transform: translateY(0);       opacity: 0.3; }
          50%  { opacity: 0.15; }
          100% { transform: translateY(400px);   opacity: 0; }
        }
      `}</style>
    </section>
  );
}
