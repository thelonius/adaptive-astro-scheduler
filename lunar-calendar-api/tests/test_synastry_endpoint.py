"""Tests for POST /api/v1/chart/synastry."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CHART_A = {
    "datetime_utc": "1990-06-15T14:30:00Z",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "house_system": "placidus",
}

CHART_B = {
    "datetime_utc": "1992-03-20T08:00:00Z",
    "latitude": 48.8566,
    "longitude": 2.3522,
    "house_system": "placidus",
}


def test_synastry_endpoint_returns_inter_aspects():
    response = client.post(
        "/api/v1/chart/synastry",
        json={
            "chart_a": CHART_A,
            "chart_b": CHART_B,
            "aspect_categories": "major",
        },
    )
    assert response.status_code == 200
    data = response.json()

    assert "chart_a_meta" in data
    assert "chart_b_meta" in data
    assert "inter_aspects" in data
    assert isinstance(data["inter_aspects"], list)
    assert len(data["inter_aspects"]) > 0

    first = data["inter_aspects"][0]
    assert "chart_a_point" in first
    assert "chart_b_point" in first
    assert "aspect" in first
    assert "orb" in first


def test_synastry_aspects_sorted_by_orb():
    response = client.post(
        "/api/v1/chart/synastry",
        json={"chart_a": CHART_A, "chart_b": CHART_B},
    )
    assert response.status_code == 200
    orbs = [a["orb"] for a in response.json()["inter_aspects"]]
    assert orbs == sorted(orbs)


def test_synastry_rejects_missing_chart_b():
    response = client.post(
        "/api/v1/chart/synastry",
        json={"chart_a": CHART_A},
    )
    assert response.status_code == 422
