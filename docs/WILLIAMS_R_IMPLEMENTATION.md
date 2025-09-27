# Williams %R Implementation

## Overview
This document describes the implementation of the Williams %R (Williams Percent Range) indicator in the JNet Site market page. Williams %R is a momentum oscillator that measures overbought and oversold levels.

## Technical Details

### Indicator Specification
- **Name**: Williams %R (Williams Percent Range)
- **Type**: Momentum Oscillator
- **Range**: -100 to 0
- **Formula**: %R = (Highest High - Close) / (Highest High - Lowest Low) × -100
- **Period**: 14 days
- **Overbought Level**: Above -20
- **Oversold Level**: Below -80

## Implementation Changes

### Backend (Stock Data Service)

#### 1. Configuration (`services/stock-data-service/app/indicators/config.py`)
- Added `WILLIAMS_R_14` to `FULL_INDICATORS` list
- Added to `chart_full` indicator set
- Set minimum period to 14 days
- Added metadata with display name, category, and outputs

#### 2. Calculator (`services/stock-data-service/app/indicators/calculator.py`)
- Implemented `_calculate_williams_r` method using ta library
- Added Williams %R case to `_calculate_indicator` routing

### Frontend

#### 1. Market Content (`frontend/src/app/market/market-content-enhanced.tsx`)
- Added `williamsr14` to `DEFAULT_INDICATORS`
- Added Williams %R checkbox to oscillators section
- Updated `activeIndicatorCount` logic to include Williams %R

#### 2. Chart Component (`frontend/src/components/charts/MarketChart.tsx`)
- Added `williamsr14` to indicators interface
- Added `WILLIAMS_R_14` to ChartData interface
- Set pane height to 100 pixels
- Added color (#FF5722 - Deep Orange)
- Added to `indicatorOrder` array for proper initialization
- Implemented Y-axis configuration with:
  - Fixed range: -100 to 0
  - Tick interval: 20
  - Overbought line at -20
  - Oversold line at -80
- Added removal logic for cleanup

## Usage

### Enabling Williams %R
1. Navigate to the market page
2. Select a stock symbol
3. In the indicators panel, under "Oscillators", check "Williams %R (14)"
4. The Williams %R indicator will appear below the main chart

### Interpretation
- **Values near 0**: Strong upward momentum
- **Values above -20**: Overbought condition (potential sell signal)
- **Values below -80**: Oversold condition (potential buy signal)
- **Values near -100**: Strong downward momentum

## Data Migration
When adding Williams %R, existing stock data must be re-downloaded to calculate the new indicator. This happens automatically when requesting data with the `chart_full` indicator set.

## Testing
- Verified calculation with sample data
- Tested Y-axis range and plot lines display correctly
- Confirmed indicator can be toggled on/off
- Validated data structure and API responses

## Related Files
- `/services/stock-data-service/app/indicators/config.py`
- `/services/stock-data-service/app/indicators/calculator.py`
- `/frontend/src/app/market/market-content-enhanced.tsx`
- `/frontend/src/components/charts/MarketChart.tsx`

## Additional Changes
- MACD pane height increased from 180px to 200px for better visibility