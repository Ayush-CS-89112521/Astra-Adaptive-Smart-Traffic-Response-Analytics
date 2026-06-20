import React from 'react';
import { Link } from 'react-router-dom';

export const TopBar = ({ title = 'Dashboard', breadcrumbs = [] }) => {
  return (
    <header className="sticky top-0 z-35 bg-surface/85 backdrop-blur-md px-8 py-4 flex justify-between items-center border-b border-outline-variant/40 soft-shadow">
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/80 font-medium">
          <Link to="/" className="flex items-center hover:text-primary transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-xs">home</span>
          </Link>
          {breadcrumbs.map((bc, idx) => (
            <React.Fragment key={idx}>
              <span className="text-[9px] opacity-40">/</span>
              <span>{bc}</span>
            </React.Fragment>
          ))}
        </div>
        <h2 className="font-headline text-2xl font-bold text-on-background mt-0.5">{title}</h2>
      </div>
      
      
    </header>
  );
};
