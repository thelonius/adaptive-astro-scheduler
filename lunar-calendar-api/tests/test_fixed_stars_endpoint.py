"""Tests for GET /api/v1/ephemeris/fixed-stars."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

MOSCOW_LAT = 55.7558
MOSCOW_LON = 37.6173
SAMPLE_DATE = "2024-01-01T12:00:00Z"


def test_fixed_stars_endpoint_returns_200():
    response = client.get(
        "/api/v1/ephemeris/fixed-stars",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200


def test_fixed_stars_endpoint_returns_non_empty_list():
    response = client.get(
        "/api/v1/ephemeris/fixed-stars",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data["stars"], list)
    assert len(data["stars"]) > 0


def test_fixed_stars_longitude_in_range():
    response = client.get(
        "/api/v1/ephemeris/fixed-stars",
        params={
            "date": SAMPLE_DATE,
            "latitude": MOSCOW_LAT,
            "longitude": MOSCOW_LON,
            "timezone": "UTC",
        },
    )
    assert response.status_code == 200
    for star in response.json()["stars"]:
        assert 0 <= star["longitude"] < 360
