"""
Type definitions for the Ephemeris Calculator.

This module defines all data types used in ephemeris calculations,
matching the TypeScript interface specification.
"""

from datetime import datetime
from typing import Optional, Literal, Callable, Dict, List
from dataclasses import dataclass
from enum import Enum


# ============================================================================
# Error Types
# ============================================================================

class EphemerisErrorCode(str, Enum):
    """Error codes for ephemeris calculations."""
    INVALID_DATE = "INVALID_DATE"
    OUT_OF_RANGE = "OUT_OF_RANGE"
    CALCULATION_FAILED = "CALCULATION_FAILED"
    DATA_UNAVAILABLE = "DATA_UNAVAILABLE"


class EphemerisError(Exception):
    """Custom exception for ephemeris calculation errors."""

    def __init__(self, code: EphemerisErrorCode, message: str, details: Optional[dict] = None):
        self.code = code
        self.message = message
        self.details = details or {}
        super().__init__(f"[{code.value}] {message}")


# ============================================================================
# Input Types
# ============================================================================

@dataclass
class Location:
    """Geographic location for observations."""
    latitude: float   # -90 to 90 degrees
    longitude: float  # -180 to 180 degrees
    elevation: float = 0.0  # meters above sea level

    def __post_init__(self):
        if not -90 <= self.latitude <= 90:
            raise ValueError(f"Latitude must be between -90 and 90, got {self.latitude}")
        if not -180 <= self.longitude <= 180:
            raise ValueError(f"Longitude must be between -180 and 180, got {self.longitude}")


@dataclass
class DateTime:
    """Date, time, and location for astronomical calculations."""
    date: datetime              # UTC datetime
    timezone: str              # IANA timezone (e.g., 'Europe/Moscow')
    location: Location         # Observer location


# ============================================================================
# Planet and Zodiac Types
# ============================================================================

class PlanetName(str, Enum):
    """Names of celestial bodies."""
    SUN = "Sun"
    MOON = "Moon"
    MERCURY = "Mercury"
    VENUS = "Venus"
    MARS = "Mars"
    JUPITER = "Jupiter"
    SATURN = "Saturn"
    URANUS = "Uranus"
    NEPTUNE = "Neptune"
    PLUTO = "Pluto"


class ZodiacSignName(str, Enum):
    """Zodiac sign names."""
    ARIES = "Aries"
    TAURUS = "Taurus"
    GEMINI = "Gemini"
    CANCER = "Cancer"
    LEO = "Leo"
    VIRGO = "Virgo"
    LIBRA = "Libra"
    SCORPIO = "Scorpio"
    SAGITTARIUS = "Sagittarius"
    CAPRICORN = "Capricorn"
    AQUARIUS = "Aquarius"
    PISCES = "Pisces"


@dataclass
class ZodiacSign:
    """Zodiac sign with metadata."""
    name: ZodiacSignName
    symbol: str              # ♈, ♉, etc.
    element: Literal["Fire", "Earth", "Air", "Water"]
    quality: Literal["Cardinal", "Fixed", "Mutable"]
    ruler: PlanetName
    degree_in_sign: float    # 0-30 degrees within the sign

    @staticmethod
    def from_longitude(longitude: float) -> 'ZodiacSign':
        """Create ZodiacSign from ecliptic longitude (0-360 degrees)."""
        # Normalize longitude to 0-360
        longitude = longitude % 360

        # Each sign is 30 degrees
        sign_index = int(longitude // 30)
        degree_in_sign = longitude % 30

        signs_data = [
            (ZodiacSignName.ARIES, "♈", "Fire", "Cardinal", PlanetName.MARS),
            (ZodiacSignName.TAURUS, "♉", "Earth", "Fixed", PlanetName.VENUS),
            (ZodiacSignName.GEMINI, "♊", "Air", "Mutable", PlanetName.MERCURY),
            (ZodiacSignName.CANCER, "♋", "Water", "Cardinal", PlanetName.MOON),
            (ZodiacSignName.LEO, "♌", "Fire", "Fixed", PlanetName.SUN),
            (ZodiacSignName.VIRGO, "♍", "Earth", "Mutable", PlanetName.MERCURY),
            (ZodiacSignName.LIBRA, "♎", "Air", "Cardinal", PlanetName.VENUS),
            (ZodiacSignName.SCORPIO, "♏", "Water", "Fixed", PlanetName.MARS),
            (ZodiacSignName.SAGITTARIUS, "♐", "Fire", "Mutable", PlanetName.JUPITER),
            (ZodiacSignName.CAPRICORN, "♑", "Earth", "Cardinal", PlanetName.SATURN),
            (ZodiacSignName.AQUARIUS, "♒", "Air", "Fixed", PlanetName.URANUS),
            (ZodiacSignName.PISCES, "♓", "Water", "Mutable", PlanetName.NEPTUNE),
        ]

        name, symbol, element, quality, ruler = signs_data[sign_index]

        return ZodiacSign(
            name=name,
            symbol=symbol,
            element=element,
            quality=quality,
            ruler=ruler,
            degree_in_sign=degree_in_sign
        )


@dataclass
class CelestialBody:
    """Position and metadata for a celestial body."""
    name: PlanetName
    longitude: float         # 0-360 degrees ecliptic longitude
    latitude: float          # Ecliptic latitude (declination)
    zodiac_sign: ZodiacSign  # Computed from longitude
    speed: float             # Degrees per day
    is_retrograde: bool      # True if speed < 0
    distance_au: float       # Distance in Astronomical Units
    right_ascension: Optional[float] = None  # RA in degrees
    declination: Optional[float] = None      # Dec in degrees


@dataclass
class PlanetPositions:
    """Positions of all major planets."""
    sun: CelestialBody
    moon: CelestialBody
    mercury: CelestialBody
    venus: CelestialBody
    mars: CelestialBody
    jupiter: CelestialBody
    saturn: CelestialBody
    uranus: CelestialBody
    neptune: CelestialBody
    pluto: CelestialBody

    def get_planet(self, name: PlanetName) -> CelestialBody:
        """Get planet by name."""
        planet_map = {
            PlanetName.SUN: self.sun,
            PlanetName.MOON: self.moon,
            PlanetName.MERCURY: self.mercury,
            PlanetName.VENUS: self.venus,
            PlanetName.MARS: self.mars,
            PlanetName.JUPITER: self.jupiter,
            PlanetName.SATURN: self.saturn,
            PlanetName.URANUS: self.uranus,
            PlanetName.NEPTUNE: self.neptune,
            PlanetName.PLUTO: self.pluto,
        }
        return planet_map[name]

    def to_list(self) -> List[CelestialBody]:
        """Return all planets as a list."""
        return [
            self.sun, self.moon, self.mercury, self.venus, self.mars,
            self.jupiter, self.saturn, self.uranus, self.neptune, self.pluto
        ]


# ============================================================================
# Moon Phase and Lunar Day Types
# ============================================================================

class MoonPhaseName(str, Enum):
    """Moon phase names."""
    NEW = "New"
    WAXING = "Waxing"
    FULL = "Full"
    WANING = "Waning"


class LunarDayEnergy(str, Enum):
    """Lunar day energy types."""
    LIGHT = "Light"
    DARK = "Dark"
    NEUTRAL = "Neutral"


@dataclass
class MoonPhase:
    """Moon phase information."""
    name: str                # "New Moon", "Waxing Crescent", etc.
    illumination: float      # 0.0 to 1.0 (0 = new moon, 1 = full moon)
    phase_type: MoonPhaseName  # General phase category
    is_waxing: bool
    emoji: str               # Moon emoji representation
    angle: float             # Phase angle in degrees (0-360)


@dataclass
class LunarDayCharacteristics:
    """Characteristics and recommendations for a lunar day."""
    spiritual: str           # "Meditation", "Cleansing"
    practical: str           # "Planting", "Haircut"
    avoided: List[str]       # ["Important decisions", "Marriage"]


@dataclass
class LunarDay:
    """Lunar day information (1-30)."""
    number: int              # 1-30
    symbol: str              # "New Moon", "First Crescent", etc.
    energy: LunarDayEnergy   # Light, Dark, or Neutral
    lunar_phase: MoonPhaseName  # New, Waxing, Full, Waning
    characteristics: LunarDayCharacteristics
    starts_at: datetime      # When this lunar day begins
    ends_at: datetime        # When this lunar day ends
    duration_hours: float    # Duration in hours


# ============================================================================
# Void of Course Moon
# ============================================================================

@dataclass
class VoidOfCourseMoon:
    """Void of Course Moon period."""
    start_time: datetime
    end_time: datetime
    sign: ZodiacSign
    duration_hours: float
    last_aspect_planet: PlanetName
    next_sign: ZodiacSign

    def is_active(self, at_time: datetime) -> bool:
        """Check if VoC Moon is active at given time."""
        return self.start_time <= at_time < self.end_time


# ============================================================================
# Aspects
# ============================================================================

class AspectType(str, Enum):
    """Types of planetary aspects."""
    CONJUNCTION = "conjunction"      # 0°
    SEXTILE = "sextile"             # 60°
    SQUARE = "square"               # 90°
    TRINE = "trine"                 # 120°
    OPPOSITION = "opposition"       # 180°
    QUINCUNX = "quincunx"           # 150°
    SEMI_SEXTILE = "semi-sextile"   # 30°
    SEMI_SQUARE = "semi-square"     # 45°
    SESQUIQUADRATE = "sesquiquadrate"  # 135°


# Aspect angle definitions
ASPECT_ANGLES: Dict[AspectType, float] = {
    AspectType.CONJUNCTION: 0.0,
    AspectType.SEMI_SEXTILE: 30.0,
    AspectType.SEMI_SQUARE: 45.0,
    AspectType.SEXTILE: 60.0,
    AspectType.SQUARE: 90.0,
    AspectType.TRINE: 120.0,
    AspectType.SESQUIQUADRATE: 135.0,
    AspectType.QUINCUNX: 150.0,
    AspectType.OPPOSITION: 180.0,
}

# Default orbs for each aspect (in degrees)
DEFAULT_ORBS: Dict[AspectType, float] = {
    AspectType.CONJUNCTION: 8.0,
    AspectType.OPPOSITION: 8.0,
    AspectType.TRINE: 8.0,
    AspectType.SQUARE: 7.0,
    AspectType.SEXTILE: 6.0,
    AspectType.QUINCUNX: 3.0,
    AspectType.SEMI_SEXTILE: 2.0,
    AspectType.SEMI_SQUARE: 2.0,
    AspectType.SESQUIQUADRATE: 2.0,
}


@dataclass
class Aspect:
    """Planetary aspect between two bodies."""
    body1: CelestialBody
    body2: CelestialBody
    aspect_type: AspectType
    angle: float              # Exact angle in degrees
    orb: float                # Orb (difference from exact)
    is_exact: bool            # Within acceptable orb?
    is_applying: bool         # Is the aspect getting tighter?
    interpretation: str       # Human-readable description

    def __str__(self) -> str:
        orb_str = f"{self.orb:.2f}°"
        applying = "applying" if self.is_applying else "separating"
        return (f"{self.body1.name.value} {self.aspect_type.value} "
                f"{self.body2.name.value} (orb: {orb_str}, {applying})")


# ============================================================================
# Houses
# ============================================================================

class HouseSystem(str, Enum):
    """House calculation systems."""
    PLACIDUS = "placidus"
    WHOLE_SIGN = "whole-sign"
    EQUAL = "equal"
    KOCH = "koch"
    CAMPANUS = "campanus"
    REGIOMONTANUS = "regiomontanus"


@dataclass
class House:
    """Astrological house."""
    number: int              # 1-12
    cusp_longitude: float    # Longitude of house cusp (0-360)
    cusp_sign: ZodiacSign    # Zodiac sign of cusp
    size_degrees: float      # Size of house in degrees
    planets: List[CelestialBody]  # Planets in this house


# ============================================================================
# Planetary Hours
# ============================================================================

@dataclass
class PlanetaryHour:
    """Planetary hour information."""
    planet: PlanetName
    start_time: datetime
    end_time: datetime
    is_day_hour: bool        # True if daytime, False if nighttime
    hour_number: int         # 1-12 for day/night
    interpretation: str      # What this hour is good for


# ============================================================================
# Utility Functions
# ============================================================================

def normalize_angle(angle: float) -> float:
    """Normalize angle to 0-360 degrees."""
    return angle % 360


def angle_difference(angle1: float, angle2: float) -> float:
    """
    Calculate the shortest angular difference between two angles.
    Returns value between 0 and 180 degrees.
    """
    diff = abs(normalize_angle(angle1) - normalize_angle(angle2))
    if diff > 180:
        diff = 360 - diff
    return diff


def is_within_orb(angle: float, target: float, orb: float) -> bool:
    """Check if angle is within orb of target."""
    return angle_difference(angle, target) <= orb


# ============================================================================
# Advanced Astrological Points (Phase 1)
# ============================================================================

class LilithType(str, Enum):
    """Types of Black Moon Lilith calculation."""
    MEAN = "mean"          # Mean (averaged) position
    TRUE = "true"          # True (osculating) position
    CORRECTED = "corrected"  # Corrected (Waldemath)


@dataclass
class LunarNode:
    """Position of a lunar node (Rahu or Ketu)."""
    name: Literal["Rahu", "Ketu"]  # North Node (Rahu) or South Node (Ketu)
    longitude: float        # Ecliptic longitude (0-360°)
    latitude: float         # Always 0 for nodes
    zodiac_sign: ZodiacSignName
    speed: float           # Daily motion in degrees
    is_retrograde: bool    # Nodes are always retrograde (moving backward)
    interpretation_ru: str  # Russian interpretation


@dataclass
class LunarNodes:
    """Both lunar nodes (Rahu and Ketu)."""
    north_node: LunarNode   # Rahu (North Node)
    south_node: LunarNode   # Ketu (South Node - always opposite)


@dataclass
class BlackMoonLilith:
    """Black Moon Lilith position."""
    lilith_type: LilithType
    longitude: float        # Ecliptic longitude (0-360°)
    latitude: float
    zodiac_sign: ZodiacSignName
    speed: float           # Daily motion
    interpretation_ru: str  # Russian interpretation


@dataclass
class ArabicPart:
    """An Arabic Part (sensitive point)."""
    name: str              # e.g., "Part of Fortune", "Part of Spirit"
    longitude: float       # Ecliptic longitude (0-360°)
    zodiac_sign: ZodiacSignName
    formula: str          # Formula used: e.g., "Asc + Moon - Sun"
    is_nocturnal: bool    # Whether nocturnal formula was used
    interpretation_ru: str  # Russian interpretation


@dataclass
class ChironPosition:
    """Chiron position and information."""
    longitude: float       # Ecliptic longitude (0-360°)
    latitude: float
    zodiac_sign: ZodiacSignName
    speed: float          # Daily motion
    is_retrograde: bool
    distance_au: float    # Distance from Earth in AU
    interpretation_ru: str  # Russian interpretation
