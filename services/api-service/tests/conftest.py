import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"X-API-Key": settings.api_key}


@pytest.fixture
def mock_stock_data():
    return [
        {
            "date": "2024-01-01",
            "open": 100.0,
            "high": 105.0,
            "low": 99.0,
            "close": 103.0,
            "volume": 1000000,
        },
        {
            "date": "2024-01-02",
            "open": 103.0,
            "high": 107.0,
            "low": 102.0,
            "close": 106.0,
            "volume": 1200000,
        },
    ]
