"""Tests for POST /api/v1/chart/human-design."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CHART = {
    "datetime_utc": "1990-06-15T14:30:00Z",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "house_system": "placidus",
}


def test_human_design_endpoint_returns_bodygraph():
    response = client.post("/api/v1/chart/human-design", json=CHART)
    assert response.status_code == 200
    data = response.json()

    assert "type" in data
    assert "profile" in data
    assert "authority" in data
    assert "personality" in data
    assert "design" in data
    assert "defined_channels" in data
    assert data["type"] in (
        "Generator", "Manifesting Generator", "Manifestor", "Projector", "Reflector"
    )


def test_human_design_profile_format():
    response = client.post("/api/v1/chart/human-design", json=CHART)
    assert response.status_code == 200
    data = response.json()

    parts = data["profile"].split("/")
    assert len(parts) == 2
    assert 1 <= int(parts[0]) <= 6
    assert 1 <= int(parts[1]) <= 6

    sun_p = data["personality"]["Sun"]
    sun_d = data["design"]["Sun"]
    assert 1 <= sun_p["gate"] <= 64
    assert 1 <= sun_p["line"] <= 6
    assert 1 <= sun_d["gate"] <= 64
    assert 1 <= sun_d["line"] <= 6


def test_human_design_design_before_birth():
    response = client.post("/api/v1/chart/human-design", json=CHART)
    assert response.status_code == 200
    data = response.json()

    birth = data["meta"]["birth_datetime_utc"]
    design = data["meta"]["design_datetime_utc"]
    assert design < birth
    assert data["meta"]["design_solar_arc_degrees"] == 88.0


def test_human_design_rejects_invalid_coords():
    bad = {**CHART, "latitude": 999}
    response = client.post("/api/v1/chart/human-design", json=bad)
    assert response.status_code == 422
