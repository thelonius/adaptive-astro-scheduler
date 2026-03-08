import os
from pathlib import Path
from datetime import datetime
import pytz
from typing import Optional, Dict

from app.calculators._swe_import import swe, HAS_SWE

from skyfield.api import load, Topos, Loader

class EphemerisCore:
    """
    Singleton core engine that unifies access to Skyfield (NASA JPL) 
    and PySwisseph (Swiss Ephemeris) calculations.
    """
    
    _instance = None
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(EphemerisCore, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        """Initializes both astronomical libraries."""
        # 1. Initialize Skyfield
        skyfield_data_dir = os.environ.get('SKYFIELD_DATA', '/tmp/skyfield-cache')
        os.makedirs(skyfield_data_dir, mode=0o777, exist_ok=True)
        self.loader = Loader(skyfield_data_dir)
        
        # Link pre-placed DE421 if available to save download time
        self._link_bsp(skyfield_data_dir, 'de421.bsp')
        
        self.eph = self.loader('de421.bsp')
        self.ts = self.loader.timescale()
        
        self.earth = self.eph['earth']
        self.moon = self.eph['moon']
        self.sun = self.eph['sun']
        
        # 2. Initialize Swiss Ephemeris (if available)
        if HAS_SWE:
            swe_data_dir = os.environ.get('SWISSEPH_DATA', '/tmp/swisseph-data')
            os.makedirs(swe_data_dir, exist_ok=True)
            try:
                swe.set_ephe_path(swe_data_dir)
            except Exception:
                pass # Ignore if swe fails to find initial path
            
            # Pre-calculate common lookup tables
            self.planets = {
                'Sun': swe.SUN,
                'Moon': swe.MOON,
                'Mercury': swe.MERCURY,
                'Venus': swe.VENUS,
                'Mars': swe.MARS,
                'Jupiter': swe.JUPITER,
                'Saturn': swe.SATURN,
                'Uranus': swe.URANUS,
                'Neptune': swe.NEPTUNE,
                'Pluto': swe.PLUTO
            }
        else:
            self.planets = {}

    def _link_bsp(self, cache_dir: str, bsp_name: str):
        """Links pre-downloaded JPL ephemeris files if they exist."""
        cached_file = Path(cache_dir) / bsp_name
        pre_placed_file = Path(f'/tmp/{bsp_name}')
        if pre_placed_file.exists() and not cached_file.exists():
            try:
                os.symlink(pre_placed_file, cached_file)
            except (OSError, FileExistsError):
                import shutil
                shutil.copy2(pre_placed_file, cached_file)

    def get_skyfield_time(self, dt: datetime):
        """Converts standard Python datetime to Skyfield Time."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        return self.ts.from_datetime(dt)

    def get_swe_julian_day(self, dt: datetime) -> float:
        """Converts standard Python datetime to SwissEph Julian Day (UT)."""
        if not HAS_SWE:
            return 0.0
            
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=pytz.UTC)
        else:
            dt = dt.astimezone(pytz.UTC)
        
        # SwissEph expects UTC time for swe.julday
        tjd = swe.julday(dt.year, dt.month, dt.day, dt.hour + dt.minute/60.0 + dt.second/3600.0, swe.GREG_CAL)
        return tjd

    # Skyfield body name mapping (for fallback when SwissEph unavailable)
    SKYFIELD_BODIES = {
        'Sun': 'sun',
        'Moon': 'moon',
        'Mercury': 'mercury',
        'Venus': 'venus',
        'Mars': 'mars barycenter',
        'Jupiter': 'jupiter barycenter',
        'Saturn': 'saturn barycenter',
        'Uranus': 'uranus barycenter',
        'Neptune': 'neptune barycenter',
        'Pluto': 'pluto barycenter',
    }

    def get_planet_position(self, planet_name: str, dt: datetime, flags: int = None):
        """
        Gets ecliptic position of a planet.
        Uses SwissEph if available, otherwise falls back to Skyfield.
        Returns: (longitude, latitude, distance, speed_long, speed_lat, speed_dist)
        """
        if HAS_SWE:
            if flags is None:
                flags = swe.FLG_SWIEPH
            if planet_name not in self.planets:
                raise ValueError(f"Unknown planet: {planet_name}")
            tjd = self.get_swe_julian_day(dt)
            planet_id = self.planets[planet_name]
            result, ret_flags = swe.calc_ut(tjd, planet_id, flags)
            return result
        else:
            # Skyfield fallback — compute ecliptic longitude from JPL ephemeris
            return self._skyfield_planet_position(planet_name, dt)
    
    def _skyfield_planet_position(self, planet_name: str, dt: datetime):
        """
        Computes ecliptic longitude/latitude using Skyfield when SwissEph is unavailable.
        Returns tuple matching SwissEph format: (lon, lat, dist, speed_lon, speed_lat, speed_dist)
        """
        from skyfield.api import Topos
        import numpy as np
        
        if planet_name not in self.SKYFIELD_BODIES:
            raise ValueError(f"Unknown planet for Skyfield fallback: {planet_name}")
        
        body_name = self.SKYFIELD_BODIES[planet_name]
        body = self.eph[body_name]
        
        t = self.get_skyfield_time(dt)
        
        # Observe from Earth
        astrometric = self.earth.at(t).observe(body)
        
        # Get ecliptic coordinates
        lat, lon, dist = astrometric.ecliptic_latlon()
        
        lon_deg = lon.degrees  # 0-360
        lat_deg = lat.degrees
        dist_au = dist.au
        
        # Approximate speed by computing position 1 hour later
        from datetime import timedelta
        dt_later = dt + timedelta(hours=1)
        t_later = self.get_skyfield_time(dt_later)
        astrometric_later = self.earth.at(t_later).observe(body)
        lat2, lon2, dist2 = astrometric_later.ecliptic_latlon()
        
        speed_lon = (lon2.degrees - lon_deg) * 24  # degrees per day
        # Handle wraparound at 360/0
        if speed_lon > 180 * 24:
            speed_lon -= 360 * 24
        elif speed_lon < -180 * 24:
            speed_lon += 360 * 24
            
        speed_lat = (lat2.degrees - lat_deg) * 24
        speed_dist = (dist2.au - dist_au) * 24
        
        return (lon_deg, lat_deg, dist_au, speed_lon, speed_lat, speed_dist)

    def is_retrograde(self, planet_name: str, dt: datetime) -> bool:
        """Checks if a planet is in apparent retrograde motion."""
        pos = self.get_planet_position(planet_name, dt)
        speed = pos[3]  # Index 3 is speed in longitude (degrees/day)
        return speed < 0

# Global accessor
ephemeris_core = EphemerisCore()
