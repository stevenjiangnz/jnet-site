"""Integration tests for weekly data aggregation pipeline."""

import pytest
from datetime import date, datetime
from unittest.mock import Mock, patch, AsyncMock
import pandas as pd

from app.models.stock_data import StockDataFile, StockDataPoint, DataRange, StockMetadata
from app.services.download import StockDataDownloader
from app.services.weekly_aggregator import WeeklyAggregator


class TestWeeklyIntegration:
    """Integration tests for weekly data processing."""

    @pytest.fixture
    def mock_gcs_storage(self):
        """Mock GCS storage manager."""
        with patch("app.services.download.GCSStorageManager") as mock:
            instance = mock.return_value
            instance.upload_json = AsyncMock(return_value=True)
            instance.download_json = AsyncMock(return_value=None)
            yield instance

    @pytest.fixture
    def mock_cache(self):
        """Mock cache service."""
        with patch("app.services.download.get_cache") as mock:
            cache = mock.return_value
            cache.delete = AsyncMock(return_value=True)
            cache.get_json = AsyncMock(return_value=None)
            cache.set_json = AsyncMock(return_value=True)
            yield cache

    @pytest.fixture
    def sample_dataframe(self):
        """Create a sample DataFrame for testing."""
        dates = pd.date_range(start="2024-01-01", end="2024-01-19", freq="B")
        data = {
            "Open": [100.0, 102.0, 101.0, 103.0, 104.0, 105.0, 106.0, 107.0, 
                    108.0, 109.0, 110.0, 111.0, 112.0, 113.0, 114.0],
            "High": [101.0, 103.0, 102.0, 104.0, 105.0, 106.0, 107.0, 108.0,
                    109.0, 110.0, 111.0, 112.0, 113.0, 114.0, 115.0],
            "Low": [99.0, 101.0, 100.0, 102.0, 103.0, 104.0, 105.0, 106.0,
                   107.0, 108.0, 109.0, 110.0, 111.0, 112.0, 113.0],
            "Close": [100.5, 102.5, 101.5, 103.5, 104.5, 105.5, 106.5, 107.5,
                     108.5, 109.5, 110.5, 111.5, 112.5, 113.5, 114.5],
            "Adj Close": [100.5, 102.5, 101.5, 103.5, 104.5, 105.5, 106.5, 107.5,
                         108.5, 109.5, 110.5, 111.5, 112.5, 113.5, 114.5],
            "Volume": [1000000, 1100000, 1200000, 1300000, 1400000,
                      1500000, 1600000, 1700000, 1800000, 1900000,
                      2000000, 2100000, 2200000, 2300000, 2400000],
        }
        return pd.DataFrame(data, index=dates)

    @pytest.mark.asyncio
    async def test_download_with_weekly_processing(
        self, mock_gcs_storage, mock_cache, sample_dataframe
    ):
        """Test that downloading daily data triggers weekly processing."""
        # Mock yfinance
        with patch("yfinance.Ticker") as mock_ticker:
            mock_ticker.return_value.history.return_value = sample_dataframe

            downloader = StockDataDownloader()
            
            # Download symbol data
            result = await downloader.download_symbol("AAPL", period="1mo")
            
            assert result is not None
            assert result.symbol == "AAPL"
            
            # Verify both daily and weekly data were uploaded
            assert mock_gcs_storage.upload_json.call_count == 2
            
            # Check daily data upload
            daily_call = mock_gcs_storage.upload_json.call_args_list[0]
            assert daily_call[0][0] == "stock-data/daily/AAPL.json"
            daily_data = daily_call[0][1]
            assert daily_data["data_type"] == "daily"
            
            # Check weekly data upload
            weekly_call = mock_gcs_storage.upload_json.call_args_list[1]
            assert weekly_call[0][0] == "stock-data/weekly/AAPL.json"
            weekly_data = weekly_call[0][1]
            assert weekly_data["data_type"] == "weekly"
            
            # Verify cache was invalidated for both
            assert mock_cache.delete.call_count == 2

    @pytest.mark.asyncio
    async def test_weekly_data_retrieval(self, mock_gcs_storage):
        """Test retrieving weekly data from storage."""
        # Mock weekly data in storage
        mock_weekly_data = {
            "symbol": "AAPL",
            "data_type": "weekly",
            "data_points": [
                {
                    "week_start": "2024-01-01",
                    "week_ending": "2024-01-05",
                    "open": 100.0,
                    "high": 105.0,
                    "low": 99.0,
                    "close": 104.5,
                    "adj_close": 104.5,
                    "volume": 6500000,
                    "trading_days": 5,
                }
            ],
            "data_range": {"start": "2024-01-01", "end": "2024-01-05"},
            "metadata": {
                "total_records": 1,
                "trading_days": 5,
                "source": "yahoo_finance",
            },
            "last_updated": "2024-01-20T10:00:00",
        }
        mock_gcs_storage.download_json.return_value = mock_weekly_data
        
        downloader = StockDataDownloader()
        weekly_data = await downloader.get_weekly_data("AAPL")
        
        assert weekly_data is not None
        assert weekly_data.symbol == "AAPL"
        assert weekly_data.data_type == "weekly"
        assert len(weekly_data.data_points) == 1
        assert weekly_data.data_points[0].week_start == date(2024, 1, 1)
        assert weekly_data.data_points[0].week_ending == date(2024, 1, 5)

    @pytest.mark.asyncio
    async def test_weekly_aggregation_accuracy(self):
        """Test accuracy of weekly aggregation calculations."""
        # Create daily data for 2 full weeks
        daily_points = []
        
        # Week 1: Jan 1-5, 2024 (Monday to Friday)
        week1_dates = [date(2024, 1, 1), date(2024, 1, 2), date(2024, 1, 3),
                      date(2024, 1, 4), date(2024, 1, 5)]
        for i, d in enumerate(week1_dates):
            daily_points.append(
                StockDataPoint(
                    date=d,
                    open=100.0 + i,
                    high=105.0 + i,
                    low=99.0 + i,
                    close=103.0 + i,
                    adj_close=103.0 + i,
                    volume=1000000 + i * 100000,
                )
            )
        
        # Week 2: Jan 8-12, 2024
        week2_dates = [date(2024, 1, 8), date(2024, 1, 9), date(2024, 1, 10),
                      date(2024, 1, 11), date(2024, 1, 12)]
        for i, d in enumerate(week2_dates):
            daily_points.append(
                StockDataPoint(
                    date=d,
                    open=110.0 + i,
                    high=115.0 + i,
                    low=109.0 + i,
                    close=113.0 + i,
                    adj_close=113.0 + i,
                    volume=1500000 + i * 100000,
                )
            )
        
        aggregator = WeeklyAggregator()
        weekly_points = aggregator.aggregate_to_weekly(daily_points)
        
        assert len(weekly_points) == 2
        
        # Check week 1 aggregation
        week1 = weekly_points[0]
        assert week1.week_start == date(2024, 1, 1)
        assert week1.week_ending == date(2024, 1, 5)
        assert week1.open == 100.0  # First day's open
        assert week1.close == 107.0  # Last day's close
        assert week1.high == 109.0  # Max high (105 + 4)
        assert week1.low == 99.0  # Min low
        assert week1.volume == 6000000  # Sum of volumes
        assert week1.trading_days == 5
        
        # Check week 2 aggregation
        week2 = weekly_points[1]
        assert week2.week_start == date(2024, 1, 8)
        assert week2.week_ending == date(2024, 1, 12)
        assert week2.open == 110.0
        assert week2.close == 117.0
        assert week2.high == 119.0  # Max high (115 + 4)
        assert week2.low == 109.0
        assert week2.volume == 8500000
        assert week2.trading_days == 5

    @pytest.mark.asyncio
    async def test_partial_week_handling(self):
        """Test handling of partial weeks in aggregation."""
        # Create data for partial week (only 3 days)
        daily_points = [
            StockDataPoint(
                date=date(2024, 1, 1),  # Monday
                open=100.0,
                high=105.0,
                low=99.0,
                close=103.0,
                adj_close=103.0,
                volume=1000000,
            ),
            StockDataPoint(
                date=date(2024, 1, 2),  # Tuesday
                open=103.0,
                high=106.0,
                low=102.0,
                close=104.0,
                adj_close=104.0,
                volume=1100000,
            ),
            StockDataPoint(
                date=date(2024, 1, 3),  # Wednesday
                open=104.0,
                high=107.0,
                low=103.0,
                close=105.0,
                adj_close=105.0,
                volume=1200000,
            ),
        ]
        
        aggregator = WeeklyAggregator()
        weekly_points = aggregator.aggregate_to_weekly(daily_points)
        
        assert len(weekly_points) == 1
        week = weekly_points[0]
        assert week.trading_days == 3  # Only 3 trading days
        assert week.volume == 3300000  # Sum of 3 days

    @pytest.mark.asyncio
    async def test_empty_daily_data_handling(self, mock_gcs_storage, mock_cache):
        """Test that empty daily data doesn't break weekly processing."""
        # Mock empty DataFrame
        with patch("yfinance.Ticker") as mock_ticker:
            mock_ticker.return_value.history.return_value = pd.DataFrame()
            
            downloader = StockDataDownloader()
            result = await downloader.download_symbol("INVALID", period="1mo")
            
            assert result is None
            # Should not attempt to upload weekly data for empty daily data
            assert mock_gcs_storage.upload_json.call_count == 0