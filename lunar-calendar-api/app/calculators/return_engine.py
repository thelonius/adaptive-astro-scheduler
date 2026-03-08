"""
Returns Engine — Sprint 8 🔄

Calculates Planetary Returns (Solar Returns, Lunar Returns).
A return occurs when a transiting planet reaches the exact ecliptic longitude
it occupied at the moment of birth.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.calculators.aspect_engine import aspect_engine
from app.calculators.planetary_engine import planetary_engine
from app.calculators.lunar_engine import lunar_engine
from app.services.chart_service import chart_service

class ReturnEngine:
    """
    Computes exact times for planetary returns using binary search.
    """
    
    def __init__(self):
        self.a_engine = aspect_engine
        
    def find_solar_return(self, natal_chart: Dict[str, Any], year: int) -> Dict[str, Any]:
        """
        Finds the exact moment of the Solar Return for a given year.
        
        Args:
            natal_chart: The result from ChartService.generate_chart()
            year: The target year (e.g., 2024)
        """
        birth_dt_str = natal_chart["meta"]["datetime_utc"]
        birth_dt = datetime.fromisoformat(birth_dt_str)
        natal_sun_lon = natal_chart["planets"]["Sun"]["longitude"]
        
        # A Solar Return happens within ~1-2 days of the birthday in the target year.
        # We start looking exactly at the birthday in the target year.
        # Handle leap year birthdays (Feb 29) gracefully
        try:
            approx_dt = birth_dt.replace(year=year)
        except ValueError:
            # Leap year baby, target year is not leap
            approx_dt = birth_dt.replace(year=year, day=28)
            
        t_start = approx_dt - timedelta(days=2)
        t_end = approx_dt + timedelta(days=2)
        
        exact_dt = self._binary_search_return("Sun", natal_sun_lon, t_start, t_end)
        
        return {
            "planet": "Sun",
            "year": year,
            "exact_at": exact_dt.isoformat(),
            "natal_longitude": natal_sun_lon
        }
        
    def find_lunar_return(self, natal_chart: Dict[str, Any], target_month_dt: datetime) -> Dict[str, Any]:
        """
        Finds the Lunar Return closest to the given date.
        The Moon returns to its natal position every ~27.32 days.
        """
        natal_moon_lon = natal_chart["planets"]["Moon"]["longitude"]
        
        # We look around the target date +/- 14 days to find the return
        t_start = target_month_dt - timedelta(days=14)
        t_end = target_month_dt + timedelta(days=14)
        
        # We need to find the interval where the Moon crosses the natal longitude.
        # The Moon moves ~13 degrees a day.
        step = timedelta(hours=6)
        t = t_start
        
        crossing_start = None
        crossing_end = None
        
        while t < t_end:
            lon1 = lunar_engine.get_moon_longitude(t)
            lon2 = lunar_engine.get_moon_longitude(t + step)
            
            # Check if natal_moon_lon is between lon1 and lon2
            # Need to handle 360-degree wraparound
            diff = self.a_engine.angular_distance(lon1, natal_moon_lon)
            diff2 = self.a_engine.angular_distance(lon2, natal_moon_lon)
            
            # The angle should shrink and then cross 0.
            # A simpler way: just check if the angular distance from natal drops below the step size's expected travel (Moon travels ~3 deg in 6h)
            if diff < 15.0:
                 # Check crossing mathematically
                 if self._is_between_arc(natal_moon_lon, lon1, lon2):
                     crossing_start = t
                     crossing_end = t + step
                     break
            t += step
            
        if not crossing_start:
            raise ValueError("Could not find Lunar Return in the specified window.")
            
        exact_dt = self._binary_search_return("Moon", natal_moon_lon, crossing_start, crossing_end)
        
        return {
            "planet": "Moon",
            "target_period": target_month_dt.isoformat(),
            "exact_at": exact_dt.isoformat(),
            "natal_longitude": natal_moon_lon
        }
        
    def _is_between_arc(self, target: float, start: float, end: float) -> bool:
        """Helper to determine if sequential longitudes cross the target."""
        # Handle the 359 -> 0 crossing
        if start < end:
            return start <= target <= end
        else:
            return target >= start or target <= end

    def _binary_search_return(
        self,
        planet: str,
        natal_lon: float,
        t_start: datetime,
        t_end: datetime,
        precision_seconds: int = 1
    ) -> datetime:
        """
        Binary search for the exact moment a planet reaches natal_lon.
        Luminaries never retrograde, so this is strictly monotonic.
        Precision defaults to 1 second.
        """
        while (t_end - t_start).total_seconds() > precision_seconds:
            t_mid = t_start + (t_end - t_start) / 2
            
            if planet == "Moon":
                lon_start = lunar_engine.get_moon_longitude(t_start)
                lon_mid = lunar_engine.get_moon_longitude(t_mid)
            else:
                lon_start = planetary_engine.core.get_planet_position(planet, t_start)[0]
                lon_mid = planetary_engine.core.get_planet_position(planet, t_mid)[0]
                
            # If the target is between start and mid, the zero-crossing is in the left half
            if self._is_between_arc(natal_lon, lon_start, lon_mid):
                t_end = t_mid
            else:
                t_start = t_mid
                
        # Return the midpoint
        return t_start + (t_end - t_start) / 2

# Singleton instance
return_engine = ReturnEngine()
