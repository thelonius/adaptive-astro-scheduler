# Quick Fix Guide: Enable All Ephemeris Endpoints

## Problem
All ephemeris endpoints return: `[DATA_UNAVAILABLE] Failed to load ephemeris data: [Errno 13] Permission denied`

## Root Cause
Docker container runs as `appuser` but can't write to `/app` to download ephemeris data.

## Solution (Choose One)

### ⭐ Option 1: Pre-download During Build (Recommended)

Edit `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ⭐ NEW: Pre-download ephemeris data
RUN python3 -c "from skyfield.api import load; eph = load('de421.bsp')"

# Copy application code
COPY . .

# ⭐ NEW: Create non-root user and set ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /root/.skyfield

# ⭐ NEW: Switch to non-root user
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Rebuild and deploy:**
```bash
# On server
cd /path/to/project
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

### Option 2: Use Dedicated Data Directory

Edit `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create data directory for ephemeris
RUN mkdir -p /app/data

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY . .

# Download ephemeris to data directory
RUN cd /app/data && python3 -c "from skyfield.api import load; load.directory = '/app/data'; load('de421.bsp')"

# Create user and set permissions
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Edit `app/core/ephemeris/adapter.py` line 57:

```python
def __init__(self, ephemeris_path: str = 'de421.bsp'):
    """Initialize the Skyfield ephemeris adapter."""
    try:
        import os
        data_dir = os.environ.get('EPHEMERIS_DATA_DIR', '/app/data')
        self.ts = load.timescale()

        # Set Skyfield data directory
        load.directory = data_dir

        self.eph = load(ephemeris_path)
        # ... rest of code
```

---

### Option 3: Quick Manual Fix (For Testing)

SSH to server and run:

```bash
# Enter container as root
docker exec -u root lunar-ephemeris-api bash

# Download ephemeris data
cd /root
python3 -c "from skyfield.api import load; load('de421.bsp')"

# Set permissions
chown -R appuser:appuser /root/.skyfield

# Exit
exit

# Restart container
docker restart lunar-ephemeris-api
```

---

## Verification

After applying the fix, test endpoints:

```bash
# Test planets
curl "http://91.84.112.120:8000/api/v1/ephemeris/planets?latitude=55.7558&longitude=37.6173"

# Test retrogrades
curl "http://91.84.112.120:8000/api/v1/ephemeris/retrogrades"

# Test aspects
curl "http://91.84.112.120:8000/api/v1/ephemeris/aspects?latitude=55.7558&longitude=37.6173"

# Test lunar nodes
curl "http://91.84.112.120:8000/api/v1/ephemeris/lunar-nodes?latitude=55.7558&longitude=37.6173"
```

All should return JSON data instead of permission errors.

---

## Expected Results

✅ All 13 ephemeris endpoints working
✅ Russian language interpretations
✅ High-precision calculations
✅ Proper caching
✅ Full API functionality

---

## File Size Note

The `de421.bsp` file is approximately **17 MB**. This will increase Docker image size but is necessary for ephemeris calculations.

Alternative: Use `de440s.bsp` (smaller, 3 MB, but less date range coverage).
