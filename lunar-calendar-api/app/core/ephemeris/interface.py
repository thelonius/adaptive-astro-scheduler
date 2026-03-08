"""
Ephemeris Calculator Interface

Defines the contract that all ephemeris calculators must implement.
This allows for different implementations (Skyfield, Swiss Ephemeris, API-based)
while maintaining a consistent interface.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from datetime import datetime

from .types import (
    DateTime,
    PlanetPositions,
    MoonPhase,
    LunarDay,
    VoidOfCourseMoon,
    CelestialBody,
    Aspect,
    House,
    HouseSystem,
    PlanetaryHour,
    PlanetName,
)


class IEphemerisCalculator(ABC):
    """
    Interface for ephemeris calculations.

    All implementations must provide these methods with the specified signatures.
    """

    @abstractmethod
    async def get_planets_positions(self, date_time: DateTime) -> PlanetPositions:
        """
        Get positions of all major planets for a given date/time.

        Args:
            date_time: Date, time, and location

        Returns:
            Object with all planet positions

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def get_moon_phase(self, date_time: DateTime) -> MoonPhase:
        """
        Get current moon phase information.

        Args:
            date_time: Date and time

        Returns:
            Moon phase information including illumination percentage

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def get_lunar_day(self, date_time: DateTime) -> LunarDay:
        """
        Calculate lunar day (1-30) for given date/time.

        Args:
            date_time: Date and time

        Returns:
            Lunar day number and metadata

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def get_void_of_course_moon(
        self,
        date_time: DateTime
    ) -> Optional[VoidOfCourseMoon]:
        """
        Detect Void of Course Moon periods.

        The Moon is Void of Course between its last major aspect in a sign
        and the time it enters the next sign.

        Args:
            date_time: Date and time to check

        Returns:
            VoidOfCourseMoon object if active, None otherwise

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def get_retrograde_planets(
        self,
        date_time: DateTime
    ) -> List[CelestialBody]:
        """
        Get list of retrograde planets.

        Args:
            date_time: Date and time

        Returns:
            Array of planets currently in retrograde

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def calculate_aspects(
        self,
        bodies: List[CelestialBody],
        orb: Optional[float] = None
    ) -> List[Aspect]:
        """
        Calculate aspects between celestial bodies.

        Args:
            bodies: Array of celestial bodies to check
            orb: Orb tolerance in degrees (uses defaults if not specified)

        Returns:
            Array of aspects found

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def calculate_houses(
        self,
        date_time: DateTime,
        system: HouseSystem = HouseSystem.PLACIDUS
    ) -> Dict[int, House]:
        """
        Calculate house cusps for given birth data.

        Args:
            date_time: Birth date, time, and location
            system: House system to use (default: Placidus)

        Returns:
            Dictionary mapping house numbers (1-12) to House objects

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    @abstractmethod
    async def get_planetary_hours(
        self,
        date_time: DateTime
    ) -> List[PlanetaryHour]:
        """
        Get planetary hours for a given date and location.

        Planetary hours divide the day and night into 12 hours each,
        with each hour ruled by a planet.

        Args:
            date_time: Date and location

        Returns:
            Array of planetary hours for the day

        Raises:
            EphemerisError: If calculation fails
        """
        pass

    # Optional helper methods

    async def get_planet_position(
        self,
        planet: PlanetName,
        date_time: DateTime
    ) -> CelestialBody:
        """
        Get position of a single planet.

        Default implementation calls get_planets_positions and extracts one planet.
        Can be overridden for optimization.

        Args:
            planet: Planet to get position for
            date_time: Date and time

        Returns:
            Position of the specified planet

        Raises:
            EphemerisError: If calculation fails
        """
        positions = await self.get_planets_positions(date_time)
        return positions.get_planet(planet)

    async def find_aspects_for_planet(
        self,
        planet: CelestialBody,
        other_planets: List[CelestialBody],
        orb: Optional[float] = None
    ) -> List[Aspect]:
        """
        Find all aspects for a specific planet.

        Args:
            planet: The planet to find aspects for
            other_planets: Other planets to check aspects with
            orb: Orb tolerance in degrees

        Returns:
            List of aspects involving the specified planet
        """
        all_bodies = [planet] + other_planets
        all_aspects = await self.calculate_aspects(all_bodies, orb)
        return [
            aspect for aspect in all_aspects
            if aspect.body1.name == planet.name or aspect.body2.name == planet.name
        ]
