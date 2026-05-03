# ── Stage 1: builder ─────────────────────────────────────────
# Install gcc, compile pyswisseph, build virtualenv.
# Build tools are NOT carried into the final image.
FROM python:3.11-slim AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libc6-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build a self-contained virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ── Stage 2: runtime ──────────────────────────────────────────
# Lean image: only the compiled venv, no build tools.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    EPHEMERIS_DATA_DIR=/app/data \
    PATH="/opt/venv/bin:$PATH"

# Copy compiled venv from builder (no gcc needed here)
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# Pre-download ephemeris data
RUN mkdir -p /app/data && \
    python3 -c "from skyfield.api import load; load.directory = '/app/data'; load('de421.bsp')" && \
    echo "Ephemeris data ready"

# Copy application code only
COPY app/ ./app/
COPY run.py ./
COPY requirements.txt ./

# Non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
