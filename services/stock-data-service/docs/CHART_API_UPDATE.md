# Chart API Period Support Update

## Overview
The chart API endpoint has been updated to support configurable time periods based on the application's `symbol_years_to_load` configuration setting.

## Changes Made

### Extended Period Support
The `/api/v1/chart/{symbol}` endpoint now supports:
- **Standard periods**: 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, 15y, 20y
- **Maximum period**: `max` - returns all available data
- **Dynamic periods**: Any number of years in format `{n}y` (e.g., 7y, 12y, 25y)

### API Endpoint
```
GET /api/v1/chart/{symbol}
```

**Query Parameters:**
- `period` (optional): Time period for chart data
  - Default: "1y" 
  - Supported: "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "15y", "20y", "max", or custom "{n}y"
- `indicators` (optional): Indicator set
  - Default: "chart_basic"
  - Options: "chart_basic", "chart_advanced", "chart_full"

**Example Requests:**
```bash
# Get 10 years of data
curl "http://localhost:9000/api/v1/chart/AAPL?period=10y&indicators=chart_full"

# Get 7 years of data (custom period)
curl "http://localhost:9000/api/v1/chart/AAPL?period=7y"

# Get all available data
curl "http://localhost:9000/api/v1/chart/AAPL?period=max"
```

### Implementation Details
1. The endpoint now parses custom year periods using regex pattern `^(\d+)y$`
2. Falls back to 1 year if an invalid period is provided
3. Filters data based on calculated date ranges
4. Returns data in Highcharts-compatible format with OHLC and volume arrays

### Integration with Frontend
The frontend chart components have been updated to:
1. Fetch the `symbol_years_to_load` configuration from the app settings
2. Pass the configured period (e.g., "10y" for 10 years) to the chart API
3. No longer hardcode the period to "1y"

This ensures that both the price chart and price history respect the user's configured data loading preferences.