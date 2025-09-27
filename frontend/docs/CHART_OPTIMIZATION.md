# Market Chart Optimization

## Overview
This document describes the optimization implemented for the market chart component to improve performance when adding/removing technical indicators, and the Highcharts module loading strategy to ensure all features work correctly in production.

## Previous Behavior
- When removing indicators, the entire chart was recreated
- This caused a noticeable flicker and poor user experience
- The chart would lose zoom state and user interactions

## New Behavior
- Indicators are dynamically added/removed without recreating the chart
- The chart smoothly resizes using the `setSize()` method
- Navigator position updates dynamically
- Zoom state and user interactions are preserved

## Technical Implementation

### Key Changes in MarketChart.tsx

1. **Removed Chart Recreation Logic**
   - Removed `shouldRecreateChart` state variable
   - Removed `recalculateLayout()` function that triggered recreation
   - Removed the useEffect that handled chart recreation

2. **Enhanced removeIndicator Function**
   ```typescript
   // Update chart height and navigator position dynamically
   const newHeight = calculateChartHeight();
   const newNavigatorTop = calculateNavigatorTop();
   
   // Check if chart still exists before updating
   if (!chartRef.current) {
     console.warn('[MarketChart] Chart reference lost during indicator removal');
     return;
   }
   
   // Update chart size
   chartRef.current.setSize(undefined, newHeight, false);
   
   // Update navigator position
   if (chartRef.current.navigator && chartRef.current.navigator.yAxis) {
     chartRef.current.navigator.yAxis.update({
       top: newNavigatorTop
     }, false);
   }
   
   // Single redraw after all updates
   chartRef.current.redraw();
   ```

3. **Added Safety Checks**
   - Added null check for `chartRef.current` before operations
   - Added existence check for navigator and yAxis properties
   - Added console warning when chart reference is lost

### Benefits
- **Performance**: No full chart recreation means faster indicator toggling
- **User Experience**: Smooth transitions without flickering
- **State Preservation**: Zoom level and selections are maintained
- **Reliability**: Safety checks prevent runtime errors

### Testing
The optimization was tested with:
- Adding/removing multiple indicators (Volume, MACD, RSI, ADX)
- Rapid toggling of indicators
- Different chart types (Candlestick, Line, Area)
- Different time ranges and view types

All scenarios showed smooth performance without errors.

## Highcharts Module Loading Strategy

### Problem
In production builds, the D/W/M (Day/Week/Month) view toggle buttons were not appearing on charts due to the Highcharts exporting module failing to load. This was caused by:
- Next.js production bundling not properly handling certain Highcharts module imports
- TypeScript type issues with Highcharts module default exports
- Missing or incorrect module paths in production builds

### Solution
Implemented a robust module loading strategy in `src/utils/highcharts-loader.ts`:

1. **Dynamic Imports with Type Assertions**
   ```typescript
   // Load exporting module - CRITICAL for D/W/M buttons
   try {
     const exportingModule = await import('highcharts/modules/exporting');
     // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const initFunction = (exportingModule as any).default;
     if (initFunction && typeof initFunction === 'function') {
       initFunction(Highcharts);
       console.log('[Highcharts] Loaded exporting module - D/W/M buttons enabled');
     }
   } catch (err) {
     console.error('[Highcharts] Failed to load exporting module - D/W/M buttons will not work:', err);
   }
   ```

2. **Key Implementation Details**
   - Use dynamic imports instead of static imports to avoid webpack bundling issues
   - Apply TypeScript type assertions `(module as any).default` to handle untyped default exports
   - Implement try-catch blocks for each module to gracefully handle loading failures
   - Add console logging for debugging module loading in production
   - Load modules in correct order: core → indicators → exporting → specific indicators

3. **Module Loading Order**
   - **Highcharts/Highstock core**: Base library
   - **Indicators module**: Required base for all technical indicators
   - **Exporting module**: Enables D/W/M buttons and export functionality
   - **Specific indicators**: EMA, Bollinger Bands, MACD, RSI (SMA and ADX are included in base)

### Benefits
- D/W/M buttons work correctly in production builds
- Graceful fallback if specific modules fail to load
- Better debugging with console logs for module loading status
- TypeScript and ESLint compliant code that passes CI/CD checks

### Troubleshooting
If D/W/M buttons are still missing:
1. Check browser console for module loading errors
2. Verify the exporting module loads successfully
3. Ensure the chart configuration includes the correct button positioning
4. Check that the production build includes the Highcharts modules in node_modules