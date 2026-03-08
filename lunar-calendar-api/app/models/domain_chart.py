"""
Pydantic models for Chart-related API requests and responses.
Used by /api/v1/chart/* endpoints.
"""
from datetime import datetime
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


# ── Request Models ──────────────────────────────────────────────

class ChartRequest(BaseModel):
    """Request body for generating any chart."""
    datetime_utc: datetime = Field(..., description="UTC datetime of the chart moment")
    latitude: float = Field(..., ge=-90, le=90, description="Geographic latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Geographic longitude")
    house_system: str = Field("placidus", description="House system: placidus, koch, equal, whole_sign")


class TransitRequest(BaseModel):
    """Request body for computing transits against a natal chart."""
    natal: ChartRequest = Field(..., description="Natal chart parameters")
    transit_datetime_utc: datetime = Field(..., description="UTC datetime of the transit moment")
    aspect_categories: str = Field("major", description="major | minor | all")


class ProgressionRequest(BaseModel):
    """Request body for secondary progressions or solar arcs."""
    natal: ChartRequest = Field(..., description="Natal chart parameters")
    target_datetime_utc: datetime = Field(..., description="Target date for progressed positions")


class ReturnRequest(BaseModel):
    """Request body for calculating a Planetary Return."""
    natal: ChartRequest = Field(..., description="Natal chart parameters")
    year: int = Field(..., description="Target year (Solar Return) or target month (Lunar Return)")


# ── Sub-response Models ─────────────────────────────────────────

class PlanetData(BaseModel):
    longitude: float
    sign: str
    sign_id: int
    sign_degree: float
    is_retrograde: bool
    house: Optional[int]
    ruler: Optional[str]


class AspectData(BaseModel):
    planet_a: str
    planet_b: str
    aspect: str
    angle: float
    orb: float
    is_applying: bool
    nature: str
    symbol: str
    category: str


class AnglesData(BaseModel):
    ascendant: float
    mc: float
    vertex: float


class RulershipsData(BaseModel):
    system: str
    final_dispositors: List[str]
    mutual_receptions: List[Any]
    chains: Dict[str, List[str]]


# ── Response Models ─────────────────────────────────────────────

class ChartMeta(BaseModel):
    datetime_utc: str
    latitude: float
    longitude: float
    house_system: str


class ChartResponse(BaseModel):
    meta: ChartMeta
    angles: AnglesData
    houses: List[float]
    planets: Dict[str, PlanetData]
    aspects: List[AspectData]
    rulerships: RulershipsData


class TransitAspect(BaseModel):
    transiting_planet: str
    natal_point: str
    aspect: str
    orb: float
    is_applying: bool
    nature: str
    symbol: str


class TransitResponse(BaseModel):
    natal_datetime_utc: str
    transit_datetime_utc: str
    active_transits: List[TransitAspect]


class ProgressedPlanets(BaseModel):
    meta: Dict[str, Any]
    planets: Dict[str, float]


class SolarArcResponse(BaseModel):
    meta: Dict[str, Any]
    planets: Dict[str, float]
    angles: Dict[str, float]


class ReturnResponse(BaseModel):
    planet: str
    year: Optional[int]
    exact_at: str
    natal_longitude: float
