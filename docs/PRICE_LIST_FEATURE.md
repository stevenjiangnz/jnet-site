# Price List Feature

## Overview

The Price List feature provides a comprehensive tabular view of historical price data alongside the existing price chart. This dual-view approach allows users to analyze stock price movements both visually and through detailed numerical data.

**Status**: ✅ Implemented and ready for deployment

## Features

### 1. Tabular Price Display
- Shows price data in a clean, organized table format
- Columns include:
  - **Trade Date**: Formatted in DD/MM/YYYY (Australian format)
  - **Open**: Opening price for the trading day
  - **Close**: Closing price with color coding
  - **High**: Highest price during the trading day
  - **Low**: Lowest price during the trading day
  - **Volume**: Trading volume with intelligent formatting

### 2. Data Presentation
- **Descending Sort**: Most recent trading days appear first
- **Color Coding**: Closing prices show in green (gains) or red (losses) compared to opening price
- **Volume Formatting**: 
  - Millions: e.g., 1.5M
  - Thousands: e.g., 250K
  - Raw numbers for volumes under 1,000

### 3. User Interface
- **Collapsible Panel**: Users can expand/collapse the price list horizontally
- **Sticky Header**: Column headers remain visible while scrolling
- **Scrollable Content**: Fixed height with vertical scroll for large datasets
- **Responsive Design**: Adapts to different screen sizes

### 4. Integration with Price Chart
- **Side-by-Side Layout**: Chart and list appear together when viewing prices
- **Synchronized Data**: Both views use the same data source
- **Responsive Layout**:
  - Desktop: Side-by-side display (chart 2/3, list 1/3 of width)
  - Mobile: Stacked vertically for better mobile experience

## Technical Implementation

### Component Architecture

```
frontend/src/components/charts/
├── PriceChart.tsx    (Existing Highcharts component)
└── PriceList.tsx     (New price list component)
```

### Key Features of PriceList Component

1. **Dynamic Data Loading**
   - Fetches price data when component becomes visible
   - Uses same API endpoint as PriceChart for consistency
   - 5-year historical data (1825 trading days)

2. **State Management**
   - Loading states with spinner
   - Error handling with user-friendly messages
   - Expand/collapse state persisted in component

3. **Performance Optimizations**
   - Data fetched only when visible
   - Efficient sorting algorithm
   - Minimal re-renders

### API Integration

The component uses the existing price data API:
```
GET /api/symbols/{symbol}/prices?interval=1d&start_date={date}&end_date={date}&limit=1825
```

### Styling
- Consistent with existing design system
- Dark mode support
- Smooth transitions for expand/collapse
- Hover effects on table rows

## User Experience

1. **Viewing Price Data**
   - Click "View Price Chart" button on a selected symbol
   - Both chart and list appear simultaneously
   - List shows most recent prices first

2. **Interacting with the List**
   - Scroll through historical data
   - Click expand/collapse button to adjust view
   - Observe color-coded price movements

3. **Responsive Behavior**
   - Automatic layout adjustment based on screen size
   - Optimal viewing experience on all devices

## Benefits

1. **Enhanced Analysis**: Users can cross-reference visual patterns with exact numerical values
2. **Quick Reference**: Easy to find specific dates and prices
3. **Detailed Inspection**: See exact open/close/high/low values
4. **Volume Analysis**: Understand trading activity alongside price movements
5. **Flexibility**: Choose between visual or tabular analysis, or use both

## Future Enhancements

1. **Sorting**: Allow sorting by any column
2. **Filtering**: Date range filters, price filters
3. **Export**: Download as CSV/Excel
4. **Search**: Find specific dates quickly
5. **Statistics**: Add daily change percentage, moving averages
6. **Pagination**: Handle very large datasets more efficiently

## Files Modified

1. `/frontend/src/components/charts/PriceList.tsx` - New component
2. `/frontend/src/app/symbols/symbols-content.tsx` - Integration of PriceList
3. `/home/sjiang/devlocal/jnet-site/CHANGELOG.md` - Documentation of changes

## Deployment Notes

No backend changes required. This is a frontend-only enhancement that uses existing API endpoints.