# 🚀 ASTRA - How to Run & Connect Guide (Whenever You Need)

This guide explains how to start your ASTRA backend, expose it globally using Cloudflare Tunnel, and connect it to your Vercel frontend.

---

## 🔑 1. Vercel Environment Variable (Copy-Paste)

In your **Vercel Project** ➔ **Settings** ➔ **Environment Variables**:

| Variable Name (Key) | Value |
|---|---|
| `VITE_API_URL` | `https://alberta-ict-demanding-flow.trycloudflare.com` |

> ⚠️ **Important:** Do NOT add a trailing slash `/` at the end of the URL.
> After saving the environment variable, go to **Deployments** ➔ Click **Redeploy** on your latest build.

---

## ⚡ 2. How to Start Everything (Daily / Future Use)

Whenever you want to run the project for testing, demonstration, or production:

### Method A: 1-Click Launch (Easiest) ⭐
In the project root folder, simply double-click:
```bash
run_with_cloudflare.bat
```
This batch script will:
1. Start the FastAPI backend with all 9 ML models pre-loaded.
2. Launch Cloudflare Tunnel and display your live global HTTPS URL on the screen.

---

### Method B: Manual Commands (via Terminal)

If you prefer running commands manually:

#### Terminal 1 — Start the Backend:
```powershell
cd "c:\Users\SeginusAlpha\Desktop\astra backend setup\Astra-Adaptive-Smart-Traffic-Response-Analytics\src\backend"
..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### Terminal 2 — Start the Cloudflare Tunnel:
```powershell
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
```
Terminal 2 will generate your live URL (e.g. `https://xyz.trycloudflare.com`).

---

## 🧪 3. How to Verify Everything is Working

Once running, you can verify your system health anytime:

1. **In Browser:**
   - Swagger API Docs: `https://alberta-ict-demanding-flow.trycloudflare.com/docs`
   - Backend Health: `https://alberta-ict-demanding-flow.trycloudflare.com/api/v1/health`
   - ML Models (All 9): `https://alberta-ict-demanding-flow.trycloudflare.com/api/v1/health/models`

2. **Automated Verification Script:**
   In terminal, run:
   ```powershell
   .venv\Scripts\python.exe test_system_checks.py
   ```
   This will automatically test all 10 endpoints (Auth, ML Models, Predictions, Diversion, Simulation) and report their status.

---

## 👥 Default Demo Credentials
- **Username:** `operator@astra.demo`
- **Password:** `AstraOps2024!`
