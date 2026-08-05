FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ML
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements-ml.txt .
RUN pip install --no-cache-dir -r requirements-ml.txt

# Create space for datasets and scripts
RUN mkdir -p /app/zet /app/scripts /app/models

# Set environment variables
ENV PYTHONPATH=/app
ENV MLFLOW_TRACKING_URI=http://mlflow:5000

# We'll mount scripts and data via volumes in dev, 
# but provide a default entrypoint
ENTRYPOINT ["uvicorn", "scripts.ml.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
