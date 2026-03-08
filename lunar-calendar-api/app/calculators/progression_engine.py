"""
Progression Engine — Sprint 7 ⏳

Calculates Secondary Progressions (1 day = 1 year) and Solar Arc Directions.
Used for long-term astrological forecasting.
"""

from datetime import datetime, timedelta
from typing import Dict, Any

from app.calculators.planetary_engine import planetary_engine
from app.calculators.lunar_engine import lunar_engine
from app.calculators.aspect_engine import aspect_engine

class ProgressionEngine:
    """
    Computes progressed positions and directed (Solar Arc) positions.
    """
    
    BODIES = [
        "Sun", "Moon", "Mercury", "Venus", "Mars",
        "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    ]
    
    EPOCH_YEAR_DAYS = 365.242199  # Tropical year length
    
    def __init__(self):
        self.p_engine = planetary_engine
        self.l_engine = lunar_engine
        self.a_engine = aspect_engine
        
    def _get_age_in_years(self, birth_dt: datetime, target_dt: datetime) -> float:
        """Calculates exact age in decimal years."""
        diff = target_dt - birth_dt
        return diff.total_seconds() / (self.EPOCH_YEAR_DAYS * 24 * 3600)
        
    def get_progressed_date(self, birth_dt: datetime, target_dt: datetime) -> datetime:
        """
        Calculates the secondary progressed date (1 day = 1 year).
        E.g., for a 30-year-old, the progressed date is exactly 30 days after birth.
        """
        age_years = self._get_age_in_years(birth_dt, target_dt)
        # 1 tropical year of actual life = 1 ephemeris day 
        progressed_delta = timedelta(days=age_years)
        return birth_dt + progressed_delta

    def calculate_secondary_progressions(
        self, 
        birth_dt: datetime, 
        target_dt: datetime
    ) -> Dict[str, Any]:
        """
        Calculates positions of planets using Secondary Progressions.
        Returns longitudes for the progressed date.
        """
        prog_dt = self.get_progressed_date(birth_dt, target_dt)
        
        positions = {}
        for planet in self.BODIES:
            if planet == "Moon":
                lon = self.l_engine.get_moon_longitude(prog_dt)
            else:
                lon = self.p_engine.core.get_planet_position(planet, prog_dt)[0]
                
            positions[planet] = round(lon, 4)
            
        return {
            "meta": {
                "birth_dt": birth_dt.isoformat(),
                "target_dt": target_dt.isoformat(),
                "progressed_dt": prog_dt.isoformat(),
                "age_years": round(self._get_age_in_years(birth_dt, target_dt), 4)
            },
            "planets": positions
        }

    def calculate_solar_arcs(
        self, 
        natal_chart: Dict[str, Any], 
        target_dt: datetime
    ) -> Dict[str, Any]:
        """
        Calculates Solar Arc directed positions.
        Algorithm:
        1. Find progressed Sun's longitude for target_dt.
        2. Arc = Progressed Sun - Natal Sun.
        3. Add Arc to every natal planet and angle.
        
        Args:
            natal_chart: The result from ChartService.generate_chart()
            target_dt: The date to calculate for.
        """
        birth_dt_str = natal_chart["meta"]["datetime_utc"]
        birth_dt = datetime.fromisoformat(birth_dt_str)
        
        # 1. Get Natal Sun
        natal_sun = natal_chart["planets"]["Sun"]["longitude"]
        
        # 2. Get Progressed Sun
        prog_dt = self.get_progressed_date(birth_dt, target_dt)
        prog_sun = self.p_engine.core.get_planet_position("Sun", prog_dt)[0]
        
        # 3. Calculate arc (handle 360 wraparound)
        # We strictly want the forward progression of the Sun
        arc = (prog_sun - natal_sun) % 360
        
        # 4. Apply arc to all points
        directed_positions = {}
        for p_name, p_data in natal_chart.get("planets", {}).items():
            dir_lon = (p_data["longitude"] + arc) % 360
            directed_positions[p_name] = round(dir_lon, 4)
            
        angles = natal_chart.get("angles", {})
        directed_angles = {}
        for a_name, a_val in angles.items():
            if a_val is not None:
                dir_lon = (a_val + arc) % 360
                directed_angles[a_name] = round(dir_lon, 4)
                
        return {
            "meta": {
                "birth_dt": birth_dt.isoformat(),
                "target_dt": target_dt.isoformat(),
                "solar_arc_degrees": round(arc, 4)
            },
            "planets": directed_positions,
            "angles": directed_angles
        }

# Singleton instance
progression_engine = ProgressionEngine()
