"""Integration test for ADX indicator with actual download."""

import pytest
import asyncio
from app.services.download import StockDataDownloader


@pytest.mark.asyncio
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


if __name__ == "__main__":
    # Run the test directly
    asyncio.run(test_download_with_adx_indicator())