FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    EPHEMERIS_DATA_DIR=/app/data

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ libc6-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create data directory for ephemeris files
RUN mkdir -p /app/data

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Pre-download ephemeris data to avoid runtime permission issues
RUN python3 -c "from skyfield.api import load; load.directory = '/app/data'; load('de421.bsp')" && \
    echo "Ephemeris data downloaded successfully to /app/data"

# Copy application code
COPY . .

# Create non-root user and set ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
