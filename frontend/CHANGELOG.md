# Frontend Changelog

## 2025-01-27

### Changed
- Consolidated Highcharts components: Replaced PriceChart with enhanced MarketChart
  - Added theme support (light/dark) to MarketChart
  - Added indicatorSet prop for backward compatibility ('chart_basic', 'chart_advanced', 'chart_full')
  - Updated symbols page to use MarketChart with light theme
  - Removed duplicate PriceChart and PriceChartTest components
  - Removed test-chart page

### Benefits
- Single source of truth for all Highcharts rendering
- Consistent behavior across the application
- Easier maintenance with only one chart component
- More features available to all pages
- Reduced bundle size by eliminating duplicate code

## Previous Changes
- Market page with enhanced charting capabilities
- Symbol management system
- Screen, Analysis, and Events pages
- Settings page with theme support