"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from 'next/dynamic';
import toast from 'react-hot-toast';
import { toBrisbaneTime } from '@/utils/dateUtils';

// Dynamically import PriceChart to avoid SSR issues
const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), {
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

interface IndicatorConfig {
  // Overlays (same scale as price)
  SMA_20: boolean;
  SMA_50: boolean;
  SMA_200: boolean;
  EMA_20: boolean;
  BB_20: boolean; // Bollinger Bands
  VWAP: boolean;
  
  // Oscillators (separate panels)
  MACD: boolean;
  RSI_14: boolean;
  STOCH: boolean;
  ADX_14: boolean;
  CCI: boolean;
  MFI: boolean;
}

const DEFAULT_INDICATORS: IndicatorConfig = {
  SMA_20: false,
  SMA_50: false,
  SMA_200: false,
  EMA_20: false,
  BB_20: false,
  VWAP: false,
  MACD: false,
  RSI_14: false,
  STOCH: false,
  ADX_14: false,
  CCI: false,
  MFI: false,
};

export default function MarketPageContentV2() {
  // State management
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(true);
  
  // Chart configuration
  const [dateRange, setDateRange] = useState("6M");
  const [viewType, setViewType] = useState<"daily" | "weekly">("daily");
  const [chartType, setChartType] = useState<"candlestick" | "line" | "area">("candlestick");
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<IndicatorConfig>(DEFAULT_INDICATORS);
  
  // Data freshness
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [isDataFresh, setIsDataFresh] = useState(false);

  // Load symbols from API
  const loadSymbols = useCallback(async () => {
    try {
      setIsLoadingSymbols(true);
      const response = await fetch('/api/symbols/list');
      if (!response.ok) throw new Error('Failed to load symbols');
      
      const data = await response.json();
      setSymbols(data);
      
      // Select first symbol by default if none selected
      if (!selectedSymbol && data.length > 0) {
        setSelectedSymbol(data[0].symbol);
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
    if (!searchQuery) return symbols.slice(0, 20); // Show top 20 when no search
    
    const query = searchQuery.toLowerCase();
    return symbols.filter(s => 
      s.symbol.toLowerCase().includes(query) || 
      s.name.toLowerCase().includes(query)
    ).slice(0, 50); // Limit results
  }, [symbols, searchQuery]);

  // Check data freshness
  const checkDataFreshness = useCallback(() => {
    if (!selectedSymbol) return;
    
    const selectedSymbolData = symbols.find(s => s.symbol === selectedSymbol);
    if (!selectedSymbolData?.latest_date) return;
    
    const latestDate = new Date(selectedSymbolData.latest_date);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Consider data fresh if updated within last trading day
    // (accounting for weekends and holidays)
    setIsDataFresh(daysSinceUpdate <= 3);
    setLastUpdateTime(latestDate);
  }, [selectedSymbol, symbols]);

  useEffect(() => {
    checkDataFreshness();
  }, [checkDataFreshness]);

  // Toggle individual indicator
  const toggleIndicator = (indicator: keyof IndicatorConfig) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  // Count active indicators for dynamic chart sizing
  const activeIndicatorCount = useMemo(() => {
    let overlays = 0;
    let oscillators = 0;
    
    Object.entries(indicators).forEach(([key, value]) => {
      if (!value) return;
      
      // Overlays (on price panel)
      if (['SMA_20', 'SMA_50', 'SMA_200', 'EMA_20', 'BB_20', 'VWAP'].includes(key)) {
        overlays++;
      } else {
        // Oscillators (separate panels)
        oscillators++;
      }
    });
    
    return { overlays, oscillators };
  }, [indicators]);

  // Build indicator parameter for API
  const buildIndicatorParam = useCallback(() => {
    const activeIndicators = Object.entries(indicators)
      .filter(([, active]) => active)
      .map(([key]) => key);
    
    if (activeIndicators.length === 0) return 'chart_basic';
    
    // For now, we'll map to the existing sets
    // TODO: Implement custom indicator selection in the API
    if (activeIndicators.includes('ADX_14')) return 'chart_full';
    if (activeIndicators.includes('RSI_14')) return 'chart_advanced';
    return 'chart_basic';
  }, [indicators]);

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
          <div className="relative">
            <label className="block text-sm font-medium mb-2 sidebar-label">
              Symbol
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery || selectedSymbol || ''}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Search symbols..."
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 sidebar-select"
              />
              <div className="absolute right-2 top-2.5">
                {isDataFresh ? (
                  <span className="text-green-500 text-sm" title="Data is up to date">●</span>
                ) : (
                  <span className="text-red-500 text-sm" title="Data may be stale">●</span>
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
                        <span className="text-sm text-gray-500 ml-2">{symbol.name}</span>
                      </div>
                      {symbol.change_percent && (
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
                className={`px-3 py-1.5 text-sm rounded ${
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
              className={`flex-1 px-3 py-2 text-sm rounded ${
                viewType === 'daily'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setViewType('weekly')}
              className={`flex-1 px-3 py-2 text-sm rounded ${
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
            onChange={(e) => setChartType(e.target.value as 'candlestick' | 'line' | 'area')}
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
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="form-checkbox h-4 w-4 text-indigo-600"
              />
              <span className="text-sm">Volume</span>
            </label>
          </div>

          {/* Price Overlays */}
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Price Overlays</h4>
            <div className="space-y-2">
              {[
                { key: 'SMA_20', label: 'SMA (20)' },
                { key: 'SMA_50', label: 'SMA (50)' },
                { key: 'SMA_200', label: 'SMA (200)' },
                { key: 'EMA_20', label: 'EMA (20)' },
                { key: 'BB_20', label: 'Bollinger Bands' },
                { key: 'VWAP', label: 'VWAP' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indicators[key as keyof IndicatorConfig]}
                    onChange={() => toggleIndicator(key as keyof IndicatorConfig)}
                    className="form-checkbox h-4 w-4 text-indigo-600"
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
                { key: 'MACD', label: 'MACD' },
                { key: 'RSI_14', label: 'RSI (14)' },
                { key: 'STOCH', label: 'Stochastic' },
                { key: 'ADX_14', label: 'ADX (14)' },
                { key: 'CCI', label: 'CCI' },
                { key: 'MFI', label: 'MFI' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={indicators[key as keyof IndicatorConfig]}
                    onChange={() => toggleIndicator(key as keyof IndicatorConfig)}
                    className="form-checkbox h-4 w-4 text-indigo-600"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Active Indicators Summary */}
        {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0) && (
          <div className="text-xs text-gray-500">
            Active: {activeIndicatorCount.overlays} overlays, {activeIndicatorCount.oscillators} oscillators
          </div>
        )}
      </div>

      {/* Middle Panel - Chart */}
      <div className="flex-1 price-content-area p-6 overflow-hidden">
        {selectedSymbol ? (
          <div className="h-full">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold main-title">
                {selectedSymbol} - {symbols.find(s => s.symbol === selectedSymbol)?.name || 'Loading...'}
              </h2>
              {lastUpdateTime && (
                <div className="text-sm text-gray-500">
                  Last updated: {toBrisbaneTime(lastUpdateTime.toISOString())}
                </div>
              )}
            </div>
            
            {/* Chart Component */}
            <div className="h-[calc(100%-4rem)]">
              <PriceChart
                symbol={selectedSymbol}
                isVisible={true}
                indicatorSet={buildIndicatorParam() as 'chart_basic' | 'chart_advanced' | 'chart_full'}
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
                  <span className="text-gray-600">Symbol:</span>
                  <span className="font-medium">{selectedSymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Price:</span>
                  <span className="font-medium">
                    ${symbols.find(s => s.symbol === selectedSymbol)?.last_price?.toFixed(2) || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change:</span>
                  <span className={`font-medium ${
                    (symbols.find(s => s.symbol === selectedSymbol)?.change_percent || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {symbols.find(s => s.symbol === selectedSymbol)?.change_percent?.toFixed(2) || '-'}%
                  </span>
                </div>
              </div>
            </div>

            {/* Selected Point Data */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Selected Data Point</h4>
              <p className="text-sm text-gray-500">
                Click on the chart to view detailed data
              </p>
            </div>

            {/* Active Indicators Values */}
            {(activeIndicatorCount.overlays > 0 || activeIndicatorCount.oscillators > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Indicator Values</h4>
                <p className="text-sm text-gray-500">
                  Values will display here when hovering over the chart
                </p>
              </div>
            )}

            {/* News/Analysis Placeholder */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Market Analysis</h4>
              <p className="text-sm text-gray-500">
                Market news and analysis will appear here
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