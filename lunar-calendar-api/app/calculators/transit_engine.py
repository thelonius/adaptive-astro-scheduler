"""
Transit Engine — Sprint 6 🔭

Calculates transits: aspects formed by current moving planets
to the fixed positions of planets in a natal chart.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any

from app.calculators.aspect_engine import aspect_engine
from app.calculators.planetary_engine import planetary_engine
from app.calculators.lunar_engine import lunar_engine

class TransitEngine:
    """
    Computes astrological transits against a base chart.
    """
    
    TRANSITING_BODIES = [
        "Sun", "Moon", "Mercury", "Venus", "Mars",
        "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    ]
    
    def __init__(self):
        self.a_engine = aspect_engine
        
    def get_current_transits(
        self, 
        natal_chart: Dict[str, Any], 
        transit_dt: datetime,
        aspect_categories: str = "major"
    ) -> List[Dict[str, Any]]:
        """
        Finds all active aspects from current moving planets to natal planets.
        
        Args:
            natal_chart: The dictionary returned by ChartService.generate_chart()
            transit_dt: The moment in time to calculate moving planets for.
            aspect_categories: "major", "minor", or "all"
            
        Returns:
            List of transit aspects, sorted by exactness (orb).
        """
        # 1. Gather all transiting planet longitudes for transit_dt
        transits = {}
        for planet in self.TRANSITING_BODIES:
            if planet == "Moon":
                lon = lunar_engine.get_moon_longitude(transit_dt)
            else:
                lon = planetary_engine.core.get_planet_position(planet, transit_dt)[0]
            transits[planet] = lon
            
        active_transits = []
        
        # 2. Extract natal positions
        natal_planets = natal_chart.get("planets", {})
        natal_angles = natal_chart.get("angles", {})
        
        natal_points = {}
        # Add planets
        for p_name, p_data in natal_planets.items():
            natal_points[p_name] = p_data["longitude"]
            
        # Add angles if present
        if "ascendant" in natal_angles:
            natal_points["ASC"] = natal_angles["ascendant"]
        if "mc" in natal_angles:
            natal_points["MC"] = natal_angles["mc"]
            
        # 3. Check every transiting body against every natal point
        for t_planet, t_lon in transits.items():
            for n_point, n_lon in natal_points.items():
                
                # Calculate the exact mathematical aspect
                actual_angle = self.a_engine.angular_distance(t_lon, n_lon)
                
                best_match = None
                smallest_orb = 999.0
                
                for asp_name, asp_def in self.a_engine.aspect_defs.items():
                    if aspect_categories == "major" and asp_def.get("category") != "major":
                        continue
                        
                    target_angle = asp_def["angle"]
                    
                    # For transits to angles, keep orb tight (e.g. max 2-3 degrees)
                    if n_point in ["ASC", "MC"]:
                        orb_limit = 2.0 
                    # Transits generally use tighter orbs than natal aspects
                    # Fast planets (Sun-Mars): 2 degrees
                    # Slow planets (Jupiter-Pluto): 1 degree
                    elif t_planet in ["Sun", "Moon", "Mercury", "Venus", "Mars"]:
                        orb_limit = 2.0
                    else:
                        orb_limit = 1.0
                        
                    diff = abs(actual_angle - target_angle)
                    
                    if diff <= orb_limit and diff < smallest_orb:
                        smallest_orb = diff
                        
                        # Determine applying/separating. A transit is applying if 
                        # the orb is decreasing as times moves forward.
                        is_applying = self._is_transit_applying(
                            t_planet, n_lon, transit_dt, target_angle
                        )
                        
                        best_match = {
                            "transiting_planet": t_planet,
                            "natal_point": n_point,
                            "aspect": asp_name,
                            "orb": round(diff, 4),
                            "is_applying": is_applying,
                            "nature": asp_def.get("nature", "unknown"),
                            "symbol": asp_def.get("symbol", "")
                        }
                
                if best_match:
                    active_transits.append(best_match)
                    
        # Sort by tightness of orb
        active_transits.sort(key=lambda t: t["orb"])
        return active_transits
        
    def _is_transit_applying(
        self, 
        trans_planet: str, 
        natal_lon: float, 
        dt: datetime, 
        target_angle: float
    ) -> bool:
        """Helper to determine if a transit aspect is getting tighter."""
        # Check position 2 hours from now
        dt_future = dt + timedelta(hours=2)
        
        if trans_planet == "Moon":
            t_lon_now = lunar_engine.get_moon_longitude(dt)
            t_lon_fut = lunar_engine.get_moon_longitude(dt_future)
        else:
            t_lon_now = planetary_engine.core.get_planet_position(trans_planet, dt)[0]
            t_lon_fut = planetary_engine.core.get_planet_position(trans_planet, dt_future)[0]
            
        angle_now = self.a_engine.angular_distance(t_lon_now, natal_lon)
        angle_fut = self.a_engine.angular_distance(t_lon_fut, natal_lon)
        
        orb_now = abs(angle_now - target_angle)
        orb_fut = abs(angle_fut - target_angle)
        
        return orb_fut < orb_now

# Singleton instance
transit_engine = TransitEngine()
