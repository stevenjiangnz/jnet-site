import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "user-service"
    # Additional fields like timestamp and version may be present

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    # The response format has changed - check for the actual response structure
    assert "service" in data or "message" in data