# ASTRA Frontend2 Implementation Walkthrough

The ASTRA React + Vite frontend has been successfully initialized, structured, and implemented inside the **`src/frontend2`** directory. It conforms to the **"Sahara — Warm Minimalism"** design system tokens and interfaces with the FastAPI backend.

---

## 1. Accomplishments & Key Components Built

1.  **Project Scaffolding:**
    *   Set up a React + Vite project structure inside `src/frontend2/`.
    *   Configured **Tailwind CSS v3** with the complete Sahara token palette, including Burnt Sienna (`#c2652a`), Warm Linen (`#faf5ee`), and Dusty Rose (`#8c3c3c`).
2.  **Robust Leaflet Integration (`SpatialMap.jsx`):**
    *   **Interactive Map Integration**: Integrated a native Leaflet map with a custom dark tile layer matching ASTRA's premium interface design. Resolved a layout conflict where Leaflet's default styles overrode Tailwind's height classes by adding explicit inline styles to guarantee rendering.
    *   Visualized spatial HDBSCAN hotspot clusters dynamically from `GET /api/v1/hotspots`.
    *   Computed and plotted detour and diversion paths via `POST /api/v1/routing/diversion`.
3.  **Real-Time Simulation Console (`SimulationConsole.jsx`):**
    *   Constructed a detailed Incident Intake Form supporting coordinates, event causes, vehicle metrics, and temporal factors.
    *   Developed a mock diagnostic terminal panel (`bg-on-background`).
    *   Wired REST-based `QUICK PREDICT` and WebSocket-based `RUN LIVE SIMULATION` routes to stream real-time step progressions.
4.  **SHAP Diagnostics Panel (`DiagnosticsPanel.jsx`):**
    *   Built an interactive interface to start and poll the CatBoost SHAP explanation job.
    *   Implemented a premium, custom-scaled SHAP Waterfall Chart:
        *   **Aesthetics**: Uses the **Sahara — Warm Minimalism** palette with Burnt sienna (`#c2652a`) and Dusty Rose (`#8c3c3c`) directional bars.
        *   **Clipping Protection**: Derives bounds dynamically and adds 10% outer padding to guarantee that bars and cumulative values never clip at the container edges.
        *   **Overflow Control**: Wraps features in a scrollable view (`max-h-[300px] overflow-y-auto`) to fit multiple parameters cleanly.
        *   **Label Enhancements**: Integrates impact values next to feature names for clear reading even with very thin bars.
        *   **Traceability & Fixes**: Restored backend uvicorn worker, resolving the `'EventRequest' object has no attribute 'crowd_size'` API crash.
5.  **Telemetry Dashboard (`OperationsDashboard.jsx`):**
    *   Created a telemetric telemetry deck displaying Avg/P95 latency, active WebSockets, worker counts, memory capacity, and hits.
    *   Maintained a 3x3 grid tracking model readiness of 9 active engines.
6.  **Three.js Canvas Atmosphere (`LandingPage.jsx` & `ThreeGlobe.jsx`):**
    *   Constructed interactive 3D WebGL wireframe globes with rotating structures and network point-clouds.

---

## 2. Page Routing

The application routes are configured in [App.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/App.jsx):

*   `/` -> [LandingPage.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/components/pages/LandingPage.jsx)
*   `/app/simulate` -> [SimulationConsole.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/components/pages/SimulationConsole.jsx)
*   `/app/diagnostics` -> [DiagnosticsPanel.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/components/pages/DiagnosticsPanel.jsx)
*   `/app/map` -> [SpatialMap.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/components/pages/SpatialMap.jsx)
*   `/app/dashboard` -> [OperationsDashboard.jsx](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/Theme%202/src/frontend2/src/components/pages/OperationsDashboard.jsx)

---

## 3. Verification

The project compiles cleanly for production output:

```bash
vite v8.0.16 building client environment for production...
transforming...✓ 98 modules transformed.
rendering chunks...
dist/index.html                     1.25 kB
dist/assets/index-C7zpV8h2.css     41.69 kB
dist/assets/index-CyNeSqwf.js   1,005.48 kB
✓ built in 1.93s
```

---

## 4. Run Locally

1.  Start the FastAPI backend on port `8000`.
2.  Navigate to `src/frontend2` and start the development server:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:5174` in your browser.
