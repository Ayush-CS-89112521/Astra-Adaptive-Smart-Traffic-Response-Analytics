import React, { useEffect, useRef, useState } from 'react';
import { getPerformanceHealth } from '../../api/health';

const METRICS = [
  { val: 99.8,  suffix: '%',   label: 'Severity Prediction F1',  desc: 'CatBoost · OOF Macro F1 (15-fold CV)',    color: 'text-primary' },
  { val: 2,     prefix: '<',   suffix: 'ms', label: 'Inference Latency',       desc: 'CatBoost tabular inference per request',  color: 'text-primary' },
  { val: 76,    suffix: '%',   label: 'Similarity Precision@1',  desc: 'FAISS + Sentence Transformer retrieval',  color: 'text-primary' },
  { val: 95,    suffix: '%',   label: 'Index Compression',       desc: 'FAISS PCA: 12.5 MB → 653 KB',           color: 'text-primary' },
];

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function AnimatedCounter({ val, prefix = '', suffix = '', delay = 0, triggered }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!triggered) return;
    let start = null;
    const duration = 1400;

    const timer = setTimeout(() => {
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        setDisplay(parseFloat((val * easeOutExpo(progress)).toFixed(val % 1 !== 0 ? 1 : 0)));
        if (progress < 1) rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(timer);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [triggered, val, delay]);

  return (
    <span>
      {prefix}{display}{suffix}
    </span>
  );
}

export default function MetricsSection() {
  const sectionRef = useRef(null);
  const [triggered, setTriggered] = useState(false);
  const [visible, setVisible]     = useState(false);
  const [metrics, setMetrics]     = useState(METRICS);

  useEffect(() => {
    const fetchLatency = async () => {
      try {
        const res = await getPerformanceHealth();
        const avgLatency = res.data.avg_latency_ms;
        if (avgLatency && typeof avgLatency === 'number') {
          setMetrics(prev => prev.map(m => {
            if (m.label === 'Inference Latency') {
              return {
                ...m,
                val: avgLatency,
                prefix: '',
                desc: `Live avg latency: ${avgLatency.toFixed(2)}ms`
              };
            }
            return m;
          }));
        }
      } catch (err) {
        console.warn('Could not fetch performance telemetry from backend:', err);
      }
    };

    fetchLatency();
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setTriggered(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-28 px-12 md:px-24 bg-surface-container-low border-y border-outline-variant/40 relative"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left: headline */}
        <div
          className="section-fade"
          style={{ transitionDelay: '0ms' }}
          ref={el => el && visible && el.classList.add('visible')}
        >
          <div className="inline-flex items-center gap-2 mb-5">
            <div className="w-8 h-px bg-primary" />
            <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">
              Intelligence Metrics
            </span>
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-light text-on-background mb-5 leading-tight">
            Validated Models.{' '}
            <span className="font-headline italic text-primary">Grounded in Data.</span>
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
            Every metric is derived from cross-validated experiments on the production dataset.
            CatBoost severity classification, FAISS semantic retrieval, and HDBSCAN spatial
            clustering — each independently benchmarked.
          </p>
        </div>

        {/* Right: metric cards */}
        <div className="grid grid-cols-2 gap-4">
          {metrics.map((m, i) => (
            <div
              key={i}
              className="bg-surface p-6 rounded-2xl border border-outline-variant/50 section-fade"
              style={{ transitionDelay: `${i * 100}ms` }}
              ref={el => {
                if (el && visible) setTimeout(() => el.classList.add('visible'), i * 100);
              }}
            >
              <div className={`font-headline text-3xl md:text-4xl font-bold ${m.color}`}>
                <AnimatedCounter
                  val={m.val}
                  prefix={m.prefix}
                  suffix={m.suffix}
                  delay={i * 100}
                  triggered={triggered}
                />
              </div>
              <p className="text-xs font-bold text-on-surface mt-2">{m.label}</p>
              <p className="text-[10px] text-on-surface-variant mt-1">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

