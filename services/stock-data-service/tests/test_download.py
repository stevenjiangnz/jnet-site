"""Tests for Stock Data Downloader."""

import pytest
import os
from datetime import date, datetime
from unittest.mock import Mock, patch, AsyncMock
import pandas as pd

from app.services.download import StockDataDownloader
from app.models.stock_data import StockDataFile, StockDataPoint


@pytest.fixture
def mock_yfinance():
    """Mock yfinance module."""
    with patch("app.services.download.yf") as mock_yf:
        yield mock_yf


@pytest.fixture
def mock_gcs_storage():
    """Mock GCS Storage Manager."""
    # Set environment variables before any GCS initialization
    with patch.dict(
        "os.environ",
        {
            "GCS_CREDENTIALS_PATH": "",
            "GCS_PROJECT_ID": "test-project",
            "GCS_BUCKET_NAME": "test-bucket",
        },
    ):
        with patch("app.services.download.GCSStorageManager") as mock_storage_class:
            mock_instance = AsyncMock()
            mock_storage_class.return_value = mock_instance
            yield mock_instance


@pytest.fixture
def mock_cache():
    """Mock cache service."""
    with patch("app.services.download.get_cache") as mock_get_cache:
        cache = AsyncMock()
        cache.delete = AsyncMock(return_value=True)
        cache.get_json = AsyncMock(return_value=None)
        cache.set_json = AsyncMock(return_value=True)
        mock_get_cache.return_value = cache
        yield cache


@pytest.fixture
def sample_dataframe():
    """Create sample DataFrame similar to yfinance output."""
    dates = pd.date_range("2024-01-01", periods=5, freq="D")
    data = {
        "Open": [100.0, 101.0, 102.0, 103.0, 104.0],
        "High": [101.0, 102.0, 103.0, 104.0, 105.0],
        "Low": [99.0, 100.0, 101.0, 102.0, 103.0],
        "Close": [100.5, 101.5, 102.5, 103.5, 104.5],
        "Adj Close": [100.5, 101.5, 102.5, 103.5, 104.5],
        "Volume": [1000000, 1100000, 1200000, 1300000, 1400000],
    }
    return pd.DataFrame(data, index=dates)


@pytest.mark.asyncio
async def test_download_symbol_success(
    mock_yfinance, mock_gcs_storage, mock_cache, sample_dataframe
):
    """Test successful download of stock data."""
    # Mock ticker
    mock_ticker = Mock()
    mock_ticker.history.return_value = sample_dataframe
    mock_yfinance.Ticker.return_value = mock_ticker

    # Mock storage upload
    mock_gcs_storage.upload_json.return_value = True

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    result = await downloader.download_symbol("AAPL", period="5d")

    assert result is not None
    assert isinstance(result, StockDataFile)
    assert result.symbol == "AAPL"
    assert len(result.data_points) == 5
    assert result.data_points[0].open == 100.0
    assert result.data_points[-1].close == 104.5

    # Verify storage was called twice (daily + weekly)
    assert mock_gcs_storage.upload_json.call_count == 2
    
    # Verify cache was invalidated
    assert mock_cache.delete.call_count == 2


@pytest.mark.asyncio
async def test_download_symbol_empty_data(mock_yfinance, mock_gcs_storage, mock_cache):
    """Test download with empty data response."""
    # Mock ticker with empty DataFrame
    mock_ticker = Mock()
    mock_ticker.history.return_value = pd.DataFrame()
    mock_yfinance.Ticker.return_value = mock_ticker

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    result = await downloader.download_symbol("INVALID", period="5d")

    assert result is None
    mock_gcs_storage.upload_json.assert_not_called()
    mock_cache.delete.assert_not_called()


@pytest.mark.asyncio
async def test_download_symbol_with_dates(
    mock_yfinance, mock_gcs_storage, mock_cache, sample_dataframe
):
    """Test download with specific date range."""
    # Mock ticker
    mock_ticker = Mock()
    mock_ticker.history.return_value = sample_dataframe
    mock_yfinance.Ticker.return_value = mock_ticker

    # Mock storage
    mock_gcs_storage.upload_json.return_value = True

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    start_date = date(2024, 1, 1)
    end_date = date(2024, 1, 5)

    result = await downloader.download_symbol(
        "AAPL", start_date=start_date, end_date=end_date
    )

    assert result is not None
    mock_ticker.history.assert_called_with(start=start_date, end=end_date)
    # Should upload both daily and weekly data
    assert mock_gcs_storage.upload_json.call_count == 2


@pytest.mark.asyncio
async def test_download_multiple_symbols(
    mock_yfinance, mock_gcs_storage, mock_cache, sample_dataframe
):
    """Test downloading multiple symbols."""
    # Mock ticker
    mock_ticker = Mock()
    mock_ticker.history.return_value = sample_dataframe
    mock_yfinance.Ticker.return_value = mock_ticker

    # Mock storage
    mock_gcs_storage.upload_json.return_value = True

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    symbols = ["AAPL", "GOOGL", "MSFT"]

    results = await downloader.download_multiple(symbols, period="1y")

    assert len(results) == 3
    assert all(success for success in results.values())
    # Each symbol should upload both daily and weekly data
    assert mock_gcs_storage.upload_json.call_count == 6  # 3 symbols * 2 uploads each


@pytest.mark.asyncio
async def test_get_symbol_data_success(mock_gcs_storage):
    """Test retrieving stored symbol data."""
    # Mock stored data
    stored_data = {
        "symbol": "AAPL",
        "data_type": "daily",
        "last_updated": "2024-01-01T00:00:00",
        "data_range": {"start": "2024-01-01", "end": "2024-01-05"},
        "data_points": [
            {
                "date": "2024-01-01",
                "open": 100.0,
                "high": 101.0,
                "low": 99.0,
                "close": 100.5,
                "adj_close": 100.5,
                "volume": 1000000,
            }
        ],
        "metadata": {
            "total_records": 1,
            "trading_days": 1,
            "source": "yahoo_finance",
        },
    }

    mock_gcs_storage.download_json.return_value = stored_data

    downloader = StockDataDownloader()
    # Inject the mock storage
    downloader.storage = mock_gcs_storage
    result = await downloader.get_symbol_data("AAPL")

    assert result is not None
    assert isinstance(result, StockDataFile)
    assert result.symbol == "AAPL"
    assert len(result.data_points) == 1


@pytest.mark.asyncio
async def test_get_symbol_data_not_found(mock_gcs_storage):
    """Test retrieving non-existent symbol data."""
    mock_gcs_storage.download_json.return_value = None

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    result = await downloader.get_symbol_data("INVALID")

    assert result is None


@pytest.mark.asyncio
async def test_list_available_symbols(mock_gcs_storage):
    """Test listing available symbols."""
    # Mock blob names
    mock_gcs_storage.list_blobs.return_value = [
        "stock-data/daily/AAPL.json",
        "stock-data/daily/GOOGL.json",
        "stock-data/daily/MSFT.json",
    ]

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    symbols = await downloader.list_available_symbols()

    assert len(symbols) == 3
    assert "AAPL" in symbols
    assert "GOOGL" in symbols
    assert "MSFT" in symbols
    assert symbols == sorted(symbols)  # Verify sorted


@pytest.mark.asyncio
async def test_convert_to_stock_data(mock_gcs_storage, sample_dataframe):
    """Test DataFrame to StockDataFile conversion."""
    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage

    # Test conversion
    result = await downloader._convert_to_stock_data("AAPL", sample_dataframe)

    assert isinstance(result, StockDataFile)
    assert result.symbol == "AAPL"
    assert result.data_type == "daily"
    assert len(result.data_points) == 5

    # Verify data points
    first_point = result.data_points[0]
    assert first_point.open == 100.0
    assert first_point.high == 101.0
    assert first_point.low == 99.0
    assert first_point.close == 100.5
    assert first_point.volume == 1000000

    # Verify metadata
    assert result.metadata.total_records == 5
    assert result.data_range.start == date(2024, 1, 1)
    assert result.data_range.end == date(2024, 1, 5)


@pytest.mark.asyncio
async def test_download_latest_for_symbol(
    mock_yfinance, mock_gcs_storage, sample_dataframe
):
    """Test downloading only latest data."""
    # Mock ticker
    mock_ticker = Mock()
    mock_ticker.history.return_value = sample_dataframe
    mock_yfinance.Ticker.return_value = mock_ticker

    # Mock storage
    mock_gcs_storage.upload_json.return_value = True

    downloader = StockDataDownloader()
    downloader.storage = mock_gcs_storage
    result = await downloader.download_latest_for_symbol("AAPL")

    assert result is True
    mock_ticker.history.assert_called_with(period="5d")
