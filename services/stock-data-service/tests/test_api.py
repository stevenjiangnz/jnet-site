import pytest
from datetime import date
from unittest.mock import patch, MagicMock


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "stock-data-service"
    assert "version" in data


def test_api_health_check(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "storage" in data


@patch("app.core.data_fetcher.yf.Ticker")
def test_download_symbol(mock_ticker, client, temp_data_dir):
    # Mock yfinance response
    mock_history = MagicMock()
    mock_history.empty = False
    mock_history.iterrows.return_value = [
        (
            date(2024, 1, 1),
            {
                "Open": 100.0,
                "High": 105.0,
                "Low": 99.0,
                "Close": 103.0,
                "Adj Close": 103.0,
                "Volume": 1000000,
            },
        )
    ]

    mock_ticker_instance = MagicMock()
    mock_ticker_instance.history.return_value = mock_history
    mock_ticker.return_value = mock_ticker_instance

    response = client.get("/api/v1/download/AAPL")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["symbol"] == "AAPL"
    assert data["records"] == 1


def test_download_invalid_symbol(client):
    response = client.get("/api/v1/download/INVALID$SYMBOL")
    assert response.status_code == 400
    assert "Invalid symbol format" in response.json()["detail"]


def test_list_symbols_empty(client, temp_data_dir):
    response = client.get("/api/v1/list")
    assert response.status_code == 200
    data = response.json()
    assert data["symbols"] == []
    assert data["count"] == 0


def test_get_data_not_found(client):
    response = client.get("/api/v1/data/AAPL")
    assert response.status_code == 404
    assert "No data found" in response.json()["detail"]


def test_delete_data_not_found(client):
    response = client.delete("/api/v1/data/AAPL")
    assert response.status_code == 404
    assert "No data found" in response.json()["detail"]


def test_bulk_download(client, temp_data_dir):
    with patch("app.core.data_fetcher.data_fetcher.fetch_bulk_data") as mock_fetch:
        mock_fetch.return_value = {"AAPL": [], "GOOGL": []}

        response = client.post(
            "/api/v1/bulk-download", json={"symbols": ["AAPL", "GOOGL"]}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["total_symbols"] == 2
