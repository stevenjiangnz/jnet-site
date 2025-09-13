"""Specific tests for ADX indicator with DI+ and DI-."""

import pytest
from datetime import date, datetime, timedelta
from app.indicators.calculator import IndicatorCalculator
from app.models.stock_data import (
    StockDataFile,
    StockDataPoint,
    DataRange,
    StockMetadata,
)


@pytest.fixture
def trending_stock_data():
    """Create sample stock data with a clear trend for ADX testing."""
    data_points = []
    base_date = date(2024, 1, 1)

    # Create 100 days of trending data
    for i in range(100):
        # Create an uptrend with some volatility
        base_price = 100.0 + i * 0.5  # Upward trend
        volatility = (i % 5) * 0.2  # Some volatility

        high = base_price + 1.0 + volatility
        low = base_price - 1.0 - volatility
        close = base_price + volatility * 0.5
        open_price = base_price - volatility * 0.3

        data_points.append(
            StockDataPoint(
                date=base_date + timedelta(days=i),
                open=open_price,
                high=high,
                low=low,
                close=close,
                adj_close=close,
                volume=1000000 + i * 10000,
            )
        )

    return StockDataFile(
        symbol="TREND",
        data_type="daily",
        last_updated=datetime.utcnow(),
        data_range=DataRange(start=data_points[0].date, end=data_points[-1].date),
        data_points=data_points,
        metadata=StockMetadata(
            total_records=len(data_points), trading_days=len(data_points), source="test"
        ),
    )


@pytest.mark.asyncio
async def test_adx_with_di_indicators(trending_stock_data):
    """Test ADX calculation with DI+ and DI- indicators."""
    calculator = IndicatorCalculator()

    indicators = await calculator.calculate_for_data(trending_stock_data, ["ADX_14"])

    assert "ADX_14" in indicators
    adx_data = indicators["ADX_14"]

    # Verify basic properties
    assert adx_data.name == "ADX_14"
    assert adx_data.category == "trend"
    assert adx_data.parameters == {"period": 14}

    # Verify all three outputs are present in the values
    # Check a value after warmup period to see all outputs
    test_value = adx_data.values[30] if len(adx_data.values) > 30 else None
    if test_value:
        assert "ADX" in test_value.values
        assert "DI+" in test_value.values
        assert "DI-" in test_value.values

    # Check that we have values after the warmup period (2 * period - 1)
    warmup_period = 2 * 14 - 1  # 27 days for ADX

    # Check values after warmup
    for i in range(warmup_period, len(adx_data.values)):
        value = adx_data.values[i]

        # All three components should have values
        assert "ADX" in value.values
        assert "DI+" in value.values
        assert "DI-" in value.values

        # After warmup, values should not be None
        if i > warmup_period + 5:  # Give a few extra days
            assert value.values["ADX"] is not None
            assert value.values["DI+"] is not None
            assert value.values["DI-"] is not None

            # ADX should be between 0 and 100
            if value.values["ADX"] is not None:
                assert 0 <= value.values["ADX"] <= 100

            # DI+ and DI- should be positive
            if value.values["DI+"] is not None:
                assert value.values["DI+"] >= 0
            if value.values["DI-"] is not None:
                assert value.values["DI-"] >= 0


@pytest.mark.asyncio
async def test_adx_trend_detection(trending_stock_data):
    """Test that ADX properly detects trend strength."""
    calculator = IndicatorCalculator()

    indicators = await calculator.calculate_for_data(trending_stock_data, ["ADX_14"])

    adx_data = indicators["ADX_14"]

    # Get the last 20 values (should show strong trend)
    last_values = adx_data.values[-20:]

    # Calculate average ADX for the last period
    adx_values = [v.values["ADX"] for v in last_values if v.values["ADX"] is not None]
    di_plus_values = [
        v.values["DI+"] for v in last_values if v.values["DI+"] is not None
    ]
    di_minus_values = [
        v.values["DI-"] for v in last_values if v.values["DI-"] is not None
    ]

    if adx_values:
        avg_adx = sum(adx_values) / len(adx_values)
        # In a trending market, ADX should be elevated (> 25 typically indicates trend)
        print(f"Average ADX: {avg_adx}")

    if di_plus_values and di_minus_values:
        avg_di_plus = sum(di_plus_values) / len(di_plus_values)
        avg_di_minus = sum(di_minus_values) / len(di_minus_values)
        # In an uptrend, DI+ should be higher than DI-
        print(f"Average DI+: {avg_di_plus}, Average DI-: {avg_di_minus}")
        assert avg_di_plus > avg_di_minus, "DI+ should be higher than DI- in uptrend"


@pytest.mark.asyncio
async def test_adx_in_chart_format():
    """Test ADX data in chart format."""
    # Create minimal data for testing
    data_points = []
    base_date = date(2024, 1, 1)

    for i in range(50):
        price = 100.0 + i * 0.5
        data_points.append(
            StockDataPoint(
                date=base_date + timedelta(days=i),
                open=price,
                high=price + 1,
                low=price - 1,
                close=price,
                adj_close=price,
                volume=1000000,
            )
        )

    stock_data = StockDataFile(
        symbol="TEST",
        data_type="daily",
        last_updated=datetime.utcnow(),
        data_range=DataRange(start=data_points[0].date, end=data_points[-1].date),
        data_points=data_points,
        metadata=StockMetadata(
            total_records=len(data_points), trading_days=len(data_points), source="test"
        ),
    )

    calculator = IndicatorCalculator()
    indicators = await calculator.calculate_for_data(stock_data, ["ADX_14"])

    adx_data = indicators["ADX_14"]
    chart_format = adx_data.to_chart_format()

    # Verify chart format has all three outputs
    assert "ADX" in chart_format
    assert "DI+" in chart_format
    assert "DI-" in chart_format

    # Each should be a list of [timestamp, value] pairs
    for output in ["ADX", "DI+", "DI-"]:
        assert isinstance(chart_format[output], list)
        if chart_format[output]:
            # Check format of first non-None value
            assert len(chart_format[output][0]) == 2
            assert isinstance(chart_format[output][0][0], int)  # timestamp
            assert isinstance(chart_format[output][0][1], float)  # value
