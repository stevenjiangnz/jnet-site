"""Test to verify ADX components in default indicators."""

import pytest
from app.indicators.config import DEFAULT_INDICATORS, INDICATOR_METADATA


def test_adx_in_defaults():
    """Verify ADX_14 is in default indicators."""
    assert "ADX_14" in DEFAULT_INDICATORS
    print(f"\n✓ ADX_14 is in DEFAULT_INDICATORS: {DEFAULT_INDICATORS}")


def test_adx_metadata():
    """Verify ADX metadata includes all three outputs."""
    assert "ADX_14" in INDICATOR_METADATA
    adx_meta = INDICATOR_METADATA["ADX_14"]
    
    print(f"\n✓ ADX_14 metadata:")
    print(f"  - Display name: {adx_meta['display_name']}")
    print(f"  - Category: {adx_meta['category']}")
    print(f"  - Description: {adx_meta['description']}")
    print(f"  - Outputs: {adx_meta['outputs']}")
    
    # Verify all three outputs are defined
    assert adx_meta["outputs"] == ["ADX", "DI+", "DI-"]
    print("\n✓ All three components (ADX, DI+, DI-) are included in outputs")


@pytest.mark.asyncio
async def test_adx_calculation_outputs():
    """Test that ADX calculation produces all three outputs."""
    from app.indicators.calculator import IndicatorCalculator
    from app.models.stock_data import StockDataFile, StockDataPoint, DataRange, StockMetadata
    from datetime import date, datetime, timedelta
    
    # Create sample data
    data_points = []
    base_date = date(2024, 1, 1)
    
    for i in range(50):
        price = 100.0 + i * 0.5
        data_points.append(StockDataPoint(
            date=base_date + timedelta(days=i),
            open=price,
            high=price + 2,
            low=price - 1,
            close=price + 1,
            adj_close=price + 1,
            volume=1000000
        ))
    
    stock_data = StockDataFile(
        symbol="TEST",
        data_type="daily",
        last_updated=datetime.utcnow(),
        data_range=DataRange(start=data_points[0].date, end=data_points[-1].date),
        data_points=data_points,
        metadata=StockMetadata(
            total_records=len(data_points),
            trading_days=len(data_points),
            source="test"
        )
    )
    
    calculator = IndicatorCalculator()
    indicators = await calculator.calculate_for_data(stock_data, ["ADX_14"])
    
    assert "ADX_14" in indicators
    adx_data = indicators["ADX_14"]
    
    # Check a value after warmup period
    test_value = adx_data.values[40]  # Well after warmup
    
    print(f"\n✓ Sample ADX calculation (Day 40):")
    print(f"  - Date: {test_value.date}")
    print(f"  - ADX: {test_value.values.get('ADX')}")
    print(f"  - DI+: {test_value.values.get('DI+')}")
    print(f"  - DI-: {test_value.values.get('DI-')}")
    
    # Verify all components exist
    assert "ADX" in test_value.values
    assert "DI+" in test_value.values
    assert "DI-" in test_value.values
    
    print("\n✓ All three components are calculated and included")