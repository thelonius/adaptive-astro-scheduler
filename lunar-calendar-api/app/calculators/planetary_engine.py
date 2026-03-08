from datetime import datetime, timedelta
import pytz

from app.calculators._swe_import import swe, HAS_SWE

from app.calculators.ephemeris_core import ephemeris_core

class PlanetaryEngine:
    """
    Handles calculations for planetary movements (Sun, Mercury through Pluto).
    Focuses on retrogrades, sign changes (ingresses), and planetary hours.
    """
    
    def __init__(self):
        self.core = ephemeris_core
        self.planets = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
        self.signs = [
            "Aries", "Taurus", "Gemini", "Cancer", 
            "Leo", "Virgo", "Libra", "Scorpio", 
            "Sagittarius", "Capricorn", "Aquarius", "Pisces"
        ]
        
    def get_all_retrogrades(self, dt: datetime, detailed: bool = False) -> list:
        """
        Returns a list of all planets that are currently retrograde.
        If detailed=True, includes the exact speed.
        """
        retro_planets = []
        for planet in self.planets:
            pos = self.core.get_planet_position(planet, dt)
            speed = pos[3] # longitude speed
            
            if speed < 0:
                if detailed:
                    retro_planets.append({
                        "planet": planet,
                        "speed": round(speed, 4),
                        "sign": self.signs[int(pos[0] / 30)]
                    })
                else:
                    retro_planets.append(planet)
                    
        return retro_planets

    def get_planet_sign(self, planet: str, dt: datetime) -> dict:
        """Returns the current zodiac sign and degree of a planet."""
        pos = self.core.get_planet_position(planet, dt)
        lon = pos[0]
        
        sign_index = int(lon / 30)
        degree_in_sign = lon % 30
        
        return {
            "planet": planet,
            "sign": self.signs[sign_index],
            "sign_id": sign_index + 1,
            "degree": round(degree_in_sign, 2)
        }

planetary_engine = PlanetaryEngine()
