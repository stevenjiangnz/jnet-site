"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { toBrisbaneTime } from '@/utils/dateUtils';
import { useTheme } from '@/providers/theme-provider';

// Dynamically import MarketChart to avoid SSR issues
const MarketChart = dynamic(() => import('@/components/charts/MarketChart'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
        <p className="text-gray-400 text-sm">Loading chart...</p>
      </div>
    </div>
  )
});

interface Symbol {
  symbol: string;
  name: string;
  sector?: string;
  last_price?: number;
  change_percent?: number;
  latest_date?: string;
}

function MarketPageContentEnhancedInner() {
  // Get current theme
  const { theme } = useTheme();
  
  // Determine actual theme (resolve 'system' to actual theme)
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark');
  
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setActualTheme(mediaQuery.matches ? 'dark' : 'light');
      
      const handleChange = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      setActualTheme(theme as 'light' | 'dark');
    }
  }, [theme]);
  
  // Symbol management
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);
  
  // Chart configuration
  const [dateRange, setDateRange] = useState("3Y");
  const [viewType, setViewType] = useState<"daily" | "weekly">("daily");
  const chartType = "candlestick"; // Fixed to candlestick only
  
  // Default indicators configuration
  const DEFAULT_INDICATORS = {
    // Basic
    volume: true,
    
    // Overlays
    sma20: false,
    sma50: false,
    sma200: false,
    ema20: false,
    bb20: false,
    
    // Oscillators
    macd: false,
    rsi14: false,
    adx14: false,
    atr14: false,
    williamsr14: false
  };

  // Indicators with flexible selection - load from localStorage
  const [indicators, setIndicators] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('marketIndicators');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse saved indicators:', e);
        }
      }
    }
    return DEFAULT_INDICATORS;
  });
  
  // Data freshness
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isDataFresh, setIsDataFresh] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<{
    timestamp: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
    indicators?: {
      sma20?: number;
      sma50?: number;
      sma200?: number;
      ema20?: number;
      bbUpper?: number;
      bbMiddle?: number;
      bbLower?: number;
      macd?: number;
      macdSignal?: number;
      macdHistogram?: number;
      rsi?: number;
      adx?: number;
      diPlus?: number;
      diMinus?: number;
      atr?: number;
      williamsR?: number;
    };
  } | null>(null);
  
  // Latest price data from chart
  const [latestPriceData, setLatestPriceData] = useState<{
    symbol: string;
    lastPrice: number;
    changePercent: number;
    latestDate: string;
  } | null>(null);

  // Load symbols from API
  const loadSymbols = useCallback(async () => {
    try {
      setIsLoadingSymbols(true);
      const response = await fetch('/api/symbols/list');
      if (!response.ok) throw new Error('Failed to load symbols');
      
      const result = await response.json();
      // Handle the API response format
      let symbolsData: Symbol[] = [];
      
      if (result.symbols && Array.isArray(result.symbols)) {
        // Convert simple symbol strings to Symbol objects
        symbolsData = result.symbols.map((symbol: string) => ({
          symbol: symbol,
          name: symbol, // Use symbol as name for now
          sector: 'Unknown'
        }));
      } else if (Array.isArray(result)) {
        // Handle if it's already an array of Symbol objects
        symbolsData = result;
      }
      
      setSymbols(symbolsData);
      
      // Select first symbol by default if none selected
      if (!selectedSymbol && symbolsData.length > 0) {
        setSelectedSymbol(symbolsData[0].symbol);
      }
    } catch (error) {
      console.error('Error loading symbols:', error);
      toast.error('Failed to load symbols');
    } finally {
      setIsLoadingSymbols(false);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    loadSymbols();
  }, [loadSymbols]);

  // Filter symbols based on search query
  const filteredSymbols = useMemo(() => {
    if (!Array.isArray(symbols)) return [];
    if (!searchQuery) return symbols.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return symbols.filter(s => 
      s.symbol.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    ).slice(0, 50);
  }, [symbols, searchQuery]);

  // Check data freshness
  const checkDataFreshness = useCallback(() => {
    if (!selectedSymbol) return;
    
    const selectedSymbolData = symbols.find(s => s.symbol === selectedSymbol);
    if (!selectedSymbolData?.latest_date) return;
    
    const latestDate = new Date(selectedSymbolData.latest_date);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider data fresh if updated within last 3 days (accounting for weekends)
    setIsDataFresh(daysSinceUpdate <= 3);
    setLastUpdateTime(latestDate);
  }, [selectedSymbol, symbols]);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    checkDataFreshness();
  }, [checkDataFreshness]);

  // Save indicators to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('marketIndicators', JSON.stringify(indicators));
    }
  }, [indicators]);

  // Toggle indicator
  const toggleIndicator = (indicator: keyof typeof indicators) => {
    setIndicators((prev: typeof indicators) => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Count active indicators
  const activeIndicatorCount = useMemo(() => {
    let overlays = 0;
    let oscillators = 0;
    
    Object.entries(indicators).forEach(([key, value]) => {
      if (!value) return;
      
      if (['sma20', 'sma50', 'sma200', 'ema20', 'bb20'].includes(key)) {
        overlays++;
      } else if (['macd', 'rsi14', 'adx14', 'atr14', 'williamsr14'].includes(key)) {
        oscillators++;
      }
    });
    
    return { overlays, oscillators, volume: indicators.volume ? 1 : 0 };
  }, [indicators]);

  // Handle outside clicks
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.symbol-selector')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    const prefs = {
      dateRange,
      viewType,
      indicators
    };
    localStorage.setItem('marketPreferences', JSON.stringify(prefs));
  }, [dateRange, viewType, indicators]);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('marketPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.dateRange) setDateRange(prefs.dateRange);
        if (prefs.viewType) setViewType(prefs.viewType);
        // chartType is now fixed to candlestick, no need to set it
        if (prefs.indicators) setIndicators(prefs.indicators);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] market-page">
      {/* Left Panel - Controls */}
      <div className="w-64 market-sidebar p-4 overflow-y-auto">
        {/* Symbol Selection */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 market-title">
            Market Analysis
          </h2>
          
          {/* Symbol Dropdown with Search */}
          <div className="relative symbol-selector">
            <label className="block text-xs font-medium mb-2 market-label uppercase">
              Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || (selectedSymbol && !isDropdownOpen ? selectedSymbol : '')}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search symbols..."
                className="w-full px-3 py-1.5 pr-8 rounded market-input text-sm"
              />
              <div className="absolute right-2 top-3">
                {isDataFresh ? (
                  <span className="text-green-500 text-xs" title="Data is up to date">●</span>
                ) : (
                  <span className="text-red-500 text-xs" title="Data may be stale">●</span>
                )}
              </div>
            </div>
            
            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 market-dropdown rounded shadow-lg max-h-60 overflow-auto">
                {isLoadingSymbols ? (
                  <div className="p-3 text-center text-gray-500">Loading...</div>
                ) : filteredSymbols.length > 0 ? (
                  filteredSymbols.map((symbol) => (
                    <button
                      key={symbol.symbol}
                      onClick={() => {
                        setSelectedSymbol(symbol.symbol);
                        setSearchQuery('');
                        setIsDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left market-dropdown-item flex justify-between items-center text-sm"
                    >
                      <div>
                        <span className="font-medium">{symbol.symbol}</span>
                        <span className="text-sm text-gray-500 ml-2 truncate block">{symbol.name}</span>
                      </div>
                      {symbol.change_percent !== undefined && (
                        <span className={`text-sm ${symbol.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {symbol.change_percent >= 0 ? '+' : ''}{symbol.change_percent.toFixed(2)}%
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">No symbols found</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Date Range */}
        <div className="mb-6">
          <label className="block text-xs font-medium mb-2 market-label uppercase">
            Date Range
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['1Y', '3Y', '5Y', 'MAX'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  dateRange === range
                    ? 'market-button active'
                    : 'market-button'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* View Type - Removed as it's now handled by Highcharts data grouping buttons */}


        {/* Technical Indicators */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold mb-3 market-label uppercase">
            Technical Indicators
          </h3>
          
          {/* Volume */}
          <div className="mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={indicators.volume}
                onChange={() => toggleIndicator('volume')}
                className="h-4 w-4 rounded market-checkbox"
              />
              <span className="text-sm">Volume</span>
            </label>
          </div>

          {/* Price Overlays */}
          <div className="mb-3">
            <h4 className="text-xs font-medium market-text-muted uppercase mb-2">Price Overlays</h4>
            <div className="space-y-2">
              {[
                { key: 'sma20', label: 'SMA (20)' },
                { key: 'sma50', label: 'SMA (50)' },
                { key: 'sma200', label: 'SMA (200)' },
                { key: 'ema20', label: 'EMA (20)' },
                { key: 'bb20', label: 'Bollinger Bands' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indicators[key as keyof typeof indicators]}
                    onChange={() => toggleIndicator(key as keyof typeof indicators)}
                    className="h-4 w-4 rounded market-checkbox"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Oscillators */}
          <div>
            <h4 className="text-xs font-medium market-text-muted uppercase mb-2">Oscillators</h4>
            <div className="space-y-2">
              {[
                { key: 'macd', label: 'MACD' },
                { key: 'rsi14', label: 'RSI (14)' },
                { key: 'adx14', label: 'ADX (14)' },
                { key: 'atr14', label: 'ATR (14)' },
                { key: 'williamsr14', label: 'Williams %R (14)' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indicators[key as keyof typeof indicators]}
                    onChange={() => toggleIndicator(key as keyof typeof indicators)}
                    className="h-4 w-4 rounded market-checkbox"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Indicators Summary */}
        {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0 || activeIndicatorCount.volume > 0) && (
          <div className="text-xs market-text-muted mt-2">
            Active: {activeIndicatorCount.volume > 0 && 'Volume'}{activeIndicatorCount.volume > 0 && activeIndicatorCount.overlays > 0 && ', '}
            {activeIndicatorCount.overlays > 0 && `${activeIndicatorCount.overlays} overlay${activeIndicatorCount.overlays > 1 ? 's' : ''}`}
            {activeIndicatorCount.overlays > 0 && activeIndicatorCount.oscillators > 0 && ', '}
            {activeIndicatorCount.oscillators > 0 && `${activeIndicatorCount.oscillators} oscillator${activeIndicatorCount.oscillators > 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Middle Panel - Chart */}
      <div className="flex-1 market-content p-6">
        {selectedSymbol ? (
          <div className="flex flex-col">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-bold market-title">
                {selectedSymbol} - {symbols.find(s => s.symbol === selectedSymbol)?.name || 'Loading...'}
              </h2>
              {isClient && lastUpdateTime && (
                <div className="text-sm market-text-muted">
                  Last updated: {toBrisbaneTime(lastUpdateTime.toISOString())}
                </div>
              )}
            </div>
            
            {/* Chart Component */}
            <div className="min-h-0 relative">
              <MarketChart
                symbol={selectedSymbol}
                isVisible={true}
                indicators={indicators}
                viewType={viewType}
                dateRange={dateRange}
                chartType={chartType}
                theme={actualTheme}
                onDataPointSelect={setSelectedDataPoint}
                onLatestPriceUpdate={(priceData) => {
                  setLatestPriceData({
                    symbol: selectedSymbol,
                    ...priceData
                  });
                  setLastUpdateTime(new Date(priceData.latestDate));
                  setIsDataFresh(true);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="market-text-muted">Select a symbol to view chart</p>
          </div>
        )}
      </div>

      {/* Right Panel - Data Details */}
      <div className="w-80 market-data-sidebar p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 market-title">Data Details</h3>
        
        {selectedSymbol ? (
          <div className="space-y-4">
            {/* Symbol Info */}
            <div className="market-info-card p-4 rounded-lg">
              <h4 className="font-semibold mb-2 market-title text-base">Symbol</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="market-text-muted text-sm">Symbol:</span>
                  <span className="font-semibold text-base">{selectedSymbol}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="market-text-muted text-sm">Name:</span>
                  <span className="font-semibold text-right text-sm">
                    {symbols.find(s => s.symbol === selectedSymbol)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="market-text-muted text-sm">Last Price:</span>
                  <span className="font-semibold text-base">
                    ${latestPriceData?.symbol === selectedSymbol ? latestPriceData.lastPrice.toFixed(2) : '-'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="market-text-muted text-sm">Change:</span>
                  <span className={`font-semibold text-base flex items-center gap-1 ${
                    latestPriceData?.symbol === selectedSymbol && latestPriceData.changePercent >= 0
                      ? 'text-green-600'
                      : latestPriceData?.symbol === selectedSymbol ? 'text-red-600' : ''
                  }`}>
                    {(() => {
                      if (latestPriceData?.symbol === selectedSymbol) {
                        const isPositive = latestPriceData.changePercent >= 0;
                        return (
                          <>
                            <span className="text-lg">
                              {isPositive ? '▲' : '▼'}
                            </span>
                            {`${isPositive ? '+' : ''}${latestPriceData.changePercent.toFixed(2)}%`}
                          </>
                        );
                      }
                      return '-';
                    })()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="market-text-muted text-sm">Last Trade:</span>
                  <span className="font-semibold text-base">
                    {latestPriceData?.symbol === selectedSymbol && latestPriceData.latestDate
                      ? new Date(latestPriceData.latestDate).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
                {(() => {
                  const sym = symbols.find(s => s.symbol === selectedSymbol);
                  if (sym?.sector) {
                    return (
                      <div className="flex justify-between items-center">
                        <span className="market-text-muted text-sm">Sector:</span>
                        <span className="font-semibold text-right text-sm">
                          {sym.sector}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* Selected Point Data */}
            <div className="market-info-card p-4 rounded-lg">
              <h4 className="font-semibold mb-2 market-title text-base">Data Point Details</h4>
              {selectedDataPoint ? (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="market-text-muted text-sm">Date:</span>
                    <span className="font-semibold text-base">
                      {new Date(selectedDataPoint.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedDataPoint.open !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="market-text-muted text-sm">Open:</span>
                      <span className="font-semibold text-base">${selectedDataPoint.open.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedDataPoint.high !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="market-text-muted text-sm">High:</span>
                      <span className="font-semibold text-base">${selectedDataPoint.high.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedDataPoint.low !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="market-text-muted text-sm">Low:</span>
                      <span className="font-semibold text-base">${selectedDataPoint.low.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedDataPoint.close !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="market-text-muted text-sm">Close:</span>
                      <span className="font-semibold text-base">${selectedDataPoint.close.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedDataPoint.volume !== undefined && (
                    <div className="flex justify-between items-center">
                      <span className="market-text-muted text-sm">Volume:</span>
                      <span className="font-semibold text-base">
                        {selectedDataPoint.volume.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {/* Show indicator values if available */}
                  {selectedDataPoint.indicators && Object.keys(selectedDataPoint.indicators).length > 0 && (
                    <>
                      <div className="border-t border-gray-700 my-3"></div>
                      <div className="text-xs font-medium market-text-muted uppercase mb-2">Indicators</div>
                      
                      {/* Price Overlays */}
                      {(selectedDataPoint.indicators.sma20 !== undefined || 
                        selectedDataPoint.indicators.sma50 !== undefined || 
                        selectedDataPoint.indicators.sma200 !== undefined || 
                        selectedDataPoint.indicators.ema20 !== undefined) && (
                        <>
                          {selectedDataPoint.indicators.sma20 !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">SMA (20):</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.sma20.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.sma50 !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">SMA (50):</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.sma50.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.sma200 !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">SMA (200):</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.sma200.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.ema20 !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">EMA (20):</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.ema20.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Bollinger Bands */}
                      {(selectedDataPoint.indicators.bbUpper !== undefined || 
                        selectedDataPoint.indicators.bbMiddle !== undefined || 
                        selectedDataPoint.indicators.bbLower !== undefined) && (
                        <>
                          {selectedDataPoint.indicators.bbUpper !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">BB Upper:</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.bbUpper.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.bbMiddle !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">BB Middle:</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.bbMiddle.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.bbLower !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">BB Lower:</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.bbLower.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* Oscillators */}
                      {(selectedDataPoint.indicators.macd !== undefined || 
                        selectedDataPoint.indicators.rsi !== undefined || 
                        selectedDataPoint.indicators.adx !== undefined || 
                        selectedDataPoint.indicators.atr !== undefined || 
                        selectedDataPoint.indicators.williamsR !== undefined) && (
                        <>
                          {selectedDataPoint.indicators.macd !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">MACD:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.macd.toFixed(4)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.macdSignal !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">MACD Signal:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.macdSignal.toFixed(4)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.macdHistogram !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">MACD Histogram:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.macdHistogram.toFixed(4)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.rsi !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">RSI (14):</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.rsi.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.adx !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">ADX (14):</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.adx.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.diPlus !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">DI+:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.diPlus.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.diMinus !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">DI-:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.diMinus.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.atr !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">ATR (14):</span>
                              <span className="font-semibold text-base">${selectedDataPoint.indicators.atr.toFixed(2)}</span>
                            </div>
                          )}
                          {selectedDataPoint.indicators.williamsR !== undefined && (
                            <div className="flex justify-between items-center">
                              <span className="market-text-muted text-sm">Williams %R:</span>
                              <span className="font-semibold text-base">{selectedDataPoint.indicators.williamsR.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm market-text-muted">
                  Click on the chart to view detailed data
                </p>
              )}
            </div>

            {/* Active Indicators Values */}
            {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0) && (
              <div className="market-info-card p-4 rounded-lg">
                <h4 className="font-medium mb-2 market-title">Additional Information</h4>
                <p className="text-sm market-text-muted">
                  News, events, and other relevant information will be displayed here when available.
                </p>
              </div>
            )}

          </div>
        ) : (
          <p className="market-text-muted text-center">
            Select a symbol to view details
          </p>
        )}
      </div>
    </div>
  );
}

export default function MarketPageContentEnhanced() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid SSR issues with ThemeProvider
  if (!mounted) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] market-page">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return <MarketPageContentEnhancedInner />;
}