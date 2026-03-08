from datetime import datetime, date
from typing import Optional

from app.calculators.lunar_engine import lunar_engine
from app.calculators.solar_engine import solar_engine
from app.calculators.planetary_engine import planetary_engine

# Need the existing calculator for legacy Moon Phase / Lunar Day mapping
from app.services.lunar_calculator import LunarCalculator
from skyfield.api import Topos

class DailyBriefingService:
    """
    Orchestrates the new Engine layers to construct a dense, comprehensive 
    daily briefing payload for front-end dashboards and planners.
    """
    def __init__(self):
        self.legacy_calculator = None
        
    def _get_legacy_calc(self, lat: float, lon: float) -> LunarCalculator:
        """Lazy load the legacy calculator bound to coordinates."""
        if not self.legacy_calculator:
            self.legacy_calculator = LunarCalculator(Topos(latitude_degrees=lat, longitude_degrees=lon))
        return self.legacy_calculator

    def get_briefing(self, dt: datetime, lat: float, lon: float, tz_str: str = "UTC") -> dict:
        """
        Builds the complete daily briefing object.
        dt should ideally be midnight of the target day in local timezone, 
        or the current precise time.
        """
        response = {
            "date": dt.strftime("%Y-%m-%d"),
            "timestamp": dt.isoformat(),
            "lunar": {},
            "solar": {},
            "planetary": {},
            "advisories": []
        }
        
        # 1. Solar Data (Twilights, Sunrises)
        solar_data = solar_engine.get_solar_times(dt, lat, lon)
        # Format datetimes to ISO for JSON serialization
        response["solar"] = {
            k: v.isoformat() if v else None 
            for k, v in solar_data.items()
        }
        
        # 2. Lunar Data (Zodiac, Mansion, Phase)
        zodiac = lunar_engine.get_zodiac_sign(dt)
        mansion = lunar_engine.get_lunar_mansion(dt)
        
        # We still use legacy calc for the visual Moon Phase & Lunar Day (which requires complex moonrise logic)
        legacy_calc = self._get_legacy_calc(lat, lon)
        lunar_day_num = legacy_calc.calculate_lunar_day(dt.date())
        lunar_day_timing = legacy_calc.get_lunar_day_timing(dt.date(), lunar_day_num, tz_str)
        moon_phase = legacy_calc.get_moon_phase(dt.date())
        
        response["lunar"] = {
            "zodiac": zodiac,
            "mansion": mansion,
            "lunar_day": lunar_day_num,
            "lunar_day_timing": {
                "starts_at": lunar_day_timing.starts_at.isoformat(),
                "ends_at": lunar_day_timing.ends_at.isoformat(),
                "is_current": lunar_day_timing.is_current
            },
            "phase": {
                "name": moon_phase.name,
                "illumination": moon_phase.illumination,
                "emoji": moon_phase.emoji
            }
        }
        
        # 3. Planetary Data (Retrogrades)
        retrogrades = planetary_engine.get_all_retrogrades(dt, detailed=True)
        response["planetary"]["retrogrades"] = retrogrades
        
        # 4. Advisories (The interpretive layer)
        if mansion.get("is_gandanta", False):
            response["advisories"].append({
                "type": "WARNING",
                "category": "lunar",
                "message": "Moon is in Gandanta (karmic knot). Avoid starting major material projects. Favorable for spiritual work."
            })
            
        if len(retrogrades) > 3:
             response["advisories"].append({
                "type": "INFO",
                "category": "planetary",
                "message": f"{len(retrogrades)} planets are currently retrograde. Expect delays and focus on reviewing past work."
            })

        return response

daily_briefing_service = DailyBriefingService()
