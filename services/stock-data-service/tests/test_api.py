from unittest.mock import patch, MagicMock, AsyncMock


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


@patch.dict(
    "os.environ",
    {
        "GCS_CREDENTIALS_PATH": "",
        "GCS_PROJECT_ID": "test-project",
        "GCS_BUCKET_NAME": "test-bucket",
    },
)
@patch("app.services.download.GCSStorageManager")
@patch("app.services.download.yf.Ticker")
def test_download_symbol(mock_ticker, mock_gcs_class, client, temp_data_dir):
    # Mock GCS storage
    mock_gcs_instance = AsyncMock()
    mock_gcs_instance.upload_json.return_value = True
    mock_gcs_class.return_value = mock_gcs_instance

    # Mock yfinance response with DataFrame
    import pandas as pd

    dates = pd.date_range("2024-01-01", periods=1, freq="D")
    mock_df = pd.DataFrame(
        {
            "Open": [100.0],
            "High": [105.0],
            "Low": [99.0],
            "Close": [103.0],
            "Adj Close": [103.0],
            "Volume": [1000000],
        },
        index=dates,
    )

    mock_ticker_instance = MagicMock()
    mock_ticker_instance.history.return_value = mock_df
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


@patch.dict(
    "os.environ",
    {
        "GCS_CREDENTIALS_PATH": "",
        "GCS_PROJECT_ID": "test-project",
        "GCS_BUCKET_NAME": "test-bucket",
    },
)
@patch("app.services.download.GCSStorageManager")
def test_list_symbols_empty(mock_gcs_class, client, temp_data_dir):
    # Mock GCS storage
    mock_gcs_instance = AsyncMock()
    mock_gcs_instance.list_blobs.return_value = []
    mock_gcs_class.return_value = mock_gcs_instance

    response = client.get("/api/v1/list")
    assert response.status_code == 200
    data = response.json()
    assert data["symbols"] == []
    assert data["count"] == 0


@patch.dict(
    "os.environ",
    {
        "GCS_CREDENTIALS_PATH": "",
        "GCS_PROJECT_ID": "test-project",
        "GCS_BUCKET_NAME": "test-bucket",
    },
)
@patch("app.services.download.GCSStorageManager")
def test_get_data_not_found(mock_gcs_class, client):
    # Mock GCS storage
    mock_gcs_instance = AsyncMock()
    mock_gcs_instance.download_json.return_value = None
    mock_gcs_class.return_value = mock_gcs_instance

    response = client.get("/api/v1/data/AAPL")
    assert response.status_code == 404
    assert "No data found" in response.json()["detail"]


def test_delete_endpoint_not_implemented(client):
    """Test that DELETE endpoint is not implemented (returns 405)."""
    response = client.delete("/api/v1/data/AAPL")
    assert response.status_code == 405  # Method Not Allowed


@patch.dict(
    "os.environ",
    {
        "GCS_CREDENTIALS_PATH": "",
        "GCS_PROJECT_ID": "test-project",
        "GCS_BUCKET_NAME": "test-bucket",
    },
)
@patch("app.services.download.GCSStorageManager")
def test_bulk_download(mock_gcs_class, client, temp_data_dir):
    # Mock GCS storage
    mock_gcs_instance = AsyncMock()
    mock_gcs_instance.upload_json.return_value = True
    mock_gcs_class.return_value = mock_gcs_instance

    with patch("app.core.data_fetcher.data_fetcher.fetch_bulk_data") as mock_fetch:
        mock_fetch.return_value = {"AAPL": [], "GOOGL": []}

        response = client.post(
            "/api/v1/bulk-download", json={"symbols": ["AAPL", "GOOGL"]}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["total_symbols"] == 2
