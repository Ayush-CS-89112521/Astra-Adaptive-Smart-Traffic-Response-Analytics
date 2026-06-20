import React, { useEffect, useRef, useState } from 'react';

const CARDS = [
  {
    icon: 'warning',
    color: 'text-primary',
    span: 'md:col-span-2',
    title: 'Severity Prediction Engine',
    body: 'A CatBoost classifier trained on Bengaluru incident data predicts operational severity (Low / High Priority) for every incoming event — with a validated Macro F1 of 99.8% across 15-fold cross-validation.',
    tag: 'Core Engine',
  },
  {
    icon: 'emergency_share',
    color: 'text-tertiary',
    span: '',
    title: 'Incident Response',
    body: 'Operator logs an incident — ASTRA instantly classifies severity, estimates resolution time, and surfaces a deployment recommendation before the situation escalates.',
    tag: 'Response',
  },
  {
    icon: 'history',
    color: 'text-on-surface',
    span: '',
    title: 'Historical Forensics',
    body: 'Run FAISS similarity searches to find identical traffic profiles and apply historical resolution patterns at scale.',
    tag: 'Memory',
  },
  {
    icon: 'analytics',
    color: 'text-primary',
    span: 'md:col-span-2',
    title: 'Simulation Console',
    body: 'Operators input event parameters (type, location, vehicle, time) and ASTRA returns a full prediction: severity class, road closure probability, estimated resolution time, and SHAP-backed feature explanations.',
    tag: 'Simulation',
  },
  {
    icon: 'psychology',
    color: 'text-primary',
    span: '',
    title: 'SHAP Explainability',
    body: 'Every prediction comes with model-level SHAP explanations — operators understand why ASTRA made each decision.',
    tag: 'Transparency',
  },
  {
    icon: 'location_on',
    color: 'text-tertiary',
    span: 'md:col-span-2',
    title: 'Spatial Clustering',
    body: 'HDBSCAN spatial clustering identifies high-risk zones across Bengaluru in real-time with unsupervised precision.',
    tag: 'Spatial AI',
  },
];

export default function BentoGrid() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-28 px-12 md:px-24 bg-surface">
      {/* Header */}
      <div className={`text-center mb-16 section-fade ${visible ? 'visible' : ''}`}>
        <div className="inline-flex items-center gap-2 mb-5">
          <div className="w-8 h-px bg-primary" />
          <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.35em]">Capabilities</span>
          <div className="w-8 h-px bg-primary" />
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-light text-on-background">
          ML-Powered Decision Architecture
        </h2>
        <p className="mt-4 text-on-surface-variant text-sm max-w-lg mx-auto leading-relaxed">
          Five validated ML components — CatBoost classifiers, FAISS retrieval, HDBSCAN clustering, and SHAP explainability — working in sequence to support traffic operations.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Subsystems (First 4 Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {CARDS.slice(0, 4).map((card, i) => (
            <div
              key={i}
              className={`bento-card bg-surface-container-low border border-outline-variant/50 p-8 rounded-3xl ${card.span} section-fade ${visible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="inline-block text-[9px] font-extrabold text-primary/70 uppercase tracking-[0.3em] border border-primary/15 bg-primary/5 rounded-full px-2 py-0.5 mb-5">
                {card.tag}
              </span>
              <div className="mb-5">
                <span className={`bento-icon material-symbols-outlined text-3xl ${card.color}`}>
                  {card.icon}
                </span>
              </div>
              <h3 className="font-display text-xl md:text-2xl font-bold text-on-background mb-3 leading-snug">
                {card.title}
              </h3>
              <p className="text-on-surface-variant text-xs leading-relaxed">
                {card.body}
              </p>
              <div className="mt-6 h-px bg-gradient-to-r from-primary/20 to-transparent" />
            </div>
          ))}
        </div>

        {/* Explainability & Spatial AI (Last 2 Cards - Equal Size) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CARDS.slice(4, 6).map((card, i) => {
            const globalIndex = i + 4;
            return (
              <div
                key={globalIndex}
                className={`bento-card bg-surface-container-low border border-outline-variant/50 p-8 rounded-3xl section-fade ${visible ? 'visible' : ''}`}
                style={{ transitionDelay: `${globalIndex * 80}ms` }}
              >
                <span className="inline-block text-[9px] font-extrabold text-primary/70 uppercase tracking-[0.3em] border border-primary/15 bg-primary/5 rounded-full px-2 py-0.5 mb-5">
                  {card.tag}
                </span>
                <div className="mb-5">
                  <span className={`bento-icon material-symbols-outlined text-3xl ${card.color}`}>
                    {card.icon}
                  </span>
                </div>
                <h3 className="font-display text-xl md:text-2xl font-bold text-on-background mb-3 leading-snug">
                  {card.title}
                </h3>
                <p className="text-on-surface-variant text-xs leading-relaxed">
                  {card.body}
                </p>
                <div className="mt-6 h-px bg-gradient-to-r from-primary/20 to-transparent" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
