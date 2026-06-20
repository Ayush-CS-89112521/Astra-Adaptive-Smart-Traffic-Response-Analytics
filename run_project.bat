@echo off
SETLOCAL EnableDelayedExpansion

echo =======================================================================
echo               ASTRA - Smart Traffic Response System Loader
echo =======================================================================
echo.

:: 1. Run ML Pipeline
echo [1/3] Verifying and running ML Pipeline...
echo ----------------------------------------------------
cd "Theme 2"
echo Running ML training/verification script...
".venv\Scripts\python.exe" -m src.ml.train_production_pipeline
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ML Pipeline failed. Exiting.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [SUCCESS] ML Pipeline complete!
echo.

:: 2. Start Backend in a new window
echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
echo ----------------------------------------------------
cd src\backend
start "ASTRA Backend Server" cmd /k "..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd ..\..

:: Wait a few seconds for backend to start up
timeout /t 5 /nobreak > nul

:: 3. Start Frontend in a new window
echo [3/3] Starting Vite Frontend on http://localhost:5174 ...
echo ----------------------------------------------------
cd "src\frontend2"
start "ASTRA Frontend Dev Server" cmd /k "npm run dev"
cd ..\..

echo.
echo =======================================================================
echo   ASTRA Project is now running!
echo   - Backend: http://127.0.0.1:8000
echo   - Frontend: http://localhost:5174
echo.
echo   Press any key to close this loader (backend and frontend will continue).
echo =======================================================================
pause
