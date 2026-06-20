import React, { useState, useEffect } from 'react';

export const SHAPBar = ({ featureName, featureValue, shapImpact, direction, maxImpact = 0.5 }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Reset and animate the bar width on change
    setWidth(0);
    const percentage = Math.min((Math.abs(shapImpact) / maxImpact) * 100, 100);
    const timer = setTimeout(() => setWidth(percentage), 80);
    return () => clearTimeout(timer);
  }, [shapImpact, maxImpact]);

  const isPositive = direction === 'increases_severity' || shapImpact > 0;

  return (
    <div className="py-2.5 border-b border-outline-variant/30 last:border-b-0">
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="font-mono font-bold text-on-surface">{featureName}</span>
        <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded font-medium">
          val: {featureValue !== undefined && featureValue !== null ? String(featureValue) : 'N/A'}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-surface-container h-2 rounded-full overflow-hidden relative">
          <div
            className={`h-full rounded-full shap-bar-transition ${
              isPositive ? 'bg-primary' : 'bg-tertiary-container'
            }`}
            style={{ width: `${width}%` }}
          />
        </div>
        <div className="w-16 text-right text-xs font-bold font-mono">
          <span className={isPositive ? 'text-primary' : 'text-tertiary'}>
            {isPositive ? '+' : ''}
            {shapImpact !== undefined ? Number(shapImpact).toFixed(4) : '0.0000'}
          </span>
        </div>
      </div>
    </div>
  );
};
