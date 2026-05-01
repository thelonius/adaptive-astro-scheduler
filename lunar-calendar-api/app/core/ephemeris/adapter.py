"""
Skyfield Ephemeris Adapter

Wraps Skyfield library to implement the IEphemerisCalculator interface.
Provides high-precision astronomical calculations using JPL ephemeris data.
"""

import pytz
import numpy as np
import json
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Tuple
from skyfield.api import load, Topos, wgs84
from skyfield.almanac import find_discrete, moon_phases
from skyfield.timelib import Time as SkyfieldTime

from .interface import IEphemerisCalculator
from app.calculators.ephemeris_core import ephemeris_core
from .types import (
    DateTime,
    Location,
    PlanetPositions,
    CelestialBody,
    PlanetName,
    ZodiacSign,
    MoonPhase,
    MoonPhaseName,
    LunarDay,
    LunarDayEnergy,
    LunarDayCharacteristics,
    VoidOfCourseMoon,
    Aspect,
    AspectType,
    House,
    HouseSystem,
    PlanetaryHour,
    EphemerisError,
    EphemerisErrorCode,
    ASPECT_ANGLES,
    DEFAULT_ORBS,
    angle_difference,
    is_within_orb,
)


class SkyfieldEphemerisAdapter(IEphemerisCalculator):
    """
    Ephemeris calculator implementation using Skyfield library.

    Uses JPL DE421 ephemeris for high-precision calculations.
    Accuracy: ±0.01° for planets, ±0.1° for Moon.
    Coverage: 1900 CE - 2150 CE (DE421 range)
    """

    # Reference new moon for lunar day calculations
    REFERENCE_NEW_MOON = datetime(2000, 1, 6, 18, 14, 0)
    LUNAR_MONTH = 29.53058867  # Synodic month in days

    # Standard lunar day symbols and energy
    LUNAR_DAY_METADATA = {
        1: ("Lamp", LunarDayEnergy.LIGHT),
        2: ("Horn of Plenty", LunarDayEnergy.LIGHT),
        3: ("Leopard", LunarDayEnergy.LIGHT),
        4: ("Tree of Knowledge", LunarDayEnergy.LIGHT),
        5: ("Unicorn", LunarDayEnergy.LIGHT),
        6: ("Crane", LunarDayEnergy.LIGHT),
        7: ("Rooster", LunarDayEnergy.LIGHT),
        8: ("Phoenix", LunarDayEnergy.LIGHT),
        9: ("Bat", LunarDayEnergy.DARK),
        10: ("Fountain", LunarDayEnergy.LIGHT),
        11: ("Fiery Sword", LunarDayEnergy.LIGHT),
        12: ("Chalice", LunarDayEnergy.LIGHT),
        13: ("Wheel", LunarDayEnergy.LIGHT),
        14: ("Trumpet", LunarDayEnergy.LIGHT),
        15: ("Serpent", LunarDayEnergy.DARK),
        16: ("Dove", LunarDayEnergy.LIGHT),
        17: ("Grape Bunch", LunarDayEnergy.LIGHT),
        18: ("Mirror", LunarDayEnergy.NEUTRAL),
        19: ("Spider", LunarDayEnergy.DARK),
        20: ("Eagle", LunarDayEnergy.LIGHT),
        21: ("Horse", LunarDayEnergy.LIGHT),
        22: ("Elephant", LunarDayEnergy.LIGHT),
        23: ("Crocodile", LunarDayEnergy.DARK),
        24: ("Bear", LunarDayEnergy.LIGHT),
        25: ("Turtle", LunarDayEnergy.LIGHT),
        26: ("Toad", LunarDayEnergy.DARK),
        27: ("Trident", LunarDayEnergy.LIGHT),
        28: ("Lotus", LunarDayEnergy.LIGHT),
        29: ("Octopus", LunarDayEnergy.DARK),
        30: ("Golden Swan", LunarDayEnergy.LIGHT),
    }

    def __init__(self, ephemeris_path: str = 'de421.bsp'):
        """
        Initialize the Skyfield ephemeris adapter.

        Args:
            ephemeris_path: Path to JPL ephemeris file (default: de421.bsp)
        """
        try:
            import os

            # Set Skyfield data directory to use dedicated location
            data_dir = os.environ.get('EPHEMERIS_DATA_DIR', '/app/data')
            if os.path.exists(data_dir):
                load.directory = data_dir

            self.ts = load.timescale()
            self.eph = load(ephemeris_path)
            self.earth = self.eph['earth']
            self.sun = self.eph['sun']
            self.moon = self.eph['moon']

            # Load lunar days data
            self.lunar_days_data = {}
            lunar_json_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'lunar_days.json')
            if os.path.exists(lunar_json_path):
                with open(lunar_json_path, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    for ld in content.get('lunar_days', []):
                        self.lunar_days_data[ld['lunar_day']] = ld
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.DATA_UNAVAILABLE,
                message=f"Failed to load ephemeris data: {str(e)}",
                details={"ephemeris_path": ephemeris_path}
            )

    def _to_skyfield_time(self, dt: datetime) -> SkyfieldTime:
        """Convert datetime to Skyfield Time object."""
        try:
            # Ensure datetime is in UTC
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=pytz.UTC)
            elif dt.tzinfo != pytz.UTC:
                dt = dt.astimezone(pytz.UTC)

            return self.ts.from_datetime(dt)
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.INVALID_DATE,
                message=f"Invalid date format: {str(e)}",
                details={"datetime": str(dt)}
            )

    def _create_observer(self, location: Location) -> object:
        """Create Skyfield observer from location."""
        try:
            return self.earth + Topos(
                latitude_degrees=location.latitude,
                longitude_degrees=location.longitude,
                elevation_m=location.elevation
            )
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to create observer: {str(e)}",
                details={"location": str(location)}
            )

    async def get_planets_positions(self, date_time: DateTime) -> PlanetPositions:
        """
        Get positions of all major planets.

        Args:
            date_time: Date, time, and location

        Returns:
            PlanetPositions object with all planet data
        """
        try:
            t = self._to_skyfield_time(date_time.date)
            observer = self._create_observer(date_time.location)

            # Calculate positions for all planets
            planets_data = {}
            planet_names_map = {
                PlanetName.SUN: 'sun',
                PlanetName.MOON: 'moon',
                PlanetName.MERCURY: 'mercury barycenter',
                PlanetName.VENUS: 'venus barycenter',
                PlanetName.MARS: 'mars barycenter',
                PlanetName.JUPITER: 'jupiter barycenter',
                PlanetName.SATURN: 'saturn barycenter',
                PlanetName.URANUS: 'uranus barycenter',
                PlanetName.NEPTUNE: 'neptune barycenter',
                PlanetName.PLUTO: 'pluto barycenter',
            }

            for planet_name, skyfield_name in planet_names_map.items():
                body = self._calculate_planet_position(
                    planet_name=planet_name,
                    skyfield_name=skyfield_name,
                    observer=observer,
                    time=t
                )
                planets_data[planet_name.value.lower()] = body

            return PlanetPositions(
                sun=planets_data['sun'],
                moon=planets_data['moon'],
                mercury=planets_data['mercury'],
                venus=planets_data['venus'],
                mars=planets_data['mars'],
                jupiter=planets_data['jupiter'],
                saturn=planets_data['saturn'],
                uranus=planets_data['uranus'],
                neptune=planets_data['neptune'],
                pluto=planets_data['pluto'],
            )

        except EphemerisError:
            raise
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate planet positions: {str(e)}",
                details={"date_time": str(date_time)}
            )

    def _calculate_planet_position(
        self,
        planet_name: PlanetName,
        skyfield_name: str,
        observer: object,
        time: SkyfieldTime
    ) -> CelestialBody:
        """Calculate position for a single planet."""
        try:
            # Use unifying ephemeris core for precision (SwissEph support)
            # This handles light-time, aberration and moves from J2000 to Date Equinox (Tropical)
            dt = time.utc_datetime()
            pos = ephemeris_core.get_planet_position(planet_name.value, dt)
            
            # SwissEph format: (longitude, latitude, distance, speed_long, speed_lat, speed_dist)
            longitude = pos[0]
            latitude = pos[1]
            distance_au = pos[2]
            speed = pos[3]
            
            is_retrograde = speed < 0

            # Get zodiac sign
            zodiac_sign = ZodiacSign.from_longitude(longitude)

            return CelestialBody(
                name=planet_name,
                longitude=longitude,
                latitude=latitude,
                zodiac_sign=zodiac_sign,
                speed=speed,
                is_retrograde=is_retrograde,
                distance_au=distance_au
            )

        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate position for {planet_name.value}: {str(e)}",
                details={"planet": planet_name.value}
            )


    async def get_moon_phase(self, date_time: DateTime) -> MoonPhase:
        """
        Calculate current moon phase.

        Args:
            date_time: Date and time

        Returns:
            MoonPhase object with illumination and phase information
        """
        try:
            t = self._to_skyfield_time(date_time.date)
            observer = self._create_observer(date_time.location)

            # Calculate Moon and Sun positions
            moon_pos = observer.at(t).observe(self.moon).apparent()
            sun_pos = observer.at(t).observe(self.sun).apparent()

            # Calculate elongation (angular separation)
            elongation = sun_pos.separation_from(moon_pos)
            elongation_degrees = elongation.degrees

            # Calculate illumination (0 to 1)
            # At new moon (0° elongation): illumination = 0
            # At full moon (180° elongation): illumination = 1
            illumination = (1 - np.cos(np.radians(elongation_degrees))) / 2

            # Determine if waxing or waning
            # Ensure we maintain timezone when adding timedelta
            dt_utc = date_time.date if date_time.date.tzinfo else date_time.date.replace(tzinfo=pytz.UTC)
            next_dt = dt_utc + timedelta(hours=6)
            next_time = self.ts.from_datetime(next_dt)
            next_moon = observer.at(next_time).observe(self.moon).apparent()
            next_sun = observer.at(next_time).observe(self.sun).apparent()
            next_elongation = next_sun.separation_from(next_moon).degrees
            next_illumination = (1 - np.cos(np.radians(next_elongation))) / 2

            is_waxing = next_illumination > illumination

            # Determine phase name and emoji
            phase_name, emoji, phase_type = self._get_phase_info(
                illumination * 100, is_waxing
            )

            return MoonPhase(
                name=phase_name,
                illumination=illumination,
                phase_type=phase_type,
                is_waxing=is_waxing,
                emoji=emoji,
                angle=elongation_degrees
            )

        except EphemerisError:
            raise
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate moon phase: {str(e)}",
                details={"date_time": str(date_time)}
            )

    def _get_phase_info(
        self,
        illumination_percent: float,
        is_waxing: bool
    ) -> Tuple[str, str, MoonPhaseName]:
        """Determine phase name, emoji, and type from illumination."""
        if illumination_percent < 1:
            return "New Moon", "🌑", MoonPhaseName.NEW
        elif illumination_percent < 45:
            if is_waxing:
                return "Waxing Crescent", "🌒", MoonPhaseName.WAXING
            else:
                return "Waning Crescent", "🌘", MoonPhaseName.WANING
        elif illumination_percent < 55:
            if is_waxing:
                return "First Quarter", "🌓", MoonPhaseName.WAXING
            else:
                return "Last Quarter", "🌗", MoonPhaseName.WANING
        elif illumination_percent < 99:
            if is_waxing:
                return "Waxing Gibbous", "🌔", MoonPhaseName.WAXING
            else:
                return "Waning Gibbous", "🌖", MoonPhaseName.WANING
        else:
            return "Full Moon", "🌕", MoonPhaseName.FULL

    async def get_lunar_day(self, date_time: DateTime) -> LunarDay:
        """
        Calculate lunar day (1-30) for given date/time.

        Args:
            date_time: Date and time

        Returns:
            LunarDay object with number and metadata
        """
        try:
            # Find new moons around the target date (always work in UTC)
            target = date_time.date
            if target.tzinfo is None:
                target = target.replace(tzinfo=pytz.UTC)
            elif target.tzinfo != pytz.UTC:
                target = target.astimezone(pytz.UTC)

            # Convert to naive for Skyfield compatibility
            target_naive = target.replace(tzinfo=None)
            new_moons = self._find_new_moons_around(target_naive)

            if not new_moons:
                # Fallback calculation
                return await self._calculate_lunar_day_fallback(date_time)

            # Find the new moon that starts the current cycle
            target_midday = target_naive.replace(hour=12, minute=0, second=0, microsecond=0)
            reference_new_moon = None

            for nm in new_moons:
                nm_dt = nm.utc_datetime().replace(tzinfo=None)
                if nm_dt <= target_midday:
                    reference_new_moon = nm_dt
                else:
                    break

            if reference_new_moon is None:
                reference_new_moon = new_moons[0].utc_datetime().replace(tzinfo=None)

            # Calculate lunar day number based on elapsed time
            elapsed = (target_midday - reference_new_moon).total_seconds() / 86400
            lunar_day_num = int(elapsed) + 1

            # Clamp to valid range
            lunar_day_num = max(1, min(30, lunar_day_num))

            # Calculate start and end times (return as UTC-aware)
            starts_at_naive = reference_new_moon + timedelta(days=lunar_day_num - 1)
            ends_at_naive = reference_new_moon + timedelta(days=lunar_day_num)
            starts_at = starts_at_naive.replace(tzinfo=pytz.UTC)
            ends_at = ends_at_naive.replace(tzinfo=pytz.UTC)
            duration_hours = 24.0  # Approximate

            # Determine energy and phase
            moon_phase = await self.get_moon_phase(date_time)

            # Get metadata
            symbol, energy = self.LUNAR_DAY_METADATA.get(lunar_day_num, (None, None))
            
            # Get characteristics from JSON
            characteristics = None
            ld_data = self.lunar_days_data.get(lunar_day_num)
            if ld_data:
                characteristics = LunarDayCharacteristics(
                    number=lunar_day_num,
                    symbol=symbol or "",
                    energy=energy or LunarDayEnergy.NEUTRAL,
                    base_colors=ld_data.get('base_colors', []),
                    affected_organs=ld_data.get('affected_organs', []),
                    affected_body_parts=ld_data.get('affected_body_parts', []),
                    health_tips=ld_data.get('health_tips', []),
                    recommended=ld_data.get('recommended', []),
                    not_recommended=ld_data.get('not_recommended', []),
                    dominant_planet=ld_data.get('dominant_planet', ""),
                    additional_influences=ld_data.get('additional_influences', []),
                    planetary_description=ld_data.get('planetary_description', ""),
                    general_description=ld_data.get('general_description', "")
                )

            return LunarDay(
                number=lunar_day_num,
                lunar_phase=moon_phase.phase_type,
                starts_at=starts_at,
                ends_at=ends_at,
                duration_hours=duration_hours,
                symbol=symbol,
                energy=energy,
                characteristics=characteristics
            )

        except EphemerisError:
            raise
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate lunar day: {str(e)}",
                details={"date_time": str(date_time)}
            )

    def _find_new_moons_around(self, target_date: datetime) -> List[SkyfieldTime]:
        """Find new moons within ±60 days of target date."""
        try:
            start_date = target_date - timedelta(days=60)
            end_date = target_date + timedelta(days=60)

            t0 = self.ts.utc(start_date.year, start_date.month, start_date.day)
            t1 = self.ts.utc(end_date.year, end_date.month, end_date.day)

            times, phases = find_discrete(t0, t1, moon_phases(self.eph))

            # Filter for new moons (phase = 0)
            new_moons = [times[i] for i, phase in enumerate(phases) if phase == 0]
            return new_moons
        except Exception:
            return []

    async def _calculate_lunar_day_fallback(self, date_time: DateTime) -> LunarDay:
        """Fallback calculation when new moon data is unavailable."""
        target = date_time.date
        days_since_ref = (target - self.REFERENCE_NEW_MOON).total_seconds() / 86400
        cycles = days_since_ref / self.LUNAR_MONTH
        lunar_day_num = int((cycles % 1) * 30) + 1
        lunar_day_num = max(1, min(30, lunar_day_num))

        moon_phase = await self.get_moon_phase(date_time)

        return LunarDay(
            number=lunar_day_num,
            lunar_phase=moon_phase.phase_type,
            starts_at=target,
            ends_at=target + timedelta(days=1),
            duration_hours=24.0
        )


    async def get_void_of_course_moon(
        self,
        date_time: DateTime
    ) -> Optional[VoidOfCourseMoon]:
        """
        Detect Void of Course Moon periods.
        """
        try:
            # 1. Get current Moon position and sign
            moon_pos = ephemeris_core.get_planet_position("Moon", date_time.date)
            moon_lon = moon_pos[0]
            current_sign_idx = int(moon_lon / 30)
            ingress_lon = (current_sign_idx + 1) * 30
            
            # 2. Find when Moon leaves current sign (Ingress)
            # Rough estimate: Moon moves ~0.5 degree per hour
            # We use a simple Newton-like search for precision
            ingress_time = await self._find_ingress_time(date_time.date, ingress_lon)
            
            # 3. Find all major aspects between date_time and ingress_time
            # Standard VoC uses Moon aspects with: Sun, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
            planets = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]
            
            # Use a very early time as baseline
            last_aspect_time = datetime(1900, 1, 1, tzinfo=pytz.UTC)
            last_planet = None
            
            major_aspect_angles: List[float] = [0.0, 60.0, 90.0, 120.0, 180.0]
            
            for planet_name in planets:
                # Find the last aspect of this planet with the Moon before ingress
                aspect_time, aspect_angle = await self._find_last_moon_aspect(
                    date_time.date, ingress_time, planet_name, major_aspect_angles
                )
                
                if aspect_time and aspect_time > last_aspect_time:
                    last_aspect_time = aspect_time
                    last_planet = PlanetName(planet_name)
            
            # 4. Determine if we are currently in VoC
            # VoC starts at last_aspect_time and ends at ingress_time
            if last_planet and last_aspect_time <= date_time.date < ingress_time:
                duration = (ingress_time - last_aspect_time).total_seconds() / 3600.0
                
                return VoidOfCourseMoon(
                    start_time=last_aspect_time,
                    end_time=ingress_time,
                    sign=ZodiacSign.from_longitude(moon_lon),
                    duration_hours=duration,
                    last_aspect_planet=last_planet,
                    next_sign=ZodiacSign.from_longitude(ingress_lon % 360)
                )
            
            return None
            
        except Exception as e:
            # Log error but don't fail the whole request
            return None

    async def _find_ingress_time(self, start_dt: datetime, target_lon: float) -> datetime:
        """Find the exact time (UTC) when Moon reaches target_lon."""
        curr_dt = start_dt
        for _ in range(5):  # 5 iterations of Newton's method is enough for < 1s precision
            pos = ephemeris_core.get_planet_position("Moon", curr_dt)
            curr_lon = pos[0]
            speed = pos[3] / 24.0  # degrees per hour
            
            diff = (target_lon - curr_lon)
            if diff < -180: diff += 360
            if diff > 180: diff -= 360
            
            dt_diff = diff / speed
            curr_dt += timedelta(hours=dt_diff)
            
        return curr_dt

    async def _find_last_moon_aspect(self, start_dt: datetime, end_dt: datetime, planet_name: str, angles: List[float]) -> Tuple[Optional[datetime], Optional[float]]:
        """Find the time of the last aspect between Moon and planet before end_dt."""
        # This is a bit complex for a single step. 
        # We'll check the end state and work backwards slightly or use a root finder.
        # Simplified for now: Check every 2 hours between start and end and find transitions.
        
        last_found_time = datetime(1900, 1, 1, tzinfo=pytz.UTC)
        last_found_angle = None
        
        # Step through the period to find when an aspect occurs
        # Moon speed is ~13-15 deg/day, Planet speed is < 2 deg/day.
        # Max relative speed is ~15 deg/day. 
        # Checking every 2 hours (1.2 deg) won't miss any aspects (orbs don't matter, we want exact).
        
        curr_dt = start_dt
        step = timedelta(hours=2)
        
        prev_diff = self._get_moon_planet_diff(start_dt, planet_name)
        
        while curr_dt < end_dt:
            next_dt = min(curr_dt + step, end_dt)
            next_diff = self._get_moon_planet_diff(next_dt, planet_name)
            
            # Check if any major angle was crossed
            for angle in angles:
                # Normalizing diffs around the target angle
                d1 = (prev_diff - angle + 180) % 360 - 180
                d2 = (next_diff - angle + 180) % 360 - 180
                
                if d1 * d2 < 0: # Sign change means we crossed the exact angle
                    # Refine the time
                    exact_time = curr_dt + (next_dt - curr_dt) * (abs(d1) / (abs(d1) + abs(d2)))
                    if exact_time > last_found_time:
                        last_found_time = exact_time
                        last_found_angle = angle
            
            curr_dt = next_dt
            prev_diff = next_diff
            
        if last_found_time.year == 1900:
            return None, None
            
        return last_found_time, last_found_angle

    def _get_moon_planet_diff(self, dt: datetime, planet_name: str) -> float:
        m_pos = ephemeris_core.get_planet_position("Moon", dt)
        p_pos = ephemeris_core.get_planet_position(planet_name, dt)
        return (m_pos[0] - p_pos[0]) % 360

    async def get_retrograde_planets(
        self,
        date_time: DateTime
    ) -> List[CelestialBody]:
        """
        Get list of planets currently in retrograde motion.

        Args:
            date_time: Date and time

        Returns:
            List of retrograde planets
        """
        try:
            positions = await self.get_planets_positions(date_time)
            retrogrades = []

            for planet in positions.to_list():
                # Sun and Moon don't go retrograde
                if planet.name not in [PlanetName.SUN, PlanetName.MOON]:
                    if planet.is_retrograde:
                        retrogrades.append(planet)

            return retrogrades

        except EphemerisError:
            raise
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to find retrograde planets: {str(e)}",
                details={"date_time": str(date_time)}
            )

    async def calculate_aspects(
        self,
        bodies: List[CelestialBody],
        orb: Optional[float] = None
    ) -> List[Aspect]:
        """
        Calculate aspects between celestial bodies.

        Args:
            bodies: List of celestial bodies
            orb: Custom orb (overrides defaults)

        Returns:
            List of aspects found
        """
        try:
            aspects = []

            # Check all pairs of bodies
            for i, body1 in enumerate(bodies):
                for body2 in bodies[i + 1:]:
                    # Calculate angular separation
                    separation = angle_difference(body1.longitude, body2.longitude)

                    # Check each aspect type
                    for aspect_type, aspect_angle in ASPECT_ANGLES.items():
                        default_orb = DEFAULT_ORBS[aspect_type]
                        use_orb = orb if orb is not None else default_orb

                        if is_within_orb(separation, aspect_angle, use_orb):
                            actual_orb = abs(separation - aspect_angle)

                            # Applying ⇔ orb shrinks over time. Extrapolate
                            # both bodies one hour forward using their daily
                            # speed and compare future orb to current orb.
                            # Speeds are in deg/day; 1h = 1/24 day.
                            hour_in_days = 1.0 / 24.0
                            fut_lon1 = (body1.longitude + body1.speed * hour_in_days) % 360
                            fut_lon2 = (body2.longitude + body2.speed * hour_in_days) % 360
                            fut_separation = angle_difference(fut_lon1, fut_lon2)
                            fut_orb = abs(fut_separation - aspect_angle)
                            is_applying = fut_orb < actual_orb

                            aspect = Aspect(
                                body1=body1,
                                body2=body2,
                                aspect_type=aspect_type,
                                angle=separation,
                                orb=actual_orb,
                                is_exact=actual_orb < 1.0,
                                is_applying=is_applying
                            )
                            aspects.append(aspect)
                            break  # Only one aspect per pair

            return aspects

        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate aspects: {str(e)}",
                details={"num_bodies": len(bodies)}
            )


    async def calculate_houses(
        self,
        date_time: DateTime,
        system: HouseSystem = HouseSystem.PLACIDUS
    ) -> Dict[int, House]:
        """
        Calculate house cusps.
        """
        try:
            # Get planets for house placement
            positions = await self.get_planets_positions(date_time)

            # Use PySwisseph house_engine for actual calculations
            try:
                from app.calculators.house_engine import house_engine
                
                # dt needs to be in UTC
                dt = date_time.date
                if dt.tzinfo is None:
                    dt = pytz.UTC.localize(dt)
                    
                # Calculate houses
                engine_result = house_engine.calculate_houses(
                    dt=dt,
                    lat=date_time.location.latitude,
                    lon=date_time.location.longitude,
                    system=system.value
                )
                
                # Get cusps array (offset by 1, index 0 is ASC)
                cusps = engine_result.get("cusps", [0.0]*13)
                asc_longitude = cusps[0] % 360
                
                houses = {}
                for house_num in range(1, 13):
                    cusp_longitude = cusps[house_num - 1] % 360
                    cusp_sign = ZodiacSign.from_longitude(cusp_longitude)
                    
                    next_cusp = cusps[house_num % 12] % 360
                    planets_in_house = []

                    for planet in positions.to_list():
                        if cusp_longitude <= next_cusp:
                            in_house = cusp_longitude <= planet.longitude < next_cusp
                        else:
                            in_house = planet.longitude >= cusp_longitude or planet.longitude < next_cusp
                            
                        if in_house:
                            planets_in_house.append(planet)

                    # Estimate size
                    if next_cusp >= cusp_longitude:
                        size_deg = next_cusp - cusp_longitude
                    else:
                        size_deg = 360.0 - cusp_longitude + next_cusp
                        
                    houses[house_num] = House(
                        number=house_num,
                        cusp_longitude=cusp_longitude,
                        cusp_sign=cusp_sign,
                        size_degrees=size_deg,
                        planets=planets_in_house
                    )
                return houses
            except Exception as e:
                 import traceback
                 print("Failed to use house engine:", e)
                 traceback.print_exc()
                 # Fallback
                 asc_longitude = 0.0

                 houses = {}
                 for house_num in range(1, 13):
                     cusp_longitude = (asc_longitude + (house_num - 1) * 30) % 360
                     cusp_sign = ZodiacSign.from_longitude(cusp_longitude)

                     # Find planets in this house
                     next_cusp = (cusp_longitude + 30) % 360
                     planets_in_house = []

                     for planet in positions.to_list():
                         if cusp_longitude <= planet.longitude < next_cusp:
                             planets_in_house.append(planet)

                     houses[house_num] = House(
                         number=house_num,
                         cusp_longitude=cusp_longitude,
                         cusp_sign=cusp_sign,
                         size_degrees=30.0,
                         planets=planets_in_house
                     )

                 return houses

        except EphemerisError:
            raise
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate houses: {str(e)}",
                details={"system": system.value}
            )

    async def get_planetary_hours(
        self,
        date_time: DateTime
    ) -> List[PlanetaryHour]:
        """
        Calculate planetary hours for the day.
        """
        try:
            from app.calculators.solar_engine import solar_engine
            
            # 1. Get sunrise/sunset for the day
            dt = date_time.date
            solar_times = solar_engine.get_solar_times(
                dt, 
                date_time.location.latitude, 
                date_time.location.longitude
            )
            
            sunrise = solar_times.get("sunrise")
            sunset = solar_times.get("sunset")
            
            if not sunrise or not sunset:
                # Fallback if no sunrise/sunset (polar regions)
                return []
                
            # 2. Get next day's sunrise for the second 12-hour block (night)
            next_day_solar = solar_engine.get_solar_times(
                dt + timedelta(days=1),
                date_time.location.latitude,
                date_time.location.longitude
            )
            next_sunrise = next_day_solar.get("sunrise")
            
            if not next_sunrise:
                return []
            
            # 3. Calculate hour lengths
            day_length = (sunset - sunrise).total_seconds() / 12.0
            night_length = (next_sunrise - sunset).total_seconds() / 12.0
            
            # 4. Chaldean order and day rulers
            chaldean_order = [
                PlanetName.SATURN, PlanetName.JUPITER, PlanetName.MARS,
                PlanetName.SUN, PlanetName.VENUS, PlanetName.MERCURY, PlanetName.MOON
            ]
            
            day_rulers = {
                0: PlanetName.MOON,     # Monday
                1: PlanetName.MARS,     # Tuesday
                2: PlanetName.MERCURY,  # Wednesday
                3: PlanetName.JUPITER,  # Thursday
                4: PlanetName.VENUS,    # Friday
                5: PlanetName.SATURN,   # Saturday
                6: PlanetName.SUN       # Sunday
            }
            
            # Get ruler for the day (using local date of the sunrise)
            # Skyfield returns UTC, we should ideally use local time at location, 
            # but let's use the date of the date_time provided.
            day_of_week = dt.weekday()
            ruler = day_rulers[day_of_week]
            
            # Start position in Chaldean order
            current_ruler_idx = chaldean_order.index(ruler)
            
            planetary_hours = []
            
            # Daytime hours
            for i in range(12):
                start = sunrise + timedelta(seconds=i * day_length)
                end = sunrise + timedelta(seconds=(i + 1) * day_length)
                
                planet = chaldean_order[current_ruler_idx]
                
                planetary_hours.append(PlanetaryHour(
                    planet=planet,
                    start_time=start,
                    end_time=end,
                    is_day_hour=True,
                    hour_number=i + 1
                ))
                
                # Advance to next ruler in the sequence
                current_ruler_idx = (current_ruler_idx + 1) % 7
                
            # Nighttime hours
            for i in range(12):
                start = sunset + timedelta(seconds=i * night_length)
                end = sunset + timedelta(seconds=(i + 1) * night_length)
                
                planet = chaldean_order[current_ruler_idx]
                
                planetary_hours.append(PlanetaryHour(
                    planet=planet,
                    start_time=start,
                    end_time=end,
                    is_day_hour=False,
                    hour_number=i + 1
                ))
                
                current_ruler_idx = (current_ruler_idx + 1) % 7
                
            return planetary_hours
            
        except Exception as e:
            raise EphemerisError(
                code=EphemerisErrorCode.CALCULATION_FAILED,
                message=f"Failed to calculate planetary hours: {str(e)}"
            )
