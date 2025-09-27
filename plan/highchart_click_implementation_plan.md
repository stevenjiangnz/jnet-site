# Highcharts Click Event Implementation Plan

## Overview
Implement click functionality on the Highcharts market chart to display data point details in the right column when a user clicks on any data point.

## Current State Analysis

### Existing Infrastructure
1. **MarketChart Component** (`/frontend/src/components/charts/MarketChart.tsx`):
   - Already has `onDataPointSelect` prop defined but not implemented
   - Uses Highcharts Stock for charting
   - Supports multiple chart types: candlestick, line, area
   - Has various indicators: SMA, EMA, BB, MACD, RSI, ADX, ATR, Williams %R

2. **Market Page** (`/frontend/src/app/market/market-content-enhanced.tsx`):
   - Already has a right panel for data point details (lines 475-595)
   - Has `selectedDataPoint` state and `setSelectedDataPoint` function
   - Passes `onDataPointSelect={setSelectedDataPoint}` to MarketChart
   - Right panel already displays the selected data point when available

## Implementation Requirements

### 1. Add Click Event Handler to Chart Configuration
In the `buildChartConfig` function, add click event handlers to:
- Main series (candlestick/line/area)
- All indicator series
- Volume series

### 2. Click Event Structure
The click event should capture and return:
```javascript
{
  timestamp: number,    // X-axis timestamp
  open?: number,       // For candlestick
  high?: number,       // For candlestick
  low?: number,        // For candlestick
  close?: number,      // For candlestick/line
  volume?: number      // If volume data available
}
```

### 3. Implementation Details

#### A. Update plotOptions in buildChartConfig
```javascript
plotOptions: {
  series: {
    cursor: 'pointer',
    point: {
      events: {
        click: function() {
          // Extract point data and call onDataPointSelect
        }
      }
    },
    // ... existing dataGrouping config
  },
  // ... existing candlestick, column, line configs
}
```

#### B. Handle Different Series Types
- **Candlestick**: Extract OHLC values
- **Line/Area**: Extract close value only
- **Volume**: Extract volume value

#### C. Update Series Creation
When adding indicators dynamically in `addIndicator`, ensure click events are inherited from plotOptions.

### 4. Technical Considerations

1. **Data Grouping**: When data is grouped (daily/weekly/monthly), ensure click returns the grouped data point
2. **Multiple Series**: When clicking on overlapping series, Highcharts will trigger the topmost series
3. **Performance**: Click handlers should be lightweight to avoid lag
4. **Null Values**: Handle cases where some OHLC values might be undefined

### 5. Testing Scenarios

1. Click on candlestick data points
2. Click on indicator lines (SMA, EMA, etc.)
3. Click on volume bars
4. Click with different date ranges and groupings
5. Click on areas where multiple series overlap

## Benefits

1. **Enhanced User Experience**: Users can inspect exact values by clicking
2. **Better Data Analysis**: Detailed information helps in technical analysis
3. **Interactive Charts**: Makes the charts more engaging and useful

## Implementation Steps

1. Update `buildChartConfig` to add click event handlers in plotOptions
2. Create a helper function to extract and format point data
3. Ensure all dynamically added series inherit the click behavior
4. Test with various chart configurations and indicators