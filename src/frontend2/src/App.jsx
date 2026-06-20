import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/pages/LandingPage';
import SimulationConsole from './components/pages/SimulationConsole';
import DiagnosticsPanel from './components/pages/DiagnosticsPanel';
import SpatialMap from './components/pages/SpatialMap';
import OperationsDashboard from './components/pages/OperationsDashboard';
import SimulationMap from './components/pages/SimulationMap';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app/simulate" element={<SimulationConsole />} />
        <Route path="/app/diagnostics" element={<DiagnosticsPanel />} />
        <Route path="/app/map" element={<SpatialMap />} />
        <Route path="/app/dashboard" element={<OperationsDashboard />} />
        <Route path="/app/simulation-map" element={<SimulationMap />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
