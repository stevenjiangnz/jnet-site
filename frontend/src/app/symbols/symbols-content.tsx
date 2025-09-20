"use client";

import { useState, useEffect } from 'react';

// API client that uses Next.js API routes (server-side proxy)
const fetchSymbols = async () => {
  const response = await fetch('/api/symbols/list');
  if (!response.ok) throw new Error('Failed to fetch symbols');
  return response.json();
};

const addSymbol = async (symbol: string) => {
  const response = await fetch(`/api/symbols/add?symbol=${symbol}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to add symbol');
  return response.json();
};

const deleteSymbol = async (symbol: string) => {
  const response = await fetch(`/api/symbols/${symbol}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete symbol');
};

const fetchSymbolCatalogInfo = async (symbol: string) => {
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
  const [selectedSymbolInfo, setSelectedSymbolInfo] = useState<any>(null);
  const [loadingSymbolInfo, setLoadingSymbolInfo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const menuItems = [
    { id: 'list', label: 'Symbol List', icon: '📋' },
    { id: 'add', label: 'Add Symbol', icon: '➕' },
    { id: 'download', label: 'Download Data', icon: '📥' },
    { id: 'analytics', label: 'Analytics', icon: '📊' },
  ];

  useEffect(() => {
    loadSymbols();
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      loadSymbolInfo(selectedSymbol);
    } else {
      setSelectedSymbolInfo(null);
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

    try {
      await addSymbol(newSymbol.toUpperCase());
      setNewSymbol('');
      await loadSymbols();
      setActiveView('list');
      setError(null);
    } catch (err) {
      setError('Failed to add symbol');
      console.error(err);
    }
  };

  const handleDeleteSymbol = async (symbol: string) => {
    if (!confirm(`Delete ${symbol}?`)) return;

    try {
      await deleteSymbol(symbol);
      await loadSymbols();
      setSelectedSymbol(null);
      setError(null);
    } catch (err) {
      setError('Failed to delete symbol');
      console.error(err);
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
            <div className="mb-6">
              <h1 className="text-2xl font-bold main-title">Symbol List</h1>
              <p className="main-subtitle mt-1">
                Manage your tracked stock symbols
              </p>
            </div>

            <div className="symbol-list-card rounded-lg shadow-sm">
              <div className="p-6">
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
                            onClick={() => setSelectedSymbol(symbol)}
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

                    {/* Symbol Details */}
                    <div className="symbol-item-card rounded-lg p-4">
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
                                      {new Date(selectedSymbolInfo.start_date).toLocaleDateString()} - {new Date(selectedSymbolInfo.end_date).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                                    <span className="main-subtitle">Last Updated</span>
                                    <span className="font-medium main-title">
                                      {new Date(selectedSymbolInfo.last_updated).toLocaleString()}
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

                            <div className="pt-4 space-y-2">
                              <button
                                onClick={() => handleDeleteSymbol(selectedSymbol)}
                                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                              >
                                Delete Symbol
                              </button>
                              <button
                                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700"
                                disabled
                              >
                                View Price Chart (Coming Soon)
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          Select a symbol to view details
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Symbol View */}
        {activeView === 'add' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold main-title">Add New Symbol</h1>
              <p className="main-subtitle mt-1">
                Add a new stock symbol to track
              </p>
            </div>

            <div className="symbol-list-card rounded-lg shadow-sm max-w-lg">
              <div className="p-6">
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
                      />
                      <p className="mt-2 text-sm main-subtitle">
                        Enter the ticker symbol of the stock you want to track
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={!newSymbol.trim()}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
                      >
                        Add Symbol
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewSymbol('');
                          setActiveView('list');
                        }}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Download Data View */}
        {activeView === 'download' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold main-title">Download Historical Data</h1>
              <p className="main-subtitle mt-1">
                Download historical price data for symbols
              </p>
            </div>

            <div className="symbol-list-card rounded-lg shadow-sm p-6">
              <p className="main-subtitle">Download functionality coming soon...</p>
            </div>
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