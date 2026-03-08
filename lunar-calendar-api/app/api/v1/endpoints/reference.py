"""Reference API Router — /api/v1/reference/*
Read-only lookup endpoints for almanac-style data.
"""
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
import pytz

from app.calculators.lunar_engine import lunar_engine
from app.calculators.solar_engine import solar_engine
from app.calculators.aspect_engine import aspect_engine
from app.calculators.ephemeris_core import ephemeris_core

router = APIRouter(prefix="/reference", tags=["reference"])

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

@router.get("/moon", summary="Current Moon Data")
async def get_moon_data(
    dt: datetime = Query(None, description="Datetime (UTC). Defaults to now."),
    lat: float = Query(None, description="Latitude (optional, for moonrise/set)"),
    lon: float = Query(None, description="Longitude (optional, for moonrise/set)"),
):
    """
    Returns current Moon data: tropical zodiac sign, degree, Nakshatra (lunar mansion),
    and applies Gandanta zone detection.
    """
    try:
        if dt is None:
            dt = datetime.now(tz=pytz.UTC)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        sign_data = lunar_engine.get_zodiac_sign(dt)
        moon_lon = lunar_engine.get_moon_longitude(dt)
        mansion_data = lunar_engine.get_lunar_mansion(dt, system="vedic")

        return {
            "datetime_utc": dt.isoformat(),
            "moon_longitude": round(moon_lon, 4),
            "sign": sign_data,
            "lunar_mansion": mansion_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/solar-times", summary="Sunrise, Sunset & Twilights")
async def get_solar_times(
    date: datetime = Query(..., description="Date (UTC)"),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """
    Returns precise sunrise, sunset, and civil/nautical/astronomical twilight times
    for a given date and location.
    """
    try:
        if date.tzinfo is None:
            date = date.replace(tzinfo=pytz.UTC)
        result = solar_engine.get_solar_times(date, lat, lon)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/aspects", summary="All Active Aspects in the Sky")
async def get_current_aspects(
    dt: datetime = Query(None, description="Datetime (UTC). Defaults to now."),
    categories: str = Query("major", description="major | minor | all"),
):
    """
    Returns all active ptolemaic (or extended) aspects between the 10 planets
    at the given moment, sorted by exactness.
    """
    try:
        if dt is None:
            dt = datetime.now(tz=pytz.UTC)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        aspects = aspect_engine.get_all_aspects(dt, categories=categories)
        return {
            "datetime_utc": dt.isoformat(),
            "count": len(aspects),
            "aspects": aspects
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planets", summary="Current Planet Positions")
async def get_planets(
    dt: datetime = Query(None, description="Datetime (UTC). Defaults to now."),
):
    """
    Returns the ecliptic longitude, current sign, and retrograde status
    for all 10 major bodies.
    """
    try:
        if dt is None:
            dt = datetime.now(tz=pytz.UTC)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        bodies = [
            "Sun", "Moon", "Mercury", "Venus", "Mars",
            "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
        ]
        result = {}
        for b in bodies:
            lon = lunar_engine.get_moon_longitude(dt) if b == "Moon" else \
                  ephemeris_core.get_planet_position(b, dt)[0]
            sign_index = int(lon / 30)
            speed = ephemeris_core.get_planet_position(b, dt)[3] if b != "Moon" else 13.0
            result[b] = {
                "longitude": round(lon, 4),
                "sign": SIGNS[sign_index],
                "sign_degree": round(lon % 30, 4),
                "is_retrograde": speed < 0
            }

        return {"datetime_utc": dt.isoformat(), "planets": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
