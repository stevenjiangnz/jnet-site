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
    
    // Load required modules - handle missing modules gracefully
    const modulesToLoad = [
      'highcharts/indicators/indicators',    // Base indicators module
      'highcharts/modules/indicators-all',   // This includes all indicators including bollinger-bands
      'highcharts/modules/exporting'         // Required for custom buttons
    ];
    
    for (const moduleToLoad of modulesToLoad) {
      try {
        const loadedModule = await import(moduleToLoad);
        // Most Highcharts modules need to be initialized explicitly
        if (loadedModule.default && typeof loadedModule.default === 'function') {
          loadedModule.default(Highcharts);
        }
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