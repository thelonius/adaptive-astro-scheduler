"""
Chart Service — Sprint 5 🗺️

Aggregates data from all calculators (Planetary, Lunar, House, Aspect, Dispositor)
to construct a complete Astrological Chart (e.g., a Natal Chart or Current Transit Chart).
This is the main orchestration layer for all chart-related API endpoints.
"""

from datetime import datetime
from typing import Dict, Any, List

from app.calculators.planetary_engine import planetary_engine
from app.calculators.lunar_engine import lunar_engine
from app.calculators.house_engine import house_engine
from app.calculators.aspect_engine import aspect_engine
from app.calculators.dispositor_engine import dispositor_engine

class ChartService:
    """
    Constructs comprehensive astrological charts.
    """
    
    # Standard 10 bodies used in modern astrology
    CHART_BODIES = [
        "Sun", "Moon", "Mercury", "Venus", "Mars",
        "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"
    ]
    
    # Points calculated via House Engine
    ANGLES = ["ascendant", "mc", "vertex"]
    
    def generate_chart(
        self,
        dt: datetime,
        lat: float,
        lon: float,
        house_system: str = "placidus"
    ) -> Dict[str, Any]:
        """
        Generates a complete astrological chart detailing planets, houses, aspects,
        and rulership chains.
        """
        # 1. Calculate Houses & Angles
        houses_data = house_engine.calculate_houses(dt, lat, lon, system=house_system)
        
        # 2. Gather Planet Positions & Placements
        planets_data = {}
        for planet in self.CHART_BODIES:
            # Ecliptic longitude
            if planet == "Moon":
                lon_deg = lunar_engine.get_moon_longitude(dt)
                sign_data = lunar_engine.get_zodiac_sign(dt)
                is_retrograde = False # Moon is never retrograde
            else:
                lon_deg = planetary_engine.core.get_planet_position(planet, dt)[0]
                sign_data = planetary_engine.get_planet_sign(planet, dt)
                is_retrograde = planetary_engine.core.is_retrograde(planet, dt)
            
            # House Placement (requires PySwisseph houses to work)
            house_num = None
            if "error" not in houses_data:
                house_num = house_engine.get_planet_house(lon_deg, houses_data["cusps"])
            
            planets_data[planet] = {
                "longitude": round(lon_deg, 4),
                "sign": sign_data["sign"],
                "sign_id": sign_data["sign_id"],
                "sign_degree": round(sign_data["degree"], 4),
                "is_retrograde": is_retrograde,
                "house": house_num
            }
            
        # 3. Calculate Aspects
        # Pass CHART_BODIES to filter out North Node or other points if we add them later
        aspects_list = aspect_engine.get_all_aspects(dt, categories="major", bodies=self.CHART_BODIES)
        
        # Also check aspects to Ascendant and MC if houses were calculated
        if "error" not in houses_data:
            asc_lon = houses_data["ascendant"]
            mc_lon = houses_data["mc"]
            
            for planet in self.CHART_BODIES:
                p_lon = planets_data[planet]["longitude"]
                
                # Check ASC aspect
                asc_angle = aspect_engine.angular_distance(p_lon, asc_lon)
                self._check_and_append_angle_aspect(aspects_list, planet, "ASC", asc_angle, asc_lon, p_lon)
                
                # Check MC aspect
                mc_angle = aspect_engine.angular_distance(p_lon, mc_lon)
                self._check_and_append_angle_aspect(aspects_list, planet, "MC", mc_angle, mc_lon, p_lon)

        # 4. Dispositor Chains (Traditional)
        dispositor_map = dispositor_engine.get_full_map(dt, system="traditional")
        mutual_receptions = dispositor_engine.find_mutual_receptions(dt, system="traditional")
        final_dispositors = dispositor_engine.find_final_dispositors(dt, system="traditional")
        
        # Inject ruler into planet data for convenience
        for planet in self.CHART_BODIES:
            if planet in dispositor_map:
                planets_data[planet]["ruler"] = dispositor_map[planet]["ruler"]

        # Assemble the final chart payload
        return {
            "meta": {
                "datetime_utc": dt.isoformat(),
                "latitude": lat,
                "longitude": lon,
                "house_system": house_system
            },
            "angles": {
                "ascendant": round(houses_data["ascendant"], 4),
                "mc": round(houses_data["mc"], 4),
                "vertex": round(houses_data.get("vertex", 0.0), 4)
            },
            "houses": [round(c, 4) for c in houses_data["cusps"][1:]] if "error" not in houses_data else [],
            "planets": planets_data,
            "aspects": aspects_list,
            "rulerships": {
                "system": "traditional",
                "final_dispositors": final_dispositors,
                "mutual_receptions": mutual_receptions,
                # Full chains are computationally light so we can include them
                "chains": {
                    p: dispositor_engine.build_chain(p, dt, system="traditional")["chain"]
                    for p in self.CHART_BODIES
                }
            }
        }
        
    def _check_and_append_angle_aspect(
        self,
        aspects_list: List[dict],
        planet: str,
        angle_name: str,
        actual_angle: float,
        angle_lon: float,
        p_lon: float
    ):
        """Helper to find and append aspects between a planet and a mathematical angle (ASC/MC)."""
        # We manually check since aspect_engine expects planet names for definitions/orbs
        best_match = None
        smallest_orb = 999.0
        
        for asp_name, asp_def in aspect_engine.aspect_defs.items():
            if asp_def.get("category") != "major":
                continue
                
            target_angle = asp_def["angle"]
            # Angles generally have tight orbs (e.g. 5 degrees)
            orb_limit = 5.0
            
            diff = abs(actual_angle - target_angle)
            if diff <= orb_limit and diff < smallest_orb:
                smallest_orb = diff
                best_match = {
                    "aspect": asp_name,
                    "angle": target_angle,
                    "orb": round(diff, 4),
                    "exact_angle": round(actual_angle, 4),
                    "is_applying": False, # Dynamic angles applying/separating is complex due to earth rotation
                    "nature": asp_def.get("nature", "unknown"),
                    "category": "major",
                    "symbol": asp_def.get("symbol", ""),
                    "planet_a": planet,
                    "planet_b": angle_name
                }
                
        if best_match:
            aspects_list.append(best_match)


# Singleton instance
chart_service = ChartService()
