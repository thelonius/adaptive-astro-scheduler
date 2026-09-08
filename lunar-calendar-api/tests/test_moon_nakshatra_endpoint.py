"""Tests for GET /api/v1/ephemeris/moon-nakshatra."""

from datetime import datetime

import pytz
from fastapi.testclient import TestClient

from app.calculators.nakshatra_engine import nakshatra_engine
from app.main import app

client = TestClient(app)

MOSCOW_LAT = 55.7558
MOSCOW_LON = 37.6173
SAMPLE_DATE = "2024-01-01T12:00:00Z"


def test_moon_nakshatra_endpoint_returns_named_nakshatra():
    response = client.get(
        "/api/v1/ephemeris/moon-nakshatra",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()

    assert 1 <= data["nakshatra_id"] <= 27
    assert isinstance(data["name"], str) and data["name"]
    assert isinstance(data["name_ru"], str) and data["name_ru"]
    assert data["ruler"] in {
        "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"
    }
    assert isinstance(data["symbol"], str) and data["symbol"]
    assert 0 <= data["sidereal_longitude"] < 360
    assert 0 <= data["degree_in_nakshatra"] < 13.34
    assert data["ayanamsa"] > 20


def test_moon_nakshatra_endpoint_includes_pada():
    response = client.get(
        "/api/v1/ephemeris/moon-nakshatra",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()

    assert data["pada"] in (1, 2, 3, 4)
    assert isinstance(data["is_gandanta"], bool)


def test_moon_nakshatra_endpoint_matches_engine():
    dt = datetime(2024, 1, 1, 12, 0, 0, tzinfo=pytz.UTC)
    expected = nakshatra_engine.get_moon_nakshatra(dt)

    response = client.get(
        "/api/v1/ephemeris/moon-nakshatra",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()

    assert data["nakshatra_id"] == expected["nakshatra_id"]
    assert data["name"] == expected["name"]
    assert data["name_ru"] == expected["name_ru"]
    assert data["ruler"] == expected["ruler"]
    assert data["pada"] == expected["pada"]
    assert abs(data["sidereal_longitude"] - expected["sidereal_longitude"]) < 0.0001
    assert abs(data["degree_in_nakshatra"] - expected["degree_in_nakshatra"]) < 0.0001
    assert abs(data["ayanamsa"] - expected["ayanamsa"]) < 0.0001
    assert data["is_gandanta"] == expected["is_gandanta"]
