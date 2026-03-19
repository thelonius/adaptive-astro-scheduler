"""
Ephemeris API Endpoints

REST API for astronomical calculations.
"""

from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
import pytz

from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    CachedEphemerisCalculator,
    DateTime,
    Location,
    HouseSystem,
    PlanetName,
    EphemerisError,
    create_cache_service,
)

# Create router
router = APIRouter(prefix="/ephemeris", tags=["ephemeris"])

# Initialize ephemeris calculator (singleton)
_calculator = None


def get_calculator() -> CachedEphemerisCalculator:
    """Get or create the ephemeris calculator instance."""
    global _calculator
    if _calculator is None:
        base_calculator = SkyfieldEphemerisAdapter()
        cache_service = create_cache_service()
        _calculator = CachedEphemerisCalculator(base_calculator, cache=cache_service)
    return _calculator


# ============================================================================
# Request/Response Models
# ============================================================================

class LocationModel(BaseModel):
    """Location for observations."""
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")
    elevation: float = Field(0.0, description="Elevation in meters")


class PlanetPositionResponse(BaseModel):
    """Planet position response."""
    name: str
    longitude: float
    latitude: float
    zodiac_sign: str
    zodiac_symbol: str
    degree_in_sign: float
    speed: float
    is_retrograde: bool
    distance_au: float


class PlanetPositionsResponse(BaseModel):
    """All planet positions response."""
    timestamp: datetime
    location: LocationModel
    planets: List[PlanetPositionResponse]


class MoonPhaseResponse(BaseModel):
    """Moon phase response."""
    name: str
    illumination: float
    phase_type: str
    is_waxing: bool
    emoji: str
    angle: float


class LunarDayResponse(BaseModel):
    """Lunar day response."""
    number: int
    lunar_phase: str
    starts_at: datetime
    ends_at: datetime
    duration_hours: float


class AspectResponse(BaseModel):
    """Aspect response."""
    planet1: str
    planet2: str
    aspect_type: str
    angle: float
    orb: float
    is_exact: bool
    is_applying: bool


class RetrogradePlanetResponse(BaseModel):
    """Retrograde planet response."""
    name: str
    longitude: float
    zodiac_sign: str
    speed: float


class HouseResponse(BaseModel):
    """House response."""
    number: int
    cusp_longitude: float
    cusp_sign: str
    size_degrees: float
    planets: List[str]


class VoidOfCourseMoonResponse(BaseModel):
    """Void of Course Moon response."""
    is_void: bool
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    sign: Optional[str] = None
    duration_hours: Optional[float] = None
    last_aspect_planet: Optional[str] = None
    next_sign: Optional[str] = None


class PlanetaryHourResponse(BaseModel):
    """Planetary hour response."""
    planet: str
    start_time: datetime
    end_time: datetime
    is_day_hour: bool
    hour_number: int


class PlanetaryHoursResponse(BaseModel):
    """Planetary hours response."""
    hours: List[PlanetaryHourResponse]


# = :==========================================================================
# Endpoints
# ============================================================================

@router.get("/cache/stats")
async def get_cache_stats():
    """Get ephemeris cache statistics."""
    calculator = get_calculator()
    return calculator.get_cache_stats()


@router.get("/planets", response_model=PlanetPositionsResponse)
async def get_planet_positions(
    date: Optional[str] = Query(None, description="ISO format date (UTC)"),
    latitude: float = Query(..., ge=-90, le=90, description="Observer latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Observer longitude"),
    elevation: float = Query(0.0, description="Observer elevation (meters)"),
    timezone: str = Query("UTC", description="IANA timezone")
):
    """
    Get positions of all major planets.

    Returns positions for Sun, Moon, and all major planets.
    """
    try:
        # Parse date or use current time
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        # Create DateTime object
        date_time = DateTime(
            date=dt,
            timezone=timezone,
            location=Location(latitude, longitude, elevation)
        )

        # Calculate positions
        calculator = get_calculator()
        positions = await calculator.get_planets_positions(date_time)

        # Convert to response format
        planets_list = []
        for planet in positions.to_list():
            planets_list.append(PlanetPositionResponse(
                name=planet.name.value,
                longitude=planet.longitude,
                latitude=planet.latitude,
                zodiac_sign=planet.zodiac_sign.name.value,
                zodiac_symbol=planet.zodiac_sign.symbol,
                degree_in_sign=planet.zodiac_sign.degree_in_sign,
                speed=planet.speed,
                is_retrograde=planet.is_retrograde,
                distance_au=planet.distance_au
            ))

        return PlanetPositionsResponse(
            timestamp=dt,
            location=LocationModel(
                latitude=latitude,
                longitude=longitude,
                elevation=elevation
            ),
            planets=planets_list
        )

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/moon-phase", response_model=MoonPhaseResponse)
async def get_moon_phase(
    date: Optional[str] = Query(None, description="ISO format date (UTC)"),
    latitude: float = Query(55.7558, description="Observer latitude"),
    longitude: float = Query(37.6173, description="Observer longitude"),
    timezone: str = Query("UTC", description="IANA timezone")
):
    """
    Get current moon phase information.

    Returns illumination percentage, phase name, and emoji.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone=timezone,
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        moon_phase = await calculator.get_moon_phase(date_time)

        return MoonPhaseResponse(
            name=moon_phase.name,
            illumination=moon_phase.illumination,
            phase_type=moon_phase.phase_type.value,
            is_waxing=moon_phase.is_waxing,
            emoji=moon_phase.emoji,
            angle=moon_phase.angle
        )

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/lunar-day", response_model=LunarDayResponse)
async def get_lunar_day(
    date: Optional[str] = Query(None, description="ISO format date (UTC)"),
    latitude: float = Query(55.7558, description="Observer latitude"),
    longitude: float = Query(37.6173, description="Observer longitude"),
    timezone: str = Query("Europe/Moscow", description="IANA timezone")
):
    """
    Get lunar day (1-30) for the given date.

    Returns lunar day number, symbol, and characteristics.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone=timezone,
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        lunar_day = await calculator.get_lunar_day(date_time)

        return LunarDayResponse(
            number=lunar_day.number,
            lunar_phase=lunar_day.lunar_phase.value,
            starts_at=lunar_day.starts_at,
            ends_at=lunar_day.ends_at,
            duration_hours=lunar_day.duration_hours
        )

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/retrogrades", response_model=List[RetrogradePlanetResponse])
async def get_retrograde_planets(
    date: Optional[str] = Query(None, description="ISO format date (UTC)"),
    latitude: float = Query(55.7558, description="Observer latitude"),
    longitude: float = Query(37.6173, description="Observer longitude"),
):
    """
    Get list of planets currently in retrograde motion.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone="UTC",
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        retrogrades = await calculator.get_retrograde_planets(date_time)

        return [
            RetrogradePlanetResponse(
                name=planet.name.value,
                longitude=planet.longitude,
                zodiac_sign=planet.zodiac_sign.name.value,
                speed=planet.speed
            )
            for planet in retrogrades
        ]

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/aspects", response_model=List[AspectResponse])
async def get_aspects(
    date: Optional[str] = Query(None, description="ISO format date (UTC)"),
    latitude: float = Query(55.7558, description="Observer latitude"),
    longitude: float = Query(37.6173, description="Observer longitude"),
    orb: Optional[float] = Query(None, ge=0, le=15, description="Custom orb in degrees")
):
    """
    Calculate aspects between all planets.

    Returns list of aspects found with the specified orb tolerance.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone="UTC",
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        positions = await calculator.get_planets_positions(date_time)
        aspects = await calculator.calculate_aspects(positions.to_list(), orb)

        return [
            AspectResponse(
                planet1=aspect.body1.name.value,
                planet2=aspect.body2.name.value,
                aspect_type=aspect.aspect_type.value,
                angle=aspect.angle,
                orb=aspect.orb,
                is_exact=aspect.is_exact,
                is_applying=aspect.is_applying
            )
            for aspect in aspects
        ]

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/houses", response_model=Dict[int, HouseResponse])
async def get_houses(
    date: str = Query(..., description="ISO format date (YYYY-MM-DD)"),
    time: str = Query("12:00:00", description="Time in UTC (HH:MM:SS)"),
    latitude: float = Query(..., ge=-90, le=90, description="Birth latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Birth longitude"),
    system: str = Query("placidus", description="House system (placidus, koch, equal, whole_sign...)")
):
    """
    Calculate astrological houses.

    Requires exact birth date, time, and location.
    """
    try:
        # Combine date and time (keep naive)
        dt_str = f"{date}T{time}"
        # Keep it naive so cache.py comparing with datetime.utcnow() doesn't break
        dt = datetime.fromisoformat(dt_str)

        date_time = DateTime(
            date=dt,
            timezone="UTC",
            location=Location(latitude, longitude)
        )

        # Parse house system
        try:
            house_system = HouseSystem(system.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid house system: {system}"
            )

        calculator = get_calculator()
        houses = await calculator.calculate_houses(date_time, house_system)

        return {
            num: HouseResponse(
                number=house.number,
                cusp_longitude=house.cusp_longitude,
                cusp_sign=house.cusp_sign.name.value,
                size_degrees=house.size_degrees,
                planets=[p.name.value for p in house.planets]
            )
            for num, house in houses.items()
        }

    except EphemerisError as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics."""
    calculator = get_calculator()
    return calculator.get_cache_stats()


@router.post("/cache/clear")
async def clear_cache():
    """Clear the ephemeris cache."""
    calculator = get_calculator()
    calculator.clear_cache()
    return {"status": "cache cleared"}


# ============================================================================
# Phase 1: Advanced Astrological Points
# ============================================================================

class LunarNodeResponse(BaseModel):
    """Lunar node (Rahu or Ketu) response."""
    name: str
    longitude: float
    latitude: float
    zodiac_sign: str
    speed: float
    is_retrograde: bool


class LunarNodesResponse(BaseModel):
    """Both lunar nodes response."""
    north_node: LunarNodeResponse  # Rahu
    south_node: LunarNodeResponse  # Ketu


class BlackMoonLilithResponse(BaseModel):
    """Black Moon Lilith response."""
    lilith_type: str
    longitude: float
    latitude: float
    zodiac_sign: str
    speed: float


class ArabicPartResponse(BaseModel):
    """Arabic Part response."""
    name: str
    longitude: float
    zodiac_sign: str
    formula: str
    is_nocturnal: bool


class ChironResponse(BaseModel):
    """Chiron response."""
    longitude: float
    latitude: float
    zodiac_sign: str
    speed: float
    is_retrograde: bool
    distance_au: float


@router.get("/lunar-nodes", response_model=LunarNodesResponse)
async def get_lunar_nodes(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone"),
    node_type: str = Query("mean", description="Node type: 'mean' or 'true'")
):
    """
    Calculate Lunar Nodes (Rahu and Ketu) positions.

    The Lunar Nodes are the points where the Moon's orbit crosses the ecliptic.
    - North Node (Rahu): Ascending node, represents future karma and growth
    - South Node (Ketu): Descending node, represents past karma and release

    Args:
        date: ISO format datetime (default: current time)
        latitude: Observer latitude in degrees
        longitude: Observer longitude in degrees
        timezone: Timezone name (e.g., "UTC", "America/New_York")
        node_type: "mean" for averaged position or "true" for osculating position
    """
    try:
        from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes, calculate_true_node

        # Parse date
        if date:
            dt_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt_obj = datetime.utcnow()

        # Apply timezone
        tz = pytz.timezone(timezone)
        dt_obj = tz.localize(dt_obj) if dt_obj.tzinfo is None else dt_obj.astimezone(tz)

        # Create DateTime object
        date_time = DateTime(
            date=dt_obj,
            timezone=timezone,
            location=Location(latitude=latitude, longitude=longitude)
        )

        # Calculate nodes
        if node_type.lower() == "true":
            nodes = calculate_true_node(date_time)
        else:
            nodes = calculate_lunar_nodes(date_time)

        return LunarNodesResponse(
            north_node=LunarNodeResponse(
                name=nodes.north_node.name,
                longitude=nodes.north_node.longitude,
                latitude=nodes.north_node.latitude,
                zodiac_sign=nodes.north_node.zodiac_sign.value,
                speed=nodes.north_node.speed,
                is_retrograde=nodes.north_node.is_retrograde
            ),
            south_node=LunarNodeResponse(
                name=nodes.south_node.name,
                longitude=nodes.south_node.longitude,
                latitude=nodes.south_node.latitude,
                zodiac_sign=nodes.south_node.zodiac_sign.value,
                speed=nodes.south_node.speed,
                is_retrograde=nodes.south_node.is_retrograde
            )
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating lunar nodes: {str(e)}")


@router.get("/lilith", response_model=BlackMoonLilithResponse)
async def get_black_moon_lilith(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone"),
    lilith_type: str = Query("mean", description="Lilith type: 'mean', 'true', or 'corrected'")
):
    """
    Calculate Black Moon Lilith position.

    Black Moon Lilith represents the lunar apogee and symbolizes the shadow side,
    repressed desires, and deep feminine power.

    Three types:
    - mean: Averaged position (most commonly used)
    - true: True osculating apogee
    - corrected: Waldemath (hypothetical dark moon)

    Args:
        date: ISO format datetime (default: current time)
        latitude: Observer latitude in degrees
        longitude: Observer longitude in degrees
        timezone: Timezone name
        lilith_type: Type of Lilith calculation
    """
    try:
        from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith
        from app.core.ephemeris import LilithType

        # Parse date
        if date:
            dt_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt_obj = datetime.utcnow()

        # Apply timezone
        tz = pytz.timezone(timezone)
        dt_obj = tz.localize(dt_obj) if dt_obj.tzinfo is None else dt_obj.astimezone(tz)

        # Create DateTime object
        date_time = DateTime(
            date=dt_obj,
            timezone=timezone,
            location=Location(latitude=latitude, longitude=longitude)
        )

        # Parse Lilith type
        try:
            ltype = LilithType(lilith_type.lower())
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid Lilith type: {lilith_type}. Use 'mean', 'true', or 'corrected'"
            )

        # Calculate Lilith
        lilith = calculate_black_moon_lilith(date_time, ltype)

        return BlackMoonLilithResponse(
            lilith_type=lilith.lilith_type.value,
            longitude=lilith.longitude,
            latitude=lilith.latitude,
            zodiac_sign=lilith.zodiac_sign.value,
            speed=lilith.speed
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating Lilith: {str(e)}")


@router.get("/chiron", response_model=ChironResponse)
async def get_chiron(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone")
):
    """
    Calculate Chiron position.

    Chiron is the "wounded healer" asteroid representing our deepest wounds
    and our capacity to heal ourselves and others.

    Args:
        date: ISO format datetime (default: current time)
        latitude: Observer latitude in degrees
        longitude: Observer longitude in degrees
        timezone: Timezone name
    """
    try:
        from app.core.ephemeris.calculations.chiron import calculate_chiron

        # Parse date
        if date:
            dt_obj = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt_obj = datetime.utcnow()

        # Apply timezone
        tz = pytz.timezone(timezone)
        dt_obj = tz.localize(dt_obj) if dt_obj.tzinfo is None else dt_obj.astimezone(tz)

        # Create DateTime object
        date_time = DateTime(
            date=dt_obj,
            timezone=timezone,
            location=Location(latitude=latitude, longitude=longitude)
        )

        # Calculate Chiron
        chiron = calculate_chiron(date_time)

        return ChironResponse(
            longitude=chiron.longitude,
            latitude=chiron.latitude,
            zodiac_sign=chiron.zodiac_sign.value,
            speed=chiron.speed,
            is_retrograde=chiron.is_retrograde,
            distance_au=chiron.distance_au
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating Chiron: {str(e)}")


@router.get("/part-of-fortune", response_model=ArabicPartResponse)
async def get_part_of_fortune(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone"),
    ascendant: float = Query(..., description="Ascendant longitude (0-360°)"),
    sun: float = Query(..., description="Sun longitude (0-360°)"),
    moon: float = Query(..., description="Moon longitude (0-360°)")
):
    """
    Calculate Part of Fortune.

    The Part of Fortune represents material prosperity, physical health,
    and worldly success.

    Formula:
    - Day chart: Ascendant + Moon - Sun
    - Night chart: Ascendant + Sun - Moon

    Args:
        date: ISO format datetime (for determining day/night)
        latitude: Observer latitude
        longitude: Observer longitude
        timezone: Timezone name
        ascendant: Ascendant longitude in degrees
        sun: Sun longitude in degrees
        moon: Moon longitude in degrees
    """
    try:
        from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_fortune

        # Calculate Part of Fortune
        part = calculate_part_of_fortune(
            ascendant=ascendant,
            sun=sun,
            moon=moon,
            is_nocturnal=None  # Auto-detect from sun and ascendant
        )

        return ArabicPartResponse(
            name=part.name,
            longitude=part.longitude,
            zodiac_sign=part.zodiac_sign.value,
            formula=part.formula,
            is_nocturnal=part.is_nocturnal
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating Part of Fortune: {str(e)}")


@router.get("/part-of-spirit", response_model=ArabicPartResponse)
async def get_part_of_spirit(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone"),
    ascendant: float = Query(..., description="Ascendant longitude (0-360°)"),
    sun: float = Query(..., description="Sun longitude (0-360°)"),
    moon: float = Query(..., description="Moon longitude (0-360°)")
):
    """
    Calculate Part of Spirit.

    The Part of Spirit represents spiritual purpose, life direction,
    and inner fulfillment. It's the counterpart to Part of Fortune.

    Formula:
    - Day chart: Ascendant + Sun - Moon
    - Night chart: Ascendant + Moon - Sun

    Args:
        date: ISO format datetime (for determining day/night)
        latitude: Observer latitude
        longitude: Observer longitude
        timezone: Timezone name
        ascendant: Ascendant longitude in degrees
        sun: Sun longitude in degrees
        moon: Moon longitude in degrees
    """
    try:
        from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_spirit

        # Calculate Part of Spirit
        part = calculate_part_of_spirit(
            ascendant=ascendant,
            sun=sun,
            moon=moon,
            is_nocturnal=None  # Auto-detect
        )

        return ArabicPartResponse(
            name=part.name,
            longitude=part.longitude,
            zodiac_sign=part.zodiac_sign.value,
            formula=part.formula,
            is_nocturnal=part.is_nocturnal
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating Part of Spirit: {str(e)}")


# ============================================================================
# Solar Times — Sunrise / Sunset
# ============================================================================

class SolarTimesResponse(BaseModel):
    """Solar times for a given date and location."""
    date: str
    latitude: float
    longitude: float
    timezone: str

    # Main events (ISO strings, nullable for polar regions)
    sunrise: Optional[str] = None
    sunset: Optional[str] = None
    solar_noon: Optional[str] = None

    # Twilight phases
    civil_dawn: Optional[str] = None
    civil_dusk: Optional[str] = None
    nautical_dawn: Optional[str] = None
    nautical_dusk: Optional[str] = None
    astronomical_dawn: Optional[str] = None
    astronomical_dusk: Optional[str] = None

    # Day length in minutes
    day_length_minutes: Optional[float] = None

    # Current period at query time: "night" | "astronomical_twilight" | "nautical_twilight" | "civil_twilight" | "day"
    current_period: str = "night"

    # Convenience booleans at query time
    is_daytime: bool = False
    is_twilight: bool = False

    # Timestamps in epoch seconds (for easy JS comparison)
    sunrise_ts: Optional[float] = None
    sunset_ts: Optional[float] = None


@router.get("/void-moon", response_model=VoidOfCourseMoonResponse)
async def get_void_of_course_moon(
    date: Optional[str] = Query(None, description="ISO format datetime (default: now)"),
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    timezone: str = Query("UTC", description="Timezone")
):
    """
    Check if Moon is currently Void of Course.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone=timezone,
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        voc = await calculator.get_void_of_course_moon(date_time)

        if not voc:
            return VoidOfCourseMoonResponse(is_void=False)

        return VoidOfCourseMoonResponse(
            is_void=True,
            start_time=voc.start_time,
            end_time=voc.end_time,
            sign=voc.sign.value,
            duration_hours=voc.duration_hours,
            last_aspect_planet=voc.last_aspect_planet.value,
            next_sign=voc.next_sign.value
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating VoC Moon: {str(e)}")


@router.get("/planetary-hours", response_model=PlanetaryHoursResponse)
async def get_planetary_hours(
    date: Optional[str] = Query(None, description="ISO format date (UTC, default: today)"),
    latitude: float = Query(..., ge=-90, le=90, description="Observer latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Observer longitude"),
    timezone: str = Query("UTC", description="IANA timezone")
):
    """
    Get 24 planetary hours for the given date.
    """
    try:
        if date:
            dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
        else:
            dt = datetime.utcnow()

        date_time = DateTime(
            date=dt,
            timezone=timezone,
            location=Location(latitude, longitude)
        )

        calculator = get_calculator()
        hours = await calculator.get_planetary_hours(date_time)

        return PlanetaryHoursResponse(
            hours=[
                PlanetaryHourResponse(
                    planet=h.planet.value,
                    start_time=h.start_time,
                    end_time=h.end_time,
                    is_day_hour=h.is_day_hour,
                    hour_number=h.hour_number
                )
                for h in hours
            ]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating planetary hours: {str(e)}")


@router.get("/solar-times", response_model=SolarTimesResponse)
async def get_solar_times(
    date: Optional[str] = Query(None, description="ISO format date, e.g. 2026-03-01 (UTC, default: today)"),
    latitude: float = Query(..., ge=-90, le=90, description="Observer latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Observer longitude"),
    timezone: str = Query("UTC", description="IANA timezone for output times"),
    elevation: float = Query(0.0, description="Observer elevation in meters"),
):
    """
    Calculate sunrise, sunset, twilight times and current solar period
    for a given date and location.

    Uses NASA JPL DE421 ephemeris via Skyfield for high-precision results.

    The 'current_period' field indicates what period is happening NOW:
    - "night"                — below astronomical twilight
    - "astronomical_twilight" — Sun -18° to -12°
    - "nautical_twilight"    — Sun -12° to -6°
    - "civil_twilight"       — Sun -6° to 0°
    - "day"                  — Sun above horizon

    Useful for adaptive dark/light theme switching.
    """
    try:
        from app.calculators.solar_engine import solar_engine

        # Parse date
        if date:
            try:
                dt = datetime.fromisoformat(date.replace('Z', '+00:00'))
            except ValueError:
                # Try parsing as date-only
                from datetime import date as date_type
                d = date_type.fromisoformat(date[:10])
                dt = datetime(d.year, d.month, d.day, tzinfo=pytz.UTC)
        else:
            dt = datetime.utcnow().replace(tzinfo=pytz.UTC)

        # Ensure timezone-aware
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)

        # Calculate solar times (returns UTC datetimes)
        solar = solar_engine.get_solar_times(dt, latitude, longitude, elevation)

        # Convert to target timezone for output
        tz = pytz.timezone(timezone)
        now_utc = datetime.utcnow().replace(tzinfo=pytz.UTC)
        now_local = now_utc.astimezone(tz)

        def fmt(d_utc) -> Optional[str]:
            if d_utc is None:
                return None
            return d_utc.astimezone(tz).isoformat()

        sunrise_utc = solar.get("sunrise")
        sunset_utc = solar.get("sunset")

        # Day length
        day_length = None
        if sunrise_utc and sunset_utc and sunset_utc > sunrise_utc:
            day_length = (sunset_utc - sunrise_utc).total_seconds() / 60.0

        # Solar noon = midpoint between sunrise and sunset
        solar_noon = None
        if sunrise_utc and sunset_utc and sunset_utc > sunrise_utc:
            noon_utc = sunrise_utc + (sunset_utc - sunrise_utc) / 2
            solar_noon = fmt(noon_utc)

        # Determine current solar period
        civil_dawn_utc = solar.get("civil_dawn")
        civil_dusk_utc = solar.get("civil_dusk")
        nautical_dawn_utc = solar.get("nautical_dawn")
        nautical_dusk_utc = solar.get("nautical_dusk")
        astro_dawn_utc = solar.get("astronomical_dawn")
        astro_dusk_utc = solar.get("astronomical_dusk")

        current_period = "night"
        is_daytime = False
        is_twilight = False

        if sunrise_utc and sunset_utc:
            if sunrise_utc <= now_utc <= sunset_utc:
                current_period = "day"
                is_daytime = True
            elif civil_dawn_utc and civil_dusk_utc:
                if civil_dawn_utc <= now_utc < sunrise_utc or sunset_utc < now_utc <= civil_dusk_utc:
                    current_period = "civil_twilight"
                    is_twilight = True
                elif nautical_dawn_utc and nautical_dusk_utc:
                    if nautical_dawn_utc <= now_utc < civil_dawn_utc or civil_dusk_utc < now_utc <= nautical_dusk_utc:
                        current_period = "nautical_twilight"
                        is_twilight = True
                    elif astro_dawn_utc and astro_dusk_utc:
                        if astro_dawn_utc <= now_utc < nautical_dawn_utc or nautical_dusk_utc < now_utc <= astro_dusk_utc:
                            current_period = "astronomical_twilight"
                            is_twilight = True

        return SolarTimesResponse(
            date=dt.strftime("%Y-%m-%d"),
            latitude=latitude,
            longitude=longitude,
            timezone=timezone,
            sunrise=fmt(sunrise_utc),
            sunset=fmt(sunset_utc),
            solar_noon=solar_noon,
            civil_dawn=fmt(civil_dawn_utc),
            civil_dusk=fmt(civil_dusk_utc),
            nautical_dawn=fmt(nautical_dawn_utc),
            nautical_dusk=fmt(nautical_dusk_utc),
            astronomical_dawn=fmt(astro_dawn_utc),
            astronomical_dusk=fmt(astro_dusk_utc),
            day_length_minutes=round(day_length, 1) if day_length else None,
            current_period=current_period,
            is_daytime=is_daytime,
            is_twilight=is_twilight,
            sunrise_ts=sunrise_utc.timestamp() if sunrise_utc else None,
            sunset_ts=sunset_utc.timestamp() if sunset_utc else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating solar times: {str(e)}")
