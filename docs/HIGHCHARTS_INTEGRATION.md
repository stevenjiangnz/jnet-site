# Highcharts Stock Chart Integration

This document describes the integration of Highcharts stock charts in the JNet Solutions frontend.

## Overview

The application uses Highcharts Stock for displaying interactive financial charts with real-time price data from the stock-data-service.

## Architecture

### Client-Side Only Rendering
- The PriceChart component is loaded dynamically with `ssr: false` to avoid Next.js SSR issues
- Highcharts requires the window object, which is only available on the client
- The component uses `isClient` state management to ensure rendering only happens after mounting

### Data Flow
1. **Frontend Component** (`PriceChart.tsx`) → 
2. **Next.js API Route** (`/api/symbols/[symbol]/prices`) → 
3. **API Service** (`/api/v1/stock/{symbol}/data`) → 
4. **Stock Data Service** (`/api/v1/data/{symbol}`) → 
5. **Google Cloud Storage**

## Data Grouping Configuration

The PriceChart component provides three configurable options for data grouping behavior:

### Option 1: Disable Data Grouping (Default)
```javascript
const disableDataGrouping = { enabled: false };
```
- Shows all individual daily data points
- No automatic grouping regardless of time range
- Best for detailed analysis

### Option 2: Force Daily Grouping Only
```javascript
const dailyGroupingOnly = {
  units: [['day', [1]]],
  forced: true // Optional
};
```
- Prevents weekly/monthly grouping
- Still groups within days if multiple data points exist
- Maintains daily granularity

### Option 3: Controlled Grouping
```javascript
const controlledGrouping = {
  units: [
    ['day', [1]],
    ['week', [1]], 
    ['month', [1, 2, 3, 4, 6]]
  ],
  groupPixelWidth: 10  // Default is 2
};
```
- Allows multiple grouping levels
- Higher `groupPixelWidth` delays when grouping activates
- Provides balance between performance and detail

To change the configuration, modify the `dataGroupingConfig` assignment in PriceChart.tsx:
```javascript
const dataGroupingConfig = disableDataGrouping; // Change to use different options
```

## Key Implementation Details

### Dynamic Import (symbols-content.tsx)
```typescript
const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

### Client-Side Check (PriceChart.tsx)
```typescript
const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

if (!isClient || !isVisible) {
  return null;
}
```

### Chart Rendering Delay
A 100ms timeout is used to ensure the DOM container is ready before creating the chart:
```typescript
setTimeout(() => {
  renderChart(result.data);
}, 100);
```

## API Integration

### Endpoint Configuration
- Stock data service endpoint: `/api/v1/data/{symbol}`
- Parameters: `start_date`, `end_date`, `interval`
- Response format: JSON with `data_points` array

### Data Transformation
The API service transforms the stock-data-service response:
- Extracts `data_points` from the response
- Converts date strings to JavaScript timestamps
- Formats data for Highcharts OHLC and volume series

## Error Handling

- Network errors display "Failed to load price data"
- Empty data shows "No price data available for this symbol"
- Chart creation errors are caught and displayed to the user

## Performance Considerations

1. **Lazy Loading**: Charts are only loaded when visible
2. **Data Limiting**: Default to 5 years of daily data (1825 points)
3. **Minimal Logging**: Production logs only show essential information
4. **Data Grouping**: Disabled by default to show all daily data points

## Troubleshooting

### Common Issues

1. **Blank Chart**
   - Check if the API service is running and accessible
   - Verify the stock-data-service endpoint is correct
   - Ensure data exists in GCS for the symbol

2. **SSR Errors**
   - Ensure dynamic import has `ssr: false`
   - Check that all Highcharts code is wrapped in client-side checks

3. **Incorrect Prices**
   - Verify the API service is using the correct endpoint
   - Check data transformation in the API service
   - Confirm GCS data is accurate

## Recent Changes (September 2025)

1. **Fixed API Integration**: Updated API service to use correct stock-data-service endpoint (`/api/v1/data/{symbol}` instead of `/api/v1/stock/{symbol}/history`)
2. **Removed Mock Data**: All dummy data generation code has been removed
3. **Cleaned Up Logging**: Reduced verbose debug logging to essential production logs only
4. **Improved Error Handling**: Better error messages for users when data is unavailable
5. **Extended Data Range**: Increased default data retrieval from 2 years to 5 years (1825 trading days)
6. **Disabled Data Grouping**: Removed automatic weekly/monthly grouping to always show daily data points
   - Previously, Highcharts would automatically group daily data into weekly or monthly periods for longer time ranges
   - Now all individual daily data points are displayed regardless of the selected time range
   - Configuration options are available to re-enable grouping if needed