"""Tests for GET /api/v1/ephemeris/arabic-parts."""

import asyncio
from datetime import datetime

import pytz
from fastapi.testclient import TestClient

from app.core.ephemeris import (
    CachedEphemerisCalculator,
    DateTime,
    HouseSystem,
    Location,
    SkyfieldEphemerisAdapter,
    ZodiacSignName,
)
from app.core.ephemeris.calculations.arabic_parts import calculate_arabic_parts
from app.main import app

client = TestClient(app)

MOSCOW_LAT = 55.7558
MOSCOW_LON = 37.6173
SAMPLE_DATE = "2024-01-01T12:00:00Z"


def _expected_parts():
    dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)
    date_time = DateTime(
        date=dt,
        timezone="UTC",
        location=Location(latitude=MOSCOW_LAT, longitude=MOSCOW_LON),
    )
    calculator = CachedEphemerisCalculator(SkyfieldEphemerisAdapter())
    positions = asyncio.run(calculator.get_planets_positions(date_time))
    houses = asyncio.run(calculator.calculate_houses(date_time, HouseSystem.PLACIDUS))
    return calculate_arabic_parts(
        ascendant=houses[1].cusp_longitude,
        sun=positions.sun.longitude,
        moon=positions.moon.longitude,
        venus=positions.venus.longitude,
        mars=positions.mars.longitude,
    )


def test_arabic_parts_endpoint_returns_fortune():
    response = client.get(
        "/api/v1/ephemeris/arabic-parts",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()

    fortune = data["part_of_fortune"]
    assert fortune["name"] == "Part of Fortune"
    assert 0 <= fortune["longitude"] < 360
    assert fortune["zodiac_sign"] in {sign.value for sign in ZodiacSignName}
    assert "formula" in fortune
    assert isinstance(data["is_nocturnal"], bool)


def test_arabic_parts_endpoint_matches_calculator():
    expected = _expected_parts()
    response = client.get(
        "/api/v1/ephemeris/arabic-parts",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()

    fortune = data["part_of_fortune"]
    assert abs(fortune["longitude"] - expected["part_of_fortune"].longitude) < 0.01
    assert fortune["zodiac_sign"] == expected["part_of_fortune"].zodiac_sign.value
    assert data["is_nocturnal"] == expected["part_of_fortune"].is_nocturnal
