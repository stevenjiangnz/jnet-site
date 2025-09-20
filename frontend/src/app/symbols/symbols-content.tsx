"use client";

import { useState, useEffect } from 'react';
import { toBrisbaneTime, toBrisbaneDateOnly } from '@/utils/dateUtils';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

// Dynamically import PriceChart to avoid SSR issues with Highcharts
const PriceChart = dynamic(() => import('@/components/charts/PriceChart'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading chart component...</p>
      </div>
    </div>
  )
});

// Dynamically import PriceList
const PriceList = dynamic(() => import('@/components/charts/PriceList'), {
  ssr: false
});

interface SymbolCatalogInfo {
  symbol: string;
  start_date: string;
  end_date: string;
  total_days: number;
  has_weekly: boolean;
  last_updated: string;
}

// API client that uses Next.js API routes (server-side proxy)
const fetchSymbols = async () => {
  const response = await fetch('/api/symbols/list');
  if (!response.ok) throw new Error('Failed to fetch symbols');
  return response.json();
};


const deleteSymbol = async (symbol: string) => {
  const response = await fetch(`/api/symbols/${symbol}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete symbol');
};

const fetchSymbolCatalogInfo = async (symbol: string): Promise<SymbolCatalogInfo> => {
  const response = await fetch(`/api/symbols/${symbol}/catalog`);
  if (!response.ok) throw new Error('Failed to fetch symbol catalog info');
  return response.json();
};

export default function SymbolsPageContent() {
  const [activeView, setActiveView] = useState('list');
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [selectedSymbolInfo, setSelectedSymbolInfo] = useState<SymbolCatalogInfo | null>(null);
  const [loadingSymbolInfo, setLoadingSymbolInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percentage: number;
    message: string;
  } | null>(null);
  const [deletingSymbol, setDeletingSymbol] = useState<string | null>(null);
  const [downloadingSymbol, setDownloadingSymbol] = useState<string | null>(null);
  const [showPriceChart, setShowPriceChart] = useState(false);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('symbolsPanelCollapsed');
      return saved === 'true';
    }
    return false;
  });

  const menuItems = [
    { id: 'list', label: 'Symbol List', icon: '📋' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  const togglePanelCollapse = () => {
    const newState = !isPanelCollapsed;
    setIsPanelCollapsed(newState);
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('symbolsPanelCollapsed', newState.toString());
    }
  };

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      loadSymbolInfo(selectedSymbol);
      setShowPriceChart(false); // Reset chart visibility when switching symbols
    } else {
      setSelectedSymbolInfo(null);
      setShowPriceChart(false);
    }
  }, [selectedSymbol]);

  const loadSymbols = async () => {
    try {
      setLoading(true);
      const data = await fetchSymbols();
      setSymbols(data.symbols || []);
      setError(null);
    } catch (err) {
      setError('Failed to load symbols');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSymbolInfo = async (symbol: string) => {
    try {
      setLoadingSymbolInfo(true);
      const info = await fetchSymbolCatalogInfo(symbol);
      setSelectedSymbolInfo(info);
    } catch (err) {
      console.error('Failed to load symbol info:', err);
      setSelectedSymbolInfo(null);
    } finally {
      setLoadingSymbolInfo(false);
    }
  };

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const symbolUpper = newSymbol.toUpperCase();
    setIsAddingSymbol(true);

    try {
      // Check if symbol already exists
      if (symbols.includes(symbolUpper)) {
        toast.error(`Symbol ${symbolUpper} already exists in your list`);
        return;
      }

      // Add symbol and download historical data
      toast.loading(`Adding symbol ${symbolUpper}...`, { id: 'add-symbol' });
      setDownloadProgress({ percentage: 0, message: 'Adding symbol...' });
      
      const response = await fetch(`/api/symbols/add?symbol=${symbolUpper}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add symbol');
      }

      const result = await response.json();

      // Update progress to show downloading
      if (result.download?.success) {
        setDownloadProgress({ percentage: 100, message: 'Download complete!' });
      }

      // Success message based on whether download succeeded
      if (result.download?.success) {
        toast.success(
          `Successfully added ${symbolUpper} with ${result.download.records_downloaded || 0} trading days of data`,
          { id: 'add-symbol' }
        );
      } else {
        toast.success(
          `Added ${symbolUpper} to your list. ${result.download?.message || 'Historical data will be downloaded later.'}`,
          { id: 'add-symbol' }
        );
      }
      
      // Refresh the symbols list
      await loadSymbols();

      setNewSymbol('');
      setShowAddForm(false);
      setSelectedSymbol(symbolUpper);
      await loadSymbols();
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add symbol';
      toast.error(errorMessage, { id: 'add-symbol' });
      console.error(err);
    } finally {
      setIsAddingSymbol(false);
      setDownloadProgress(null);
    }
  };

  const handleDeleteSymbol = async (symbol: string) => {
    if (!confirm(`Delete ${symbol}?`)) return;

    try {
      setDeletingSymbol(symbol);
      await deleteSymbol(symbol);
      toast.success(`Symbol ${symbol} removed from your list`);
      await loadSymbols();
      if (selectedSymbol === symbol) {
        setSelectedSymbol(null);
      }
      setError(null);
    } catch (err) {
      toast.error('Failed to delete symbol');
      console.error(err);
    } finally {
      setDeletingSymbol(null);
    }
  };

  const handleDownloadPrices = async (symbol: string) => {
    setDownloadingSymbol(symbol);
    try {
      const response = await fetch(`/api/symbols/${symbol}/download-incremental`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Download failed');
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      // Show success message with details
      if (result.status === 'no_new_data') {
        toast.success(`No new data available for ${symbol}`);
      } else if (result.status === 'fallback_full_download') {
        toast.success(`Downloaded ${result.new_data_points || 0} data points for ${symbol} (full download)`);
      } else {
        toast.success(`Downloaded ${result.new_data_points || 0} new price points for ${symbol}`);
      }
      
      // Refresh symbol info to show updated data
      if (selectedSymbol === symbol) {
        await loadSymbolInfo(symbol);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download prices for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingSymbol(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar */}
      <div className="w-64 symbol-sidebar">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 main-title">Symbol Management</h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium symbol-menu-item ${
                  activeView === item.id ? 'active' : ''
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Quick Stats */}
          <div className="mt-8 p-4 symbol-stats-card rounded-lg">
            <h3 className="text-sm font-semibold main-subtitle mb-3">Quick Stats</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="sidebar-text">Total Symbols</span>
                <span className="font-semibold main-title">{symbols.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="sidebar-text">Last Updated</span>
                <span className="font-semibold main-title">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 symbol-content-area overflow-y-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Symbol List View */}
        {activeView === 'list' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold main-title">Symbol List</h1>
                <p className="main-subtitle mt-1">
                  Manage your tracked stock symbols
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setSelectedSymbol(null);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <span className="text-lg">➕</span>
                  <span>Add New Symbol</span>
                </button>
                <button
                  onClick={togglePanelCollapse}
                  className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title={isPanelCollapsed ? "Expand panels" : "Collapse panels"}
                >
                  {isPanelCollapsed ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className={`symbol-list-card rounded-lg shadow-sm transition-all duration-300 ${isPanelCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
              <div className={`${isPanelCollapsed ? 'hidden' : 'p-6'}`}>
                {loading ? (
                  <div className="text-center py-8">Loading symbols...</div>
                ) : symbols.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No symbols found. Click &quot;Add Symbol&quot; to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Symbol List */}
                    <div className="symbol-item-card rounded-lg p-4">
                      <h3 className="font-semibold mb-3 main-title">All Symbols ({symbols.length})</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {symbols.map((symbol) => (
                          <div
                            key={symbol}
                            onClick={() => {
                              setSelectedSymbol(symbol);
                              setShowAddForm(false);
                            }}
                            className={`p-3 rounded-lg cursor-pointer transition-colors symbol-item ${
                              selectedSymbol === symbol ? 'selected' : ''
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-medium main-title">{symbol}</span>
                              <span className="text-sm main-subtitle">→</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Symbol Details / Add Form */}
                    <div className="symbol-item-card rounded-lg p-4">
                      {showAddForm ? (
                        <>
                          <h3 className="font-semibold mb-3 main-title">Add New Symbol</h3>
                          <form onSubmit={handleAddSymbol}>
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-semibold mb-2 main-subtitle">
                                  Stock Symbol
                                </label>
                                <input
                                  type="text"
                                  value={newSymbol}
                                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                  placeholder="Enter symbol (e.g., AAPL)"
                                  className="w-full px-4 py-2 rounded-lg form-input"
                                  required
                                  disabled={isAddingSymbol}
                                />
                                <p className="mt-2 text-sm main-subtitle">
                                  Enter the ticker symbol of the stock you want to track
                                </p>
                              </div>

                              {downloadProgress && (
                                <div className="space-y-2">
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div 
                                      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                                      style={{ width: `${downloadProgress.percentage}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {downloadProgress.message}
                                  </p>
                                </div>
                              )}

                              <div className="flex gap-3">
                                <button
                                  type="submit"
                                  disabled={!newSymbol.trim() || isAddingSymbol}
                                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
                                >
                                  {isAddingSymbol ? (
                                    <>
                                      <span className="animate-spin">⏳</span>
                                      <span>Adding...</span>
                                    </>
                                  ) : (
                                    'Add Symbol'
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewSymbol('');
                                    setShowAddForm(false);
                                    setDownloadProgress(null);
                                  }}
                                  disabled={isAddingSymbol}
                                  className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </form>
                        </>
                      ) : (
                        <>
                          <h3 className="font-semibold mb-3 main-title">Symbol Details</h3>
                          {selectedSymbol ? (
                        <div>
                          <div className="space-y-4">
                            <div className="symbol-stats-card p-4 rounded-lg">
                              <h4 className="text-2xl font-bold main-title">{selectedSymbol}</h4>
                              <p className="main-subtitle">Stock Symbol</p>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              {loadingSymbolInfo ? (
                                <div className="text-center py-4">
                                  <span className="text-gray-500">Loading symbol information...</span>
                                </div>
                              ) : selectedSymbolInfo ? (
                                <>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Total Days of Data</span>
                                    <span className="font-medium main-title">{selectedSymbolInfo.total_days}</span>
                                  </div>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Date Range</span>
                                    <span className="font-medium main-title text-sm">
                                      {toBrisbaneDateOnly(selectedSymbolInfo.start_date)} - {toBrisbaneDateOnly(selectedSymbolInfo.end_date)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Last Updated (Brisbane)</span>
                                    <span className="font-medium main-title">
                                      {toBrisbaneTime(selectedSymbolInfo.last_updated)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Weekly Data</span>
                                    <span className="font-medium main-title">
                                      {selectedSymbolInfo.has_weekly ? 'Available' : 'Not Available'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-3">
                                    <span className="main-subtitle">Data Completeness</span>
                                    <span className="font-medium main-title">
                                      {(() => {
                                        const start = new Date(selectedSymbolInfo.start_date);
                                        const end = new Date(selectedSymbolInfo.end_date);
                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        const tradingDays = Math.floor(diffDays * 5 / 7); // Rough estimate
                                        const completeness = Math.round((selectedSymbolInfo.total_days / tradingDays) * 100);
                                        return `~${completeness}%`;
                                      })()}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Status</span>
                                    <span className="font-medium main-title">Active</span>
                                  </div>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Data Points</span>
                                    <span className="font-medium main-title">~252/year</span>
                                  </div>
                                  <div className="flex justify-between py-3">
                                    <span className="main-subtitle">Storage</span>
                                    <span className="font-medium main-title">~0.5 MB</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="pt-4 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleDownloadPrices(selectedSymbol)}
                                disabled={downloadingSymbol === selectedSymbol}
                                className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                              >
                                {downloadingSymbol === selectedSymbol ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="text-xs">Downloading...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="mr-1.5 text-sm">📥</span>
                                    <span className="text-xs">Download Prices</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteSymbol(selectedSymbol)}
                                disabled={deletingSymbol === selectedSymbol}
                                className="px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center justify-center"
                              >
                                {deletingSymbol === selectedSymbol ? (
                                  <>
                                    <span className="mr-1.5 text-sm">🗑️</span>
                                    <span className="text-xs">Deleting...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="mr-1.5 text-sm">🗑️</span>
                                    <span className="text-xs">Delete</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => setShowPriceChart(!showPriceChart)}
                                className="col-span-2 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center justify-center transition-colors duration-200"
                              >
                                <span className="mr-1.5 text-sm">📊</span>
                                <span className="text-xs">{showPriceChart ? 'Hide' : 'View'} Price Chart</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Select a symbol to view details
                        </div>
                      )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Price Chart and List */}
            {selectedSymbol && (showPriceChart || isPanelCollapsed) && (
              <div className={`mt-6 transition-all duration-300 ${isPanelCollapsed ? 'mt-0' : ''}`}>
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Chart Section */}
                  <div className="flex-1 min-w-0">
                    <PriceChart 
                      symbol={selectedSymbol} 
                      isVisible={showPriceChart || isPanelCollapsed} 
                    />
                  </div>
                  {/* List Section */}
                  <div className="w-full lg:w-2/5 xl:w-1/3">
                    <PriceList 
                      symbol={selectedSymbol} 
                      isVisible={showPriceChart || isPanelCollapsed} 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* Analytics View */}
        {activeView === 'analytics' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold main-title">Symbol Analytics</h1>
              <p className="main-subtitle mt-1">
                View analytics and insights for your symbols
              </p>
            </div>

            <div className="symbol-list-card rounded-lg shadow-sm p-6">
              <p className="main-subtitle">Analytics functionality coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}