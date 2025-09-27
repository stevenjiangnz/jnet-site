// Import statements at the top for better production builds
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsIndicators from 'highcharts/indicators/indicators';
import HighchartsIndicatorsAll from 'highcharts/modules/indicators-all';

// Utility to load Highcharts and all required modules
export async function loadHighchartsModules() {
  if (typeof window === 'undefined') return null;
  
  // Check if already loaded with indicators
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window.Highcharts as any)?.seriesTypes?.bb) {
    return window.Highcharts;
  }
  
  try {
    // Load core Highcharts Stock
    const Highcharts = (await import('highcharts/highstock')).default;
    window.Highcharts = Highcharts;
    
    // Load required modules using static imports for better production compatibility
    try {
      // Initialize modules in the correct order
      // 1. Indicators base module first
      if (HighchartsIndicators && typeof HighchartsIndicators === 'function') {
        HighchartsIndicators(Highcharts);
        console.log('[Highcharts] Initialized indicators module');
      }
      
      // 2. All indicators module
      if (HighchartsIndicatorsAll && typeof HighchartsIndicatorsAll === 'function') {
        HighchartsIndicatorsAll(Highcharts);
        console.log('[Highcharts] Initialized indicators-all module');
      }
      
      // 3. Exporting module - critical for D/W/M buttons
      if (HighchartsExporting && typeof HighchartsExporting === 'function') {
        HighchartsExporting(Highcharts);
        console.log('[Highcharts] Initialized exporting module - D/W/M buttons should work');
      } else {
        console.error('[Highcharts] Exporting module not properly imported');
      }
    } catch (err) {
      console.error('[Highcharts] Error initializing modules:', err);
    }
    
    // If indicators-all didn't work, try loading individual indicators from the main indicators module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window.Highcharts as any).seriesTypes?.sma) {
      try {
        // Try importing the indicators module which should initialize indicator functions
        const indicatorsModule = await import('highcharts/indicators/indicators');
        if (indicatorsModule.default) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (indicatorsModule.default as any)(Highcharts);
        }
      } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
        console.warn('[Highcharts] Could not initialize indicators module');
      }
    }
    
    console.log('[Highcharts] Core modules loaded successfully');
    return Highcharts;
  } catch (error) {
    console.error('[Highcharts] Error loading modules:', error);
    throw error;
  }
}