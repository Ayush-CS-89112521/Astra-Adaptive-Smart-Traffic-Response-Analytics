import React, { useEffect, useRef, useState } from 'react';

const WITHOUT = [
  { icon: 'schedule',       text: 'Average 47-minute incident response time' },
  { icon: 'directions',     text: 'No automated diversion — manual re-routing only' },
  { icon: 'visibility_off', text: 'Zero real-time congestion prediction' },
  { icon: 'groups',         text: 'Under-deployment of officers at peak stress points' },
];

const WITH = [
  { icon: 'bolt',           text: '< 2ms prediction — officers deployed pre-emptively' },
  { icon: 'alt_route',      text: 'Automated diversions on 247 road nodes' },
  { icon: 'analytics',      text: '99.8% severity prediction Macro F1 — CatBoost cross-validated' },
  { icon: 'emergency_share',text: 'ML-driven resource deployment recommendations across the grid' },
];

export default function BeforeAfter() {
  const sectionRef  = useRef(null);
  const [progress, setProgress] = useState(0); // 0→1
  const [visible,  setVisible]  = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  /* Scroll-linked progress for the divider */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const onScroll = () => {
      const rect = section.getBoundingClientRect();
      const vh   = window.innerHeight;
      // Progress: 0 when top of section at bottom of viewport, 1 when section top at -50% viewport
      const raw = (vh - rect.top) / (vh + rect.height * 0.5);
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Divider goes from 50% (equal) to 65% (right side dominates)
  const dividerPct = 50 + progress * 15;

  return (
    <section ref={sectionRef} className="py-28 px-12 md:px-24 bg-surface">
      {/* Header */}
      <div className={`text-center mb-16 section-fade ${visible ? 'visible' : ''}`}>
        <div className="inline-flex items-center gap-2 mb-5">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">Phase 05 — Impact</span>
          <div className="w-8 h-px bg-primary" />
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-light text-on-background">
          The ASTRA Transformation
        </h2>
      </div>

      {/* Split-screen comparison */}
      <div className={`relative rounded-3xl overflow-hidden border border-outline-variant/40 shadow-lg section-fade ${visible ? 'visible' : ''}`}
        style={{ minHeight: '460px', transitionDelay: '150ms' }}>

        {/* LEFT PANEL — Without ASTRA */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#fff5f5] to-[#ffeaea] flex flex-col justify-center px-10 py-12"
          style={{ clipPath: `inset(0 ${100 - dividerPct}% 0 0)`, transition: 'clip-path 0.05s linear' }}
        >
          <div className="max-w-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-[0.3em]">Without ASTRA</span>
            </div>
            <h3 className="font-display text-2xl font-light text-red-900 mb-6 leading-tight">
              Reactive. Manual. Overwhelmed.
            </h3>
            <div className="space-y-4">
              {WITHOUT.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-300 text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                  <span className="text-xs text-red-700/80 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
            {/* Big stat */}
            <div className="mt-8 p-4 bg-red-100/80 rounded-2xl border border-red-200/60">
              <span className="font-headline text-4xl font-bold text-red-500">47 min</span>
              <p className="text-xs text-red-600 mt-1">Average incident response time</p>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — With ASTRA */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#f5fcf7] to-[#e8f8ee] flex flex-col justify-center px-10 py-12"
          style={{ clipPath: `inset(0 0 0 ${100 - dividerPct}%)`, transition: 'clip-path 0.05s linear' }}
        >
          {/* Right-aligned content */}
          <div className="ml-auto max-w-sm">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 status-blink" />
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-[0.3em]">With ASTRA</span>
            </div>
            <h3 className="font-display text-2xl font-light text-emerald-900 mb-6 leading-tight">
              Predictive. Automated. In Control.
            </h3>
            <div className="space-y-4">
              {WITH.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-500 text-lg flex-shrink-0 mt-0.5">{item.icon}</span>
                  <span className="text-xs text-emerald-800/80 leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
            {/* Big stat */}
            <div className="mt-8 p-4 bg-emerald-100/80 rounded-2xl border border-emerald-200/60">
              <span className="font-headline text-4xl font-bold text-emerald-600">&lt; 2 ms</span>
              <p className="text-xs text-emerald-700 mt-1">Prediction + response pipeline latency</p>
            </div>
          </div>
        </div>

        {/* Divider handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl z-10 flex items-center justify-center"
          style={{ left: `${dividerPct}%`, transition: 'left 0.05s linear' }}
        >
          <div className="w-8 h-8 rounded-full bg-white border border-outline-variant/50 shadow-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 8h6M3 5l-2 3 2 3M13 5l2 3-2 3" stroke="#c2652a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className={`mt-4 flex justify-between text-[10px] text-on-surface-variant/60 font-bold uppercase tracking-wider px-2 section-fade ${visible ? 'visible' : ''}`}
        style={{ transitionDelay: '300ms' }}>
        <span>← Scroll reveals transformation →</span>
        <span>Right side expands as you scroll ↓</span>
      </div>
    </section>
  );
}
