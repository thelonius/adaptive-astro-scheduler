"""
Lunar Calendar API - Main Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1 import legacy_endpoints as endpoints
from app.api.v1 import ephemeris
from app.api.v1 import geo

# Phase 2 routers (Sprint 9)  — direct module path to avoid collision with endpoints.py
import importlib
chart_router    = importlib.import_module("app.api.v1.endpoints.chart")
planning_router = importlib.import_module("app.api.v1.endpoints.planning")
reference_router = importlib.import_module("app.api.v1.endpoints.reference")

# Create FastAPI application
app = FastAPI(
    title="Ephemeris & Astro-Planning API",
    description=(
        "Comprehensive astrological API powering natal charts, transit analysis, "
        "progressions, returns, Void of Course Moon windows, dispositor chains, and more."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Legacy Phase 1 Routers (backward compatible) ──────────────────────────────
app.include_router(endpoints.router, prefix=settings.API_V1_PREFIX, tags=["lunar-calendar"])
app.include_router(ephemeris.router, prefix=settings.API_V1_PREFIX, tags=["ephemeris"])
app.include_router(geo.router, prefix=settings.API_V1_PREFIX, tags=["geo"])

# ── Phase 2 Routers (Sprint 9) ────────────────────────────────────────────────
app.include_router(chart_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(planning_router.router, prefix=settings.API_V1_PREFIX)
app.include_router(reference_router.router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Welcome to the Lunar Calendar API",
        "version": settings.VERSION,
        "docs": "/docs",
        "health": f"{settings.API_V1_PREFIX}/health"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.API_RELOAD
    )
