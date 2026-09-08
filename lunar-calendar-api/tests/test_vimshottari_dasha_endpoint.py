"""Tests for POST /api/v1/chart/vimshottari-dasha."""

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

CHART = {
    "natal": {
        "datetime_utc": "1990-06-15T14:30:00Z",
        "latitude": 55.7558,
        "longitude": 37.6173,
        "house_system": "placidus",
    }
}


def test_vimshottari_dasha_returns_timeline():
    response = client.post("/api/v1/chart/vimshottari-dasha", json=CHART)
    assert response.status_code == 200
    data = response.json()

    assert data["meta"]["system"] == "Vimshottari"
    assert data["meta"]["ayanamsa_type"] == "Lahiri"
    assert "birth_nakshatra" in data
    assert "birth_dasha_lord" in data
    assert len(data["mahadashas"]) >= 9
    assert data["current"]["mahadasha"] is not None


def test_vimshottari_first_mahadasha_matches_nakshatra_ruler():
    response = client.post("/api/v1/chart/vimshottari-dasha", json=CHART)
    assert response.status_code == 200
    data = response.json()

    assert data["mahadashas"][0]["lord"] == data["birth_dasha_lord"]
    assert data["mahadashas"][0]["lord"] == data["birth_nakshatra"]["ruler"]
    assert data["mahadashas"][0]["duration_years"] == data["birth_dasha_balance_years"]


def test_vimshottari_current_at_query_date():
    payload = {
        **CHART,
        "query_datetime_utc": "2010-01-01T12:00:00Z",
    }
    response = client.post("/api/v1/chart/vimshottari-dasha", json=payload)
    assert response.status_code == 200
    data = response.json()

    maha = data["current"]["mahadasha"]
    assert maha is not None
    assert datetime.fromisoformat(maha["start"]) <= datetime(2010, 1, 1, 12, 0, tzinfo=timezone.utc)
    assert datetime.fromisoformat(maha["end"]) > datetime(2010, 1, 1, 12, 0, tzinfo=timezone.utc)


def test_vimshottari_antardashas_present():
    response = client.post("/api/v1/chart/vimshottari-dasha", json=CHART)
    assert response.status_code == 200
    data = response.json()

    first = data["mahadashas"][0]
    assert len(first["antardashas"]) == 9
    assert first["antardashas"][0]["lord"] == first["lord"]
