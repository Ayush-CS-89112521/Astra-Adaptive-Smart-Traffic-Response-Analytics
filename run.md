# Running the ASTRA Project

This guide provides instructions on how to run the Adaptive Smart Traffic Response & Analytics (ASTRA) project, both using the automated Windows batch script and manually step-by-step.

---

## Method 1: Using the Automated Batch Script (Recommended for Windows)

A startup batch script [run_project.bat](file:///c:/Users/SeginusAlpha/Desktop/FlipKart%20Gridlock%202.0%20Round%202%20frontend2/run_project.bat) is provided in the root directory. It runs the ML pipeline to prepare models, then starts the FastAPI backend and Vite frontend servers in separate windows.

### Steps:
1. Open a command prompt or file explorer in the root folder `FlipKart Gridlock 2.0 Round 2 frontend2`.
2. Double-click or execute:
   ```cmd
   run_project.bat
   ```
3. The script will:
   * Run the ML pipeline training and data preparation (`train_production_pipeline.py`).
   * Spawn a new command terminal starting the FastAPI backend on `http://127.0.0.1:8000`.
   * Spawn another command terminal starting the Vite frontend on `http://localhost:5174`.

---

## Method 2: Running Manually (Without the `.bat` file)

If you prefer to run each component manually in separate terminal windows, follow these steps:

### 1. Run the Machine Learning Pipeline
Prepare the required models and FAISS indices:
1. Open a terminal in the `Theme 2` directory.
2. Activate the virtual environment:
   ```powershell
   # Windows PowerShell
   .\.venv\Scripts\Activate.ps1
   ```
3. Run the ML pipeline script:
   ```bash
   python -m src.ml.train_production_pipeline
   ```
*(This exports the trained classifiers, similarity indices, and cluster metadata to `src/ml/models/`).*

### 2. Start the Backend Server
1. Open a new terminal in the `Theme 2/src/backend` directory.
2. Make sure the virtual environment is activated:
   ```powershell
   # Windows PowerShell
   ..\..\.venv\Scripts\Activate.ps1
   ```
3. Launch the FastAPI server using Uvicorn:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
*(The backend is now accessible at `http://127.0.0.1:8000`)*

### 3. Start the Frontend Dev Server
1. Open a new terminal in the `Theme 2/src/frontend2` directory.
2. Run npm dev script:
   ```bash
   npm run dev
   ```
*(The frontend is now accessible at `http://localhost:5174`)*
