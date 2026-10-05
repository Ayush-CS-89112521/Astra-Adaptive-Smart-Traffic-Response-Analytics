@echo off
SETLOCAL EnableDelayedExpansion

echo =======================================================================
echo          ASTRA Backend + Cloudflare Tunnel (Global Live URL)
echo =======================================================================
echo.

cd /d "%~dp0"

:: 1. Start FastAPI Backend in background window if not running
echo [1/2] Launching ASTRA FastAPI Backend...
cd src\backend
start "ASTRA Backend Server" cmd /k "..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd ..\..

timeout /t 3 /nobreak > nul

:: 2. Launch Cloudflare Tunnel
echo.
echo [2/2] Launching Cloudflare Tunnel for Port 8000...
echo -----------------------------------------------------------------------
echo Look for the link ending in '.trycloudflare.com' below:
echo (Copy that link and put it in your Vercel VITE_API_URL settings)
echo -----------------------------------------------------------------------
echo.

"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000
