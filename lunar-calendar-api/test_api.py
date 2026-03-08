"""
Simple tests for the Lunar Calendar API
Run with: pytest test_api.py
"""

import pytest
from datetime import date
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


def test_health_endpoint():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_api_health_endpoint():
    """Test the API v1 health endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_get_lunar_day_today():
    """Test getting lunar day for today."""
    response = client.get("/api/v1/lunar-day")
    assert response.status_code == 200
    data = response.json()

    assert "lunar_day" in data
    assert 1 <= data["lunar_day"] <= 30
    assert "moon_phase" in data
    assert "color_palette" in data
    assert "health" in data
    assert "recommendations" in data
    assert "planetary_influence" in data


def test_get_lunar_day_specific_date():
    """Test getting lunar day for a specific date."""
    response = client.get("/api/v1/lunar-day?date=2025-01-01")
    assert response.status_code == 200
    data = response.json()

    assert data["gregorian_date"] == "2025-01-01"
    assert 1 <= data["lunar_day"] <= 30


def test_get_moon_phase():
    """Test getting moon phase."""
    response = client.get("/api/v1/moon-phase")
    assert response.status_code == 200
    data = response.json()

    assert "name" in data
    assert "illumination" in data
    assert "is_waxing" in data
    assert "emoji" in data
    assert 0 <= data["illumination"] <= 100


def test_find_best_days():
    """Test finding best days for an activity."""
    payload = {
        "activity": "haircut",
        "days_ahead": 30
    }

    response = client.post("/api/v1/best-days", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["activity"] == "haircut"
    assert "search_period" in data
    assert "best_days" in data
    assert isinstance(data["best_days"], list)

    if len(data["best_days"]) > 0:
        best_day = data["best_days"][0]
        assert "date" in best_day
        assert "lunar_day" in best_day
        assert "score" in best_day
        assert "reason" in best_day


def test_find_best_days_custom_activity():
    """Test finding best days for a custom activity."""
    payload = {
        "activity": "meditation",
        "days_ahead": 60
    }

    response = client.post("/api/v1/best-days", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["activity"] == "meditation"


def test_get_lunar_calendar():
    """Test getting lunar calendar."""
    response = client.get("/api/v1/lunar-calendar?days=7")
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) == 7

    for day_info in data:
        assert "lunar_day" in day_info
        assert "gregorian_date" in day_info
        assert "moon_phase" in day_info


def test_color_palette_generation():
    """Test that color palettes are generated correctly."""
    response = client.get("/api/v1/lunar-day")
    assert response.status_code == 200
    data = response.json()

    palette = data["color_palette"]
    assert "base_colors" in palette
    assert "gradient" in palette
    assert len(palette["base_colors"]) > 0
    assert len(palette["gradient"]) > 0

    # Check that colors are valid hex codes
    for color in palette["base_colors"]:
        assert color.startswith("#")
        assert len(color) == 7


def test_lunar_day_data_completeness():
    """Test that lunar day data is complete."""
    response = client.get("/api/v1/lunar-day")
    assert response.status_code == 200
    data = response.json()

    # Check all required fields
    assert "health" in data
    health = data["health"]
    assert "affected_organs" in health
    assert "affected_body_parts" in health
    assert isinstance(health["affected_organs"], list)

    recommendations = data["recommendations"]
    assert "recommended" in recommendations
    assert "not_recommended" in recommendations
    assert isinstance(recommendations["recommended"], list)

    planetary = data["planetary_influence"]
    assert "dominant_planet" in planetary
    assert "description" in planetary


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
