"""
House Engine — Sprint 4 🏠

Calculates Astrological Houses (Placidus, Koch, Equal, etc.) and Angles (ASC, MC).
Requires PySwisseph for accurate trigonometric calculations of house cusps.
"""

from datetime import datetime
import pytz

from app.calculators._swe_import import swe, HAS_SWE

from app.calculators.ephemeris_core import ephemeris_core


class HouseEngine:
    """
    Calculates astrological houses and determines which house a planet occupies.
    """
    
    def __init__(self):
        self.core = ephemeris_core
        
        # Mapping of common house systems to Swiss Ephemeris byte codes
        self.SYSTEMS = {
            "placidus": b'P',
            "koch": b'K',
            "equal": b'E',
            "whole_sign": b'W',
            "campanus": b'C',
            "regiomontanus": b'R'
        }

    def calculate_houses(
        self, 
        dt: datetime, 
        lat: float, 
        lon: float, 
        system: str = "placidus"
    ) -> dict:
        """
        Calculates the 12 house cusps and main angles (Ascendant, Midheaven).
        
        Returns:
            {
                "system": "placidus",
                "ascendant": 12.34,
                "mc": 284.56,
                "vertex": 150.21,
                "cusps": [0.0, 12.34, 45.67, ...]  # index 1 = House 1, index 12 = House 12
            }
        """
        if not HAS_SWE:
            return {
                "error": "PySwisseph is required for house system calculations",
                "ascendant": 0.0,
                "mc": 0.0,
                "cusps": [0.0] * 13
            }

        sys_code = self.SYSTEMS.get(system.lower(), b'P')
        tjd = self.core.get_swe_julian_day(dt)
        
        # swe.houses_ex(tjd_ut, lat, lon, hsys=b'P', flags=0)
        # Returns: (cusps, ascmc)
        # cusps: tuple of 13 floats. cusps[1] to cusps[12] are the 12 house cusps. cusps[0] is always 0.0.
        # ascmc: tuple of 10 floats. 
        #   [0] = Ascendant
        #   [1] = MC (Midheaven)
        #   [2] = ARMC (Right Ascension of MC)
        #   [3] = Vertex
        #   [4] = Equatorial Ascendant
        #   [5] = Co-Ascendant (Walter Koch)
        #   [6] = Co-Ascendant (Michael Munkasey)
        #    [0] = Ascendant
        #    ...
        
        cusps, ascmc = swe.houses_ex(tjd, lat, lon, sys_code)
        
        # In Python, cusps is a 12-element tuple (cusps[0] = 1st house cusp = ascendant)
        return {
            "system": system.lower(),
            "ascendant": ascmc[0],
            "mc": ascmc[1],
            "vertex": ascmc[3],
            "cusps": list(cusps)  # 12 elements, index 0 = H1 ... index 11 = H12
        }

    def get_planet_house(self, planet_longitude: float, cusps: list) -> int:
        """
        Determines which house an ecliptic longitude falls into.
        cusps array must be the 12-element array returned by calculate_houses.
        
        Returns the house number (1-12).
        """
        if len(cusps) != 12:
            raise ValueError("Cusps array must have exactly 12 elements.")
            
        # The houses wrap around 360 degrees. 
        # A house N contains longitudes from cusps[N-1] up to cusps[N].
        # House 12 goes from cusps[11] up to cusps[0].
        
        for i in range(11):
            start = cusps[i]
            end = cusps[i+1]
            
            if self._is_between(planet_longitude, start, end):
                return i + 1
                
        # If it's not in 1-11, it must be in 12
        return 12
        
    def _is_between(self, point: float, start: float, end: float) -> bool:
        """
        Checks if a point on a circle is between start and end angles.
        Handles the 360-degree wrap-around.
        """
        point = point % 360
        start = start % 360
        end = end % 360
        
        if start <= end:
            return start <= point < end
        else:
            # The span crosses the 0-degree mark (e.g. start=350, end=10)
            return point >= start or point < end


# Singleton instance
house_engine = HouseEngine()
