from datetime import datetime, timedelta
import pytz
from skyfield.api import Topos
from skyfield import almanac

from app.calculators.ephemeris_core import ephemeris_core

class SolarEngine:
    """
    Handles Topocentric (Earth-observer) solar phenomena.
    Calculates Sunrises, Sunsets, Twilights, and Golden Hours using Skyfield.
    """
    
    def __init__(self):
        self.core = ephemeris_core
        
    def get_solar_times(self, dt: datetime, lat: float, lon: float, elevation_m: float = 0) -> dict:
        """
        Calculates all significant solar events for a given day and location.
        Returns times in UTC.
        """
        # Define observer
        observer = Topos(latitude_degrees=lat, longitude_degrees=lon, elevation_m=elevation_m)
        
        # We need a 24h window starting from local midnight.
        # Since dt can be timezone-aware or naive, let's normalize to UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
            
        # Define search window (00:00 to 24:00 UTC of that day)
        start_time = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(days=1)
        
        t0 = self.core.get_skyfield_time(start_time)
        t1 = self.core.get_skyfield_time(end_time)
        
        # 1. Sunrise and Sunset (center of sun reaches horizon)
        f_sun = almanac.sunrise_sunset(self.core.eph, observer)
        t_sun, y_sun = almanac.find_discrete(t0, t1, f_sun)
        
        # 2. Twilights (Civil -6, Nautical -12, Astronomical -18 degrees)
        f_twilight = almanac.dark_twilight_day(self.core.eph, observer)
        t_twilight, y_twilight = almanac.find_discrete(t0, t1, f_twilight)
        
        result = {
            "sunrise": None,
            "sunset": None,
            "civil_dawn": None,
            "civil_dusk": None,
            "nautical_dawn": None,
            "nautical_dusk": None,
            "astronomical_dawn": None,
            "astronomical_dusk": None,
        }
        
        # Parse Sunrise / Sunset
        for time, is_sunrise in zip(t_sun, y_sun):
            dt_utc = time.utc_datetime()
            if is_sunrise:
                result["sunrise"] = dt_utc
            else:
                result["sunset"] = dt_utc
                
        # Parse Twilights
        # y_twilight states:
        # 0 = Dark (Night)
        # 1 = Astronomical twilight (-18 to -12)
        # 2 = Nautical twilight (-12 to -6)
        # 3 = Civil twilight (-6 to 0)
        # 4 = Day (Sun above horizon)
        
        last_state = y_twilight[0] if len(y_twilight) > 0 else -1
        
        for time, current_state in zip(t_twilight, y_twilight):
            dt_utc = time.utc_datetime()
            
            # Transition to Day -> Dawn
            if last_state < current_state:
                if current_state == 1:
                    result["astronomical_dawn"] = dt_utc
                elif current_state == 2:
                    result["nautical_dawn"] = dt_utc
                elif current_state == 3:
                    result["civil_dawn"] = dt_utc
            
            # Transition to Night -> Dusk
            elif last_state > current_state:
                if current_state == 3:
                    result["sunset"] = dt_utc # Day turning to civil twilight
                elif current_state == 2:
                    result["civil_dusk"] = dt_utc
                elif current_state == 1:
                    result["nautical_dusk"] = dt_utc
                elif current_state == 0:
                    result["astronomical_dusk"] = dt_utc
                    
            last_state = current_state

        return result
        
solar_engine = SolarEngine()
