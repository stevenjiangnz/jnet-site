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
    
    // Load modules in a Next.js-compatible way
    // We'll use dynamic imports with specific handling for each module
    
    // 1. Load indicators module first (required base module)
    try {
      const indicatorsModule = await import('highcharts/indicators/indicators');
      if (indicatorsModule.default && typeof indicatorsModule.default === 'function') {
        indicatorsModule.default(Highcharts);
        console.log('[Highcharts] Loaded indicators module');
      }
    } catch (err) {
      console.warn('[Highcharts] Could not load indicators module:', err);
    }
    
    // 2. Load exporting module - CRITICAL for D/W/M buttons
    try {
      const exportingModule = await import('highcharts/modules/exporting');
      if (exportingModule.default && typeof exportingModule.default === 'function') {
        exportingModule.default(Highcharts);
        console.log('[Highcharts] Loaded exporting module - D/W/M buttons enabled');
      }
    } catch (err) {
      console.error('[Highcharts] Failed to load exporting module - D/W/M buttons will not work:', err);
    }
    
    // 3. Try to load specific indicator modules we need
    const indicatorModules = [
      'highcharts/indicators/ema',
      'highcharts/indicators/sma',
      'highcharts/indicators/bollinger-bands',
      'highcharts/indicators/macd',
      'highcharts/indicators/rsi',
      'highcharts/indicators/adx'
    ];
    
    for (const modulePath of indicatorModules) {
      try {
        const loadedModule = await import(modulePath);
        if (loadedModule.default && typeof loadedModule.default === 'function') {
          loadedModule.default(Highcharts);
          const moduleName = modulePath.split('/').pop();
          console.log(`[Highcharts] Loaded ${moduleName} indicator`);
        }
      } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
        // Some indicators might not be available, that's OK
        const moduleName = modulePath.split('/').pop();
        console.warn(`[Highcharts] Could not load ${moduleName} indicator`);
      }
    }
    
    console.log('[Highcharts] Module loading complete');
    return Highcharts;
  } catch (error) {
    console.error('[Highcharts] Error loading modules:', error);
    throw error;
  }
}