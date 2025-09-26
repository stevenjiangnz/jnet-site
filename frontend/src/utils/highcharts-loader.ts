// Utility to load Highcharts and all required modules
export async function loadHighchartsModules() {
  if (typeof window === 'undefined') return null;
  
  // Check if already loaded
  if (window.Highcharts) {
    return window.Highcharts;
  }
  
  try {
    // Load core Highcharts Stock
    const Highcharts = (await import('highcharts/highstock')).default;
    window.Highcharts = Highcharts;
    
    // Load required modules - handle missing modules gracefully
    const modulesToLoad = [
      'highcharts/indicators/indicators',
      'highcharts/modules/indicators-all'  // This includes all indicators
    ];
    
    for (const moduleToLoad of modulesToLoad) {
      try {
        await import(moduleToLoad);
        console.log(`[Highcharts] Loaded module: ${moduleToLoad}`);
      } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
        console.warn(`[Highcharts] Could not load module ${moduleToLoad}, trying alternative approach`);
      }
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