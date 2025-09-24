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
    
    for (const module of modulesToLoad) {
      try {
        await import(module);
        console.log(`[Highcharts] Loaded module: ${module}`);
      } catch (err) {
        console.warn(`[Highcharts] Could not load module ${module}, trying alternative approach`);
      }
    }
    
    // If indicators-all didn't work, try loading individual indicators from the main indicators module
    if (!window.Highcharts.seriesTypes.sma) {
      try {
        // Try importing the indicators module which should initialize indicator functions
        const indicatorsModule = await import('highcharts/indicators/indicators');
        if (indicatorsModule.default) {
          indicatorsModule.default(Highcharts);
        }
      } catch (err) {
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