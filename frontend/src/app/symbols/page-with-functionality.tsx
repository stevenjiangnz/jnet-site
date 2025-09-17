"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';

// Simple API client
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8002';

const fetchSymbols = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/symbols/list`);
  if (!response.ok) throw new Error('Failed to fetch symbols');
  return response.json();
};

const addSymbol = async (symbol: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/symbols/add?symbol=${symbol}`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to add symbol');
  return response.json();
};

const deleteSymbol = async (symbol: string) => {
  const response = await fetch(`${API_BASE_URL}/api/v1/symbols/${symbol}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete symbol');
};

export default function SymbolsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [symbols, setSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      loadSymbols();
    }
  }, [user]);

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

  const handleAddSymbol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    try {
      await addSymbol(newSymbol.toUpperCase());
      setNewSymbol('');
      await loadSymbols();
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
      setError(null);
    } catch (err) {
      setError('Failed to delete symbol');
      console.error(err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Symbol Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage stock symbols and download historical data
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
            {error}
          </div>
        )}

        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Add New Symbol</h2>
          <form onSubmit={handleAddSymbol} className="flex gap-2">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Enter symbol (e.g., AAPL)"
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              type="submit"
              disabled={!newSymbol.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              Add Symbol
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Symbol List ({symbols.length})
            </h2>
            
            {loading ? (
              <div className="text-center py-4">Loading symbols...</div>
            ) : symbols.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No symbols found. Add a symbol to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700">
                      <th className="text-left py-2">Symbol</th>
                      <th className="text-right py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbols.map((symbol) => (
                      <tr key={symbol} className="border-b dark:border-gray-700">
                        <td className="py-3 font-medium">{symbol}</td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleDeleteSymbol(symbol)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}