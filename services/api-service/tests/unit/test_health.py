def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "JNet API Service"


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_readiness_endpoint(client, auth_headers):
    response = client.get("/api/v1/health/ready", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_dependencies_endpoint(client, auth_headers):
    response = client.get("/api/v1/health/dependencies", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "dependencies" in data