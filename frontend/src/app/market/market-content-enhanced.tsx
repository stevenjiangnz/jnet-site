"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { toBrisbaneTime } from '@/utils/dateUtils';

// Dynamically import MarketChart to avoid SSR issues
const MarketChart = dynamic(() => import('@/components/charts/MarketChart'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading chart...</p>
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

export default function MarketPageContentEnhanced() {
  // Symbol management
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);
  
  // Chart configuration
  const [dateRange, setDateRange] = useState("6M");
  const [viewType, setViewType] = useState<"daily" | "weekly">("daily");
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
  
  // Indicators with flexible selection
  const [indicators, setIndicators] = useState({
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
    adx14: false
  });
  
  // Data freshness
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isDataFresh, setIsDataFresh] = useState(false);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);

  // Load symbols from API
  useEffect(() => {
    loadSymbols();
  }, []);

  const loadSymbols = async () => {
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
  };

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

  useEffect(() => {
    checkDataFreshness();
  }, [checkDataFreshness]);

  // Toggle indicator
  const toggleIndicator = (indicator: keyof typeof indicators) => {
    setIndicators(prev => ({
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
      } else if (['macd', 'rsi14', 'adx14'].includes(key)) {
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
      chartType,
      indicators
    };
    localStorage.setItem('marketPreferences', JSON.stringify(prefs));
  }, [dateRange, viewType, chartType, indicators]);

  // Load preferences on mount
  useEffect(() => {
    const saved = localStorage.getItem('marketPreferences');
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        if (prefs.dateRange) setDateRange(prefs.dateRange);
        if (prefs.viewType) setViewType(prefs.viewType);
        if (prefs.chartType) setChartType(prefs.chartType);
        if (prefs.indicators) setIndicators(prefs.indicators);
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Controls */}
      <div className="w-80 price-sidebar p-6 overflow-y-auto">
        {/* Symbol Selection */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 main-title">
            Market Analysis
          </h2>
          
          {/* Symbol Dropdown with Search */}
          <div className="relative symbol-selector">
            <label className="block text-sm font-medium mb-2 sidebar-label">
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
                className="w-full px-3 py-2 pr-8 border rounded-md focus:ring-2 focus:ring-indigo-500 sidebar-select"
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
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg max-h-60 overflow-auto">
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
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
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
          <label className="block text-sm font-medium mb-2 sidebar-label">
            Date Range
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['1M', '3M', '6M', '1Y', '3Y', '5Y', 'ALL'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  dateRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* View Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 sidebar-label">
            View Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setViewType('daily')}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                viewType === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
                viewType === 'weekly'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>

        {/* Chart Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 sidebar-label">
            Chart Type
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            className="w-full px-3 py-2 border rounded-md sidebar-select"
          >
            <option value="candlestick">Candlestick</option>
            <option value="line">Line</option>
            <option value="area">Area</option>
          </select>
        </div>

        {/* Technical Indicators */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 sidebar-label">
            Technical Indicators
          </h3>
          
          {/* Volume */}
          <div className="mb-3">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={indicators.volume}
                onChange={() => toggleIndicator('volume')}
                className="form-checkbox h-4 w-4 text-indigo-600 rounded"
              />
              <span className="text-sm">Volume</span>
            </label>
          </div>

          {/* Price Overlays */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Price Overlays</h4>
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
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Oscillators */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Oscillators</h4>
            <div className="space-y-2">
              {[
                { key: 'macd', label: 'MACD' },
                { key: 'rsi14', label: 'RSI (14)' },
                { key: 'adx14', label: 'ADX (14)' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indicators[key as keyof typeof indicators]}
                    onChange={() => toggleIndicator(key as keyof typeof indicators)}
                    className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Indicators Summary */}
        {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0 || activeIndicatorCount.volume > 0) && (
          <div className="text-xs text-gray-500 mt-2">
            Active: {activeIndicatorCount.volume > 0 && 'Volume'}{activeIndicatorCount.volume > 0 && activeIndicatorCount.overlays > 0 && ', '}
            {activeIndicatorCount.overlays > 0 && `${activeIndicatorCount.overlays} overlay${activeIndicatorCount.overlays > 1 ? 's' : ''}`}
            {activeIndicatorCount.overlays > 0 && activeIndicatorCount.oscillators > 0 && ', '}
            {activeIndicatorCount.oscillators > 0 && `${activeIndicatorCount.oscillators} oscillator${activeIndicatorCount.oscillators > 1 ? 's' : ''}`}
          </div>
        )}
      </div>

      {/* Middle Panel - Chart */}
      <div className="flex-1 price-content-area p-6 overflow-hidden">
        {selectedSymbol ? (
          <div className="h-full flex flex-col">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold main-title">
                {selectedSymbol} - {symbols.find(s => s.symbol === selectedSymbol)?.name || 'Loading...'}
              </h2>
              {lastUpdateTime && (
                <div className="text-sm text-gray-500">
                  Last updated: {toBrisbaneTime(lastUpdateTime)}
                </div>
              )}
            </div>
            
            {/* Chart Component */}
            <div className="flex-1 min-h-0">
              <MarketChart
                symbol={selectedSymbol}
                isVisible={true}
                indicators={indicators}
                viewType={viewType}
                dateRange={dateRange}
                chartType={chartType}
                onDataPointSelect={setSelectedDataPoint}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500">Select a symbol to view chart</p>
          </div>
        )}
      </div>

      {/* Right Panel - Data Details */}
      <div className="w-80 price-data-sidebar p-6 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Data Details</h3>
        
        {selectedSymbol ? (
          <div className="space-y-4">
            {/* Symbol Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Symbol Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Symbol:</span>
                  <span className="font-medium">{selectedSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-right text-xs">
                    {symbols.find(s => s.symbol === selectedSymbol)?.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Last Price:</span>
                  <span className="font-medium">
                    ${symbols.find(s => s.symbol === selectedSymbol)?.last_price?.toFixed(2) || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Change:</span>
                  <span className={`font-medium ${
                    (symbols.find(s => s.symbol === selectedSymbol)?.change_percent || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {symbols.find(s => s.symbol === selectedSymbol)?.change_percent !== undefined
                      ? `${symbols.find(s => s.symbol === selectedSymbol)!.change_percent >= 0 ? '+' : ''}${symbols.find(s => s.symbol === selectedSymbol)!.change_percent.toFixed(2)}%`
                      : '-'}
                  </span>
                </div>
                {symbols.find(s => s.symbol === selectedSymbol)?.sector && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Sector:</span>
                    <span className="font-medium text-right text-xs">
                      {symbols.find(s => s.symbol === selectedSymbol)!.sector}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Point Data */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Data Point</h4>
              {selectedDataPoint ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium">
                      {new Date(selectedDataPoint.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Open:</span>
                    <span className="font-medium">${selectedDataPoint.open?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">High:</span>
                    <span className="font-medium">${selectedDataPoint.high?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Low:</span>
                    <span className="font-medium">${selectedDataPoint.low?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Close:</span>
                    <span className="font-medium">${selectedDataPoint.close?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Volume:</span>
                    <span className="font-medium">
                      {selectedDataPoint.volume?.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Click on the chart to view detailed data
                </p>
              )}
            </div>

            {/* Active Indicators Values */}
            {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Indicator Values</h4>
                <p className="text-sm text-gray-500">
                  Hover over the chart to see indicator values
                </p>
              </div>
            )}

            {/* News/Analysis Placeholder */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Market News</h4>
              <p className="text-sm text-gray-500">
                Market news and analysis coming soon
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center">
            Select a symbol to view details
          </p>
        )}
      </div>
    </div>
  );
}