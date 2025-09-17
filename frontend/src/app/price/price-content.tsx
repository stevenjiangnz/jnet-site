"use client";

import { useState, useEffect } from "react";

// Dummy data for symbols
const dummySymbols = [
  { code: "AAPL", name: "Apple Inc." },
  { code: "GOOGL", name: "Alphabet Inc." },
  { code: "MSFT", name: "Microsoft Corporation" },
  { code: "AMZN", name: "Amazon.com Inc." },
  { code: "TSLA", name: "Tesla Inc." },
  { code: "NVDA", name: "NVIDIA Corporation" },
  { code: "META", name: "Meta Platforms Inc." },
];

// Dummy data for selected point
const dummyDataPoint = {
  date: "2024-01-15",
  open: 185.50,
  high: 187.20,
  low: 184.80,
  close: 186.95,
  volume: 45678900,
  change: 1.45,
  changePercent: 0.78,
};

export default function PricePageContent() {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartType, setChartType] = useState("candlestick");
  const [showVolume, setShowVolume] = useState(true);
  const [indicators, setIndicators] = useState<string[]>([]);

  // Simulate loading symbols from API
  useEffect(() => {
    // TODO: Fetch symbols from stock-data-service API
    console.log("Loading symbols...");
  }, []);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel - Symbol Selector & Chart Config */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Symbol Selection
        </h2>
        
        {/* Symbol Dropdown */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Symbol
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full p-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
          >
            {dummySymbols.map((symbol) => (
              <option key={symbol.code} value={symbol.code}>
                {symbol.code} - {symbol.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chart Configuration */}
        <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
          Chart Configuration
        </h3>
        
        {/* Timeframe */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Timeframe
          </label>
          <div className="grid grid-cols-3 gap-2">
            {["1D", "5D", "1M", "3M", "6M", "1Y"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-sm ${
                  timeframe === tf
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Chart Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="candlestick"
                checked={chartType === "candlestick"}
                onChange={(e) => setChartType(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Candlestick</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="line"
                checked={chartType === "line"}
                onChange={(e) => setChartType(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Line</span>
            </label>
          </div>
        </div>

        {/* Volume Toggle */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showVolume}
              onChange={(e) => setShowVolume(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Show Volume</span>
          </label>
        </div>

        {/* Indicators */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Technical Indicators
          </label>
          <div className="space-y-2">
            {["SMA", "EMA", "RSI", "MACD", "Bollinger Bands"].map((ind) => (
              <label key={ind} className="flex items-center">
                <input
                  type="checkbox"
                  value={ind}
                  checked={indicators.includes(ind)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setIndicators([...indicators, ind]);
                    } else {
                      setIndicators(indicators.filter((i) => i !== ind));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{ind}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Panel - Charts */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {selectedSymbol} - {dummySymbols.find(s => s.code === selectedSymbol)?.name}
            </h2>
            <div className="text-right">
              <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                $186.95
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                +1.45 (+0.78%)
              </div>
            </div>
          </div>
          
          {/* Chart Placeholder */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-[400px] mb-4 flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              Highcharts Stock Chart Will Be Here
            </p>
          </div>
          
          {/* Volume Chart Placeholder */}
          {showVolume && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg h-[150px] flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                Volume Chart Will Be Here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Data Details */}
      <div className="w-80 border-l border-gray-200 dark:border-gray-800 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Data Point Details
        </h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Selected Date
          </h3>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {dummyDataPoint.date}
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            OHLCV Data
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Open</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ${dummyDataPoint.open.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">High</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ${dummyDataPoint.high.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Low</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ${dummyDataPoint.low.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Close</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ${dummyDataPoint.close.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Volume</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {(dummyDataPoint.volume / 1000000).toFixed(2)}M
              </span>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
            Day Statistics
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Change</span>
              <span className={`text-sm font-medium ${
                dummyDataPoint.change > 0 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                ${dummyDataPoint.change.toFixed(2)} ({dummyDataPoint.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Range</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                ${dummyDataPoint.low.toFixed(2)} - ${dummyDataPoint.high.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Additional Info Placeholder */}
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
            Additional Information
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            News, events, and other relevant information will be displayed here when available.
          </p>
        </div>
      </div>
    </div>
  );
}