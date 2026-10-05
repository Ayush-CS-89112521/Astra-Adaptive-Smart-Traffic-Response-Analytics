# ==============================================================================
# ASTRA FastAPI Backend — Google Cloud Run Production Dockerfile
# ==============================================================================
FROM python:3.11-slim

# Prevent python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    API_ENV=production \
    ML_MODELS_PATH=/app/src/ml/models \
    LOG_DIR=/app/src/backend/logs \
    ALLOWED_ORIGINS=* \
    PORT=8080

WORKDIR /app

# Install system dependencies (libgomp1 is required for FAISS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies with CPU-only PyTorch first (fast build & lean image)
COPY src/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend source code and pre-compiled ML models
COPY src/backend/ /app/src/backend/
COPY src/ml/models/ /app/src/ml/models/

# Create logs directory
RUN mkdir -p /app/src/backend/logs

WORKDIR /app/src/backend

# Cloud Run injects $PORT environment variable (defaults to 8080)
EXPOSE 8080

CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}
