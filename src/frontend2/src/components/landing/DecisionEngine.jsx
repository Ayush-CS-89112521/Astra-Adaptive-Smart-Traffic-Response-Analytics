import React, { useEffect, useRef, useState } from 'react';
import { getRoutingHealth } from '../../api/health';

const PIPELINE_STAGES = [
  { id: 'event',      label: 'Event Data',       icon: 'sensors',     color: '#605850', desc: 'Incident form submitted' },
  { id: 'severity',   label: 'Severity Engine',  icon: 'warning',     color: '#c2652a', desc: 'CatBoost ML classification' },
  { id: 'similarity', label: 'Similarity Engine',icon: 'search',      color: '#c2652a', desc: 'FAISS vector retrieval' },
  { id: 'routing',    label: 'Routing Engine',   icon: 'alt_route',   color: '#c2652a', desc: 'NetworkX diversion graph' },
  { id: 'decision',   label: 'Decision Layer',   icon: 'psychology',  color: '#3a302a', desc: 'Rule engine synthesis' },
  { id: 'response',   label: 'Response',         icon: 'emergency_share', color: '#c2652a', desc: 'Officers + diversion deployed' },
];

export default function DecisionEngine() {
  const sectionRef = useRef(null);
  const [activeStage, setActiveStage] = useState(-1);
  const [drawnLines, setDrawnLines]   = useState([]);
  const [pulseLine, setPulseLine]     = useState(null);
  const [started, setStarted]         = useState(false);
  const [visible, setVisible]         = useState(false);
  const [roadNodes, setRoadNodes]     = useState(247);

  useEffect(() => {
    const fetchRouting = async () => {
      try {
        const res = await getRoutingHealth();
        if (res.data && typeof res.data.nodes === 'number' && res.data.nodes > 0) {
          setRoadNodes(res.data.nodes);
        }
      } catch (err) {
        console.warn('Could not fetch routing telemetry:', err);
      }
    };
    fetchRouting();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setVisible(true);
          setStarted(true);
        }
      },
      { threshold: 0.25 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, [started]);


  // Sequential stage reveal + line draw
  useEffect(() => {
    if (!started) return;
    const timers = [];
    PIPELINE_STAGES.forEach((_, i) => {
      timers.push(
        setTimeout(() => {
          setActiveStage(i);
          if (i > 0) setDrawnLines(prev => [...prev, i - 1]);
          if (i > 0) {
            setPulseLine(i - 1);
            setTimeout(() => setPulseLine(null), 1600);
          }
        }, 300 + i * 500)
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [started]);

  return (
    <section
      ref={sectionRef}
      className="py-28 px-12 md:px-24 bg-surface-container-low border-y border-outline-variant/30"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-20 section-fade ${visible ? 'visible' : ''}`}>
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-px bg-primary" />
            <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">Phase 04 — Decision</span>
            <div className="w-8 h-px bg-primary" />
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-on-background leading-tight">
            The ASTRA Decision Engine
          </h2>
          <p className="mt-4 text-on-surface-variant text-sm max-w-lg mx-auto leading-relaxed">
            Six integrated subsystems fire in sequence — from incident input to deployed response recommendation.
          </p>
        </div>

        {/* Pipeline Diagram */}
        <div className="relative">
          {/* Desktop: horizontal flow */}
          <div className="hidden md:flex items-center justify-between gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive  = activeStage >= i;
              const isDrawn   = drawnLines.includes(i - 1);
              const isPulsing = pulseLine === i - 1;

              return (
                <React.Fragment key={stage.id}>
                  {/* Connector line (before each stage except first) */}
                  {i > 0 && (
                    <div className="flex-1 relative h-1 mx-1">
                      {/* Base track */}
                      <div className="absolute inset-0 bg-outline-variant/40 rounded-full" />
                      {/* Drawn segment */}
                      <div
                        className="absolute inset-0 bg-primary rounded-full transition-all duration-500"
                        style={{ width: isDrawn ? '100%' : '0%' }}
                      />
                      {/* Pulse dot */}
                      {isPulsing && (
                        <div
                          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-md"
                          style={{
                            animation: 'pulseTravel 1.5s linear forwards',
                            left: '0%',
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Stage node */}
                  <div
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                    style={{
                      opacity: isActive ? 1 : 0.3,
                      transform: isActive ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.95)',
                      transition: 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: isActive ? (i === 0 || i === 4 ? '#f6f0e8' : '#fbe8d8') : '#f6f0e8',
                        borderColor:  isActive ? 'rgba(194,101,42,0.4)' : 'rgba(216,208,200,0.5)',
                        boxShadow: isActive && (i === 1 || i === 4 || i === 5) ? '0 0 0 3px rgba(194,101,42,0.12)' : 'none',
                        transition: 'all 0.4s ease',
                      }}
                    >
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ color: isActive ? stage.color : '#d8d0c8' }}
                      >
                        {stage.icon}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-bold text-center leading-tight max-w-[70px]"
                      style={{ color: isActive ? '#3a302a' : '#d8d0c8' }}
                    >
                      {stage.label}
                    </span>
                    <span
                      className="text-[9px] text-center leading-tight max-w-[70px]"
                      style={{ color: isActive ? '#605850' : '#e0d8d0', opacity: isActive ? 1 : 0 }}
                    >
                      {stage.desc}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* Mobile: vertical flow */}
          <div className="md:hidden flex flex-col items-center gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const isActive = activeStage >= i;
              const isDrawn  = drawnLines.includes(i - 1);
              return (
                <React.Fragment key={stage.id}>
                  {i > 0 && (
                    <div className="w-px h-8 relative">
                      <div className="absolute inset-0 bg-outline-variant/40" />
                      <div className="absolute inset-0 bg-primary transition-all duration-500"
                        style={{ height: isDrawn ? '100%' : '0%' }} />
                    </div>
                  )}
                  <div
                    className="flex items-center gap-4 w-full max-w-xs p-3 rounded-xl border"
                    style={{
                      opacity: isActive ? 1 : 0.35,
                      borderColor: isActive ? 'rgba(194,101,42,0.3)' : 'rgba(216,208,200,0.4)',
                      background: isActive ? '#fbe8d8' : '#f6f0e8',
                      transition: 'all 0.5s ease',
                    }}
                  >
                    <span className="material-symbols-outlined text-xl" style={{ color: isActive ? stage.color : '#d8d0c8' }}>
                      {stage.icon}
                    </span>
                    <div>
                      <span className="text-xs font-bold block" style={{ color: isActive ? '#3a302a' : '#d8d0c8' }}>{stage.label}</span>
                      <span className="text-[10px]" style={{ color: '#605850' }}>{stage.desc}</span>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Bottom latency badge */}
        <div
          className={`mt-16 flex justify-center section-fade ${visible ? 'visible' : ''}`}
          style={{ transitionDelay: '300ms' }}
        >
          <div className="inline-flex items-center gap-4 bg-surface border border-outline-variant/50 rounded-2xl px-8 py-4 shadow-sm">
            <div className="text-center">
              <span className="font-headline text-3xl font-bold text-primary block">&lt;2ms</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Model Inference</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/40" />
            <div className="text-center">
              <span className="font-headline text-3xl font-bold text-primary block">6</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Subsystems</span>
            </div>
            <div className="w-px h-10 bg-outline-variant/40" />
            <div className="text-center">
              <span className="font-headline text-3xl font-bold text-primary block">&lt;300ms</span>
              <span className="text-[10px] text-on-surface-variant uppercase tracking-wider font-bold">Full Pipeline</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pulse travel animation (CSS-only fallback) */}
      <style>{`
        @keyframes pulseTravel {
          from { left: 0%;   opacity: 1; }
          to   { left: 100%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}
