import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import HeroSection    from '../landing/HeroSection';
import MetricsSection from '../landing/MetricsSection';
import ScrollNarrative from '../landing/ScrollNarrative';
import DecisionEngine from '../landing/DecisionEngine';
import LiveDiversion  from '../landing/LiveDiversion';
import BeforeAfter    from '../landing/BeforeAfter';
import BentoGrid      from '../landing/BentoGrid';
import { getLivenessHealth, getModelHealth } from '../../api/health';

/* ─── Sticky Navbar with scroll-opacity ─── */
function Navbar({ status }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getStatusColor = () => {
    if (status === 'ok') return 'bg-emerald-500';
    if (status === 'degraded') return 'bg-amber-500';
    if (status === 'offline') return 'bg-rose-500';
    return 'bg-blue-400 animate-pulse';
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 px-8 py-4 flex justify-between items-center transition-all duration-400"
      style={{
        background: scrolled
          ? 'rgba(250,245,238,0.88)'
          : 'rgba(250,245,238,0)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(216,208,200,0.4)' : '1px solid transparent',
        boxShadow: scrolled ? '0 1px 20px rgba(58,48,42,0.06)' : 'none',
      }}
    >
      <div className="flex flex-col items-start">
        <span className="font-headline text-2xl font-bold text-primary tracking-tight leading-none">ASTRA</span>
        <span className="font-body text-[9px] text-primary uppercase tracking-widest mt-1 font-semibold opacity-85">Bengaluru Traffic Control</span>
      </div>

      <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-on-surface-variant">
        <Link to="/"                className="hover:text-primary transition-colors text-on-background">Overview</Link>
        <Link to="/app/simulate"    className="hover:text-primary transition-colors">Simulation</Link>
        <Link to="/app/diagnostics" className="hover:text-primary transition-colors">Diagnostics</Link>
        <Link to="/app/map"         className="hover:text-primary transition-colors">Spatial Map</Link>
        <Link to="/app/dashboard"   className="hover:text-primary transition-colors">Dashboard</Link>
      </nav>

      <button
        onClick={() => navigate('/app/simulate')}
        className="bg-primary hover:bg-primary-container text-on-primary px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md hover:-translate-y-0.5"
      >
        Launch Console
      </button>
    </header>
  );
}


/* ─── Final CTA ─── */
function FinalCTA() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative bg-primary text-on-primary py-28 px-12 text-center overflow-hidden"
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Ambient circles */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/3 pointer-events-none" />

      <div className={`relative z-10 section-fade ${visible ? 'visible' : ''}`}>
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-on-primary/60 status-blink" />
          <span className="text-[10px] font-extrabold text-on-primary/70 uppercase tracking-[0.35em]">
            Ready for Deployment
          </span>
        </div>
        <h2 className="font-display text-4xl md:text-6xl font-light mb-5 leading-tight">
          Deploy Network Intelligence.
        </h2>
        <p className="text-on-primary/75 text-sm md:text-base mb-10 max-w-lg mx-auto leading-relaxed font-light">
          Simulate incident effects, run live predictions, and orchestrate traffic across
          the entire Bengaluru metropolitan grid.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/app/simulate')}
            className="bg-on-primary text-primary hover:bg-primary-fixed px-10 py-4 rounded-lg text-sm font-bold transition-all shadow-xl hover:-translate-y-0.5 uppercase tracking-widest"
          >
            Launch Command Centre
          </button>
          <button
            onClick={() => navigate('/app/dashboard')}
            className="border border-on-primary/30 text-on-primary hover:bg-on-primary/10 px-10 py-4 rounded-lg text-sm font-bold transition-all uppercase tracking-widest"
          >
            System Dashboard
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── Footer ─── */
function Footer({ status }) {
  const getStatusDetails = () => {
    if (status === 'ok')       return { color: 'text-emerald-600', dot: 'bg-emerald-500', text: 'All Systems Operational' };
    if (status === 'degraded') return { color: 'text-amber-600',   dot: 'bg-amber-500',   text: 'Degraded — Models Loading' };
    if (status === 'offline')  return { color: 'text-rose-500',    dot: 'bg-rose-500',    text: 'Backend Offline' };
    return { color: 'text-blue-500', dot: 'bg-blue-400 animate-pulse', text: 'Checking Status…' };
  };
  const details = getStatusDetails();

  const capabilities = [
    'Severity Prediction', 'Diversion Planning', 'Resource Allocation',
    'Geospatial Intelligence', 'Historical Retrieval', 'Decision Support',
  ];

  return (
    <footer className="bg-[#faf5ee] pt-16 pb-8 px-12 md:px-24 border-t border-[#e8ddd0]">
      <div className="max-w-6xl mx-auto">

        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12 border-b border-[#e8ddd0]">

          {/* Col 1 — Brand + Description */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <span className="font-headline text-3xl font-bold text-[#c2652a] tracking-tight">ASTRA</span>
            </div>
            <p className="text-[11px] font-bold text-[#c2652a] uppercase tracking-[0.25em]">
              Predict. Plan. Divert. Respond.
            </p>
            <p className="text-[12px] text-[#7a6e64] leading-relaxed">
              A machine learning-powered Traffic Operations Intelligence Platform built on CatBoost and geospatial analytics. ASTRA forecasts incident severity, estimates resolution time, retrieves similar historical events, recommends police and barricade deployment, and generates optimised diversion routes — before congestion escalates.
            </p>
            {/* Capabilities pills */}
            <div className="flex flex-wrap gap-1.5 mt-1">
              {capabilities.map((cap) => (
                <span
                  key={cap}
                  className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-[#d8cfc4] text-[#9a8a7a] bg-[#f6f0e8]"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2 — Navigation */}
          <div className="flex flex-col gap-3">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#b0a090] mb-1">Platform</p>
            {[
              { label: 'Simulation Console',    to: '/app/simulate' },
              { label: 'Diagnostics Panel',     to: '/app/diagnostics' },
              { label: 'Spatial Map',           to: '/app/map' },
              { label: 'Operations Dashboard',  to: '/app/dashboard' },
            ].map(({ label, to }) => (
              <Link
                key={to}
                to={to}
                className="text-[12px] text-[#7a6e64] hover:text-[#c2652a] transition-colors font-medium flex items-center gap-2 group"
              >
                <span className="w-3 h-px bg-[#d8cfc4] group-hover:bg-[#c2652a] group-hover:w-4 transition-all duration-200" />
                {label}
              </Link>
            ))}
          </div>

          {/* Col 3 — Builder + System Status */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#b0a090] mb-3">Builder</p>
              <p className="text-[13px] font-bold text-[#3a302a] mb-0.5">Ayush</p>
              <p className="text-[11px] text-[#9a8a7a] leading-relaxed mb-4">
                Built for Flipkart Gridlock 2.0 · Round 2
              </p>
              <div className="flex gap-3">
                {/* GitHub */}
                <a
                  href="https://github.com/Ayush-CS-89112521"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d8cfc4] bg-white hover:border-[#c2652a]/50 hover:bg-[#c2652a]/5 transition-all group"
                >
                  <svg className="w-4 h-4 text-[#9a8a7a] group-hover:text-[#c2652a] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <span className="text-[11px] font-bold text-[#7a6e64] group-hover:text-[#c2652a] transition-colors">GitHub</span>
                </a>
                {/* LinkedIn */}
                <a
                  href="https://www.linkedin.com/in/ayush-54b931381/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#d8cfc4] bg-white hover:border-[#c2652a]/50 hover:bg-[#c2652a]/5 transition-all group"
                >
                  <svg className="w-4 h-4 text-[#9a8a7a] group-hover:text-[#c2652a] transition-colors" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span className="text-[11px] font-bold text-[#7a6e64] group-hover:text-[#c2652a] transition-colors">LinkedIn</span>
                </a>
              </div>
            </div>


          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[10px] text-[#b0a090] font-mono">
            © 2026 ASTRA · Adaptive Smart Traffic Response &amp; Analytics · Flipkart Gridlock 2.0
          </p>
          <p className="text-[10px] text-[#c8bfb4] font-mono">
            CatBoost · FastAPI · React · Vite · Bengaluru Grid
          </p>
        </div>

      </div>
    </footer>
  );
}

/* ─── Root LandingPage ─── */
export default function LandingPage() {
  const [systemStatus, setSystemStatus] = useState('loading'); // loading | ok | degraded | offline

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const [liveness, models] = await Promise.all([
          getLivenessHealth(),
          getModelHealth()
        ]);
        if (!active) return;
        if (liveness.data.status === 'ok') {
          if (models.data.status === 'ok') {
            setSystemStatus('ok');
          } else {
            setSystemStatus('degraded');
          }
        } else {
          setSystemStatus('offline');
        }
      } catch (err) {
        if (active) setSystemStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative bg-surface overflow-x-hidden selection:bg-primary/20 selection:text-primary">
      {/* Mouse follow glow */}
      <MouseGlow />

      <Navbar status={systemStatus} />

      {/* 1. Cinematic Hero */}
      <HeroSection />

      {/* 2. Intelligence Metrics (counting) */}
      <MetricsSection />

      {/* 3. Scroll Narrative: Chaos → Predict → Simulate */}
      <ScrollNarrative />

      {/* 4. Decision Engine Pipeline */}
      <DecisionEngine />

      {/* 5. Live Diversion Showcase */}
      <LiveDiversion />

      {/* 6. Before vs After */}
      <BeforeAfter />

      {/* 7. Bento Capabilities */}
      <BentoGrid />

      {/* 8. Final CTA */}
      <FinalCTA />

      {/* 9. Footer */}
      <Footer status={systemStatus} />
    </div>
  );
}


/* ─── Mouse Glow (subtle ambient) ─── */
function MouseGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    let rafId;
    let mx = -1000, my = -1000;

    const onMove = (e) => { mx = e.clientX; my = e.clientY; };
    window.addEventListener('mousemove', onMove, { passive: true });

    const tick = () => {
      if (glowRef.current) {
        glowRef.current.style.left = `${mx}px`;
        glowRef.current.style.top  = `${my}px`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full z-0"
      style={{
        background: 'radial-gradient(circle, rgba(194,101,42,0.04) 0%, transparent 70%)',
        left: '-1000px',
        top:  '-1000px',
      }}
    />
  );
}
