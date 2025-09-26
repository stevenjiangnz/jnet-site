"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type Highcharts from 'highcharts';

interface PriceChartProps {
  symbol: string;
  isVisible: boolean;
  indicatorSet?: 'chart_basic' | 'chart_advanced' | 'chart_full';
}

interface PriceData {
  timestamp: string | Date | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Indicators {
  SMA_20?: { SMA: number[][] };
  SMA_50?: { SMA: number[][] };
  SMA_200?: { SMA: number[][] };
  BB_20?: { upper: number[][], middle: number[][], lower: number[][] };
  MACD?: { MACD: number[][], signal: number[][], histogram: number[][] };
  RSI_14?: { RSI: number[][] };
  ADX_14?: { ADX: number[][], 'DI+': number[][], 'DI-': number[][] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow string indexing for dynamic access
}

// Extend Window to include Highcharts
declare global {
  interface Window {
    Highcharts?: typeof Highcharts;
  }
}

export default function PriceChart({ symbol, isVisible, indicatorSet = 'chart_basic' }: PriceChartProps) {
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

  const createChart = useCallback((ohlc: number[][], volume: any[], indicators: Indicators | null) => {
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
    // const dailyGroupingOnly = {
    //   units: [['day', [1]]],
    //   // Optional: force grouping even when all points fit in view
    //   // forced: true
    // };
    
    // Option 3: Allow multiple grouping levels but control when they activate
    // const controlledGrouping = {
    //   units: [
    //     ['day', [1]],
    //     ['week', [1]], 
    //     ['month', [1, 2, 3, 4, 6]]
    //   ],
    //   // Increase this value to require more data points before grouping activates
    //   groupPixelWidth: 10  // Default is 2
    // };
    
    // Choose your preferred configuration
    const dataGroupingConfig = disableDataGrouping; // Change this to use different options

    // Define indicator colors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indicatorColors: Record<string, any> = {
      SMA_20: '#FF6B6B',
      SMA_50: '#4ECDC4',
      SMA_200: '#45B7D1',
      BB: {
        upper: 'rgba(170,170,170,0.3)',
        middle: '#888888',
        lower: 'rgba(170,170,170,0.3)',
        fill: 'rgba(170,170,170,0.1)'
      },
      MACD: {
        macd: '#26A69A',
        signal: '#EF5350',
        histogram: '#78909C'
      },
      RSI: '#9C27B0',
      ADX: {
        adx: '#FF9800',
        plusDI: '#4CAF50',
        minusDI: '#F44336'
      }
    };

    // Configure Y-axes based on indicators present
    const yAxis = [];
    const series = [];
    
    // Fixed pixel heights for all panes
    const priceHeight = 300; // Fixed height for price+volume panel
    const macdHeight = 150; // Fixed height for MACD panel
    const rsiHeight = 100; // Fixed height for RSI panel
    const adxHeight = 150; // Fixed height for ADX panel
    const panelGap = 10; // Gap between panels in pixels
    
    let currentTop = 0;
    
    // Price panel with volume (merged) - using fixed pixel height
    yAxis.push({
      labels: {
        align: 'right',
        x: -3
      },
      title: {
        text: 'Price'
      },
      height: priceHeight,
      top: currentTop,
      lineWidth: 2
    });
    
    // Secondary y-axis for volume (on the same panel as price)
    yAxis.push({
      labels: {
        align: 'left',
        x: 3
      },
      title: {
        text: 'Volume'
      },
      height: priceHeight,
      top: currentTop,
      opposite: true,
      lineWidth: 0,
      gridLineWidth: 0,
      // Scale volume to use only bottom 49% of the panel (70% of 70%)
      max: undefined,
      endOnTick: false,
      maxPadding: 0.51 // This creates 51% padding at the top, effectively limiting volume to 49% height
    });
    
    currentTop += priceHeight + panelGap;

    // MACD panel (if present) - using fixed pixel height
    if (indicators && indicators.MACD) {
      yAxis.push({
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'MACD'
        },
        top: currentTop,
        height: macdHeight,
        offset: 0,
        lineWidth: 2
      });
      currentTop += macdHeight + panelGap;
    }

    // ADX panel (if present) - using fixed pixel height
    if (indicators && indicators.ADX_14) {
      yAxis.push({
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'ADX'
        },
        top: currentTop,
        height: adxHeight,
        offset: 0,
        lineWidth: 2
      });
      currentTop += adxHeight + panelGap;
    }

    // RSI panel (if present) - using fixed pixel height
    if (indicators && indicators.RSI_14) {
      yAxis.push({
        labels: {
          align: 'right',
          x: -3
        },
        title: {
          text: 'RSI'
        },
        top: currentTop,
        height: rsiHeight,
        offset: 0,
        lineWidth: 2,
        plotLines: [{
          value: 70,
          color: '#FF4444',
          width: 1,
          dashStyle: 'shortdash',
          label: {
            text: '70',
            align: 'left'
          }
        }, {
          value: 30,
          color: '#44FF44',
          width: 1,
          dashStyle: 'shortdash',
          label: {
            text: '30',
            align: 'left'
          }
        }]
      });
    }

    // Add price series
    series.push({
      type: 'candlestick',
      name: symbol,
      data: ohlc,
      yAxis: 0,
      dataGrouping: dataGroupingConfig
    });

    // Add volume series (on the same panel as price, using secondary y-axis)
    series.push({
      type: 'column',
      name: 'Volume',
      data: volume,
      yAxis: 1,
      turboThreshold: 0, // Disable threshold to support color objects
      dataGrouping: {
        enabled: false // Disable data grouping to preserve colors
      },
      opacity: 0.7
      // Colors are now embedded in the data points
    });

    // Add overlay indicators (on price panel)
    if (indicators) {
      // SMAs
      ['SMA_20', 'SMA_50', 'SMA_200'].forEach(smaKey => {
        if (indicators[smaKey] && indicators[smaKey].SMA) {
          series.push({
            type: 'line',
            name: smaKey.replace('_', ' '),
            data: indicators[smaKey].SMA,
            yAxis: 0,
            color: indicatorColors[smaKey],
            lineWidth: 2,
            dataGrouping: dataGroupingConfig
          });
        }
      });

      // Bollinger Bands
      if (indicators.BB_20) {
        // Add fill area
        if (indicators.BB_20.upper && indicators.BB_20.lower) {
          series.push({
            type: 'arearange',
            name: 'BB Bands',
            data: indicators.BB_20.upper.map((point, i) => {
              return [point[0], indicators.BB_20!.lower[i][1], point[1]];
            }),
            yAxis: 0,
            lineWidth: 0,
            linkedTo: ':previous',
            color: indicatorColors.BB.upper,
            fillOpacity: 0.1,
            zIndex: 0,
            dataGrouping: dataGroupingConfig
          });
        }

        // Add middle line
        if (indicators.BB_20.middle) {
          series.push({
            type: 'line',
            name: 'BB Middle',
            data: indicators.BB_20.middle,
            yAxis: 0,
            color: indicatorColors.BB.middle,
            lineWidth: 1,
            dashStyle: 'shortdot',
            dataGrouping: dataGroupingConfig
          });
        }
      }

      // MACD (separate panel) - adjusted index since volume is merged
      const macdYAxis = 2;
      if (indicators.MACD) {
        // MACD histogram
        if (indicators.MACD.histogram) {
          series.push({
            type: 'column',
            name: 'MACD Histogram',
            data: indicators.MACD.histogram,
            yAxis: macdYAxis,
            color: indicatorColors.MACD.histogram,
            dataGrouping: dataGroupingConfig
          });
        }

        // MACD line
        if (indicators.MACD.MACD) {
          series.push({
            type: 'line',
            name: 'MACD',
            data: indicators.MACD.MACD,
            yAxis: macdYAxis,
            color: indicatorColors.MACD.macd,
            lineWidth: 2,
            dataGrouping: dataGroupingConfig
          });
        }

        // Signal line
        if (indicators.MACD.signal) {
          series.push({
            type: 'line',
            name: 'Signal',
            data: indicators.MACD.signal,
            yAxis: macdYAxis,
            color: indicatorColors.MACD.signal,
            lineWidth: 2,
            dataGrouping: dataGroupingConfig
          });
        }
      }

      // ADX (separate panel) - moved before RSI
      const adxYAxis = indicators.MACD ? 3 : 2;
      if (indicators.ADX_14) {
        // ADX line
        if (indicators.ADX_14.ADX) {
          series.push({
            type: 'line',
            name: 'ADX',
            data: indicators.ADX_14.ADX,
            yAxis: adxYAxis,
            color: indicatorColors.ADX.adx,
            lineWidth: 2,
            dataGrouping: dataGroupingConfig
          });
        }

        // DI+ line
        if (indicators.ADX_14['DI+']) {
          series.push({
            type: 'line',
            name: 'DI+',
            data: indicators.ADX_14['DI+'],
            yAxis: adxYAxis,
            color: indicatorColors.ADX.plusDI,
            lineWidth: 1,
            dataGrouping: dataGroupingConfig
          });
        }

        // DI- line
        if (indicators.ADX_14['DI-']) {
          series.push({
            type: 'line',
            name: 'DI-',
            data: indicators.ADX_14['DI-'],
            yAxis: adxYAxis,
            color: indicatorColors.ADX.minusDI,
            lineWidth: 1,
            dataGrouping: dataGroupingConfig
          });
        }
      }

      // RSI (separate panel) - moved after ADX
      const rsiYAxis = adxYAxis + (indicators.ADX_14 ? 1 : 0);
      if (indicators.RSI_14 && indicators.RSI_14.RSI) {
        series.push({
          type: 'line',
          name: 'RSI',
          data: indicators.RSI_14.RSI,
          yAxis: rsiYAxis,
          color: indicatorColors.RSI,
          lineWidth: 2,
          dataGrouping: dataGroupingConfig
        });
      }
    }

    // Calculate total chart height based on actual panels present
    let chartHeight = priceHeight; // Start with price panel height
    
    // Add heights for each indicator panel that's actually present
    if (indicators && indicators.MACD) {
      chartHeight += panelGap + macdHeight;
    }
    
    if (indicators && indicators.ADX_14) {
      chartHeight += panelGap + adxHeight;
    }
    
    if (indicators && indicators.RSI_14) {
      chartHeight += panelGap + rsiHeight;
    }
    
    // Add padding for range selector and margins
    chartHeight += 80; // Extra space for range selector and chart margins

    // Create the chart
    try {
      // Type assertion to satisfy Highcharts API  
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chartRef.current = (window.Highcharts as any).stockChart(chartContainerRef.current!, {
        chart: {
          backgroundColor: '#ffffff',
          height: chartHeight
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

        yAxis: yAxis,

        series: series,

        legend: {
          enabled: true,
          align: 'center',
          verticalAlign: 'bottom',
          layout: 'horizontal'
        },

        tooltip: {
          split: true
        }
      });
    } catch (error) {
      console.error('[PriceChart] Error creating chart:', error);
      setError('Failed to render chart: ' + (error as Error).message);
    }
  }, [symbol, indicatorSet]);

  const renderChart = useCallback((data: PriceData[], indicators?: Indicators) => {
    if (!chartContainerRef.current || !window.Highcharts) {
      console.error('[PriceChart] Cannot render - missing requirements:', {
        hasContainer: !!chartContainerRef.current,
        hasHighcharts: !!window.Highcharts
      });
      return;
    }

    // Prepare data for Highcharts
    const ohlc: number[][] = [];
    const volume: any[] = [];

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
      
      // Store volume with color information based on price movement
      const isGreen = item.close >= item.open;
      volume.push({
        x: timestamp,
        y: item.volume,
        color: isGreen ? '#22c55e' : '#ef4444' // Green for up, red for down
      } as any);
    });

    createChart(ohlc, volume, indicators || null);
  }, [createChart]);

  const loadChartData = useCallback(async () => {
    // Don't load if not visible
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        indicators: indicatorSet
      });

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[PriceChart] Fetching chart data for ${symbol} with indicators: ${indicatorSet}`);
      }

      const response = await fetch(`/api/symbols/${symbol}/chart?${params}`);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('[PriceChart] API Error:', response.status, errorData);
        throw new Error(`API returned ${response.status}: ${errorData}`);
      }

      const result = await response.json();
      
      // Keep minimal logging in production
      if (result.ohlc && result.ohlc.length > 0) {
        console.log(`[PriceChart] Loaded ${result.ohlc.length} data points for ${symbol}`);
      }
      
      if (result.ohlc && result.ohlc.length > 0) {
        // Convert chart format back to PriceData format for backward compatibility
        const priceData = result.ohlc.map((point: number[]) => ({
          timestamp: new Date(point[0]),
          open: point[1],
          high: point[2],
          low: point[3],
          close: point[4],
          volume: 0 // Volume is separate
        }));

        // Add volume data
        if (result.volume) {
          result.volume.forEach((vol: number[], i: number) => {
            if (priceData[i]) {
              priceData[i].volume = vol[1];
            }
          });
        }

        // Use setTimeout to ensure the container is mounted
        setTimeout(() => {
          renderChart(priceData, result.indicators);
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
  }, [isVisible, symbol, indicatorSet, renderChart]);

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
  }, [symbol, isVisible, highchartsLoaded, isClient, indicatorSet, loadChartData]);

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
          className="w-full bg-white rounded-lg shadow-sm p-2"
          style={{ 
            visibility: isVisible ? 'visible' : 'hidden',
            minHeight: indicatorSet === 'chart_full' ? '820px' : // 300 + 150 + 150 + 100 + gaps + padding
                      indicatorSet === 'chart_advanced' ? '570px' : // 300 + 150 + 100 + gaps + padding
                      '540px' // 300 + 150 + gaps + padding
          }}
        />
      )}
    </div>
  );
}