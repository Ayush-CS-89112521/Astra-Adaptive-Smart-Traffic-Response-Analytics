import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreeGlobe } from '../ui/ThreeGlobe';

/**
 * HeroSection — Cinematic full-screen hero with word-by-word reveal.
 * Timeline:
 *   0.0s → 0.5s  — Ambient background only
 *   0.5s → 1.2s  — Globe emerges (spring scale 0.85→1.0)
 *   1.2s          — "Predict." reveals (slide up)
 *   1.4s          — "Simulate." reveals
 *   1.6s          — "Respond." reveals
 *   1.9s          — Subtitle fades in
 *   2.1s          — CTAs fade in
 *   2.4s          — Scroll indicator appears
 */
export default function HeroSection() {
  const navigate  = useNavigate();
  const [supVisible, setSupVisible] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [scrollVisible, setScrollVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setSupVisible(true),    900);
    const t2 = setTimeout(() => setCtaVisible(true),    1100);
    const t3 = setTimeout(() => setScrollVisible(true), 1400);
    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, []);

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden"
      style={{ background: '#faf5ee' }}
    >
      {/* Dot-grid ambient background */}
      <div className="absolute inset-0 hero-grid-bg pointer-events-none" />

      {/* Radial gradient vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(250,245,238,0.85) 100%)',
        }}
      />

      {/* Globe — centered behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="globe-enter w-[580px] h-[580px] md:w-[700px] md:h-[700px]">
          <ThreeGlobe zoom={220} rotationSpeed={0.0012} variant="hero" />
        </div>
      </div>



      {/* Headline — word-by-word reveal */}
      <div className="relative z-10 select-none mt-8">
        <h1
          className="font-display leading-none tracking-tight text-on-background"
          style={{ fontSize: 'clamp(4rem, 10vw, 8.5rem)' }}
        >
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { text: 'Predict.',  delay: '0.1s',  cls: '' },
              { text: 'Simulate.', delay: '0.35s', cls: 'text-primary italic' },
              { text: 'Respond.',  delay: '0.6s',  cls: '' },
            ].map((w, i) => (
              <span key={i} className="word-mask">
                <span
                  className={`word-inner word-inner-auto ${w.cls}`}
                  style={{ animationDelay: w.delay }}
                >
                  {w.text}
                </span>
              </span>
            ))}
          </div>
        </h1>
      </div>

      {/* Subtitle */}
      <p
        className="relative z-10 mt-8 font-body text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-light px-6"
        style={{
          opacity: supVisible ? 1 : 0,
          transform: supVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <span className="font-semibold text-on-background">ASTRA</span>
        <span className="text-on-surface-variant/50"> (Adaptive Smart Traffic Response &amp; Analytics)</span>
        {' '}— CatBoost severity classification, FAISS incident retrieval, HDBSCAN spatial
        clustering, and SHAP explainability — forecasting impact, recommending deployment,
        and generating diversion routes before congestion escalates.
      </p>

      {/* CTA Buttons */}
      <div
        className="relative z-10 mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center px-6"
        style={{
          opacity: ctaVisible ? 1 : 0,
          transform: ctaVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s, transform 0.7s cubic-bezier(0.16,1,0.3,1) 0.05s',
        }}
      >
        <button
          onClick={() => navigate('/app/simulate')}
          className="bg-primary hover:bg-primary-container text-on-primary px-10 py-4 rounded-lg font-label text-sm uppercase tracking-widest font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
        >
          Enter Simulation
        </button>
        <button
          onClick={() => navigate('/app/map')}
          className="border border-outline-variant/70 bg-white/40 backdrop-blur-sm text-on-background px-10 py-4 rounded-lg font-label text-sm uppercase tracking-widest font-bold hover:bg-surface-container transition-all"
        >
          View Live Map
        </button>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        style={{
          opacity: scrollVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <span className="text-[9px] text-on-surface-variant/60 uppercase tracking-[0.3em] font-bold">Scroll</span>
        <div className="scroll-bounce">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 4v10M4 9l5 5 5-5" stroke="#c2652a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
          </svg>
        </div>
      </div>


    </section>
  );
}
