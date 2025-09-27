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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFunction = (indicatorsModule as any).default;
      if (initFunction && typeof initFunction === 'function') {
        initFunction(Highcharts);
        console.log('[Highcharts] Loaded indicators module');
      }
    } catch (err) {
      console.warn('[Highcharts] Could not load indicators module:', err);
    }
    
    // 2. Load exporting module - CRITICAL for D/W/M buttons
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
    
    // 3. Load specific indicator modules we need
    // Using explicit imports to avoid webpack warnings about dynamic expressions
    
    // EMA indicator
    try {
      const emaModule = await import('highcharts/indicators/ema');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFunction = (emaModule as any).default;
      if (initFunction && typeof initFunction === 'function') {
        initFunction(Highcharts);
        console.log('[Highcharts] Loaded ema indicator');
      }
    } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.warn('[Highcharts] Could not load ema indicator');
    }
    
    // SMA is included in the base indicators module, no separate import needed
    
    // Bollinger Bands indicator
    try {
      const bbModule = await import('highcharts/indicators/bollinger-bands');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFunction = (bbModule as any).default;
      if (initFunction && typeof initFunction === 'function') {
        initFunction(Highcharts);
        console.log('[Highcharts] Loaded bollinger-bands indicator');
      }
    } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.warn('[Highcharts] Could not load bollinger-bands indicator');
    }
    
    // MACD indicator
    try {
      const macdModule = await import('highcharts/indicators/macd');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFunction = (macdModule as any).default;
      if (initFunction && typeof initFunction === 'function') {
        initFunction(Highcharts);
        console.log('[Highcharts] Loaded macd indicator');
      }
    } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.warn('[Highcharts] Could not load macd indicator');
    }
    
    // RSI indicator
    try {
      const rsiModule = await import('highcharts/indicators/rsi');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const initFunction = (rsiModule as any).default;
      if (initFunction && typeof initFunction === 'function') {
        initFunction(Highcharts);
        console.log('[Highcharts] Loaded rsi indicator');
      }
    } catch (err) { // eslint-disable-line @typescript-eslint/no-unused-vars
      console.warn('[Highcharts] Could not load rsi indicator');
    }
    
    // ADX is included in the base indicators module, no separate import needed
    
    console.log('[Highcharts] Module loading complete');
    return Highcharts;
  } catch (error) {
    console.error('[Highcharts] Error loading modules:', error);
    throw error;
  }
}