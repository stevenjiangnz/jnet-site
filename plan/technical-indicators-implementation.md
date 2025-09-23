# Technical Indicators Implementation Plan

## Overview
Add technical indicators to the symbol page price chart with multiple panels for different indicator types.

## Current State
- **Frontend**: PriceChart component displays OHLCV data using Highcharts Stock
- **Backend**: Stock-data-service already has indicators implemented with these available:
  - **Overlay indicators** (same panel as price): SMA_20, SMA_50, SMA_200, EMA_12, EMA_26, BB_20 (Bollinger Bands)
  - **Separate panel indicators**: MACD, RSI_14, ADX_14, ATR_14, STOCH, OBV, CMF_20

## Architecture Flow
```
Browser → Next.js API Route → Stock-Data-Service → GCS Storage
         ↓
     PriceChart Component with Multi-Panel Indicators
```

## Implementation Tasks

### 1. Create Frontend API Route for Chart Data with Indicators
- Location: `/api/symbols/[symbol]/chart/route.ts`
- Proxies to stock-data-service's `/chart/{symbol}` endpoint
- Passes indicator set parameter (chart_basic, chart_advanced, chart_full)
- Returns formatted data for Highcharts with indicators

### 2. Update PriceChart Component
```typescript
interface PriceChartProps {
  symbol: string;
  isVisible: boolean;
  indicatorSet?: 'chart_basic' | 'chart_advanced' | 'chart_full';
}
```

### 3. Highcharts Multi-Panel Configuration
```javascript
yAxis: [
  { // Price + Overlay Indicators
    height: '55%',
    labels: { align: 'right', x: -3 },
    title: { text: 'Price' },
  },
  { // Volume
    top: '56%', 
    height: '12%',
    offset: 0,
    labels: { align: 'right', x: -3 },
    title: { text: 'Volume' },
  },
  { // MACD
    top: '70%',
    height: '14%',
    offset: 0,
    labels: { align: 'right', x: -3 },
    title: { text: 'MACD' },
  },
  { // RSI
    top: '86%',
    height: '14%',
    offset: 0,
    labels: { align: 'right', x: -3 },
    title: { text: 'RSI' },
    plotLines: [{
      value: 70,
      color: '#FF4444',
      width: 1,
      label: { text: 'Overbought' }
    }, {
      value: 30,
      color: '#44FF44',
      width: 1,
      label: { text: 'Oversold' }
    }]
  }
]
```

### 4. Indicator Series Configuration

#### Overlay Indicators (yAxis: 0)
- **SMA_20, SMA_50, SMA_200**: Line series
- **BB_20**: Arearange + line series for bands

#### Separate Panel Indicators
- **MACD (yAxis: 2)**: 
  - Column series for histogram
  - 2 line series for MACD and signal lines
- **RSI_14 (yAxis: 3)**: 
  - Line series with overbought/oversold zones
- **ADX_14**: 
  - 3 line series (ADX, DI+, DI-)

### 5. Color Scheme
```javascript
const indicatorColors = {
  SMA_20: '#FF6B6B',   // Red
  SMA_50: '#4ECDC4',   // Teal  
  SMA_200: '#45B7D1',  // Blue
  BB: {
    upper: 'rgba(170,170,170,0.3)',
    middle: '#888888',
    lower: 'rgba(170,170,170,0.3)',
    fill: 'rgba(170,170,170,0.1)'
  },
  MACD: {
    macd: '#26A69A',     // Teal
    signal: '#EF5350',   // Red
    histogram: '#78909C' // Gray
  },
  RSI: '#9C27B0',        // Purple
  ADX: {
    adx: '#FF9800',      // Orange
    plusDI: '#4CAF50',   // Green
    minusDI: '#F44336'   // Red
  }
};
```

### 6. UI Enhancements
- Add indicator selector dropdown/buttons above chart
- Options: "Basic", "Advanced", "Full", or custom indicator selection
- Store user preference in localStorage

## Indicator Sets

### chart_basic
- Price panel: SMA_20, SMA_50, SMA_200, Volume SMA
- No additional panels

### chart_advanced  
- Price panel: SMA_20, SMA_50, SMA_200, EMA_12, EMA_26, BB_20
- MACD panel
- RSI panel

### chart_full
- Price panel: All overlay indicators
- MACD panel
- RSI panel  
- ADX panel
- Additional indicators as needed

## API Response Format
```json
{
  "symbol": "AAPL",
  "period": "1y",
  "ohlc": [[timestamp, open, high, low, close], ...],
  "volume": [[timestamp, volume], ...],
  "indicators": {
    "SMA_20": {
      "SMA": [[timestamp, value], ...]
    },
    "BB_20": {
      "upper": [[timestamp, value], ...],
      "middle": [[timestamp, value], ...],
      "lower": [[timestamp, value], ...]
    },
    "MACD": {
      "MACD": [[timestamp, value], ...],
      "signal": [[timestamp, value], ...],
      "histogram": [[timestamp, value], ...]
    },
    "RSI_14": {
      "RSI": [[timestamp, value], ...]
    }
  }
}
```

## Implementation Steps
1. Create chart API route
2. Update PriceChart to accept indicator set prop
3. Implement multi-panel layout in Highcharts config
4. Add overlay indicators to price panel
5. Add MACD panel
6. Add RSI panel  
7. Add ADX panel (optional)
8. Create indicator selector UI
9. Add localStorage for preferences
10. Test with real data

## Testing Checklist
- [ ] Chart loads with basic indicators
- [ ] Chart loads with advanced indicators
- [ ] Chart loads with full indicators
- [ ] Indicators display correctly in respective panels
- [ ] Panel heights and spacing are correct
- [ ] Colors are distinguishable
- [ ] Performance is acceptable with all indicators
- [ ] Indicator selector works properly
- [ ] User preferences persist