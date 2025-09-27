# Highchart Click Event Testing Guide

## Testing Steps

1. **Start the Application**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Navigate to Market Page**
   - Login to the application
   - Navigate to `/market`

3. **Test Scenarios**

   ### A. Basic Click on Candlestick
   1. Select a symbol from the dropdown
   2. Click on any candlestick in the chart
   3. Verify the right panel shows:
      - Date of the selected point
      - Open, High, Low, Close values
      - Volume (if available)

   ### B. Click on Indicators
   1. Enable SMA (20) indicator
   2. Click on the SMA line
   3. Verify the right panel shows:
      - Date of the selected point
      - Close value (from the SMA point)
      - Volume (if available at that timestamp)

   ### C. Click on Volume Bars
   1. Ensure Volume indicator is enabled
   2. Click on a volume bar
   3. Verify the volume data is displayed

   ### D. Test Different Chart Types
   1. Switch between Daily/Weekly/Monthly views using the D/W/M buttons
   2. Click on data points in each view
   3. Verify correct grouped data is displayed

   ### E. Test with Multiple Indicators
   1. Enable multiple indicators (SMA, EMA, BB)
   2. Click on overlapping areas
   3. Verify the topmost series data is captured

## Expected Behavior

- **Cursor Change**: Mouse cursor should change to pointer when hovering over clickable elements
- **Data Display**: Right panel should update immediately upon click
- **Data Format**:
  - Dates should be properly formatted
  - Numeric values should show 2 decimal places for prices
  - Volume should use thousand separators

## Known Limitations

1. When multiple series overlap, only the topmost series will register the click
2. Volume clicks might not work directly on the bars due to their low height in the chart

## Troubleshooting

If clicks are not working:
1. Check browser console for JavaScript errors
2. Verify `onDataPointSelect` prop is passed to MarketChart
3. Ensure Highcharts modules are loaded properly
4. Check if the chart has finished rendering before clicking