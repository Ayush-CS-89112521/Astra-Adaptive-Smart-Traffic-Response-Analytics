# ASTRA FastAPI Backend — Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    API_ENV=production \
    ML_MODELS_PATH=/app/ml/models

WORKDIR /app/backend

# Create system user & group
RUN groupadd -g 10001 astra && \
    useradd -u 10001 -g astra -m -s /bin/bash astra

# Install system dependencies needed for compiling or running ML packages (e.g. libgomp for FAISS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app/ app/
COPY logs/ logs/

# Ensure proper permissions
RUN mkdir -p /app/ml/models /app/backend/logs && \
    chown -R astra:astra /app

# Switch to non-root user
USER astra

# Expose FastAPI port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
