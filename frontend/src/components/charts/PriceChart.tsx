"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type Highcharts from 'highcharts';

interface PriceChartProps {
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

// Extend Window to include Highcharts
declare global {
  interface Window {
    Highcharts?: typeof Highcharts;
  }
}

export default function PriceChart({ symbol, isVisible }: PriceChartProps) {
  // Ensure this component only renders on the client
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highchartsLoaded, setHighchartsLoaded] = useState(false);

  // Load Highcharts dynamically on client side only
  useEffect(() => {
    if (!isClient) return;
    
    const loadHighcharts = async () => {
      if (typeof window !== 'undefined' && !window.Highcharts) {
        const HighchartsModule = (await import('highcharts/highstock')).default;
        window.Highcharts = HighchartsModule;
        setHighchartsLoaded(true);
      } else if (window.Highcharts) {
        setHighchartsLoaded(true);
      }
    };
    
    loadHighcharts();
    
    // Clean up chart when component unmounts
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [isClient]);

  const createChart = useCallback((ohlc: number[][], volume: number[][]) => {
    if (!chartContainerRef.current || !window.Highcharts) {
      console.error('[PriceChart] Missing requirements:', {
        hasContainer: !!chartContainerRef.current,
        hasHighcharts: !!window.Highcharts
      });
      return;
    }

    // Destroy existing chart if any
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Data grouping configuration
    // Option 1: Disable data grouping completely (always show individual daily points)
    const disableDataGrouping = { enabled: false };
    
    // Option 2: Force daily grouping only (prevents automatic weekly/monthly grouping)
    const dailyGroupingOnly = {
      units: [['day', [1]]],
      // Optional: force grouping even when all points fit in view
      // forced: true
    };
    
    // Option 3: Allow multiple grouping levels but control when they activate
    const controlledGrouping = {
      units: [
        ['day', [1]],
        ['week', [1]], 
        ['month', [1, 2, 3, 4, 6]]
      ],
      // Increase this value to require more data points before grouping activates
      groupPixelWidth: 10  // Default is 2
    };
    
    // Choose your preferred configuration
    const dataGroupingConfig = disableDataGrouping; // Change this to use different options

    // Create the chart
    try {
      // @ts-expect-error - Highcharts types are not fully compatible with DOM elements
      chartRef.current = window.Highcharts.stockChart(chartContainerRef.current, {
        chart: {
          backgroundColor: '#ffffff',
          height: 600
        },

        rangeSelector: {
          buttons: [{
            type: 'month',
            count: 1,
            text: '1m'
          }, {
            type: 'month',
            count: 3,
            text: '3m'
          }, {
            type: 'month',
            count: 6,
            text: '6m'
          }, {
            type: 'ytd',
            text: 'YTD'
          }, {
            type: 'year',
            count: 1,
            text: '1y'
          }, {
            type: 'all',
            text: 'All'
          }],
          selected: 2  // Default to 6 months (index 2)
        },

        title: {
          text: `${symbol} Stock Price`
        },

        yAxis: [{
          labels: {
            align: 'right',
            x: -3
          },
          title: {
            text: 'OHLC'
          },
          height: '60%',
          lineWidth: 2
        }, {
          labels: {
            align: 'right',
            x: -3
          },
          title: {
            text: 'Volume'
          },
          top: '65%',
          height: '35%',
          offset: 0,
          lineWidth: 2
        }],

        series: [{
          type: 'candlestick',
          name: symbol,
          data: ohlc,
          dataGrouping: dataGroupingConfig
        }, {
          type: 'column',
          name: 'Volume',
          data: volume,
          yAxis: 1,
          dataGrouping: dataGroupingConfig
        }]
      });
    } catch (error) {
      console.error('[PriceChart] Error creating chart:', error);
      setError('Failed to render chart: ' + (error as Error).message);
    }
  }, [symbol]);

  const renderChart = useCallback((data: PriceData[]) => {
    if (!chartContainerRef.current || !window.Highcharts) {
      console.error('[PriceChart] Cannot render - missing requirements:', {
        hasContainer: !!chartContainerRef.current,
        hasHighcharts: !!window.Highcharts
      });
      return;
    }

    // Prepare data for Highcharts
    const ohlc: number[][] = [];
    const volume: number[][] = [];

    data.forEach((item, index) => {
      // Simple timestamp conversion - let JavaScript Date handle it
      let timestamp: number;
      
      // The API returns ISO strings, potentially with microseconds
      // JavaScript Date constructor handles ISO 8601 format correctly
      if (typeof item.timestamp === 'string') {
        // If the timestamp has microseconds (more than 3 decimal places), truncate them
        let timestampStr = item.timestamp;
        const microsecondsMatch = timestampStr.match(/\.\d{6,}/);
        if (microsecondsMatch) {
          // Replace microseconds with milliseconds (keep only 3 digits)
          timestampStr = timestampStr.replace(/(\.\d{3})\d*/, '$1');
        }
        
        // Ensure the timestamp ends with 'Z' for UTC
        if (!timestampStr.endsWith('Z') && !timestampStr.includes('+') && !timestampStr.includes('-')) {
          timestampStr += 'Z';
        }
        
        timestamp = new Date(timestampStr).getTime();
      } else if (item.timestamp instanceof Date) {
        timestamp = item.timestamp.getTime();
      } else {
        // If it's already a number, assume it's milliseconds
        timestamp = Number(item.timestamp);
      }
      
      
      if (isNaN(timestamp)) {
        console.error('[PriceChart] Invalid timestamp at index', index, item);
        return; // Skip this data point
      }
      
      ohlc.push([
        timestamp,
        item.open,
        item.high,
        item.low,
        item.close
      ]);
      volume.push([
        timestamp,
        item.volume
      ]);
    });

    createChart(ohlc, volume);
  }, [createChart]);

  const loadChartData = useCallback(async () => {
    // Don't load if not visible
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
        limit: '1825'  // 5 years worth of trading days (365 * 5)
      });

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PriceChart] Fetching data for ${symbol}`);
      }

      const response = await fetch(`/api/symbols/${symbol}/prices?${params}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[PriceChart] API Error:', response.status, errorData);
        throw new Error(`API returned ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      // Keep minimal logging in production
      if (result.data && result.data.length > 0) {
        console.log(`[PriceChart] Loaded ${result.data.length} data points for ${symbol}`);
      }
      
      if (result.data && result.data.length > 0) {
        // Use setTimeout to ensure the container is mounted
        setTimeout(() => {
          renderChart(result.data);
        }, 100);
      } else {
        setError('No price data available for this symbol');
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load price data');
    } finally {
      setLoading(false);
    }
  }, [isVisible, symbol, renderChart]);

  useEffect(() => {
    if (!isClient) return;
    
    if (!isVisible && chartRef.current) {
      // Destroy chart when hidden
      chartRef.current.destroy();
      chartRef.current = null;
      return;
    }
    
    if (highchartsLoaded && isVisible && symbol && chartContainerRef.current) {
      loadChartData();
    }
  }, [symbol, isVisible, highchartsLoaded, isClient, loadChartData]);

  // Don't render anything on the server
  if (!isClient || !isVisible) {
    return null;
  }

  return (
    <div className="w-full">
      {(loading || !highchartsLoaded) && (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {!highchartsLoaded ? 'Loading chart library...' : 'Loading price data...'}
            </p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}
      
      {highchartsLoaded && !loading && !error && (
        <div 
          ref={chartContainerRef} 
          className="w-full min-h-[600px] bg-white rounded-lg shadow-sm p-2"
          style={{ visibility: isVisible ? 'visible' : 'hidden' }}
        />
      )}
    </div>
  );
}