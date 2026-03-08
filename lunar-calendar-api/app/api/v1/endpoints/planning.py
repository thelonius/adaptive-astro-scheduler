"""
Planning API Router — /api/v1/planning/*
Endpoints for astrological planning: VoC windows, retrogrades, and dispositor chains.
"""
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException, Query
import pytz

from app.models.domain_planning import VoCResponse, VoCWindow, VoCLastAspect, DispositorResponse
from app.calculators.lunar_engine import lunar_engine
from app.calculators.planetary_engine import planetary_engine
from app.calculators.dispositor_engine import dispositor_engine

router = APIRouter(prefix="/planning", tags=["planning"])


@router.get("/void-of-course", response_model=VoCResponse, summary="Void of Course Moon Windows")
async def get_void_of_course(
    start: datetime = Query(..., description="Start datetime (UTC) for VoC search window"),
    end: datetime = Query(..., description="End datetime (UTC) for VoC search window"),
):
    """
    Returns all Void of Course Moon windows within the requested period.

    A VoC window begins when the Moon makes its last exact major aspect to a
    traditional planet (Sun, Mercury, Venus, Mars, Jupiter, Saturn) before
    entering the next zodiac sign, and ends at the moment of that sign ingress.

    Practical implication: Avoid starting new projects or making important decisions
    during VoC windows as intentions set in this period often "come to nothing."
    """
    try:
        if start.tzinfo is None:
            start = start.replace(tzinfo=pytz.UTC)
        if end.tzinfo is None:
            end = end.replace(tzinfo=pytz.UTC)

        if (end - start).days > 90:
            raise HTTPException(status_code=400, detail="Date range cannot exceed 90 days.")

        windows_raw = lunar_engine.find_void_of_course_windows(start, end)

        windows = [
            VoCWindow(
                voc_start=w["voc_start"],
                voc_end=w["voc_end"],
                duration_hours=w["duration_hours"],
                last_aspect=VoCLastAspect(**w["last_aspect"]),
                new_sign=w["new_sign"]
            )
            for w in windows_raw
        ]

        return VoCResponse(start=start, end=end, windows=windows, total_count=len(windows))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retrogrades", summary="Active Retrograde Planets")
async def get_retrogrades(
    dt: datetime = Query(None, description="Datetime to check (UTC). Defaults to now.")
):
    """
    Returns a list of all planets currently in apparent retrograde motion.
    Includes the planet name, its current sign, and its angular speed.
    """
    try:
        if dt is None:
            dt = datetime.now(tz=pytz.UTC)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        retrograde_planets = planetary_engine.get_all_retrogrades(dt, detailed=True)
        return {
            "datetime_utc": dt.isoformat(),
            "retrograde_planets": retrograde_planets,
            "count": len(retrograde_planets)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dispositors", response_model=DispositorResponse, summary="Planetary Dispositor Chains")
async def get_dispositors(
    dt: datetime = Query(None, description="Datetime to check (UTC). Defaults to now."),
    system: str = Query("traditional", description="Rulership system: traditional | modern")
):
    """
    Returns complete dispositor chains for all planets at the given moment.

    A dispositor chain traces the sequence of sign rulers: e.g.,
    Mars in Taurus → Venus (Taurus ruler) in Pisces → Jupiter (Pisces ruler) …
    until it reaches a planet in its own sign (final dispositor) or a loop.

    Useful for understanding the dominant planetary energy driving the current sky
    or a natal chart.
    """
    try:
        if dt is None:
            dt = datetime.now(tz=pytz.UTC)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        full_map = dispositor_engine.get_full_map(dt, system=system)
        final_disps = dispositor_engine.find_final_dispositors(dt, system=system)
        mutual_recs = dispositor_engine.find_mutual_receptions(dt, system=system)

        planets = [
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
        ]
        chains = {p: dispositor_engine.build_chain(p, dt, system=system) for p in planets}

        return DispositorResponse(
            datetime_utc=dt.isoformat(),
            system=system,
            full_map=full_map,
            final_dispositors=final_disps,
            mutual_receptions=mutual_recs,
            chains=chains
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
