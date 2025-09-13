"""Tests for technical indicators calculation."""

import pytest
from datetime import date, datetime, timedelta
from app.indicators.calculator import IndicatorCalculator
from app.indicators.config import DEFAULT_INDICATORS, INDICATOR_SETS
from app.indicators.models import IndicatorData, IndicatorValue
from app.models.stock_data import StockDataFile, StockDataPoint, DataRange, StockMetadata


@pytest.fixture
def sample_stock_data():
    """Create sample stock data for testing."""
    data_points = []
    
    # Create 60 days of sample data
    base_price = 100.0
    base_date = date(2024, 1, 1)
    for i in range(60):
        # Create some price movement
        price_change = (i % 10 - 5) * 0.5  # Oscillating price
        price = base_price + price_change + i * 0.1  # Slight upward trend
        
        current_date = base_date + timedelta(days=i)
        
        data_points.append(StockDataPoint(
            date=current_date,
            open=price - 0.5,
            high=price + 1.0,
            low=price - 1.5,
            close=price,
            adj_close=price,
            volume=1000000 + i * 10000
        ))
    
    return StockDataFile(
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


@pytest.fixture
def calculator():
    """Create an IndicatorCalculator instance."""
    return IndicatorCalculator()


@pytest.mark.asyncio
async def test_calculate_sma(calculator, sample_stock_data):
    """Test SMA calculation."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        ["SMA_20"]
    )
    
    assert "SMA_20" in indicators
    sma_data = indicators["SMA_20"]
    
    assert isinstance(sma_data, IndicatorData)
    assert sma_data.name == "SMA_20"
    assert sma_data.category == "trend"
    assert len(sma_data.values) == len(sample_stock_data.data_points)
    
    # First 19 values should be None
    for i in range(19):
        assert sma_data.values[i].values["SMA"] is None
    
    # 20th value and onwards should have values
    for i in range(19, len(sma_data.values)):
        assert sma_data.values[i].values["SMA"] is not None
        assert isinstance(sma_data.values[i].values["SMA"], float)


@pytest.mark.asyncio
async def test_calculate_rsi(calculator, sample_stock_data):
    """Test RSI calculation."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        ["RSI_14"]
    )
    
    assert "RSI_14" in indicators
    rsi_data = indicators["RSI_14"]
    
    assert rsi_data.name == "RSI_14"
    assert rsi_data.category == "momentum"
    
    # Check RSI values are in valid range (0-100)
    for value in rsi_data.values:
        if value.values["RSI"] is not None:
            assert 0 <= value.values["RSI"] <= 100


@pytest.mark.asyncio
async def test_calculate_macd(calculator, sample_stock_data):
    """Test MACD calculation."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        ["MACD"]
    )
    
    assert "MACD" in indicators
    macd_data = indicators["MACD"]
    
    assert macd_data.name == "MACD"
    assert macd_data.category == "momentum"
    
    # Check MACD has all three outputs
    for value in macd_data.values[35:]:  # After warmup period
        assert "MACD" in value.values
        assert "signal" in value.values
        assert "histogram" in value.values


@pytest.mark.asyncio
async def test_calculate_bollinger_bands(calculator, sample_stock_data):
    """Test Bollinger Bands calculation."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        ["BB_20"]
    )
    
    assert "BB_20" in indicators
    bb_data = indicators["BB_20"]
    
    assert bb_data.name == "BB_20"
    assert bb_data.category == "volatility"
    
    # Check BB has all three bands
    for value in bb_data.values[20:]:  # After warmup period
        if all(v is not None for v in value.values.values()):
            assert value.values["upper"] > value.values["middle"]
            assert value.values["middle"] > value.values["lower"]


@pytest.mark.asyncio
async def test_calculate_volume_sma(calculator, sample_stock_data):
    """Test Volume SMA calculation."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        ["VOLUME_SMA_20"]
    )
    
    assert "VOLUME_SMA_20" in indicators
    vol_sma_data = indicators["VOLUME_SMA_20"]
    
    assert vol_sma_data.name == "VOLUME_SMA_20"
    assert vol_sma_data.category == "volume"
    
    # Check values after warmup
    for i in range(20, len(vol_sma_data.values)):
        assert vol_sma_data.values[i].values["Volume_SMA"] is not None


@pytest.mark.asyncio
async def test_calculate_multiple_indicators(calculator, sample_stock_data):
    """Test calculating multiple indicators at once."""
    indicators = await calculator.calculate_for_data(
        sample_stock_data,
        DEFAULT_INDICATORS
    )
    
    # All default indicators should be calculated
    for indicator_name in DEFAULT_INDICATORS:
        assert indicator_name in indicators


@pytest.mark.asyncio
async def test_insufficient_data(calculator):
    """Test behavior with insufficient data."""
    # Create data with only 10 points
    data_points = []
    base_date = date(2024, 1, 1)
    for i in range(10):
        data_points.append(StockDataPoint(
            date=base_date + timedelta(days=i),
            open=100.0,
            high=101.0,
            low=99.0,
            close=100.0,
            adj_close=100.0,
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
    
    # Try to calculate SMA_50 which needs 50 data points
    indicators = await calculator.calculate_for_data(
        stock_data,
        ["SMA_50"]
    )
    
    # Should return empty dict due to insufficient data
    assert "SMA_50" not in indicators


@pytest.mark.asyncio
async def test_indicator_value_model():
    """Test IndicatorValue model."""
    value = IndicatorValue(
        date=date(2024, 1, 1),
        values={"SMA": 100.5, "signal": None}
    )
    
    assert value.date == date(2024, 1, 1)
    assert value.values["SMA"] == 100.5
    assert value.values["signal"] is None


@pytest.mark.asyncio
async def test_indicator_data_model():
    """Test IndicatorData model."""
    data = IndicatorData(
        name="TEST_IND",
        display_name="Test Indicator",
        category="test",
        parameters={"period": 20},
        values=[
            IndicatorValue(date=date(2024, 1, 1), values={"value": 100.0}),
            IndicatorValue(date=date(2024, 1, 2), values={"value": 101.0})
        ]
    )
    
    assert data.name == "TEST_IND"
    assert len(data.values) == 2
    
    # Test get_latest_value
    latest = data.get_latest_value()
    assert latest == {"value": 101.0}
    
    # Test get_value_at_date
    value_at_date = data.get_value_at_date(date(2024, 1, 1))
    assert value_at_date == {"value": 100.0}
    
    # Test to_chart_format
    chart_format = data.to_chart_format()
    assert "value" in chart_format
    assert len(chart_format["value"]) == 2


@pytest.mark.asyncio
async def test_indicator_sets():
    """Test indicator set management."""
    from app.indicators.indicator_sets import IndicatorSetManager
    
    # Test predefined sets
    basic_indicators = IndicatorSetManager.get_indicators("chart_basic")
    assert "SMA_20" in basic_indicators
    assert "SMA_50" in basic_indicators
    
    # Test comma-separated
    custom_indicators = IndicatorSetManager.get_indicators("RSI_14,MACD,BB_20")
    assert len(custom_indicators) == 3
    assert "RSI_14" in custom_indicators
    
    # Test 'all' keyword
    all_indicators = IndicatorSetManager.get_indicators("all")
    assert len(all_indicators) > 10  # Should have many indicators
    
    # Test validation
    valid = IndicatorSetManager.validate_indicators(["SMA_20", "INVALID", "RSI_14"])
    assert len(valid) == 2
    assert "INVALID" not in valid