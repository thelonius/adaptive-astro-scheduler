from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from timezonefinder import TimezoneFinder
from typing import Optional

router = APIRouter(prefix="/geo", tags=["geo"])
tf = TimezoneFinder()

class GeoLocation(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude in degrees")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude in degrees")

class TimezoneResponse(BaseModel):
    timezone: str = Field(..., description="IANA Timezone ID (e.g. Europe/London)")

@router.post("/timezone", response_model=TimezoneResponse)
async def get_timezone(location: GeoLocation):
    """
    Get the IANA timezone ID for a given latitude and longitude.
    This is essential for resolving historical time offsets correctly.
    """
    timezone_str = tf.timezone_at(lng=location.longitude, lat=location.latitude)

    if timezone_str is None:
        # Fallback: try finding closest timezone within 100km?
        # For now, just return UTC if really unknown, or raise 404
        # But usually timezone_at returns None only for oceans far from land
        timezone_str = tf.closest_timezone_at(lng=location.longitude, lat=location.latitude)

        if timezone_str is None:
             raise HTTPException(status_code=404, detail="Timezone not found for this location")

    return {"timezone": timezone_str}
