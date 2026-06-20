import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    from tests.test_astra_backend import _make_mock_state
    mock_state = _make_mock_state()
    with TestClient(app) as c:
        for key, val in mock_state.items():
            setattr(c.app.state, key, val)
        yield c


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_auth_token_success(client):
    payload = {
        "username": "operator@astra.demo",
        "password": "AstraOps2024!"
    }
    response = client.post("/api/v1/auth/token", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "traffic_operator"


def test_auth_token_failure(client):
    payload = {
        "username": "invalid_user",
        "password": "wrong_password"
    }
    response = client.post("/api/v1/auth/token", json=payload)
    assert response.status_code == 401


def test_protected_route_without_token(client):
    payload = {
        "event_type": "unplanned",
        "event_cause": "vehicle_breakdown",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "description": "Test",
        "vehicle_type": "heavy_vehicle",
        "corridor": "MG Road"
    }
    response = client.post("/api/v1/predict/severity", json=payload)
    assert response.status_code == 401


def test_protected_route_with_token(client):
    # Login
    auth_res = client.post("/api/v1/auth/token", json={"username": "operator@astra.demo", "password": "AstraOps2024!"})
    token = auth_res.json()["access_token"]
    
    # Predict
    payload = {
        "event_type": "unplanned",
        "event_cause": "vehicle_breakdown",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "description": "Test",
        "vehicle_type": "heavy_vehicle",
        "corridor": "MG Road"
    }
    response = client.post("/api/v1/predict/severity", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "severity" in response.json()
    assert "confidence" in response.json()

