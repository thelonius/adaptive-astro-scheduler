from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import date as DateType, datetime


class ColorPalette(BaseModel):
    """Color palette for a lunar day."""
    base_colors: List[str] = Field(..., description="Base colors for the lunar day")
    gradient: List[str] = Field(..., description="Gradient colors generated from base colors")


class HealthAspect(BaseModel):
    """Health aspects affected during a lunar day."""
    affected_organs: List[str] = Field(..., description="Organs affected on this lunar day")
    affected_body_parts: List[str] = Field(..., description="Body parts requiring attention")
    health_tips: List[str] = Field(default_factory=list, description="Health recommendations")


class Recommendations(BaseModel):
    """Things to do and avoid on a lunar day."""
    recommended: List[str] = Field(..., description="Recommended activities")
    not_recommended: List[str] = Field(..., description="Activities to avoid")


class PlanetaryInfluence(BaseModel):
    """Planetary and stellar influences."""
    dominant_planet: Optional[str] = Field(None, description="Main planet influencing this day")
    additional_influences: List[str] = Field(default_factory=list, description="Other celestial influences")
    description: str = Field(..., description="Description of the influence")


class MoonPhase(BaseModel):
    """Moon phase information."""
    name: str = Field(..., description="Phase name (New Moon, Waxing Crescent, etc.)")
    illumination: float = Field(..., description="Moon illumination percentage (0-100)")
    is_waxing: bool = Field(..., description="Whether moon is waxing (growing)")
    emoji: str = Field(..., description="Emoji representation of the phase")


class LunarDayTiming(BaseModel):
    """Timing information for a lunar day."""
    starts_at: datetime = Field(..., description="When this lunar day starts (UTC)")
    ends_at: datetime = Field(..., description="When this lunar day ends (UTC)")
    duration_hours: float = Field(..., description="Duration of this lunar day in hours")
    is_current: bool = Field(..., description="Whether this lunar day is currently active")

    # Human-readable local time fields
    starts_at_local: Optional[str] = Field(None, description="Start time in local timezone (human readable)")
    ends_at_local: Optional[str] = Field(None, description="End time in local timezone (human readable)")
    timezone: Optional[str] = Field(None, description="Timezone used for local times")

    # Time progress fields
    time_elapsed_hours: Optional[float] = Field(None, description="Hours passed since lunar day started")
    time_remaining_hours: Optional[float] = Field(None, description="Hours remaining until lunar day ends")
    time_elapsed_readable: Optional[str] = Field(None, description="Human-readable time elapsed (e.g., '2 hours 30 minutes')")
    time_remaining_readable: Optional[str] = Field(None, description="Human-readable time remaining (e.g., '21 hours 30 minutes')")
    progress_percentage: Optional[float] = Field(None, description="Percentage of lunar day completed (0-100)")


class LunarDayInfo(BaseModel):
    """Complete information for a lunar day."""
    lunar_day: int = Field(..., ge=1, le=30, description="Lunar day number (1-30)")
    gregorian_date: DateType = Field(..., description="Gregorian calendar date")
    timing: LunarDayTiming = Field(..., description="When this lunar day starts and ends")
    moon_phase: MoonPhase = Field(..., description="Current moon phase")
    color_palette: ColorPalette = Field(..., description="Color palette for the day")
    health: HealthAspect = Field(..., description="Health aspects")
    recommendations: Recommendations = Field(..., description="Activity recommendations")
    planetary_influence: PlanetaryInfluence = Field(..., description="Planetary influences")
    general_description: str = Field(..., description="General description of the day")


class LunarDayData(BaseModel):
    """Static data for a specific lunar day (from JSON)."""
    lunar_day: int = Field(..., ge=1, le=30)
    base_colors: List[str]
    affected_organs: List[str]
    affected_body_parts: List[str]
    health_tips: List[str] = Field(default_factory=list)
    recommended: List[str]
    not_recommended: List[str]
    dominant_planet: Optional[str] = None
    additional_influences: List[str] = Field(default_factory=list)
    planetary_description: str
    general_description: str


class ActivityRequest(BaseModel):
    """Request to find best days for an activity."""
    activity: str = Field(..., description="Type of activity (e.g., 'haircut', 'starting new project')")
    start_date: Optional[DateType] = Field(None, description="Starting date for search (defaults to today)")
    days_ahead: int = Field(30, ge=1, le=365, description="Number of days to search ahead")


class BestDayResult(BaseModel):
    """Result for a recommended day."""
    date: DateType = Field(..., description="Recommended date")
    lunar_day: int = Field(..., description="Lunar day number")
    moon_phase: str = Field(..., description="Moon phase name")
    score: float = Field(..., description="Suitability score (0-100)")
    reason: str = Field(..., description="Why this day is recommended")


class BestDaysResponse(BaseModel):
    """Response with best days for an activity."""
    activity: str = Field(..., description="Requested activity")
    search_period: Dict[str, DateType] = Field(..., description="Search period (start and end dates)")
    best_days: List[BestDayResult] = Field(..., description="List of recommended days")
