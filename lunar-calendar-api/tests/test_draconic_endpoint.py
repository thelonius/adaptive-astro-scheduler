"""Tests for POST /api/v1/chart/draconic."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CHART = {
    "datetime_utc": "1990-06-15T14:30:00Z",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "house_system": "placidus",
}


def test_draconic_endpoint_returns_chart():
    response = client.post("/api/v1/chart/draconic", json=CHART)
    assert response.status_code == 200
    data = response.json()

    assert "planets" in data
    assert "north_node_longitude" in data
    assert "aspects" in data
    assert data["meta"]["chart_type"] == "draconic"
    assert len(data["planets"]) >= 10


def test_draconic_rahu_at_zero_aries():
    response = client.post("/api/v1/chart/draconic", json=CHART)
    assert response.status_code == 200
    data = response.json()

    rahu = data["planets"].get("Rahu")
    assert rahu is not None, "Rahu must be present in draconic chart"
    assert rahu["sign"] == "Aries"
    assert rahu["sign_degree"] < 0.01 or rahu["longitude"] < 0.01


def test_draconic_ketu_opposite_rahu():
    response = client.post("/api/v1/chart/draconic", json=CHART)
    assert response.status_code == 200
    data = response.json()

    rahu_lon = data["planets"]["Rahu"]["longitude"]
    ketu_lon = data["planets"]["Ketu"]["longitude"]
    diff = abs(rahu_lon - ketu_lon)
    assert abs(diff - 180) < 0.1 or abs(diff - 180) > 179.9


def test_draconic_rejects_invalid_coords():
    bad = {**CHART, "latitude": 999}
    response = client.post("/api/v1/chart/draconic", json=bad)
    assert response.status_code == 422
