@echo off
SETLOCAL EnableDelayedExpansion

echo =======================================================================
echo               ASTRA - Smart Traffic Response System Loader
echo =======================================================================
echo.

:: Change directory to the folder containing this batch script
cd /d "%~dp0"

:: 1. Verify ML Models
echo [1/3] Checking ML Model artifacts...
echo ----------------------------------------------------
if exist "src\ml\models\severity_model.cbm" (
    echo [OK] Pre-compiled ML models found in src\ml\models. Skipping retraining.
) else (
    echo [INFO] Training ML pipeline models...
    ".venv\Scripts\python.exe" -m src.ml.train_production_pipeline
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] ML Pipeline failed. Exiting.
        pause
        exit /b %ERRORLEVEL%
    )
)
echo.

:: 2. Start Backend in a new window
echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 ...
echo ----------------------------------------------------
cd src\backend
start "ASTRA Backend Server" cmd /k "..\..\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
cd ..\..

:: Wait for backend to initialize models
timeout /t 5 /nobreak > nul

:: 3. Start Frontend in a new window
echo [3/3] Starting Vite Frontend on http://localhost:5173 ...
echo ----------------------------------------------------
cd "src\frontend2"
start "ASTRA Frontend Dev Server" cmd /k "npm run dev"
cd ..\..

echo.
echo =======================================================================
echo   ASTRA Project is now running locally!
echo   - Backend:  http://127.0.0.1:8000 (Swagger docs at /docs)
echo   - Frontend: http://localhost:5173
echo.
echo   Opening browser in 3 seconds...
echo =======================================================================
timeout /t 3 /nobreak > nul
start http://localhost:5173
