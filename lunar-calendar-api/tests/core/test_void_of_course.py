"""
Tests for Void of Course Moon detection.

Reference windows below were cross-checked against an independent Swiss
Ephemeris run and against /api/v1/planning/void-of-course, which walks the
same September 2026 stretch with a different code path.
"""

import asyncio

import pytest
from datetime import datetime, timedelta, timezone

from app.calculators.lunar_engine import lunar_engine
from app.core.ephemeris import (
    SkyfieldEphemerisAdapter,
    DateTime,
    Location,
    ZodiacSignName,
    PlanetName,
)


MOSCOW = Location(latitude=55.7558, longitude=37.6173)

# (voc_start UTC, ingress UTC, last aspect planet, sign entered)
REFERENCE_WINDOWS = [
    (datetime(2026, 9, 5, 8, 39, 51, tzinfo=timezone.utc),
     datetime(2026, 9, 5, 14, 30, 56, tzinfo=timezone.utc),
     "Venus", ZodiacSignName.CANCER),
    (datetime(2026, 9, 7, 13, 39, 51, tzinfo=timezone.utc),
     datetime(2026, 9, 7, 16, 49, 41, tzinfo=timezone.utc),
     "Venus", ZodiacSignName.LEO),
    (datetime(2026, 9, 11, 5, 52, 2, tzinfo=timezone.utc),
     datetime(2026, 9, 11, 23, 52, 30, tzinfo=timezone.utc),
     "Mars", ZodiacSignName.LIBRA),
]

TOLERANCE = timedelta(minutes=3)


def _mid(start, end):
    return start + (end - start) / 2


@pytest.fixture
def calculator():
    return SkyfieldEphemerisAdapter()


@pytest.mark.parametrize("start,end,planet,next_sign", REFERENCE_WINDOWS)
def test_engine_reports_window_from_inside(start, end, planet, next_sign):
    """The Moon is void between its last aspect in a sign and the ingress."""
    window = lunar_engine.get_active_voc_window(_mid(start, end))

    assert window is not None
    assert abs(window["voc_start"] - start) < TOLERANCE
    assert abs(window["voc_end"] - end) < TOLERANCE
    assert window["last_aspect"]["planet"] == planet
    assert window["new_sign"] == next_sign.value


@pytest.mark.parametrize("start,end,planet,next_sign", REFERENCE_WINDOWS)
def test_engine_silent_outside_window(start, end, planet, next_sign):
    """Just before the last aspect and just after the ingress are not void.

    The original implementation searched for the last aspect forward from the
    query instead of backward, so it answered "not void" everywhere; a test
    that only checks the outside of the windows would have passed on it.
    """
    assert lunar_engine.get_active_voc_window(start - timedelta(minutes=5)) is None
    assert lunar_engine.get_active_voc_window(end + timedelta(minutes=5)) is None


@pytest.mark.parametrize("start,end,planet,next_sign", REFERENCE_WINDOWS)
def test_adapter_maps_window_to_domain_type(calculator, start, end, planet, next_sign):
    voc = asyncio.run(calculator.get_void_of_course_moon(
        DateTime(date=_mid(start, end), timezone="UTC", location=MOSCOW)
    ))

    assert voc is not None
    assert abs(voc.start_time - start) < TOLERANCE
    assert abs(voc.end_time - end) < TOLERANCE
    assert voc.last_aspect_planet == PlanetName(planet)
    assert voc.next_sign.name == next_sign
    assert voc.sign.name != next_sign
    assert voc.is_active(_mid(start, end))


def test_adapter_accepts_naive_datetime_as_utc(calculator):
    start, end, _, _ = REFERENCE_WINDOWS[0]
    naive = _mid(start, end).replace(tzinfo=None)

    voc = asyncio.run(calculator.get_void_of_course_moon(
        DateTime(date=naive, timezone="UTC", location=MOSCOW)
    ))

    assert voc is not None
    assert abs(voc.start_time - start) < TOLERANCE


def test_adapter_returns_none_outside_window(calculator):
    start, end, _, _ = REFERENCE_WINDOWS[0]

    voc = asyncio.run(calculator.get_void_of_course_moon(
        DateTime(date=end + timedelta(hours=2), timezone="UTC", location=MOSCOW)
    ))

    assert voc is None
