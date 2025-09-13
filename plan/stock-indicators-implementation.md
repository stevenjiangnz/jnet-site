# Stock Data Service - Technical Indicators Implementation Plan (Final)

## Overview
Integrate technical indicators calculation directly into the stock data download and retrieval process, providing unified endpoints that return both price and indicator data together. All data (price + indicators) will be stored in a single JSON file per symbol.

## Key Design Decisions
1. **Calculate indicators during download** - Indicators computed immediately after price data is downloaded
2. **Single file storage** - One JSON file contains both price and indicators (no backward compatibility needed)
3. **Recalculate all indicators on updates** - Ensures accuracy for technical analysis
4. **Enhanced endpoints** - Return price + indicators together for charting and scanning
5. **pandas-ta library** - Industry-standard technical analysis library for Python

## Architecture Design

### 1. Directory Structure
```
services/stock-data-service/
├── app/
│   ├── indicators/
│   │   ├── __init__.py
│   │   ├── calculator.py        # Main indicator calculation engine
│   │   ├── config.py            # Indicator definitions and defaults
│   │   ├── models.py            # Pydantic models for indicators
│   │   └── indicator_sets.py    # Predefined indicator sets (chart, scan, etc.)
│   ├── models/
│   │   ├── stock_data.py        # Enhanced to include indicators
│   │   └── responses.py         # Enhanced response models
│   ├── services/
│   │   └── download.py          # Enhanced to calculate indicators
│   └── api/v1/endpoints/
│       └── data.py              # Enhanced/new endpoints
```

### 2. Storage Structure
```
GCS Bucket Structure:
stock-data/
├── daily/
│   ├── AAPL.json          # Contains price + indicators
│   ├── MSFT.json          # Contains price + indicators
│   └── {SYMBOL}.json      # One file per symbol (uppercase)
├── weekly/
│   ├── AAPL.json          # Weekly price + indicators
│   ├── MSFT.json          # Weekly price + indicators
│   └── {SYMBOL}.json      # One file per symbol (uppercase)
└── metadata/
    ├── profile.json
    └── symbol-index.json
```

### 3. Data Model
```python
# Enhanced StockDataFile includes indicators
class StockDataFile:
    symbol: str
    timeframe: str  # "daily" or "weekly"
    data_points: List[StockDataPoint]
    indicators: Dict[str, IndicatorData]  # NEW: Indicators stored here
    metadata: StockMetadata
    
class IndicatorData:
    name: str
    display_name: str
    category: str  # trend, momentum, volatility, volume
    parameters: Dict[str, Any]
    values: List[IndicatorValue]
    
class IndicatorValue:
    date: date
    values: Dict[str, float]  # e.g., {"MACD": 1.23, "signal": 1.08, "histogram": 0.15}
```

## Download and Calculation Flow

### 1. Initial Full Download
```python
async def download_symbol(self, symbol: str, period: str = "max"):
    # Step 1: Download price data from Yahoo Finance
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period)
    
    # Step 2: Convert to StockDataFile model
    stock_data = await self._convert_to_stock_data(symbol, df)
    
    # Step 3: Calculate indicators on the downloaded data
    if self.calculate_indicators_enabled:
        indicator_calculator = IndicatorCalculator()
        indicators = await indicator_calculator.calculate_for_data(
            stock_data,
            self.default_indicators  # ["SMA_20", "SMA_50", "RSI_14", "MACD", "VOLUME_SMA_20"]
        )
        stock_data.indicators = indicators
    
    # Step 4: Save complete data (price + indicators) to GCS
    storage_path = StoragePaths.get_daily_path(symbol)  # e.g., "stock-data/daily/AAPL.json"
    await self.storage.upload_json(storage_path, stock_data.to_dict())
    
    # Step 5: Process weekly aggregation with indicators
    await self._process_weekly_data(stock_data)
```

### 2. Daily Incremental Updates
```python
async def update_symbol_with_new_data(self, symbol: str):
    # Step 1: Load existing data from GCS (includes previous indicators)
    existing_data = await self.get_symbol_data(symbol)
    last_date = existing_data.data_points[-1].date
    
    # Step 2: Download only new data from Yahoo Finance
    ticker = yf.Ticker(symbol)
    df_new = ticker.history(start=last_date + timedelta(days=1))
    
    if df_new.empty:
        return  # No new data
    
    # Step 3: Append new price data points
    new_points = self._convert_to_data_points(df_new)
    existing_data.data_points.extend(new_points)
    
    # Step 4: Recalculate ALL indicators with full dataset
    # (Required for accuracy - most indicators need full history)
    indicator_calculator = IndicatorCalculator()
    indicators = await indicator_calculator.calculate_for_data(
        existing_data,
        self.default_indicators
    )
    existing_data.indicators = indicators
    
    # Step 5: Save updated data back to GCS
    storage_path = StoragePaths.get_daily_path(symbol)
    await self.storage.upload_json(storage_path, existing_data.to_dict())
```

## Indicator Configuration

### 1. Default Indicators
```python
# Automatically calculated for all symbols
DEFAULT_INDICATORS = [
    "SMA_20",      # 20-day Simple Moving Average
    "SMA_50",      # 50-day Simple Moving Average  
    "RSI_14",      # 14-day Relative Strength Index
    "MACD",        # MACD (12,26,9)
    "VOLUME_SMA_20" # 20-day Volume Moving Average
]
```

### 2. Indicator Sets for Different Use Cases
```python
CHART_INDICATORS = {
    "basic": ["SMA_20", "SMA_50", "VOLUME_SMA_20"],
    "advanced": ["SMA_20", "SMA_50", "EMA_12", "EMA_26", "MACD", "RSI_14", "BB_20"],
    "full": ["SMA_20", "SMA_50", "SMA_200", "EMA_12", "EMA_26", 
             "MACD", "RSI_14", "BB_20", "ADX_14", "ATR_14", "VOLUME_SMA_20"]
}

SCAN_INDICATORS = {
    "momentum": ["RSI_14", "MACD", "STOCH"],
    "trend": ["ADX_14", "SMA_20", "SMA_50", "SMA_200"],
    "volatility": ["ATR_14", "BB_20"],
    "volume": ["OBV", "VOLUME_SMA_20", "CMF_20"]
}
```

### 3. Minimum Data Requirements
```python
INDICATOR_MIN_PERIODS = {
    "SMA_20": 20,
    "SMA_50": 50,
    "SMA_200": 200,
    "EMA_12": 25,      # 2x period for stability
    "EMA_26": 50,
    "RSI_14": 15,
    "MACD": 35,        # 26 + 9 signal period
    "BB_20": 20,
    "ADX_14": 28,      # 2x period
    "ATR_14": 15,
    "STOCH": 14,
    "OBV": 2,
    "CMF_20": 21
}
```

## API Endpoints

### 1. Enhanced Get Symbol Data
```
GET /api/data/{symbol}?indicators=chart_basic

Query Parameters:
- indicators: Comma-separated list or preset name
  - Examples: "SMA_20,RSI_14,MACD" or "chart_basic" or "all"
- start_date: Optional start date
- end_date: Optional end date

Response includes both price and indicators:
{
  "symbol": "AAPL",
  "timeframe": "daily",
  "data_points": [...],
  "indicators": {
    "SMA_20": {
      "name": "SMA_20",
      "display_name": "Simple Moving Average (20)",
      "category": "trend",
      "parameters": {"period": 20},
      "values": [
        {"date": "2024-01-15", "value": 150.25},
        ...
      ]
    },
    ...
  }
}
```

### 2. Chart-Optimized Endpoint
```
GET /api/chart/{symbol}?period=1y&indicators=advanced

Response optimized for charting libraries:
{
  "symbol": "AAPL",
  "period": "1y",
  "ohlc": [[timestamp, open, high, low, close], ...],
  "volume": [[timestamp, volume], ...],
  "indicators": {
    "SMA_20": [[timestamp, value], ...],
    "MACD": {
      "MACD": [[timestamp, value], ...],
      "signal": [[timestamp, value], ...],
      "histogram": [[timestamp, value], ...]
    }
  }
}
```

### 3. Scanner Endpoint
```
POST /api/scan

Request:
{
  "symbols": ["AAPL", "MSFT", "GOOGL"],
  "conditions": [
    {"indicator": "RSI_14", "operator": "<", "value": 30},
    {"indicator": "PRICE", "operator": "above", "indicator_ref": "SMA_50"}
  ],
  "return_data": ["latest_price", "RSI_14", "MACD"]
}
```

### 4. List Available Indicators
```
GET /api/indicators

Response:
{
  "indicators": [
    {
      "name": "MACD",
      "category": "momentum",
      "description": "Moving Average Convergence Divergence",
      "parameters": [...],
      "outputs": ["MACD", "signal", "histogram"]
    },
    ...
  ]
}
```

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
1. Install pandas-ta: `uv add pandas-ta`
2. Create indicator module structure
3. Implement IndicatorCalculator class
4. Add indicator fields to existing models
5. Implement 10 core indicators

### Phase 2: Integration with Download (Week 1-2)
1. Enhance download service to calculate indicators
2. Update data models to include indicators
3. Ensure indicators are calculated for both daily and weekly data
4. Test with multiple symbols

### Phase 3: API Development (Week 2)
1. Enhance existing /data endpoints with indicator parameter
2. Create new /chart endpoint for optimized data
3. Implement /scan endpoint for screening
4. Add /indicators endpoint for listing available indicators

### Phase 4: Testing & Optimization (Week 3)
1. Performance testing with 1000+ symbols
2. Optimize pandas-ta calculations
3. Add comprehensive test coverage
4. Documentation and examples

## Technical Considerations

### 1. NaN Handling
- Indicators produce NaN/null values for initial periods (e.g., SMA_20 has nulls for first 19 days)
- Store as null in JSON, not NaN
- Frontend must handle null values gracefully

### 2. Performance Optimization
- Use pandas-ta's vectorized operations
- Calculate all indicators in single pass
- Consider parallel processing for bulk downloads
- Cache intermediate calculations when possible

### 3. Error Handling
- Check minimum data requirements before calculation
- Log warnings for insufficient data
- Continue with other indicators if one fails
- Return partial results rather than failing completely

## Dependencies
```toml
# Add to pyproject.toml
[tool.uv.dependencies]
pandas-ta = "^0.3.14"
```

## Configuration
```python
# Environment variables
ENABLE_INDICATOR_CALCULATION=true
DEFAULT_INDICATOR_SET=default
INDICATOR_PARALLEL_WORKERS=4
```

## Success Criteria
1. Indicators calculated automatically on all downloads
2. < 2 second response time for data with indicators
3. Support for 20+ technical indicators
4. Accurate calculations matching industry standards
5. Seamless integration with existing workflow

## Next Steps
1. Review and approve final plan
2. Create feature branch
3. Install pandas-ta dependency
4. Begin Phase 1 implementation