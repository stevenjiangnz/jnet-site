# Williams %R Implementation Plan

## Overview
This document outlines the implementation plan for adding Williams %R (Williams Percent Range) indicator to the JNet Site market page. The plan is based on lessons learned from the ATR implementation.

## Key Lessons from ATR Implementation

1. **Data Recalculation Required**: When adding a new indicator, existing stock data in GCS must be re-downloaded to include the new indicator calculations.

2. **Frontend Initialization**: New indicators must be added to the `indicatorOrder` array in MarketChart.tsx to ensure they are properly initialized when the chart is created.

3. **Multi-Service Updates**: Changes are required across three services:
   - stock-data-service (calculation logic)
   - api-service (data forwarding)
   - frontend (display logic)

4. **Indicator Sets**: New indicators should be added to appropriate indicator sets (chart_basic, chart_advanced, chart_full).

## Williams %R Indicator Details

- **Name**: Williams %R (Williams Percent Range)
- **Type**: Momentum Oscillator
- **Range**: -100 to 0
- **Calculation**: %R = (Highest High - Close) / (Highest High - Lowest Low) × -100
- **Default Period**: 14 days
- **Overbought**: Above -20
- **Oversold**: Below -80

## Implementation Steps

### Phase 1: Stock Data Service (Backend)

#### 1.1 Add Williams %R to Configuration
**File**: `/services/stock-data-service/app/indicators/config.py`

```python
# Add to FULL_INDICATORS list
FULL_INDICATORS = [
    # ... existing indicators ...
    "WILLIAMS_R_14",  # 14-day Williams %R
]

# Add to INDICATOR_SETS["chart_full"]
"chart_full": [
    # ... existing indicators ...
    "WILLIAMS_R_14",
]

# Add to INDICATOR_MIN_PERIODS
INDICATOR_MIN_PERIODS = {
    # ... existing periods ...
    "WILLIAMS_R_14": 14,
}

# Add to INDICATOR_METADATA
INDICATOR_METADATA = {
    # ... existing metadata ...
    "WILLIAMS_R_14": {
        "display_name": "Williams %R (14)",
        "category": "momentum",
        "description": "14-day Williams Percent Range",
        "outputs": ["Williams_R"],
    },
}
```

#### 1.2 Implement Calculation Logic
**File**: `/services/stock-data-service/app/indicators/calculator.py`

```python
def _calculate_williams_r(self, df: pd.DataFrame, metadata: Dict) -> IndicatorData:
    """Calculate Williams %R."""
    # Use ta library's Williams %R implementation
    williams_r = ta.momentum.WilliamsRIndicator(
        high=df["high"], low=df["low"], close=df["close"], lbp=14
    )
    
    return self._create_indicator_data(
        name="WILLIAMS_R_14",
        metadata=metadata,
        df=df,
        values_dict={"Williams_R": williams_r.williams_r()},
        parameters={"period": 14},
    )
```

#### 1.3 Add to Calculator Mapping
Update the `_calculate_indicator` method to include Williams %R:

```python
elif indicator_name == "WILLIAMS_R_14":
    return self._calculate_williams_r(df, metadata)
```

### Phase 2: API Service

The API service should automatically forward the Williams %R data as it uses the stock-data-service indicators. No changes required based on current architecture.

### Phase 3: Frontend Implementation

#### 3.1 Add to Market Content
**File**: `/frontend/src/app/market/market-content-enhanced.tsx`

```typescript
// Add to DEFAULT_INDICATORS
const DEFAULT_INDICATORS = {
    // ... existing indicators ...
    williamsr14: false
};

// Add to oscillators array in the UI
{ key: 'williamsr14', label: 'Williams %R (14)' }

// Update activeIndicatorCount logic
else if (['macd', 'rsi14', 'adx14', 'atr14', 'williamsr14'].includes(key)) {
    oscillators++;
}
```

#### 3.2 Update MarketChart Component
**File**: `/frontend/src/components/charts/MarketChart.tsx`

```typescript
// Add to indicators interface
indicators?: {
    // ... existing indicators ...
    williamsr14?: boolean;
};

// Add to ChartData interface
WILLIAMS_R_14?: {
    Williams_R: Array<[number, number]>;
};

// Add to PANE_HEIGHTS
const PANE_HEIGHTS = {
    // ... existing heights ...
    williamsr: 100,  // Williams %R height
};

// Add to INDICATOR_COLORS
const INDICATOR_COLORS = {
    // ... existing colors ...
    williamsr: '#FF5722'  // Deep Orange for Williams %R
};

// Add to indicatorOrder array (CRITICAL!)
const indicatorOrder = ['volume', 'sma20', 'sma50', 'sma200', 'ema20', 'bb20', 
                       'macd', 'rsi14', 'adx14', 'atr14', 'williamsr14'];

// Add case in createIndicatorSeries
case 'williamsr14':
    if (data?.indicators?.WILLIAMS_R_14?.Williams_R) {
        const williamsrAxisIndex = addNewYAxis('Williams %R', {
            min: -100,
            max: 0,
            tickInterval: 20,
            plotLines: [{
                value: -20,
                color: '#FF5722',
                width: 1,
                dashStyle: 'dash',
                label: { text: 'Overbought', style: { color: '#666' } }
            }, {
                value: -80,
                color: '#FF5722',
                width: 1,
                dashStyle: 'dash',
                label: { text: 'Oversold', style: { color: '#666' } }
            }]
        });
        
        series = {
            type: 'line',
            id: 'williamsr-series',
            name: 'Williams %R (14)',
            data: data.indicators.WILLIAMS_R_14.Williams_R,
            yAxis: williamsrAxisIndex,
            color: INDICATOR_COLORS.williamsr,
            lineWidth: 1,
            ...seriesOptions
        };
    }
    break;

// Update height calculations
case 'williamsr14':
    return PANE_HEIGHTS.williamsr;

// Add to removal logic
if (chartRef.current.get('williamsr-series')) {
    chartRef.current.get('williamsr-series').remove();
}
```

#### 3.3 Update API Types
**File**: `/frontend/src/types/api.ts` (if exists)

Add Williams %R to any relevant type definitions.

### Phase 4: Testing and Deployment

1. **Local Testing**:
   - Start all services locally
   - Delete and re-download a test symbol (e.g., AAPL)
   - Verify Williams %R data is calculated and stored
   - Test Williams %R display on market page
   - Verify Y-axis range (-100 to 0) and plot lines

2. **Data Migration**:
   - After deployment, all existing symbols need to be re-downloaded
   - Consider implementing a batch re-download script

3. **Verification Checklist**:
   - [ ] Williams %R calculation works in stock-data-service
   - [ ] Data is properly stored in GCS
   - [ ] API returns Williams %R data
   - [ ] Frontend checkbox appears in oscillators
   - [ ] Williams %R pane displays when checked
   - [ ] Y-axis shows -100 to 0 range
   - [ ] Overbought/Oversold lines at -20/-80
   - [ ] Indicator can be toggled on/off
   - [ ] Active indicator count is correct
   - [ ] No TypeScript/ESLint errors
   - [ ] GitHub Actions pass

## Common Pitfalls to Avoid

1. **Don't forget `indicatorOrder` array**: This was the main issue with ATR - the indicator won't initialize without being in this array.

2. **Data must be recalculated**: Existing data won't have Williams %R until re-downloaded.

3. **Check indicator naming consistency**: Use WILLIAMS_R_14 in backend, williamsr14 in frontend.

4. **Test with fresh data**: Always delete and re-download test symbols to ensure calculations work.

5. **Verify Y-axis configuration**: Williams %R uses -100 to 0 range, unlike most indicators.

## References

- Williams %R Formula: (Highest High - Close) / (Highest High - Lowest Low) × -100
- ta library documentation: https://technical-analysis-library-in-python.readthedocs.io/
- Typical interpretation:
  - Above -20: Overbought
  - Below -80: Oversold
  - Range: -100 to 0 (more negative = more oversold)