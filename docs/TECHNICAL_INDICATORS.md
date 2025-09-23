# Technical Indicators Documentation

## Overview

The JNet Solutions platform now includes comprehensive technical indicators support for stock price charts. This feature allows users to analyze price movements with various technical indicators displayed in a multi-panel chart layout.

## Available Indicators

### Indicator Sets

The system provides three predefined indicator sets:

1. **Basic** - Essential indicators for basic analysis
   - Simple Moving Averages (SMA 20, 50, 200)
   - Bollinger Bands (20-period)
   - MACD (12, 26, 9)

2. **Advanced** - Includes momentum indicators
   - All Basic indicators
   - RSI (14-period)

3. **Full** - Complete technical analysis toolkit
   - All Advanced indicators
   - ADX (14-period) with DI+ and DI-

### Indicator Details

#### Price Panel Indicators (Overlays)
- **SMA (Simple Moving Average)**
  - SMA 20 (Red): Short-term trend
  - SMA 50 (Teal): Medium-term trend
  - SMA 200 (Blue): Long-term trend
  
- **Bollinger Bands**
  - Upper/Lower bands with gray fill
  - Middle line (20-period SMA)

#### Separate Panel Indicators

- **MACD (Moving Average Convergence Divergence)**
  - MACD Line (Green)
  - Signal Line (Red)
  - Histogram (Gray)
  - Panel Height: 18% (Basic), 20% (Advanced), 18% (Full)

- **ADX (Average Directional Index)**
  - ADX Line (Orange): Trend strength indicator
  - DI+ (Green): Positive directional indicator
  - DI- (Red): Negative directional indicator
  - Panel Height: 18% (same as MACD for consistency)
  - Note: ADX appears above RSI for easier access

- **RSI (Relative Strength Index)**
  - RSI Line (Purple)
  - Overbought level: 70 (Red dashed line)
  - Oversold level: 30 (Green dashed line)
  - Panel Height: 10% (Full), 15% (Advanced)

## Architecture

### Data Flow
```
Frontend (Browser) → Next.js API Route → API Service → Stock Data Service
```

### Key Components

1. **Frontend**
   - `PriceChart.tsx`: Main chart component with multi-panel support
   - `symbols-content.tsx`: Contains indicator selector UI
   - Uses Highcharts Stock for rendering

2. **API Layer**
   - Frontend API Route: `/api/symbols/[symbol]/chart/route.ts`
   - API Service Endpoint: `/api/v1/stock/{symbol}/chart`
   - Stock Data Service Endpoint: `/api/v1/chart/{symbol}`

3. **Data Processing**
   - Stock Data Service calculates all indicators
   - Data is cached for performance
   - Indicators are returned in chart-optimized format

## User Interface

### Indicator Selection
- Three buttons: Basic, Advanced, Full
- Selection is persisted in localStorage
- Visual indicator shows current selection

### Chart Layout
- Adaptive height based on indicator set:
  - Basic: 650px
  - Advanced: 800px
  - Full: 950px
- Panels are dynamically sized to prevent overlap
- Range selector appears at bottom without overlapping

### Panel Order (Top to Bottom)
1. Price Panel (with overlays)
2. Volume Panel
3. MACD Panel
4. ADX Panel (prioritized above RSI)
5. RSI Panel

## Performance Considerations

- Indicator calculations are performed server-side
- Results are cached to reduce computation
- Chart data is optimized for Highcharts format
- Data grouping disabled for precise daily data

## Future Enhancements

Potential additions:
- Customizable indicator parameters
- Additional indicators (Stochastic, Williams %R, etc.)
- Save/load custom indicator sets
- Drawing tools integration
- Real-time indicator updates

## Development Notes

### Adding New Indicators

1. Add indicator calculation in Stock Data Service
2. Update indicator sets configuration
3. Add panel configuration in PriceChart
4. Update chart height calculations
5. Add indicator colors and styling

### Testing

- Test with different time periods
- Verify panel layouts don't overlap
- Check localStorage persistence
- Validate indicator calculations