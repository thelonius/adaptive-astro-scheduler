"""Tests for POST /api/v1/chart/navamsa."""

from fastapi.testclient import TestClient

from app.calculators.navamsa_engine import navamsa_engine
from app.main import app

client = TestClient(app)

CHART = {
    "datetime_utc": "1990-06-15T14:30:00Z",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "house_system": "placidus",
}


def test_navamsa_endpoint_returns_chart():
    response = client.post("/api/v1/chart/navamsa", json=CHART)
    assert response.status_code == 200
    data = response.json()

    assert data["meta"]["varga"] == "D9"
    assert data["meta"]["ayanamsa_type"] == "Lahiri"
    assert len(data["planets"]) >= 9
    assert "d1" in data["planets"]["Sun"]
    assert "d9" in data["planets"]["Sun"]


def test_navamsa_d9_has_navamsa_number():
    response = client.post("/api/v1/chart/navamsa", json=CHART)
    assert response.status_code == 200
    sun = response.json()["planets"]["Sun"]

    assert 1 <= sun["d9"]["navamsa_number"] <= 9
    assert 0 <= sun["d9"]["sign_degree"] < 30


def test_navamsa_vargottama_is_boolean():
    response = client.post("/api/v1/chart/navamsa", json=CHART)
    assert response.status_code == 200
    data = response.json()

    for body, positions in data["planets"].items():
        assert isinstance(positions["is_vargottama"], bool)
        if positions["is_vargottama"]:
            assert positions["d1"]["sign"] == positions["d9"]["sign"]
            assert body in data["vargottama_planets"]


def test_navamsa_formula_movable_sign():
    d9 = navamsa_engine.navamsa_from_sidereal(15.0)
    assert d9["navamsa_number"] == 5
    assert d9["sign"] == "Leo"
