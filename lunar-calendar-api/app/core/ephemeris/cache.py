"""
Caching layer for ephemeris calculations.

Implements caching to improve performance for repeated calculations.
Past dates are cached forever, future dates for 24 hours.
"""

import hashlib
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from functools import wraps

from .interface import IEphemerisCalculator
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


class CacheService:
    """Simple in-memory cache service."""

    def __init__(self):
        self._cache: Dict[str, tuple[Any, Optional[datetime]]] = {}

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if key in self._cache:
            value, expires_at = self._cache[key]
            if expires_at is None or datetime.utcnow() < expires_at:
                return value
            else:
                # Expired
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        """Set value in cache with optional TTL."""
        expires_at = None
        if ttl_seconds is not None and ttl_seconds > 0:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl_seconds)
        self._cache[key] = (value, expires_at)

    def clear(self):
        """Clear all cache entries."""
        self._cache.clear()

    def size(self) -> int:
        """Get number of cached items."""
        return len(self._cache)


class CachedEphemerisCalculator(IEphemerisCalculator):
    """
    Ephemeris calculator with caching layer.

    Wraps another IEphemerisCalculator implementation and adds caching.
    """

    def __init__(
        self,
        calculator: IEphemerisCalculator,
        cache: Optional[CacheService] = None
    ):
        """
        Initialize cached calculator.

        Args:
            calculator: The underlying calculator to wrap
            cache: Cache service (creates new one if not provided)
        """
        self.calculator = calculator
        self.cache = cache or CacheService()

    def _make_cache_key(self, prefix: str, **kwargs) -> str:
        """Generate cache key from arguments."""
        # Sort kwargs for consistent key generation
        sorted_items = sorted(kwargs.items())
        key_data = f"{prefix}:" + ":".join(
            f"{k}={self._serialize_value(v)}" for k, v in sorted_items
        )
        # Hash to keep keys short
        return hashlib.md5(key_data.encode()).hexdigest()

    def _serialize_value(self, value: Any) -> str:
        """Serialize a value for cache key generation."""
        if isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, DateTime):
            return f"{value.date.isoformat()}_{value.location.latitude}_{value.location.longitude}"
        elif isinstance(value, (list, tuple)):
            return ",".join(self._serialize_value(v) for v in value)
        elif hasattr(value, 'value'):  # Enum
            return str(value.value)
        else:
            return str(value)

    def _get_ttl(self, date_time: DateTime) -> Optional[int]:
        """
        Determine TTL based on date.

        Past dates: cache forever (None)
        Future dates: cache for 24 hours
        """
        now = datetime.utcnow()
        target = date_time.date

        if target.tzinfo is None:
            target = target.replace(tzinfo=None)

        # If date is in the past, cache forever
        if target < now:
            return None
        else:
            # Cache future dates for 24 hours
            return 86400

    async def get_planets_positions(self, date_time: DateTime) -> PlanetPositions:
        """Get planet positions with caching."""
        cache_key = self._make_cache_key(
            "planets",
            date=date_time.date,
            lat=date_time.location.latitude,
            lon=date_time.location.longitude
        )

        # Try cache first
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        # Calculate and cache
        result = await self.calculator.get_planets_positions(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def get_moon_phase(self, date_time: DateTime) -> MoonPhase:
        """Get moon phase with caching."""
        cache_key = self._make_cache_key(
            "moon_phase",
            date=date_time.date,
            lat=date_time.location.latitude,
            lon=date_time.location.longitude
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.get_moon_phase(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def get_lunar_day(self, date_time: DateTime) -> LunarDay:
        """Get lunar day with caching."""
        cache_key = self._make_cache_key(
            "lunar_day",
            date=date_time.date,
            lat=date_time.location.latitude,
            lon=date_time.location.longitude
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.get_lunar_day(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def get_void_of_course_moon(
        self,
        date_time: DateTime
    ) -> Optional[VoidOfCourseMoon]:
        """Get VoC Moon with caching."""
        cache_key = self._make_cache_key(
            "voc_moon",
            date=date_time.date,
            lat=date_time.location.latitude,
            lon=date_time.location.longitude
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.get_void_of_course_moon(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def get_retrograde_planets(
        self,
        date_time: DateTime
    ) -> List[CelestialBody]:
        """Get retrograde planets with caching."""
        cache_key = self._make_cache_key(
            "retrogrades",
            date=date_time.date
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.get_retrograde_planets(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def calculate_aspects(
        self,
        bodies: List[CelestialBody],
        orb: Optional[float] = None
    ) -> List[Aspect]:
        """Calculate aspects with caching."""
        # Create cache key from body positions
        bodies_key = "_".join(
            f"{b.name.value}:{b.longitude:.2f}" for b in bodies
        )
        cache_key = self._make_cache_key(
            "aspects",
            bodies=bodies_key,
            orb=orb or "default"
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.calculate_aspects(bodies, orb)
        # Cache aspects for 1 hour (they depend on current positions)
        self.cache.set(cache_key, result, 3600)

        return result

    async def calculate_houses(
        self,
        date_time: DateTime,
        system: HouseSystem = HouseSystem.PLACIDUS
    ) -> Dict[int, House]:
        """Calculate houses with caching."""
        cache_key = self._make_cache_key(
            "houses",
            date=date_time.date,
            lat=date_time.location.latitude,
            lon=date_time.location.longitude,
            system=system
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.calculate_houses(date_time, system)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    async def get_planetary_hours(
        self,
        date_time: DateTime
    ) -> List[PlanetaryHour]:
        """Get planetary hours with caching."""
        cache_key = self._make_cache_key(
            "planetary_hours",
            date=date_time.date.date(),  # Just the date, not time
            lat=date_time.location.latitude,
            lon=date_time.location.longitude
        )

        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        result = await self.calculator.get_planetary_hours(date_time)
        ttl = self._get_ttl(date_time)
        self.cache.set(cache_key, result, ttl)

        return result

    # Stats methods
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "size": self.cache.size(),
            "backend": "in-memory"
        }

    def clear_cache(self):
        """Clear all cached data."""
        self.cache.clear()
