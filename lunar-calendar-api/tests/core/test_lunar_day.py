"""
Tests for lunar day boundaries.

A lunar day runs from one moonrise to the next; the first day of a cycle
starts at the new moon and the last one is cut short by the following new
moon. Same definition as AstroClock/src/lunar.h.
"""

import asyncio
from datetime import datetime, timedelta

import pytest

from app.core.ephemeris import SkyfieldEphemerisAdapter, DateTime, Location
from app.services.lunar_calculator import LunarCalculator


MOSCOW = Location(latitude=55.7558, longitude=37.6173)
REYKJAVIK = Location(latitude=64.1466, longitude=-21.9426)

# 2026-02-17 12:01:10 UTC by Swiss Ephemeris
FEB_NEW_MOON = datetime(2026, 2, 17, 12, 1, 10)


@pytest.fixture
def adapter():
    return SkyfieldEphemerisAdapter()


def _lunar_day(adapter, when, location=MOSCOW):
    return asyncio.run(adapter.get_lunar_day(
        DateTime(date=when, timezone="UTC", location=location)
    ))


def test_new_moon_opens_the_cycle(adapter):
    """Day 30 ends at the new moon and day 1 starts there, to the second."""
    last = _lunar_day(adapter, FEB_NEW_MOON - timedelta(minutes=1))
    first = _lunar_day(adapter, FEB_NEW_MOON + timedelta(minutes=1))

    assert last.number == 30
    assert first.number == 1
    assert abs(last.ends_at.replace(tzinfo=None) - FEB_NEW_MOON) < timedelta(seconds=5)
    assert last.ends_at == first.starts_at


def test_day_number_never_moves_backwards(adapter):
    """Walking a full cycle three hours at a time, the number only grows or resets."""
    previous = None
    for hours in range(0, 24 * 31, 3):
        day = _lunar_day(adapter, FEB_NEW_MOON + timedelta(hours=hours))
        if previous is not None:
            assert day.number in (previous, previous + 1, 1), (
                f"jumped from {previous} to {day.number} at +{hours}h"
            )
        previous = day.number


def test_boundaries_bracket_the_query(adapter):
    """The reported window actually contains the moment that was asked about."""
    for hours in range(0, 24 * 31, 7):
        when = FEB_NEW_MOON + timedelta(hours=hours)
        day = _lunar_day(adapter, when)
        assert day.starts_at.replace(tzinfo=None) <= when < day.ends_at.replace(tzinfo=None)
        assert 0 < day.duration_hours <= 27


def test_time_of_day_matters(adapter):
    """Two moments on one calendar date can fall in different lunar days.

    The previous implementation snapped every query to 12:00 UTC and answered
    the same number for the whole date.
    """
    morning = _lunar_day(adapter, datetime(2026, 9, 5, 12, 0))
    evening = _lunar_day(adapter, datetime(2026, 9, 5, 23, 0))

    assert morning.number != evening.number


def test_location_matters(adapter):
    """Moonrise is local, so the boundary moves with the observer."""
    when = datetime(2026, 9, 5, 18, 0)

    moscow = _lunar_day(adapter, when, MOSCOW)
    reykjavik = _lunar_day(adapter, when, REYKJAVIK)

    assert moscow.starts_at != reykjavik.starts_at


def test_no_moonrise_is_skipped(adapter):
    """Consecutive moonrises are ~24-26 hours apart, with no gap of two days.

    Sampling risings_and_settings every six hours used to drop the rises
    around late August 2026, when the Moon at 56°N stays up only briefly.
    """
    rises = adapter._find_moonrises_between(
        datetime(2026, 8, 12, 17, 37),
        datetime(2026, 9, 8),
        MOSCOW,
    )

    assert len(rises) >= 25
    gaps = [(b - a).total_seconds() / 3600 for a, b in zip(rises, rises[1:])]
    assert max(gaps) < 27, f"missed a moonrise: largest gap {max(gaps):.1f}h"


def test_both_implementations_agree():
    """The adapter and the legacy calculator answer the same for a whole month."""
    adapter = SkyfieldEphemerisAdapter()
    legacy = LunarCalculator()

    for offset in range(31):
        day = (datetime(2026, 9, 1) + timedelta(days=offset)).date()
        from_adapter = _lunar_day(
            adapter, datetime(day.year, day.month, day.day, 12)
        ).number
        assert from_adapter == legacy.calculate_lunar_day(day), f"disagree on {day}"
