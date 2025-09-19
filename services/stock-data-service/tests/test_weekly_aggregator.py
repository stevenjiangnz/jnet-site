"""Tests for weekly data aggregation."""

from datetime import date, timedelta
import pytest

from app.models.stock_data import StockDataPoint
from app.services.weekly_aggregator import WeeklyAggregator


class TestWeeklyAggregator:
    """Test cases for WeeklyAggregator."""

    @pytest.fixture
    def aggregator(self):
        """Create WeeklyAggregator instance."""
        return WeeklyAggregator()

    @pytest.fixture
    def sample_daily_data(self):
        """Create sample daily data for a full week."""
        # Monday to Friday data
        data = []
        start_date = date(2024, 1, 8)  # Monday
        for i in range(5):
            current_date = start_date + timedelta(days=i)
            data.append(
                StockDataPoint(
                    date=current_date,
                    open=100.0 + i,
                    high=105.0 + i,
                    low=99.0 + i,
                    close=103.0 + i,
                    adj_close=103.0 + i,
                    volume=1000000 + i * 100000,
                )
            )
        return data

    def test_get_week_boundaries_monday(self, aggregator):
        """Test week boundaries for Monday."""
        monday = date(2024, 1, 8)
        start, end = aggregator.get_week_boundaries(monday)
        assert start == date(2024, 1, 8)
        assert end == date(2024, 1, 12)
        assert start.weekday() == 0  # Monday
        assert end.weekday() == 4  # Friday

    def test_get_week_boundaries_friday(self, aggregator):
        """Test week boundaries for Friday."""
        friday = date(2024, 1, 12)
        start, end = aggregator.get_week_boundaries(friday)
        assert start == date(2024, 1, 8)
        assert end == date(2024, 1, 12)

    def test_get_week_boundaries_wednesday(self, aggregator):
        """Test week boundaries for mid-week."""
        wednesday = date(2024, 1, 10)
        start, end = aggregator.get_week_boundaries(wednesday)
        assert start == date(2024, 1, 8)
        assert end == date(2024, 1, 12)

    def test_aggregate_week_full_week(self, aggregator, sample_daily_data):
        """Test aggregating a full trading week."""
        week_start = date(2024, 1, 8)
        week_end = date(2024, 1, 12)

        result = aggregator.aggregate_week(sample_daily_data, week_start, week_end)

        assert result.week_start == week_start
        assert result.week_ending == week_end
        assert result.open == 100.0  # First day's open
        assert result.close == 107.0  # Last day's close
        assert result.adj_close == 107.0  # Last day's adj_close
        assert result.high == 109.0  # Max high (105 + 4)
        assert result.low == 99.0  # Min low
        assert (
            result.volume == 6000000
        )  # Sum of all volumes (1000000 + 1100000 + 1200000 + 1300000 + 1400000)
        assert result.trading_days == 5

    def test_aggregate_week_partial_week(self, aggregator):
        """Test aggregating a partial week."""
        # Only 3 days of data
        data = [
            StockDataPoint(
                date=date(2024, 1, 8),
                open=100.0,
                high=105.0,
                low=99.0,
                close=103.0,
                adj_close=103.0,
                volume=1000000,
            ),
            StockDataPoint(
                date=date(2024, 1, 9),
                open=103.0,
                high=106.0,
                low=102.0,
                close=104.0,
                adj_close=104.0,
                volume=1100000,
            ),
            StockDataPoint(
                date=date(2024, 1, 10),
                open=104.0,
                high=107.0,
                low=103.0,
                close=105.0,
                adj_close=105.0,
                volume=1200000,
            ),
        ]

        week_start = date(2024, 1, 8)
        week_end = date(2024, 1, 12)

        result = aggregator.aggregate_week(data, week_start, week_end)

        assert result.open == 100.0
        assert result.close == 105.0
        assert result.high == 107.0
        assert result.low == 99.0
        assert result.volume == 3300000
        assert result.trading_days == 3

    def test_aggregate_to_weekly_empty_data(self, aggregator):
        """Test aggregating empty data."""
        result = aggregator.aggregate_to_weekly([])
        assert result == []

    def test_aggregate_to_weekly_single_day(self, aggregator):
        """Test aggregating single day data."""
        data = [
            StockDataPoint(
                date=date(2024, 1, 10),  # Wednesday
                open=100.0,
                high=105.0,
                low=99.0,
                close=103.0,
                adj_close=103.0,
                volume=1000000,
            )
        ]

        result = aggregator.aggregate_to_weekly(data)

        assert len(result) == 1
        weekly = result[0]
        assert weekly.week_start == date(2024, 1, 8)
        assert weekly.week_ending == date(2024, 1, 12)
        assert weekly.open == 100.0
        assert weekly.close == 103.0
        assert weekly.trading_days == 1

    def test_aggregate_to_weekly_multiple_weeks(self, aggregator):
        """Test aggregating data spanning multiple weeks."""
        data = []
        # Week 1: Jan 8-12, 2024
        for i in range(5):
            data.append(
                StockDataPoint(
                    date=date(2024, 1, 8) + timedelta(days=i),
                    open=100.0 + i,
                    high=105.0 + i,
                    low=99.0 + i,
                    close=103.0 + i,
                    adj_close=103.0 + i,
                    volume=1000000,
                )
            )
        # Week 2: Jan 15-19, 2024
        for i in range(5):
            data.append(
                StockDataPoint(
                    date=date(2024, 1, 15) + timedelta(days=i),
                    open=110.0 + i,
                    high=115.0 + i,
                    low=109.0 + i,
                    close=113.0 + i,
                    adj_close=113.0 + i,
                    volume=1100000,
                )
            )

        result = aggregator.aggregate_to_weekly(data)

        assert len(result) == 2

        # Check first week
        week1 = result[0]
        assert week1.week_start == date(2024, 1, 8)
        assert week1.week_ending == date(2024, 1, 12)
        assert week1.open == 100.0
        assert week1.close == 107.0
        assert week1.trading_days == 5

        # Check second week
        week2 = result[1]
        assert week2.week_start == date(2024, 1, 15)
        assert week2.week_ending == date(2024, 1, 19)
        assert week2.open == 110.0
        assert week2.close == 117.0
        assert week2.trading_days == 5

    def test_aggregate_to_weekly_unordered_data(self, aggregator):
        """Test aggregating unordered daily data."""
        data = [
            StockDataPoint(
                date=date(2024, 1, 10),  # Wednesday
                open=102.0,
                high=105.0,
                low=101.0,
                close=103.0,
                adj_close=103.0,
                volume=1000000,
            ),
            StockDataPoint(
                date=date(2024, 1, 8),  # Monday
                open=100.0,
                high=103.0,
                low=99.0,
                close=101.0,
                adj_close=101.0,
                volume=900000,
            ),
            StockDataPoint(
                date=date(2024, 1, 12),  # Friday
                open=104.0,
                high=107.0,
                low=103.0,
                close=106.0,
                adj_close=106.0,
                volume=1100000,
            ),
        ]

        result = aggregator.aggregate_to_weekly(data)

        assert len(result) == 1
        weekly = result[0]
        assert weekly.open == 100.0  # Monday's open
        assert weekly.close == 106.0  # Friday's close
        assert weekly.high == 107.0  # Max high
        assert weekly.low == 99.0  # Min low

    def test_aggregate_to_weekly_with_gaps(self, aggregator):
        """Test aggregating data with missing days (holidays)."""
        # Simulating a week with holiday on Wednesday
        data = [
            StockDataPoint(
                date=date(2024, 1, 8),  # Monday
                open=100.0,
                high=105.0,
                low=99.0,
                close=103.0,
                adj_close=103.0,
                volume=1000000,
            ),
            StockDataPoint(
                date=date(2024, 1, 9),  # Tuesday
                open=103.0,
                high=106.0,
                low=102.0,
                close=104.0,
                adj_close=104.0,
                volume=1100000,
            ),
            # Wednesday missing (holiday)
            StockDataPoint(
                date=date(2024, 1, 11),  # Thursday
                open=105.0,
                high=108.0,
                low=104.0,
                close=107.0,
                adj_close=107.0,
                volume=1200000,
            ),
            StockDataPoint(
                date=date(2024, 1, 12),  # Friday
                open=107.0,
                high=110.0,
                low=106.0,
                close=109.0,
                adj_close=109.0,
                volume=1300000,
            ),
        ]

        result = aggregator.aggregate_to_weekly(data)

        assert len(result) == 1
        weekly = result[0]
        assert weekly.trading_days == 4  # Only 4 trading days
        assert weekly.open == 100.0
        assert weekly.close == 109.0
        assert weekly.volume == 4600000

    def test_get_partial_week_boundaries(self, aggregator):
        """Test getting week boundaries for partial date ranges."""
        # Start mid-week, end mid-week
        start = date(2024, 1, 10)  # Wednesday
        end = date(2024, 1, 24)  # Wednesday of next week

        boundaries = aggregator.get_partial_week_boundaries(start, end)

        assert len(boundaries) == 3

        # First partial week
        assert boundaries[0] == (date(2024, 1, 10), date(2024, 1, 12))

        # Full week
        assert boundaries[1] == (date(2024, 1, 15), date(2024, 1, 19))

        # Last partial week
        assert boundaries[2] == (date(2024, 1, 22), date(2024, 1, 24))
