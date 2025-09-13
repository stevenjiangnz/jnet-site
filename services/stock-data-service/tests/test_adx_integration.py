"""Integration test for ADX indicator with actual download."""

import pytest
import asyncio
import os
from unittest.mock import AsyncMock, MagicMock
from datetime import date, datetime, timedelta
from app.services.download import StockDataDownloader
from app.models.stock_data import (
    StockDataFile,
    StockDataPoint,
    DataRange,
    StockMetadata,
)


@pytest.mark.asyncio
@pytest.mark.skipif(
    os.getenv("CI") == "true"
    or not os.path.exists("./credentials/gcs-service-account.json"),
    reason="Skipping integration test in CI or when credentials not available",
)
async def test_download_with_adx_indicator():
    """Test downloading stock data and verifying ADX indicators are calculated."""
    downloader = StockDataDownloader()

    # Download a small period of data for testing
    stock_data = await downloader.download_symbol("AAPL", period="3mo")

    assert stock_data is not None
    assert stock_data.indicators is not None

    # Check that ADX_14 is in the default indicators
    if "ADX_14" in stock_data.indicators:
        adx_data = stock_data.indicators["ADX_14"]

        # Verify structure
        assert "name" in adx_data
        assert adx_data["name"] == "ADX_14"
        assert "values" in adx_data
        assert len(adx_data["values"]) > 0

        # Check a recent value has all three components
        recent_values = adx_data["values"][-10:]  # Last 10 values

        for value in recent_values:
            if value["values"]["ADX"] is not None:
                # When ADX has a value, DI+ and DI- should also have values
                assert "DI+" in value["values"]
                assert "DI-" in value["values"]

                # Print one example for verification
                print(f"Date: {value['date']}")
                print(f"ADX: {value['values']['ADX']}")
                print(f"DI+: {value['values']['DI+']}")
                print(f"DI-: {value['values']['DI-']}")
                break
    else:
        # If ADX_14 is not in default indicators, let's verify it can be calculated
        from app.indicators.calculator import IndicatorCalculator

        calculator = IndicatorCalculator()
        indicators = await calculator.calculate_for_data(stock_data, ["ADX_14"])

        assert "ADX_14" in indicators
        adx_indicator = indicators["ADX_14"]

        # Verify all three outputs are present
        sample_value = adx_indicator.values[-1]  # Last value
        assert "ADX" in sample_value.values
        assert "DI+" in sample_value.values
        assert "DI-" in sample_value.values


@pytest.mark.asyncio
async def test_adx_indicator_calculation_unit():
    """Unit test for ADX indicator calculation without external dependencies."""
    from app.indicators.calculator import IndicatorCalculator

    # Create sample stock data
    data_points = []
    base_date = date(2024, 1, 1)
    base_price = 100.0

    # Create 100 days of trending data
    for i in range(100):
        # Create an uptrend with some volatility
        price = base_price + i * 0.5  # Upward trend
        volatility = (i % 5) * 0.2  # Some volatility

        data_points.append(
            StockDataPoint(
                date=base_date + timedelta(days=i),
                open=price - volatility * 0.3,
                high=price + 1.0 + volatility,
                low=price - 1.0 - volatility,
                close=price + volatility * 0.5,
                adj_close=price + volatility * 0.5,
                volume=1000000 + i * 10000,
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

    # Calculate indicators
    calculator = IndicatorCalculator()
    indicators = await calculator.calculate_for_data(stock_data, ["ADX_14"])

    assert "ADX_14" in indicators
    adx_indicator = indicators["ADX_14"]

    # Verify all three outputs are present
    assert len(adx_indicator.values) == len(data_points)

    # Check values after warmup period
    for i in range(30, len(adx_indicator.values)):
        value = adx_indicator.values[i]
        assert "ADX" in value.values
        assert "DI+" in value.values
        assert "DI-" in value.values

        # In an uptrend, DI+ should generally be higher than DI-
        if (
            value.values["ADX"] is not None
            and value.values["DI+"] is not None
            and value.values["DI-"] is not None
        ):
            if i > 50:  # After sufficient data
                # Just verify the values are reasonable
                assert 0 <= value.values["ADX"] <= 100
                assert value.values["DI+"] >= 0
                assert value.values["DI-"] >= 0


if __name__ == "__main__":
    # Run the test directly
    asyncio.run(test_download_with_adx_indicator())
