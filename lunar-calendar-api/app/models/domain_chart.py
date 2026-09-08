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


class SynastryRequest(BaseModel):
    """Request body for synastry between two natal charts."""
    chart_a: ChartRequest = Field(..., description="First person's chart")
    chart_b: ChartRequest = Field(..., description="Second person's chart")
    aspect_categories: str = Field("major", description="major | minor | all")


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


class SynastryAspect(BaseModel):
    chart_a_point: str
    chart_b_point: str
    aspect: str
    angle: float
    orb: float
    nature: str
    symbol: str
    category: str


class SynastryResponse(BaseModel):
    chart_a_meta: ChartMeta
    chart_b_meta: ChartMeta
    inter_aspects: List[SynastryAspect]


class DraconicResponse(BaseModel):
    """Draconic chart — zodiac rebased to North Node at 0° Aries."""
    meta: Dict[str, Any]
    north_node_longitude: float
    angles: AnglesData
    houses: List[float]
    planets: Dict[str, PlanetData]
    aspects: List[AspectData]


class GateActivation(BaseModel):
    gate: int
    line: int
    center: str
    longitude: float


class HumanDesignResponse(BaseModel):
    """Human Design bodygraph — type, profile, authority, gates/channels."""
    meta: Dict[str, Any]
    type: str
    profile: str
    authority: str
    strategy: str
    definition: str
    defined_centers: List[Dict[str, str]]
    defined_channels: List[str]
    active_gates: List[int]
    personality: Dict[str, GateActivation]
    design: Dict[str, GateActivation]



class VimshottariDashaRequest(BaseModel):
    """Request for Vimshottari dasha timeline from birth data."""
    natal: ChartRequest = Field(..., description="Birth chart parameters")
    query_datetime_utc: Optional[datetime] = Field(None, description="Date to find current dasha (default: now)")


class DashaPeriod(BaseModel):
    lord: str
    start: str
    end: str
    duration_years: float
    progress_pct: Optional[float] = None


class AntardashaPeriod(DashaPeriod):
    pass


class MahadashaPeriod(BaseModel):
    lord: str
    start: str
    end: str
    duration_years: float
    antardashas: List[AntardashaPeriod]


class VimshottariDashaResponse(BaseModel):
    """Vimshottari mahadasha/antardasha timeline."""
    meta: Dict[str, Any]
    birth_nakshatra: Dict[str, Any]
    birth_dasha_lord: str
    birth_dasha_balance_years: float
    current: Dict[str, Any]
    mahadashas: List[MahadashaPeriod]


class VargaPosition(BaseModel):
    longitude: float
    sign: str
    sign_id: int
    sign_degree: float


class NavamsaPlanet(BaseModel):
    d1: VargaPosition
    d9: Dict[str, Any]
    is_vargottama: bool


class NavamsaResponse(BaseModel):
    """D9 Navamsa divisional chart (sidereal Lahiri)."""
    meta: Dict[str, Any]
    planets: Dict[str, NavamsaPlanet]
    vargottama_planets: List[str]


class ReturnResponse(BaseModel):
    planet: str
    year: Optional[int]
    exact_at: str
    natal_longitude: float
