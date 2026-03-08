"""
Chart API Router — /api/v1/chart/*
Endpoints for natal charts, transits, progressions, and returns.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import pytz

from app.models.domain_chart import (
    ChartRequest, TransitRequest, ProgressionRequest, ReturnRequest,
    ChartResponse, TransitResponse, TransitAspect,
    ProgressedPlanets, SolarArcResponse, ReturnResponse
)
from app.services.chart_service import chart_service
from app.calculators.transit_engine import transit_engine
from app.calculators.progression_engine import progression_engine
from app.calculators.return_engine import return_engine

router = APIRouter(prefix="/chart", tags=["chart"])


@router.post("/natal", response_model=ChartResponse, summary="Generate a full Natal Chart")
async def get_natal_chart(req: ChartRequest):
    """
    Generates a full astrological natal chart for a given datetime and location.
    Returns planets, houses, aspects, and rulership chains.
    """
    try:
        dt = req.datetime_utc.replace(tzinfo=pytz.UTC) if req.datetime_utc.tzinfo is None else req.datetime_utc
        chart = chart_service.generate_chart(dt, req.latitude, req.longitude, req.house_system)
        return chart
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transits", response_model=TransitResponse, summary="Get active transits against a natal chart")
async def get_transits(req: TransitRequest):
    """
    Finds all active transiting aspects between the current sky and natal planet positions.
    Includes applying/separating status and orb of each transit.
    """
    try:
        natal_dt = req.natal.datetime_utc
        if natal_dt.tzinfo is None:
            natal_dt = natal_dt.replace(tzinfo=pytz.UTC)

        transit_dt = req.transit_datetime_utc
        if transit_dt.tzinfo is None:
            transit_dt = transit_dt.replace(tzinfo=pytz.UTC)

        natal_chart = chart_service.generate_chart(natal_dt, req.natal.latitude, req.natal.longitude)
        transits = transit_engine.get_current_transits(natal_chart, transit_dt, req.aspect_categories)

        return TransitResponse(
            natal_datetime_utc=natal_dt.isoformat(),
            transit_datetime_utc=transit_dt.isoformat(),
            active_transits=[TransitAspect(**t) for t in transits]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progressions", response_model=ProgressedPlanets, summary="Secondary Progressions")
async def get_progressions(req: ProgressionRequest):
    """
    Returns progressed planet positions using the Secondary Progressions method (1 day = 1 year).
    """
    try:
        birth_dt = req.natal.datetime_utc
        if birth_dt.tzinfo is None:
            birth_dt = birth_dt.replace(tzinfo=pytz.UTC)

        target_dt = req.target_datetime_utc
        if target_dt.tzinfo is None:
            target_dt = target_dt.replace(tzinfo=pytz.UTC)

        result = progression_engine.calculate_secondary_progressions(birth_dt, target_dt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/solar-arc", response_model=SolarArcResponse, summary="Solar Arc Directions")
async def get_solar_arc(req: ProgressionRequest):
    """
    Returns Solar Arc directed planet positions. The Solar Arc equals the progressed
    Sun's travel distance, applied uniformly to all planets and angles.
    """
    try:
        birth_dt = req.natal.datetime_utc
        if birth_dt.tzinfo is None:
            birth_dt = birth_dt.replace(tzinfo=pytz.UTC)

        target_dt = req.target_datetime_utc
        if target_dt.tzinfo is None:
            target_dt = target_dt.replace(tzinfo=pytz.UTC)

        natal_chart = chart_service.generate_chart(birth_dt, req.natal.latitude, req.natal.longitude)
        result = progression_engine.calculate_solar_arcs(natal_chart, target_dt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/solar-return", response_model=ReturnResponse, summary="Solar Return Chart")
async def get_solar_return(req: ReturnRequest):
    """
    Calculates the exact moment of the Solar Return for a given year.
    This is when the transiting Sun returns to its exact natal degree and minute.
    Precision: ≤1 second.
    """
    try:
        birth_dt = req.natal.datetime_utc
        if birth_dt.tzinfo is None:
            birth_dt = birth_dt.replace(tzinfo=pytz.UTC)

        natal_chart = chart_service.generate_chart(birth_dt, req.natal.latitude, req.natal.longitude)
        result = return_engine.find_solar_return(natal_chart, req.year)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lunar-return", response_model=ReturnResponse, summary="Lunar Return")
async def get_lunar_return(req: TransitRequest):
    """
    Calculates the Lunar Return closest to the transit_datetime_utc.
    The Moon returns to its natal longitude approximately every 27.32 days.
    """
    try:
        birth_dt = req.natal.datetime_utc
        if birth_dt.tzinfo is None:
            birth_dt = birth_dt.replace(tzinfo=pytz.UTC)

        transit_dt = req.transit_datetime_utc
        if transit_dt.tzinfo is None:
            transit_dt = transit_dt.replace(tzinfo=pytz.UTC)

        natal_chart = chart_service.generate_chart(birth_dt, req.natal.latitude, req.natal.longitude)
        result = return_engine.find_lunar_return(natal_chart, transit_dt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
