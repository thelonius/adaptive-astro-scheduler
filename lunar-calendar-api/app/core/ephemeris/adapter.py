"""
Skyfield Ephemeris Adapter

Wraps Skyfield library to implement the IEphemerisCalculator interface.
Provides high-precision astronomical calculations using JPL ephemeris data.
"""

import pytz
import numpy as np
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Tuple
from skyfield.api import load, Topos, wgs84
from skyfield.almanac import find_discrete, moon_phases
from skyfield.timelib import Time as SkyfieldTime

from .interface import IEphemerisCalculator
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
            # Get the celestial body
            body = self.eph[skyfield_name]

            # Observe from Earth
            astrometric = observer.at(time).observe(body)
            apparent = astrometric.apparent()

            # Get ecliptic coordinates
            ecliptic = apparent.ecliptic_latlon()
            longitude = ecliptic[1].degrees % 360
            latitude = ecliptic[0].degrees

            # Get right ascension and declination
            ra, dec, distance = apparent.radec()
            right_ascension = ra._degrees
            declination = dec.degrees
            distance_au = distance.au

            # Calculate speed (degrees per day)
            # Use a 1-day difference for speed calculation
            next_time = self.ts.from_datetime(
                time.utc_datetime() + timedelta(days=1)
            )
            next_astrometric = observer.at(next_time).observe(body)
            next_apparent = next_astrometric.apparent()
            next_ecliptic = next_apparent.ecliptic_latlon()
            next_longitude = next_ecliptic[1].degrees % 360

            # Handle 360° wraparound
            speed = next_longitude - longitude
            if speed > 180:
                speed -= 360
            elif speed < -180:
                speed += 360

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
                distance_au=distance_au,
                right_ascension=right_ascension,
                declination=declination
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

            # Get characteristics (simplified for now)
            characteristics = self._get_lunar_day_characteristics(lunar_day_num)

            # Determine energy and phase
            energy = self._get_lunar_day_energy(lunar_day_num)
            moon_phase = await self.get_moon_phase(date_time)

            return LunarDay(
                number=lunar_day_num,
                symbol=self._get_lunar_day_symbol(lunar_day_num),
                energy=energy,
                lunar_phase=moon_phase.phase_type,
                characteristics=characteristics,
                starts_at=starts_at,
                ends_at=ends_at,
                duration_hours=duration_hours
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

        characteristics = self._get_lunar_day_characteristics(lunar_day_num)
        energy = self._get_lunar_day_energy(lunar_day_num)
        moon_phase = await self.get_moon_phase(date_time)

        return LunarDay(
            number=lunar_day_num,
            symbol=self._get_lunar_day_symbol(lunar_day_num),
            energy=energy,
            lunar_phase=moon_phase.phase_type,
            characteristics=characteristics,
            starts_at=target,
            ends_at=target + timedelta(days=1),
            duration_hours=24.0
        )

    def _get_lunar_day_symbol(self, day: int) -> str:
        """Get symbol for lunar day."""
        symbols = {
            1: "Fountain", 2: "Horn of Plenty", 3: "Leopard",
            4: "Tree of Knowledge", 5: "Unicorn", 6: "Sacred Bird",
            7: "Wind Rose", 8: "Fire Phoenix", 9: "Bat",
            10: "Fountain of Life", 11: "Flaming Sword", 12: "Chalice",
            13: "Spinning Wheel", 14: "Trumpet", 15: "Snake",
            16: "Dove", 17: "Bunch of Grapes", 18: "Mirror",
            19: "Spider", 20: "Eagle", 21: "Horse",
            22: "Elephant", 23: "Crocodile", 24: "Bear",
            25: "Turtle", 26: "Toad", 27: "Trident",
            28: "Lotus", 29: "Octopus", 30: "Golden Swan"
        }
        return symbols.get(day, f"Day {day}")

    def _get_lunar_day_energy(self, day: int) -> LunarDayEnergy:
        """Determine energy type for lunar day."""
        # Days 1-15 are generally waxing (light)
        # Days 16-30 are generally waning (some dark energy)
        if day <= 7:
            return LunarDayEnergy.LIGHT
        elif day <= 15:
            return LunarDayEnergy.LIGHT
        elif day <= 23:
            return LunarDayEnergy.NEUTRAL
        else:
            return LunarDayEnergy.DARK

    def _get_lunar_day_characteristics(self, day: int) -> LunarDayCharacteristics:
        """Get characteristics for lunar day (simplified)."""
        # This is a simplified version - full implementation would use
        # comprehensive lunar day database
        return LunarDayCharacteristics(
            spiritual=f"Meditation and reflection suitable for day {day}",
            practical=f"General activities suitable for day {day}",
            avoided=["Important life decisions"] if day in [9, 19, 29] else []
        )

    async def get_void_of_course_moon(
        self,
        date_time: DateTime
    ) -> Optional[VoidOfCourseMoon]:
        """
        Detect Void of Course Moon periods.

        The Moon is Void of Course from its last major aspect until
        it enters the next sign.

        Args:
            date_time: Date and time to check

        Returns:
            VoidOfCourseMoon if active, None otherwise
        """
        # This is a complex calculation that requires:
        # 1. Finding when Moon makes its last aspect in current sign
        # 2. Finding when Moon enters next sign
        # 3. Checking if current time falls in that window

        # Simplified implementation - full version would track all aspects
        return None  # TODO: Implement full VoC Moon detection

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

                            # Determine if applying or separating
                            # (requires speed calculation - simplified here)
                            is_applying = body2.speed > body1.speed

                            aspect = Aspect(
                                body1=body1,
                                body2=body2,
                                aspect_type=aspect_type,
                                angle=separation,
                                orb=actual_orb,
                                is_exact=actual_orb < 1.0,
                                is_applying=is_applying,
                                interpretation=self._get_aspect_interpretation(
                                    body1, body2, aspect_type
                                )
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

    def _get_aspect_interpretation(
        self,
        body1: CelestialBody,
        body2: CelestialBody,
        aspect_type: AspectType
    ) -> str:
        """Generate human-readable aspect interpretation."""
        quality = {
            AspectType.CONJUNCTION: "merges with",
            AspectType.SEXTILE: "harmonizes with",
            AspectType.SQUARE: "challenges",
            AspectType.TRINE: "flows with",
            AspectType.OPPOSITION: "opposes",
            AspectType.QUINCUNX: "adjusts to",
        }.get(aspect_type, "aspects")

        return f"{body1.name.value} {quality} {body2.name.value}"

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

        Planetary hours divide day and night into 12 hours each,
        ruled by planets in Chaldean order.

        Args:
            date_time: Date and location

        Returns:
            List of 24 planetary hours
        """
        # This requires sunrise/sunset calculation
        # Simplified implementation
        return []  # TODO: Implement planetary hours calculation
