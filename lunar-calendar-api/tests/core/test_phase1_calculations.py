"""
Tests for Phase 1 Advanced Astrological Calculations

Tests for:
- Lunar Nodes (Rahu and Ketu)
- Black Moon Lilith (Mean, True, Corrected)
- Chiron
- Arabic Parts (Part of Fortune, Part of Spirit)
"""

import pytest
from datetime import datetime
from app.core.ephemeris import DateTime, Location, ZodiacSignName, LilithType


# Test fixtures
@pytest.fixture
def test_location():
    """Test location: Moscow, Russia"""
    return Location(latitude=55.7558, longitude=37.6173, elevation=0.0)


@pytest.fixture
def test_datetime_2024(test_location):
    """Test datetime: January 1, 2024, 12:00 UTC"""
    return DateTime(
        date=datetime(2024, 1, 1, 12, 0, 0),
        timezone="UTC",
        location=test_location
    )


@pytest.fixture
def test_datetime_2000(test_location):
    """Test datetime: January 1, 2000, 12:00 UTC (J2000 epoch)"""
    return DateTime(
        date=datetime(2000, 1, 1, 12, 0, 0),
        timezone="UTC",
        location=test_location
    )


# ============================================================================
# Lunar Nodes Tests
# ============================================================================

def test_calculate_lunar_nodes_mean(test_datetime_2024):
    """Test Mean Lunar Nodes calculation."""
    from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes

    nodes = calculate_lunar_nodes(test_datetime_2024)

    # Verify structure
    assert nodes is not None
    assert nodes.north_node is not None
    assert nodes.south_node is not None

    # Verify names
    assert nodes.north_node.name == "Rahu"
    assert nodes.south_node.name == "Ketu"

    # Verify that nodes are exactly 180° apart
    north_lon = nodes.north_node.longitude
    south_lon = nodes.south_node.longitude
    diff = abs(north_lon - south_lon)
    assert abs(diff - 180.0) < 0.01, f"Nodes should be 180° apart, got {diff}°"

    # Verify nodes are on the ecliptic (latitude = 0)
    assert abs(nodes.north_node.latitude) < 0.01
    assert abs(nodes.south_node.latitude) < 0.01

    # Verify nodes are retrograde
    assert nodes.north_node.is_retrograde is True
    assert nodes.south_node.is_retrograde is True

    # Verify speed is negative (retrograde motion)
    assert nodes.north_node.speed < 0

    # Verify Russian interpretations exist
    assert len(nodes.north_node.interpretation_ru) > 0
    assert len(nodes.south_node.interpretation_ru) > 0
    assert "Раху" in nodes.north_node.interpretation_ru or "путь" in nodes.north_node.interpretation_ru.lower()


def test_calculate_lunar_nodes_true(test_datetime_2024):
    """Test True (Osculating) Lunar Nodes calculation."""
    from app.core.ephemeris.calculations.nodes import calculate_true_node

    nodes = calculate_true_node(test_datetime_2024)

    # Verify structure
    assert nodes is not None
    assert nodes.north_node.name == "Rahu"
    assert nodes.south_node.name == "Ketu"

    # True nodes should also be 180° apart
    north_lon = nodes.north_node.longitude
    south_lon = nodes.south_node.longitude
    diff = abs(north_lon - south_lon)
    assert abs(diff - 180.0) < 0.01


def test_lunar_nodes_mean_vs_true(test_datetime_2024):
    """Test that Mean and True nodes are close but different."""
    from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes, calculate_true_node

    mean_nodes = calculate_lunar_nodes(test_datetime_2024)
    true_nodes = calculate_true_node(test_datetime_2024)

    # They should be close (within a few degrees)
    diff = abs(mean_nodes.north_node.longitude - true_nodes.north_node.longitude)
    assert diff < 5.0, f"Mean and True nodes should be within 5°, got {diff}°"


def test_lunar_nodes_zodiac_signs(test_datetime_2024):
    """Test that lunar nodes are in valid zodiac signs."""
    from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes

    nodes = calculate_lunar_nodes(test_datetime_2024)

    # Verify zodiac signs are valid
    valid_signs = [sign for sign in ZodiacSignName]
    assert nodes.north_node.zodiac_sign in valid_signs
    assert nodes.south_node.zodiac_sign in valid_signs


# ============================================================================
# Black Moon Lilith Tests
# ============================================================================

def test_calculate_mean_lilith(test_datetime_2024):
    """Test Mean Black Moon Lilith calculation."""
    from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith

    lilith = calculate_black_moon_lilith(test_datetime_2024, LilithType.MEAN)

    # Verify structure
    assert lilith is not None
    assert lilith.lilith_type == LilithType.MEAN
    assert 0 <= lilith.longitude < 360
    assert lilith.zodiac_sign in [sign for sign in ZodiacSignName]

    # Verify interpretation exists
    assert len(lilith.interpretation_ru) > 0
    assert "Лилит" in lilith.interpretation_ru


def test_calculate_true_lilith(test_datetime_2024):
    """Test True (Osculating) Black Moon Lilith calculation."""
    from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith

    lilith = calculate_black_moon_lilith(test_datetime_2024, LilithType.TRUE)

    # Verify structure
    assert lilith is not None
    assert lilith.lilith_type == LilithType.TRUE
    assert 0 <= lilith.longitude < 360


def test_calculate_corrected_lilith(test_datetime_2024):
    """Test Corrected (Waldemath) Black Moon Lilith calculation."""
    from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith

    lilith = calculate_black_moon_lilith(test_datetime_2024, LilithType.CORRECTED)

    # Verify structure
    assert lilith is not None
    assert lilith.lilith_type == LilithType.CORRECTED
    assert 0 <= lilith.longitude < 360


def test_all_liliths(test_datetime_2024):
    """Test calculating all three types of Lilith."""
    from app.core.ephemeris.calculations.lilith import calculate_all_liliths

    liliths = calculate_all_liliths(test_datetime_2024)

    # Verify all three types returned
    assert LilithType.MEAN in liliths
    assert LilithType.TRUE in liliths
    assert LilithType.CORRECTED in liliths

    # All should have valid longitudes
    for lilith_type, lilith in liliths.items():
        assert 0 <= lilith.longitude < 360
        assert lilith.lilith_type == lilith_type


# ============================================================================
# Chiron Tests
# ============================================================================

def test_calculate_chiron(test_datetime_2024):
    """Test Chiron calculation."""
    from app.core.ephemeris.calculations.chiron import calculate_chiron

    chiron = calculate_chiron(test_datetime_2024)

    # Verify structure
    assert chiron is not None
    assert 0 <= chiron.longitude < 360
    assert chiron.zodiac_sign in [sign for sign in ZodiacSignName]

    # Chiron should have distance and speed
    assert chiron.distance_au > 0
    assert chiron.speed != 0  # Chiron is always moving

    # Verify interpretation exists
    assert len(chiron.interpretation_ru) > 0
    assert "Хирон" in chiron.interpretation_ru


def test_chiron_retrograde_detection(test_datetime_2024):
    """Test that Chiron retrograde status is properly detected."""
    from app.core.ephemeris.calculations.chiron import calculate_chiron

    chiron = calculate_chiron(test_datetime_2024)

    # is_retrograde should match speed sign
    if chiron.speed < 0:
        assert chiron.is_retrograde is True
    else:
        assert chiron.is_retrograde is False


def test_chiron_return_detection():
    """Test Chiron return detection."""
    from app.core.ephemeris.calculations.chiron import is_chiron_return

    # Same position - should be a return
    assert is_chiron_return(100.0, 100.0, orb=2.0) is True

    # Within orb - should be a return
    assert is_chiron_return(100.0, 101.5, orb=2.0) is True

    # Outside orb - should not be a return
    assert is_chiron_return(100.0, 105.0, orb=2.0) is False

    # Test with wrap-around (near 0°/360°)
    assert is_chiron_return(359.0, 1.0, orb=2.0) is True


# ============================================================================
# Arabic Parts Tests
# ============================================================================

def test_calculate_part_of_fortune_day():
    """Test Part of Fortune calculation for day chart."""
    from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_fortune

    # Day chart example: Sun above horizon
    # Ascendant = 0° (Aries), Sun = 90° (Cancer), Moon = 120° (Leo)
    part = calculate_part_of_fortune(
        ascendant=0.0,
        sun=90.0,
        moon=120.0,
        is_nocturnal=False
    )

    # Formula for day: Asc + Moon - Sun = 0 + 120 - 90 = 30° (Taurus)
    expected = 30.0
    assert abs(part.longitude - expected) < 0.01, f"Expected {expected}°, got {part.longitude}°"

    # Verify it's in Taurus
    assert part.zodiac_sign == ZodiacSignName.TAURUS

    # Verify formula
    assert "Moon" in part.formula and "Sun" in part.formula
    assert part.is_nocturnal is False

    # Verify interpretation
    assert len(part.interpretation_ru) > 0
    assert "Парс" in part.interpretation_ru or "Фортун" in part.interpretation_ru


def test_calculate_part_of_fortune_night():
    """Test Part of Fortune calculation for night chart."""
    from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_fortune

    # Night chart: Sun below horizon
    # Ascendant = 0°, Sun = 270° (Capricorn - below horizon), Moon = 120°
    part = calculate_part_of_fortune(
        ascendant=0.0,
        sun=270.0,
        moon=120.0,
        is_nocturnal=True
    )

    # Formula for night: Asc + Sun - Moon = 0 + 270 - 120 = 150° (Virgo)
    expected = 150.0
    assert abs(part.longitude - expected) < 0.01

    assert part.zodiac_sign == ZodiacSignName.VIRGO
    assert part.is_nocturnal is True


def test_calculate_part_of_spirit_day():
    """Test Part of Spirit calculation for day chart."""
    from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_spirit

    # Day chart: Formula is Asc + Sun - Moon (opposite of Fortune)
    part = calculate_part_of_spirit(
        ascendant=0.0,
        sun=90.0,
        moon=120.0,
        is_nocturnal=False
    )

    # Formula for day: Asc + Sun - Moon = 0 + 90 - 120 = -30 = 330° (Pisces)
    expected = 330.0
    assert abs(part.longitude - expected) < 0.01

    assert part.zodiac_sign == ZodiacSignName.PISCES
    assert "Парс" in part.interpretation_ru or "Дух" in part.interpretation_ru


def test_calculate_part_of_eros():
    """Test Part of Eros calculation."""
    from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_eros

    # Formula: Asc + Venus - Mars
    # Asc = 0°, Venus = 60° (Gemini), Mars = 30° (Taurus)
    part = calculate_part_of_eros(
        ascendant=0.0,
        venus=60.0,
        mars=30.0
    )

    # 0 + 60 - 30 = 30° (Taurus)
    expected = 30.0
    assert abs(part.longitude - expected) < 0.01

    assert part.zodiac_sign == ZodiacSignName.TAURUS
    assert part.name == "Part of Eros"


def test_arabic_part_angle_normalization():
    """Test that Arabic Parts properly normalize angles."""
    from app.core.ephemeris.calculations.arabic_parts import calculate_part_of_fortune

    # Test with result > 360°
    part = calculate_part_of_fortune(
        ascendant=300.0,
        sun=30.0,
        moon=100.0,
        is_nocturnal=False
    )

    # 300 + 100 - 30 = 370° -> should normalize to 10°
    assert 0 <= part.longitude < 360
    expected = 10.0
    assert abs(part.longitude - expected) < 0.01


def test_nocturnal_chart_detection():
    """Test day/night chart detection."""
    from app.core.ephemeris.calculations.arabic_parts import is_nocturnal_chart

    # Sun at 90° (MC), Asc at 0° -> Sun is above horizon (day chart)
    assert is_nocturnal_chart(sun_longitude=90.0, ascendant_longitude=0.0) is False

    # Sun at 270° (IC), Asc at 0° -> Sun is below horizon (night chart)
    assert is_nocturnal_chart(sun_longitude=270.0, ascendant_longitude=0.0) is True

    # Sun at 45°, Asc at 0° -> Sun above horizon (day)
    assert is_nocturnal_chart(sun_longitude=45.0, ascendant_longitude=0.0) is False

    # Sun at 200°, Asc at 0° -> Sun below horizon (night)
    assert is_nocturnal_chart(sun_longitude=200.0, ascendant_longitude=0.0) is True


# ============================================================================
# Integration Tests
# ============================================================================

def test_phase1_all_calculations(test_datetime_2024):
    """Integration test: Calculate all Phase 1 features."""
    from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes
    from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith
    from app.core.ephemeris.calculations.chiron import calculate_chiron

    # All should complete without errors
    nodes = calculate_lunar_nodes(test_datetime_2024)
    lilith = calculate_black_moon_lilith(test_datetime_2024, LilithType.MEAN)
    chiron = calculate_chiron(test_datetime_2024)

    assert nodes is not None
    assert lilith is not None
    assert chiron is not None


def test_russian_interpretations_present():
    """Test that all Russian interpretations are present."""
    from app.core.ephemeris.calculations.nodes import calculate_lunar_nodes
    from app.core.ephemeris.calculations.lilith import calculate_black_moon_lilith
    from app.core.ephemeris.calculations.chiron import calculate_chiron
    from datetime import datetime
    from app.core.ephemeris import DateTime, Location

    test_dt = DateTime(
        date=datetime(2024, 1, 1, 12, 0, 0),
        timezone="UTC",
        location=Location(55.7558, 37.6173)
    )

    # Test nodes
    nodes = calculate_lunar_nodes(test_dt)
    assert "Раху" in nodes.north_node.interpretation_ru or "путь" in nodes.north_node.interpretation_ru.lower()
    assert "Кету" in nodes.south_node.interpretation_ru or "опыт" in nodes.south_node.interpretation_ru.lower()

    # Test Lilith
    lilith = calculate_black_moon_lilith(test_dt, LilithType.MEAN)
    assert "Лилит" in lilith.interpretation_ru

    # Test Chiron
    chiron = calculate_chiron(test_dt)
    assert "Хирон" in chiron.interpretation_ru


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
