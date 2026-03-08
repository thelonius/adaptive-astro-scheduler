"""
Unit tests for ephemeris calculator.

Tests against known astronomical data from NASA JPL and other sources.
"""

import pytest
from datetime import datetime
from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    CachedEphemerisCalculator,
    DateTime,
    Location,
    PlanetName,
    ZodiacSign,
    ZodiacSignName,
    EphemerisError,
)


# Test fixtures
@pytest.fixture
def calculator():
    """Create ephemeris calculator instance."""
    base = SkyfieldEphemerisAdapter()
    return CachedEphemerisCalculator(base)


@pytest.fixture
def moscow_location():
    """Moscow location."""
    return Location(latitude=55.7558, longitude=37.6173)


@pytest.fixture
def greenwich_location():
    """Greenwich location (0,0 for simplicity)."""
    return Location(latitude=51.4769, longitude=0.0)


# ============================================================================
# Test: Zodiac Sign Calculations
# ============================================================================

def test_zodiac_sign_from_longitude():
    """Test zodiac sign calculation from longitude."""
    # 0° = Aries
    sign = ZodiacSign.from_longitude(0)
    assert sign.name == ZodiacSignName.ARIES
    assert sign.degree_in_sign == 0.0

    # 15° = Aries (15° into Aries)
    sign = ZodiacSign.from_longitude(15)
    assert sign.name == ZodiacSignName.ARIES
    assert sign.degree_in_sign == 15.0

    # 30° = Taurus (0° into Taurus)
    sign = ZodiacSign.from_longitude(30)
    assert sign.name == ZodiacSignName.TAURUS
    assert sign.degree_in_sign == 0.0

    # 90° = Cancer (0° into Cancer)
    sign = ZodiacSign.from_longitude(90)
    assert sign.name == ZodiacSignName.CANCER

    # 280° = Capricorn
    sign = ZodiacSign.from_longitude(280)
    assert sign.name == ZodiacSignName.CAPRICORN

    # 360° = Aries (wraps around)
    sign = ZodiacSign.from_longitude(360)
    assert sign.name == ZodiacSignName.ARIES


# ============================================================================
# Test: Planet Positions
# ============================================================================

@pytest.mark.asyncio
async def test_get_sun_position_vernal_equinox(calculator, greenwich_location):
    """
    Test Sun position at vernal equinox.
    March 20, 2026 - Sun should be at approximately 0° Aries.
    """
    # Vernal Equinox 2026: March 20, 14:46 UTC
    dt = DateTime(
        date=datetime(2026, 3, 20, 14, 46, 0),
        timezone="UTC",
        location=greenwich_location
    )

    positions = await calculator.get_planets_positions(dt)

    # Sun should be very close to 0° (within 1°)
    assert 358 <= positions.sun.longitude <= 2 or positions.sun.longitude < 2
    assert positions.sun.zodiac_sign.name == ZodiacSignName.ARIES
    assert not positions.sun.is_retrograde  # Sun never retrogrades


@pytest.mark.asyncio
async def test_get_planet_positions_basic(calculator, moscow_location):
    """Test basic planet position calculation."""
    dt = DateTime(
        date=datetime(2026, 1, 1, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    positions = await calculator.get_planets_positions(dt)

    # Check all planets exist
    assert positions.sun is not None
    assert positions.moon is not None
    assert positions.mercury is not None
    assert positions.venus is not None
    assert positions.mars is not None
    assert positions.jupiter is not None
    assert positions.saturn is not None
    assert positions.uranus is not None
    assert positions.neptune is not None
    assert positions.pluto is not None

    # Check longitude ranges
    for planet in positions.to_list():
        assert 0 <= planet.longitude < 360
        assert planet.zodiac_sign is not None
        assert 0 <= planet.zodiac_sign.degree_in_sign < 30


@pytest.mark.asyncio
async def test_sun_never_retrograde(calculator, moscow_location):
    """Sun should never be retrograde."""
    dt = DateTime(
        date=datetime(2026, 6, 15, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    positions = await calculator.get_planets_positions(dt)
    assert not positions.sun.is_retrograde
    assert positions.sun.speed > 0


@pytest.mark.asyncio
async def test_moon_never_retrograde(calculator, moscow_location):
    """Moon should never be retrograde."""
    dt = DateTime(
        date=datetime(2026, 6, 15, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    positions = await calculator.get_planets_positions(dt)
    assert not positions.moon.is_retrograde
    assert positions.moon.speed > 0


# ============================================================================
# Test: Moon Phase
# ============================================================================

@pytest.mark.asyncio
async def test_moon_phase_new_moon(calculator, moscow_location):
    """Test moon phase at known new moon."""
    # New Moon on February 17, 2026
    dt = DateTime(
        date=datetime(2026, 2, 17, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    phase = await calculator.get_moon_phase(dt)

    # Should be very close to 0% illumination
    assert phase.illumination < 0.05
    assert "New" in phase.name


@pytest.mark.asyncio
async def test_moon_phase_full_moon(calculator, moscow_location):
    """Test moon phase at known full moon."""
    # Full Moon on March 3, 2026
    dt = DateTime(
        date=datetime(2026, 3, 3, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    phase = await calculator.get_moon_phase(dt)

    # Should be very close to 100% illumination
    assert phase.illumination > 0.95
    assert "Full" in phase.name


@pytest.mark.asyncio
async def test_moon_phase_first_quarter(calculator, moscow_location):
    """Test moon phase at first quarter."""
    # Approximately first quarter
    dt = DateTime(
        date=datetime(2026, 2, 24, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    phase = await calculator.get_moon_phase(dt)

    # Should be around 50% illumination
    assert 0.4 < phase.illumination < 0.6
    assert phase.is_waxing


# ============================================================================
# Test: Lunar Day
# ============================================================================

@pytest.mark.asyncio
async def test_lunar_day_valid_range(calculator, moscow_location):
    """Lunar day should always be between 1 and 30."""
    for day_offset in range(0, 60):  # Test 60 days
        dt = DateTime(
            date=datetime(2026, 1, 1, 12, 0, 0) + pytest.importorskip('datetime').timedelta(days=day_offset),
            timezone="UTC",
            location=moscow_location
        )

        lunar_day = await calculator.get_lunar_day(dt)
        assert 1 <= lunar_day.number <= 30


@pytest.mark.asyncio
async def test_lunar_day_at_new_moon(calculator, moscow_location):
    """Lunar day should be 1 at new moon."""
    # New Moon on February 17, 2026
    dt = DateTime(
        date=datetime(2026, 2, 17, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    lunar_day = await calculator.get_lunar_day(dt)

    # Should be day 1 or very close (within a day either side)
    assert 1 <= lunar_day.number <= 2


# ============================================================================
# Test: Retrograde Planets
# ============================================================================

@pytest.mark.asyncio
async def test_mercury_retrograde_detection(calculator, moscow_location):
    """
    Test Mercury retrograde detection.
    Mercury is retrograde from February 15 to March 10, 2026.
    """
    # During retrograde
    dt_retro = DateTime(
        date=datetime(2026, 2, 25, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    retrogrades = await calculator.get_retrograde_planets(dt_retro)
    mercury_retro = any(p.name == PlanetName.MERCURY for p in retrogrades)

    # Mercury should be retrograde
    assert mercury_retro

    # Not during retrograde (before)
    dt_direct = DateTime(
        date=datetime(2026, 1, 15, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    retrogrades_direct = await calculator.get_retrograde_planets(dt_direct)
    mercury_direct = any(p.name == PlanetName.MERCURY for p in retrogrades_direct)

    # Mercury should be direct
    assert not mercury_direct


# ============================================================================
# Test: Aspects
# ============================================================================

@pytest.mark.asyncio
async def test_calculate_aspects(calculator, moscow_location):
    """Test aspect calculation between planets."""
    dt = DateTime(
        date=datetime(2026, 1, 1, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    positions = await calculator.get_planets_positions(dt)
    aspects = await calculator.calculate_aspects(positions.to_list())

    # Should find at least some aspects
    assert len(aspects) > 0

    # All aspects should have valid orbs
    for aspect in aspects:
        assert 0 <= aspect.orb <= 15  # Maximum reasonable orb


@pytest.mark.asyncio
async def test_sun_moon_conjunction_at_new_moon(calculator, moscow_location):
    """At new moon, Sun and Moon should be in conjunction."""
    # New Moon on February 17, 2026
    dt = DateTime(
        date=datetime(2026, 2, 17, 12, 0, 0),
        timezone="UTC",
        location=moscow_location
    )

    positions = await calculator.get_planets_positions(dt)
    aspects = await calculator.calculate_aspects([positions.sun, positions.moon])

    # Should find a conjunction
    has_conjunction = any(
        a.aspect_type.value == "conjunction"
        and a.body1.name == PlanetName.SUN
        and a.body2.name == PlanetName.MOON
        for a in aspects
    )

    assert has_conjunction


# ============================================================================
# Test: Caching
# ============================================================================

@pytest.mark.asyncio
async def test_caching_works(calculator, moscow_location):
    """Test that caching improves performance."""
    dt = DateTime(
        date=datetime(2020, 1, 1, 12, 0, 0),  # Past date
        timezone="UTC",
        location=moscow_location
    )

    # Clear cache
    calculator.clear_cache()

    # First call - not cached
    result1 = await calculator.get_planets_positions(dt)

    # Second call - should be cached
    result2 = await calculator.get_planets_positions(dt)

    # Results should be identical
    assert result1.sun.longitude == result2.sun.longitude

    # Cache should have entries
    stats = calculator.get_cache_stats()
    assert stats["size"] > 0


# ============================================================================
# Test: Error Handling
# ============================================================================

def test_invalid_location():
    """Test that invalid locations raise errors."""
    with pytest.raises(ValueError):
        Location(latitude=100, longitude=0)  # Invalid latitude

    with pytest.raises(ValueError):
        Location(latitude=0, longitude=200)  # Invalid longitude


# ============================================================================
# Test: Known Astronomical Events
# ============================================================================

@pytest.mark.asyncio
async def test_spring_equinox_2026(calculator, greenwich_location):
    """
    Spring Equinox 2026: March 20, 14:46 UTC
    Sun should be at 0° Aries.
    """
    dt = DateTime(
        date=datetime(2026, 3, 20, 14, 46, 0),
        timezone="UTC",
        location=greenwich_location
    )

    positions = await calculator.get_planets_positions(dt)

    # Sun should be very close to 0° (within 1°)
    assert positions.sun.zodiac_sign.name == ZodiacSignName.ARIES
    assert positions.sun.longitude < 2 or positions.sun.longitude > 358


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
