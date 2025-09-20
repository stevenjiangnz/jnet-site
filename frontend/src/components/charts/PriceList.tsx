"use client";

import { useState, useEffect, useCallback } from 'react';
// import { toBrisbaneTime } from '@/utils/dateUtils';

interface PriceListProps {
  symbol: string;
  isVisible: boolean;
}

interface PriceData {
  timestamp: string | Date | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function PriceList({ symbol, isVisible }: PriceListProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  const loadPriceData = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);

    try {
      // Calculate date range (5 years of data)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5);

      const params = new URLSearchParams({
        interval: '1d',
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        limit: '1825'  // 5 years worth of trading days
      });

      const response = await fetch(`/api/symbols/${symbol}/prices?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch price data`);
      }

      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        // Sort by timestamp descending
        const sortedData = result.data.sort((a: PriceData, b: PriceData) => {
          const aTime = new Date(a.timestamp).getTime();
          const bTime = new Date(b.timestamp).getTime();
          return bTime - aTime;
        });
        setPriceData(sortedData);
      } else {
        setError('No price data available for this symbol');
      }
    } catch (err) {
      console.error('Error loading price data:', err);
      setError('Failed to load price data');
    } finally {
      setLoading(false);
    }
  }, [symbol, isVisible]);

  useEffect(() => {
    if (isVisible && symbol) {
      loadPriceData();
    }
  }, [symbol, isVisible, loadPriceData]);

  if (!isVisible) {
    return null;
  }

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(2) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(2) + 'K';
    }
    return volume.toString();
  };

  return (
    <div className={`transition-all duration-300 ${isExpanded ? 'w-full' : 'w-12'}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          {isExpanded && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Price History
            </h3>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="overflow-auto" style={{ maxHeight: '600px' }}>
            {loading && (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {error && (
              <div className="p-4 text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && priceData.length > 0 && (
              <table className="min-w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Trade Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Open
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Close
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      High
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Low
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Volume
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {priceData.map((price, index) => {
                    const changePercent = ((price.close - price.open) / price.open) * 100;
                    const isPositive = changePercent >= 0;
                    
                    return (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(price.timestamp).toLocaleDateString('en-AU', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                          ${formatNumber(price.open)}
                        </td>
                        <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-medium ${
                          isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          ${formatNumber(price.close)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                          ${formatNumber(price.high)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                          ${formatNumber(price.low)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
                          {formatVolume(price.volume)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && !error && priceData.length === 0 && (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No price data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}