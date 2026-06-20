import React from 'react';

export const StatusBadge = ({ status }) => {
  const normStatus = String(status || '').toLowerCase().trim();

  let bgClass = 'bg-surface-container-high text-on-surface-variant';
  let dotClass = 'bg-secondary';
  let label = 'UNKNOWN';
  let icon = 'info';

  if (normStatus === 'ready' || normStatus === 'ok' || normStatus === 'true' || normStatus === 'active') {
    bgClass = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
    dotClass = 'bg-emerald-500';
    label = 'READY';
    icon = 'check_circle';
  } else if (normStatus === 'degraded' || normStatus === 'warning') {
    bgClass = 'bg-amber-100 text-amber-800 border border-amber-200';
    dotClass = 'bg-amber-500';
    label = 'DEGRADED';
    icon = 'warning';
  } else if (normStatus === 'warming' || normStatus === 'false' || normStatus === 'pending') {
    bgClass = 'bg-blue-100 text-blue-800 border border-blue-200';
    dotClass = 'bg-blue-500 animate-pulse';
    label = 'WARMING';
    icon = 'hourglass_empty';
  } else if (normStatus === 'failed' || normStatus === 'error' || normStatus === 'offline') {
    bgClass = 'bg-rose-100 text-rose-800 border border-rose-200';
    dotClass = 'bg-rose-500';
    label = 'OFFLINE';
    icon = 'cancel';
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${bgClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      <span>{label}</span>
    </div>
  );
};
