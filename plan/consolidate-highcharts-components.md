# Plan: Consolidate Highcharts Components (PriceChart → MarketChart)

## Background
The project currently has two Highcharts components:
1. **PriceChart** - Used in the price/symbols page
2. **MarketChart** - Used in the market page

Having two similar components is confusing and problematic. This plan outlines how to consolidate them by enhancing MarketChart and replacing all PriceChart usages.

## Analysis Summary

### PriceChart Component
- **Location**: `/frontend/src/components/charts/PriceChart.tsx`
- **Props**: 
  - `symbol: string`
  - `isVisible: boolean`
  - `indicatorSet?: 'chart_basic' | 'chart_advanced' | 'chart_full'`
- **Features**:
  - Fixed indicator sets (predefined combinations)
  - Light theme (white background)
  - Uses direct Highcharts import
  - No data grouping controls
  - Fixed layout heights
  - Simpler API with fewer configuration options

### MarketChart Component
- **Location**: `/frontend/src/components/charts/MarketChart.tsx`
- **Props**:
  - `symbol: string`
  - `isVisible: boolean`
  - `indicators: { volume, sma20, sma50, sma200, ema20, bb20, macd, rsi14, adx14 }`
  - `dateRange: string`
  - `chartType?: 'candlestick' | 'line' | 'area'`
  - `viewType: 'daily' | 'weekly'`
  - `onDataPointSelect?: (point) => void`
- **Features**:
  - Dynamic indicator toggling (individual control)
  - Dark theme (black background)
  - Uses centralized Highcharts loader
  - D/W/M data grouping buttons
  - Dynamic layout based on active indicators
  - More flexible but complex API

### Current Usage
1. **symbols-content.tsx** (`/frontend/src/app/symbols/symbols-content.tsx`)
   - Uses PriceChart with indicatorSet='chart_basic'
   - Expects light theme

2. **test-chart page** (`/frontend/src/app/test-chart/page.tsx`)
   - Uses PriceChartTest component

## Implementation Steps

### Step 1: Add Theme Support to MarketChart
- Add a `theme?: 'light' | 'dark'` prop (default to 'dark')
- Create theme configuration objects with all color values
- Update all hardcoded colors to use theme values
- Ensure backward compatibility (existing uses continue with dark theme)

### Step 2: Add IndicatorSet Support for Backward Compatibility
- Add optional `indicatorSet?: 'chart_basic' | 'chart_advanced' | 'chart_full'` prop
- Map indicatorSet values to individual indicator toggles:
  - `'chart_basic'`: { volume: true, sma20: true, sma50: true, others: false }
  - `'chart_advanced'`: { volume: true, sma20: true, sma50: true, bb20: true, macd: true, rsi14: true, others: false }
  - `'chart_full'`: All indicators enabled
- When indicatorSet is provided, it overrides individual indicator props

### Step 3: Update MarketChart API for Compatibility
- Make `dateRange` optional with default value
- Make `viewType` optional with default value
- Ensure all props work with minimal configuration

### Step 4: Replace PriceChart Usage in symbols-content.tsx
- Change import from PriceChart to MarketChart
- Update props:
  ```tsx
  <MarketChart
    symbol={symbol}
    isVisible={isVisible}
    indicatorSet="chart_basic"
    theme="light"
    dateRange="1Y"  // or appropriate default
    viewType="daily"
    indicators={{}}  // Will be overridden by indicatorSet
  />
  ```

### Step 5: Handle Test Page
- Either update test-chart page to use MarketChart
- Or remove the test page if it's no longer needed

### Step 6: Clean Up
- Delete `/frontend/src/components/charts/PriceChart.tsx`
- Delete `/frontend/src/components/charts/PriceChartTest.tsx`
- Remove any unused imports

## Benefits
1. **Single source of truth** for Highcharts rendering
2. **Consistent behavior** across the application
3. **Easier maintenance** - only one component to update
4. **More features available** - symbols page can now use advanced features if needed
5. **Reduced bundle size** - less duplicate code

## Testing Plan
1. Test symbols page with light theme
2. Verify indicator sets work correctly
3. Ensure market page continues to work with dark theme
4. Test all indicator combinations
5. Verify data grouping buttons work in both themes
6. Check responsive behavior

## Rollback Plan
If issues arise:
1. Git revert the changes
2. PriceChart component is preserved in git history
3. Can be restored quickly if needed