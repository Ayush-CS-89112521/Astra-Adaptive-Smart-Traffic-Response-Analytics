import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

export const SideNav = () => {
  const [hasSimulation, setHasSimulation] = useState(
    !!localStorage.getItem('astra_active_simulation')
  );

  useEffect(() => {
    const checkSim = () => {
      setHasSimulation(!!localStorage.getItem('astra_active_simulation'));
    };
    window.addEventListener('storage', checkSim);
    window.addEventListener('astra_simulation_change', checkSim);
    return () => {
      window.removeEventListener('storage', checkSim);
      window.removeEventListener('astra_simulation_change', checkSim);
    };
  }, []);

  const navItems = [
    { label: 'Portal Entry', path: '/', icon: 'home' },
    { label: 'Simulation Console', path: '/app/simulate', icon: 'rebase_edit' },
    ...(hasSimulation ? [{ label: 'Simulation Map', path: '/app/simulation-map', icon: 'route' }] : []),
    { label: 'Diagnostics Panel', path: '/app/diagnostics', icon: 'analytics' },
    { label: 'Spatial Map', path: '/app/map', icon: 'map' },
    { label: 'Operations Dashboard', path: '/app/dashboard', icon: 'dashboard' },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full flex flex-col p-4 z-40 w-64 bg-surface-container-low border-r border-outline-variant/60">
      <div className="mb-8 px-2">
        <h1 className="font-headline text-xl font-bold text-primary tracking-tight">ASTRA</h1>
        <p className="font-body text-xs text-on-surface-variant/70 uppercase tracking-widest mt-1">Bengaluru Traffic Control</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-body text-sm ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container font-bold scale-95 duration-150 shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface font-medium'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span 
                  className="material-symbols-outlined text-lg"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
