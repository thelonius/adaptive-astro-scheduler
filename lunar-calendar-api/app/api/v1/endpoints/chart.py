"""
Chart API Router — /api/v1/chart/*
Endpoints for natal charts, transits, progressions, and returns.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
import pytz

from app.models.domain_chart import (
    ChartRequest, TransitRequest, ProgressionRequest, ReturnRequest, SynastryRequest, VimshottariDashaRequest,
    ChartResponse, TransitResponse, TransitAspect,
    ProgressedPlanets, SolarArcResponse, ReturnResponse,
    SynastryResponse, SynastryAspect, DraconicResponse, HumanDesignResponse, VimshottariDashaResponse, NavamsaResponse, ChartMeta,
)
from app.services.chart_service import chart_service
from app.calculators.transit_engine import transit_engine
from app.calculators.progression_engine import progression_engine
from app.calculators.return_engine import return_engine
from app.calculators.synastry_engine import synastry_engine
from app.calculators.draconic_engine import draconic_engine
from app.calculators.human_design_engine import human_design_engine
from app.calculators.vimshottari_dasha_engine import vimshottari_dasha_engine
from app.calculators.navamsa_engine import navamsa_engine

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


@router.post("/synastry", response_model=SynastryResponse, summary="Synastry between two natal charts")
async def get_synastry(req: SynastryRequest):
    """
    Compares two natal charts and returns all inter-chart aspects
    (every planet/angle in chart A against every planet/angle in chart B).
    """
    try:
        dt_a = req.chart_a.datetime_utc
        if dt_a.tzinfo is None:
            dt_a = dt_a.replace(tzinfo=pytz.UTC)

        dt_b = req.chart_b.datetime_utc
        if dt_b.tzinfo is None:
            dt_b = dt_b.replace(tzinfo=pytz.UTC)

        chart_a = chart_service.generate_chart(
            dt_a, req.chart_a.latitude, req.chart_a.longitude, req.chart_a.house_system
        )
        chart_b = chart_service.generate_chart(
            dt_b, req.chart_b.latitude, req.chart_b.longitude, req.chart_b.house_system
        )

        aspects = synastry_engine.compare_charts(chart_a, chart_b, req.aspect_categories)

        return SynastryResponse(
            chart_a_meta=ChartMeta(**chart_a["meta"]),
            chart_b_meta=ChartMeta(**chart_b["meta"]),
            inter_aspects=[SynastryAspect(**a) for a in aspects],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/draconic", response_model=DraconicResponse, summary="Draconic chart (North Node at 0° Aries)")
async def get_draconic(req: ChartRequest):
    """
    Rebases the zodiac so the North Node (Rahu) sits at 0° Aries.
    All planets, angles, and house cusps are rotated accordingly.
    """
    try:
        dt = req.datetime_utc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        natal_chart = chart_service.generate_chart(
            dt, req.latitude, req.longitude, req.house_system
        )
        draconic = draconic_engine.convert_to_draconic(natal_chart)
        return draconic
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/human-design", response_model=HumanDesignResponse, summary="Human Design bodygraph")
async def get_human_design(req: ChartRequest):
    """
    Calculates a Human Design bodygraph: Personality (birth) + Design (~88° solar arc before birth).
    Returns type, profile, authority, defined centers/channels, and gate.line activations.
    """
    try:
        dt = req.datetime_utc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        result = human_design_engine.calculate(dt, req.latitude, req.longitude)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




@router.post("/vimshottari-dasha", response_model=VimshottariDashaResponse, summary="Vimshottari Dasha (Jyotish)")
async def get_vimshottari_dasha(req: VimshottariDashaRequest):
    """
    Calculates the Vimshottari dasha timeline from birth Moon nakshatra.
    Returns mahadasha/antardasha periods and the currently running dasha.
    """
    try:
        birth_dt = req.natal.datetime_utc
        if birth_dt.tzinfo is None:
            birth_dt = birth_dt.replace(tzinfo=pytz.UTC)

        query_dt = req.query_datetime_utc
        if query_dt is not None and query_dt.tzinfo is None:
            query_dt = query_dt.replace(tzinfo=pytz.UTC)

        result = vimshottari_dasha_engine.calculate(birth_dt, query_dt)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/navamsa", response_model=NavamsaResponse, summary="Navamsa chart (D9)")
async def get_navamsa(req: ChartRequest):
    """
    Calculates the Navamsa (D9) divisional chart from Lahiri sidereal positions.
    Returns D1 + D9 for each graha, navamsa number, and vargottama flags.
    """
    try:
        dt = req.datetime_utc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        result = navamsa_engine.calculate(dt, req.latitude, req.longitude)
        return result
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
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
