from fastapi import APIRouter, HTTPException, Query
from datetime import date, datetime, timedelta
from typing import Optional
import pytz

from app.models.lunar_day import (
    LunarDayInfo, MoonPhase, ActivityRequest, BestDaysResponse,
    HealthAspect, Recommendations, PlanetaryInfluence, ColorPalette, LunarDayTiming
)
from app.services.lunar_calculator import LunarCalculator
from app.services.color_generator import ColorGenerator
from app.services.activity_finder import ActivityFinder
from app.services.daily_briefing import daily_briefing_service

router = APIRouter()

# Initialize services - defer lunar calculator to lazy initialization
lunar_calculator = None
color_generator = ColorGenerator()
activity_finder = ActivityFinder()


def get_lunar_calculator_instance() -> LunarCalculator:
    """Get or create the lunar calculator (lazy initialization)."""
    global lunar_calculator
    if lunar_calculator is None:
        lunar_calculator = LunarCalculator()
    return lunar_calculator


def get_lunar_calculator(lat: Optional[float] = None, lon: Optional[float] = None, tz: Optional[str] = None) -> LunarCalculator:
    """Get a lunar calculator configured for the specified location."""
    from skyfield.api import Topos

    # Use provided location or default to Moscow
    latitude = lat or 55.7558
    longitude = lon or 37.6173
    location = Topos(latitude_degrees=latitude, longitude_degrees=longitude)

    calculator = LunarCalculator(location=location)
    return calculator


def get_activity_finder(lat: Optional[float] = None, lon: Optional[float] = None, tz: Optional[str] = None) -> ActivityFinder:
    """Get an activity finder configured for the specified location."""
    finder = ActivityFinder()
    finder.calculator = get_lunar_calculator(lat, lon, tz)
    return finder


@router.get("/daily-briefing")
async def get_daily_briefing(
    date_param: Optional[date] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
    lat: Optional[float] = Query(55.7558, description="Latitude (default: Moscow 55.7558)"),
    lon: Optional[float] = Query(37.6173, description="Longitude (default: Moscow 37.6173)"),
    tz: Optional[str] = Query("Europe/Moscow", description="Timezone (default: Europe/Moscow)")
):
    """
    Get a comprehensive daily briefing including lunar, solar, and planetary data
    optimized for dashboard and planner views.
    """
    target_date = date_param or date.today()
    
    # Convert local date to a midnight datetime in the target timezone
    try:
        local_tz = pytz.timezone(tz)
    except pytz.UnknownTimeZoneError:
        local_tz = pytz.UTC
        
    dt_local = datetime.combine(target_date, datetime.min.time())
    dt_aware = local_tz.localize(dt_local)

    try:
        briefing = daily_briefing_service.get_briefing(dt_aware, lat, lon, tz)
        return briefing
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lunar-day", response_model=LunarDayInfo)
async def get_lunar_day(
    date_param: Optional[date] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
    timezone: Optional[str] = Query("Europe/Moscow", description="Timezone for local time display (e.g., 'US/Eastern', 'Europe/London')")
):
    """
    Get comprehensive lunar day information for a specific date.

    Returns:
    - Lunar day number (1-30)
    - Moon phase with illumination percentage
    - Color palette with gradients
    - Health aspects and affected organs
    - Recommended and not recommended activities
    - Planetary influences
    - General description
    """
    target_date = date_param or date.today()

    try:
        # Calculate lunar day
        calc = get_lunar_calculator_instance()
        lunar_day = calc.calculate_lunar_day(target_date)

        # Get moon phase
        moon_phase = calc.get_moon_phase(target_date)

        # Get lunar day timing
        timing = calc.get_lunar_day_timing(target_date, lunar_day, timezone_str=timezone or "Europe/Moscow")

        # Get lunar day data
        lunar_data = activity_finder.lunar_data.get(lunar_day)
        if not lunar_data:
            raise HTTPException(
                status_code=404,
                detail=f"No data available for lunar day {lunar_day}"
            )

        # Generate color palette
        color_palette = color_generator.generate_palette(
            lunar_data.base_colors,
            gradient_steps=12
        )

        # Build response
        lunar_day_info = LunarDayInfo(
            lunar_day=lunar_day,
            gregorian_date=target_date,
            timing=timing,
            moon_phase=moon_phase,
            color_palette=color_palette,
            health=HealthAspect(
                affected_organs=lunar_data.affected_organs,
                affected_body_parts=lunar_data.affected_body_parts,
                health_tips=lunar_data.health_tips
            ),
            recommendations=Recommendations(
                recommended=lunar_data.recommended,
                not_recommended=lunar_data.not_recommended
            ),
            planetary_influence=PlanetaryInfluence(
                dominant_planet=lunar_data.dominant_planet,
                additional_influences=lunar_data.additional_influences,
                description=lunar_data.planetary_description
            ),
            general_description=lunar_data.general_description
        )

        return lunar_day_info

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/moon-phase", response_model=MoonPhase)
async def get_moon_phase(
    date_param: Optional[date] = Query(None, alias="date", description="Date in YYYY-MM-DD format"),
    lat: Optional[float] = Query(None, description="Latitude (default: Moscow 55.7558)"),
    lon: Optional[float] = Query(None, description="Longitude (default: Moscow 37.6173)"),
    tz: Optional[str] = Query(None, description="Timezone (default: Europe/Moscow)")
):
    """
    Get moon phase information for a specific date and location.

    By default, calculations are done for Moscow, Russia.

    Returns:
    - Phase name (New Moon, Full Moon, etc.)
    - Illumination percentage
    - Whether moon is waxing or waning
    - Emoji representation
    """
    target_date = date_param or date.today()

    try:
        lunar_calculator = get_lunar_calculator(lat, lon, tz)
        moon_phase = get_lunar_calculator_instance().get_moon_phase(target_date)
        return moon_phase
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/best-days", response_model=BestDaysResponse)
async def find_best_days(
    request: ActivityRequest,
    lat: Optional[float] = Query(None, description="Latitude (default: Moscow 55.7558)"),
    lon: Optional[float] = Query(None, description="Longitude (default: Moscow 37.6173)"),
    tz: Optional[str] = Query(None, description="Timezone (default: Europe/Moscow)")
):
    """
    Find the best upcoming days for a specific activity.

    By default, calculations are done for Moscow, Russia.

    Request body:
    - activity: Type of activity (e.g., "haircut", "new project", "travel")
    - start_date: Starting date for search (optional, defaults to today)
    - days_ahead: Number of days to search ahead (default: 30, max: 365)

    Returns:
    - List of recommended dates with scores and reasons
    - Search period information
    """
    try:
        # Get activity finder with location
        activity_finder = get_activity_finder(lat, lon, tz)

        # Find best days
        best_days = activity_finder.find_best_days(request)

        # Determine search period
        start_date = request.start_date or date.today()
        end_date = start_date + timedelta(days=request.days_ahead)

        response = BestDaysResponse(
            activity=request.activity,
            search_period={
                "start": start_date,
                "end": end_date
            },
            best_days=best_days
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lunar-calendar", response_model=list[LunarDayInfo])
async def get_lunar_calendar(
    start_date: Optional[date] = Query(None, description="Start date"),
    days: int = Query(30, ge=1, le=90, description="Number of days to return"),
    lat: Optional[float] = Query(None, description="Latitude (default: Moscow 55.7558)"),
    lon: Optional[float] = Query(None, description="Longitude (default: Moscow 37.6173)"),
    tz: Optional[str] = Query(None, description="Timezone (default: Europe/Moscow)")
):
    """
    Get lunar calendar information for a range of dates.

    By default, calculations are done for Moscow, Russia.

    Parameters:
    - start_date: Starting date (defaults to today)
    - days: Number of days to include (default: 30, max: 90)
    - lat, lon, tz: Location parameters

    Returns:
    - List of lunar day information for each date
    """
    start = start_date or date.today()

    try:
        lunar_calculator = get_lunar_calculator(lat, lon, tz)
        activity_finder = get_activity_finder(lat, lon, tz)

        calendar_data = []

        for i in range(days):
            current_date = start + timedelta(days=i)

            # Calculate lunar day
            calc = get_lunar_calculator_instance()
            lunar_day = calc.calculate_lunar_day(current_date)
            moon_phase = calc.get_moon_phase(current_date)
            timing = calc.get_lunar_day_timing(current_date, lunar_day)
            lunar_data = activity_finder.lunar_data.get(lunar_day)

            if lunar_data:
                color_palette = color_generator.generate_palette(
                    lunar_data.base_colors,
                    gradient_steps=12
                )

                lunar_day_info = LunarDayInfo(
                    lunar_day=lunar_day,
                    gregorian_date=current_date,
                    timing=timing,
                    moon_phase=moon_phase,
                    color_palette=color_palette,
                    health=HealthAspect(
                        affected_organs=lunar_data.affected_organs,
                        affected_body_parts=lunar_data.affected_body_parts,
                        health_tips=lunar_data.health_tips
                    ),
                    recommendations=Recommendations(
                        recommended=lunar_data.recommended,
                        not_recommended=lunar_data.not_recommended
                    ),
                    planetary_influence=PlanetaryInfluence(
                        dominant_planet=lunar_data.dominant_planet,
                        additional_influences=lunar_data.additional_influences,
                        description=lunar_data.planetary_description
                    ),
                    general_description=lunar_data.general_description
                )

                calendar_data.append(lunar_day_info)

        return calendar_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns:
    - API status and version
    """
    return {
        "status": "healthy",
        "service": "Lunar Calendar API",
        "version": "1.0.0"
    }


@router.get("/current-lunar-day")
async def get_current_lunar_day(
    lat: Optional[float] = Query(None, description="Latitude (default: Moscow 55.7558)"),
    lon: Optional[float] = Query(None, description="Longitude (default: Moscow 37.6173)"),
    tz: Optional[str] = Query(None, description="Timezone (default: Europe/Moscow)")
):
    """
    Get the CURRENT lunar day for today's date.

    Returns:
    - Current lunar day number
    - Current date
    - Moon phase information
    - Location details
    """
    try:
        lunar_calculator = get_lunar_calculator(lat, lon, tz)

        # Get current lunar day for today
        today = date.today()
        calc = get_lunar_calculator_instance()
        current_lunar_day = calc.calculate_lunar_day(today)
        moon_phase = calc.get_moon_phase(today)
        timing = calc.get_lunar_day_timing(today, current_lunar_day)

        return {
            "current_date": today,
            "lunar_day": current_lunar_day,
            "timing": {
                "starts_at": timing.starts_at,
                "ends_at": timing.ends_at,
                "duration_hours": timing.duration_hours,
                "is_current": timing.is_current
            },
            "moon_phase": moon_phase.dict(),
            "location": {
                "latitude": float(get_lunar_calculator_instance().location.latitude.degrees),
                "longitude": float(get_lunar_calculator_instance().location.longitude.degrees)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
