import pytest
from datetime import date
from unittest.mock import patch, MagicMock
from app.core.data_fetcher import DataFetcher
from app.core.exceptions import SymbolNotFoundError


def test_data_fetcher_initialization():
    fetcher = DataFetcher()
    assert fetcher._last_call_time == 0
    assert fetcher._call_count == 0


@patch("app.core.data_fetcher.yf.Ticker")
def test_fetch_stock_data_success(mock_ticker):
    # Setup mock
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

    # Test
    fetcher = DataFetcher()
    data_points = fetcher.fetch_stock_data("AAPL")

    assert len(data_points) == 1
    assert data_points[0].open == 100.0
    assert data_points[0].close == 103.0
    assert data_points[0].volume == 1000000


@patch("app.core.data_fetcher.yf.Ticker")
def test_fetch_stock_data_symbol_not_found(mock_ticker):
    # Setup mock for empty history
    mock_history = MagicMock()
    mock_history.empty = True

    mock_ticker_instance = MagicMock()
    mock_ticker_instance.history.return_value = mock_history
    mock_ticker_instance.info = {}
    mock_ticker.return_value = mock_ticker_instance

    # Test
    fetcher = DataFetcher()
    with pytest.raises(SymbolNotFoundError):
        fetcher.fetch_stock_data("INVALID")


@patch("app.core.data_fetcher.yf.Ticker")
def test_validate_symbol_valid(mock_ticker):
    mock_ticker_instance = MagicMock()
    mock_ticker_instance.info = {"symbol": "AAPL"}
    mock_ticker.return_value = mock_ticker_instance

    fetcher = DataFetcher()
    assert fetcher.validate_symbol("AAPL") is True


@patch("app.core.data_fetcher.yf.Ticker")
def test_validate_symbol_invalid(mock_ticker):
    mock_ticker_instance = MagicMock()
    mock_ticker_instance.info = {}
    mock_ticker.return_value = mock_ticker_instance

    fetcher = DataFetcher()
    assert fetcher.validate_symbol("INVALID") is False


def test_rate_limiting():
    fetcher = DataFetcher()
    fetcher._call_count = 5  # Already at limit
    fetcher._last_call_time = 0  # Old timestamp

    with patch("time.time", return_value=0.5):
        with patch("time.sleep") as mock_sleep:
            fetcher._check_rate_limit()
            mock_sleep.assert_called_once()
