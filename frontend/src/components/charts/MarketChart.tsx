"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import type Highcharts from 'highcharts';

// Extend Window to include Highcharts
declare global {
  interface Window {
    Highcharts?: typeof Highcharts;
  }
}

interface MarketChartProps {
  symbol: string;
  isVisible: boolean;
  indicators: {
    // Overlays
    volume: boolean;
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    ema20: boolean;
    bb20: boolean;
    
    // Oscillators
    macd: boolean;
    rsi14: boolean;
    adx14: boolean;
  };
  viewType: 'daily' | 'weekly';
  dateRange: string;
  chartType: 'candlestick' | 'line' | 'area';
  onDataPointSelect?: (point: {
    timestamp: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume?: number;
  }) => void;
}

interface ChartData {
  ohlc: number[][];
  volume: number[][];
  indicators?: {
    SMA_20?: { SMA: number[][] };
    SMA_50?: { SMA: number[][] };
    SMA_200?: { SMA: number[][] };
    BB_20?: { upper: number[][], middle: number[][], lower: number[][] };
    MACD?: { MACD: number[][], signal: number[][], histogram: number[][] };
    RSI_14?: { RSI: number[][] };
    ADX_14?: { ADX: number[][], 'DI+': number[][], 'DI-': number[][] };
  };
}

// Indicator colors configuration
const INDICATOR_COLORS = {
  sma20: '#fbbf24',  // Amber
  sma50: '#3b82f6',  // Blue
  sma200: '#a855f7', // Purple
  ema20: '#f97316',  // Orange
  bb: {
    upper: 'rgba(168, 85, 247, 0.3)',
    middle: '#a855f7',
    lower: 'rgba(168, 85, 247, 0.3)',
    fill: 'rgba(168, 85, 247, 0.1)'
  },
  macd: {
    macd: '#10b981',   // Emerald
    signal: '#f59e0b', // Amber
    histogram: 'rgba(139, 92, 246, 0.5)' // Purple with transparency
  },
  rsi: '#ec4899',    // Pink
  adx: {
    adx: '#f59e0b',    // Amber
    plusDI: '#10b981', // Emerald
    minusDI: '#ef4444' // Red
  }
};

export default function MarketChart({
  symbol,
  isVisible,
  indicators,
  viewType,
  dateRange,
  chartType,
  onDataPointSelect // eslint-disable-line @typescript-eslint/no-unused-vars
}: MarketChartProps) {
  const [isClient, setIsClient] = useState(false);
  const [highchartsLoaded, setHighchartsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const indicatorSeriesIds = useRef<Record<string, string>>({});
  const yAxisManager = useRef({
    priceAxisIndex: 0,
    volumeAxisIndex: 1,
    oscillatorAxes: new Map<string, number>()
  });

  // Initialize client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load Highcharts dynamically
  useEffect(() => {
    if (!isClient) return;
    
    const loadHighcharts = async () => {
      try {
        const { loadHighchartsModules } = await import('@/utils/highcharts-loader');
        await loadHighchartsModules();
        setHighchartsLoaded(true);
      } catch (error) {
        console.error('[MarketChart] Error loading Highcharts:', error);
        setError('Failed to load chart library');
      }
    };
    
    if (!window.Highcharts) {
      loadHighcharts();
    } else {
      setHighchartsLoaded(true);
    }
  }, [isClient]);

  // Calculate dynamic chart height based on active indicators
  const calculateChartHeight = useCallback(() => {
    const baseHeight = 500; // Base for price + volume
    let oscillatorCount = 0;
    
    if (indicators.macd) oscillatorCount++;
    if (indicators.rsi14) oscillatorCount++;
    if (indicators.adx14) oscillatorCount++;
    
    // Add 150px for each oscillator panel
    return baseHeight + (oscillatorCount * 150);
  }, [indicators]);

  // Build chart configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildChartConfig = useCallback((): any => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      chart: {
        backgroundColor: '#1a1a1a',
        height: calculateChartHeight(),
        style: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        events: {
          load: function() {
            console.log('[MarketChart] Chart loaded successfully');
          }
        }
      },
      
      time: {
        timezone: 'Australia/Brisbane'
      },
      
      rangeSelector: {
        buttons: [
          { type: 'month', count: 1, text: '1M' },
          { type: 'month', count: 3, text: '3M' },
          { type: 'month', count: 6, text: '6M' },
          { type: 'year', count: 1, text: '1Y' },
          { type: 'year', count: 3, text: '3Y' },
          { type: 'all', text: 'All' }
        ],
        selected: dateRange === '1M' ? 0 : 
                 dateRange === '3M' ? 1 : 
                 dateRange === '6M' ? 2 : 
                 dateRange === '1Y' ? 3 : 
                 dateRange === '3Y' ? 4 : 5,
        inputEnabled: true,
        buttonTheme: {
          fill: '#2d2d2d',
          stroke: '#404040',
          'stroke-width': 1,
          r: 4,
          style: {
            color: '#a0a0a0',
            fontWeight: 'normal',
            fontSize: '12px'
          },
          states: {
            hover: {
              fill: '#3d3d3d',
              stroke: '#505050',
              style: {
                color: '#ffffff',
                cursor: 'pointer'
              }
            },
            select: {
              fill: '#4f46e5',
              stroke: '#4f46e5',
              style: {
                color: '#ffffff',
                fontWeight: '500'
              }
            }
          }
        },
        inputBoxBorderColor: '#404040',
        inputBoxHeight: 32,
        inputBoxWidth: 120,
        inputStyle: {
          backgroundColor: '#2d2d2d',
          color: '#e0e0e0',
          fontSize: '12px'
        },
        labelStyle: {
          color: '#a0a0a0',
          fontSize: '12px'
        }
      },
      
      title: {
        text: `${symbol} Stock Price`,
        style: {
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '500'
        }
      },
      
      yAxis: [{
        // Price axis
        labels: { 
          align: 'right', 
          x: -3,
          style: {
            color: '#a0a0a0',
            fontSize: '12px'
          }
        },
        title: { 
          text: 'Price',
          style: {
            color: '#a0a0a0',
            fontSize: '12px'
          }
        },
        height: '60%',
        lineWidth: 0,
        id: 'price-axis',
        gridLineColor: '#2a2a2a',
        gridLineWidth: 1,
        lineColor: '#404040'
      }],
      
      plotOptions: {
        series: {
          dataGrouping: {
            enabled: viewType === 'weekly',
            units: viewType === 'weekly' ? [['week', [1]]] : undefined
          }
        },
        candlestick: {
          color: '#ef4444',
          upColor: '#10b981',
          lineColor: '#ef4444',
          upLineColor: '#10b981'
        },
        column: {
          color: 'rgba(139, 92, 246, 0.3)',
          borderColor: 'transparent'
        },
        line: {
          lineWidth: 2
        }
      },
      
      series: [{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: chartType as any,
        id: 'main-series',
        name: symbol,
        data: [],
        tooltip: {
          valueDecimals: 2
        }
      }],
      
      legend: {
        itemStyle: {
          color: '#a0a0a0',
          fontSize: '12px'
        },
        itemHoverStyle: {
          color: '#ffffff'
        },
        itemHiddenStyle: {
          color: '#606060'
        },
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal',
        backgroundColor: 'transparent'
      },
      
      responsive: {
        rules: [{
          condition: {
            maxWidth: 800
          },
          chartOptions: {
            rangeSelector: {
              inputEnabled: false,
              buttonTheme: {
                width: 40
              }
            }
          }
        }]
      },
      
      // Add xAxis theme
      xAxis: {
        lineColor: '#404040',
        tickColor: '#404040',
        labels: {
          style: {
            color: '#a0a0a0',
            fontSize: '12px'
          }
        }
      },
      
      // Navigator styling
      navigator: {
        maskFill: 'rgba(139, 92, 246, 0.1)',
        series: {
          color: '#8b5cf6',
          lineColor: '#8b5cf6',
          lineWidth: 1
        },
        xAxis: {
          gridLineColor: '#2a2a2a',
          labels: {
            style: {
              color: '#a0a0a0',
              fontSize: '11px'
            }
          }
        },
        handles: {
          backgroundColor: '#8b5cf6',
          borderColor: '#8b5cf6',
          borderRadius: 2
        },
        height: 40,
        margin: 25
      },
      
      // Scrollbar styling
      scrollbar: {
        barBackgroundColor: '#404040',
        barBorderColor: '#404040',
        buttonBackgroundColor: '#2d2d2d',
        buttonBorderColor: '#404040',
        trackBackgroundColor: '#1a1a1a',
        trackBorderColor: '#404040',
        buttonArrowColor: '#a0a0a0'
      },
      
      // Tooltip styling
      tooltip: {
        split: true,
        crosshairs: true,
        backgroundColor: 'rgba(30, 30, 30, 0.95)',
        borderWidth: 1,
        borderColor: '#404040',
        style: {
          color: '#ffffff',
          fontSize: '12px'
        },
        shadow: true
      }
    };
    
    return config;
  }, [symbol, calculateChartHeight, dateRange, viewType, chartType]);

  // Add new Y-axis for oscillators
  const addNewYAxis = useCallback((title: string, height: number = 15): number => {
    if (!chartRef.current) return -1;
    
    // Calculate top position
    const existingAxes = chartRef.current.yAxis.length;
    let currentTop = 0;
    
    // Recalculate all axis positions
    const priceHeight = 60 - (existingAxes - 1) * 5; // Shrink price panel
    const gap = 2;
    
    // Update price axis height
    chartRef.current.yAxis[0].update({
      height: `${priceHeight}%`
    }, false);
    
    currentTop = priceHeight + gap;
    
    // Update positions of existing axes
    for (let i = 1; i < existingAxes; i++) {
      chartRef.current.yAxis[i].update({
        top: `${currentTop}%`
      }, false);
      currentTop += 15 + gap; // Standard height for oscillators
    }
    
    // Add new axis
    const newAxis: Highcharts.YAxisOptions = {
      labels: { 
        align: 'right', 
        x: -3,
        style: {
          color: '#a0a0a0',
          fontSize: '11px'
        }
      },
      title: { 
        text: title,
        style: {
          color: '#a0a0a0',
          fontSize: '12px'
        }
      },
      top: `${currentTop}%`,
      height: `${height}%`,
      offset: 0,
      lineWidth: 0,
      gridLineColor: '#2a2a2a',
      gridLineWidth: 1,
      lineColor: '#404040'
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axis = chartRef.current.addAxis(newAxis as any, false, false);
    const axisIndex = chartRef.current.yAxis.indexOf(axis);
    
    yAxisManager.current.oscillatorAxes.set(title, axisIndex);
    chartRef.current.redraw();
    
    return axisIndex;
  }, []);

  // Add indicator dynamically
  const addIndicator = useCallback((indicatorType: string, data?: ChartData) => {
    if (!chartRef.current) return;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let series: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesOptions: any = {
      animation: { duration: 200 }
    };
    
    switch (indicatorType) {
      case 'volume':
        // Add volume axis if not exists
        if (!yAxisManager.current.oscillatorAxes.has('Volume')) {
          const volumeAxisIndex = addNewYAxis('Volume', 15);
          yAxisManager.current.volumeAxisIndex = volumeAxisIndex;
          
          series = {
            type: 'column',
            id: 'volume-series',
            name: 'Volume',
            data: data?.volume || [],
            yAxis: volumeAxisIndex,
            color: 'rgba(139, 92, 246, 0.3)',
            borderColor: 'transparent',
            ...seriesOptions
          };
        }
        break;
        
      case 'sma20':
        if (data?.indicators?.SMA_20?.SMA) {
          series = {
            type: 'line',
            id: 'sma20-series',
            name: 'SMA (20)',
            data: data.indicators.SMA_20.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma20,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'sma50':
        if (data?.indicators?.SMA_50?.SMA) {
          series = {
            type: 'line',
            id: 'sma50-series',
            name: 'SMA (50)',
            data: data.indicators.SMA_50.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma50,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'sma200':
        if (data?.indicators?.SMA_200?.SMA) {
          series = {
            type: 'line',
            id: 'sma200-series',
            name: 'SMA (200)',
            data: data.indicators.SMA_200.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma200,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'bb20':
        if (data?.indicators?.BB_20) {
          // Add fill area
          if (data.indicators.BB_20.upper && data.indicators.BB_20.lower) {
            chartRef.current.addSeries({
              type: 'arearange',
              id: 'bb-range-series',
              name: 'BB Bands',
              data: data.indicators.BB_20.upper.map((point, i) => {
                return [point[0], data.indicators!.BB_20!.lower[i][1], point[1]];
              }),
              yAxis: 0,
              lineWidth: 0,
              linkedTo: ':previous',
              color: INDICATOR_COLORS.bb.upper,
              fillOpacity: 0.1,
              zIndex: 0,
              ...seriesOptions
            }, false);
            
            indicatorSeriesIds.current['bb20-range'] = 'bb-range-series';
          }
          
          // Add middle line
          if (data.indicators.BB_20.middle) {
            series = {
              type: 'line',
              id: 'bb-middle-series',
              name: 'BB Middle',
              data: data.indicators.BB_20.middle,
              yAxis: 0,
              color: INDICATOR_COLORS.bb.middle,
              lineWidth: 1,
              dashStyle: 'ShortDot',
              ...seriesOptions
            };
          }
        }
        break;
        
      case 'macd':
        if (data?.indicators?.MACD) {
          const macdAxisIndex = addNewYAxis('MACD', 15);
          
          // Add histogram
          if (data.indicators.MACD.histogram) {
            chartRef.current.addSeries({
              type: 'column',
              id: 'macd-histogram-series',
              name: 'MACD Histogram',
              data: data.indicators.MACD.histogram,
              yAxis: macdAxisIndex,
              color: INDICATOR_COLORS.macd.histogram,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['macd-histogram'] = 'macd-histogram-series';
          }
          
          // Add MACD line
          if (data.indicators.MACD.MACD) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'macd-line-series',
              name: 'MACD',
              data: data.indicators.MACD.MACD,
              yAxis: macdAxisIndex,
              color: INDICATOR_COLORS.macd.macd,
              lineWidth: 2,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['macd-line'] = 'macd-line-series';
          }
          
          // Add signal line
          if (data.indicators.MACD.signal) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'macd-signal-series',
              name: 'Signal',
              data: data.indicators.MACD.signal,
              yAxis: macdAxisIndex,
              color: INDICATOR_COLORS.macd.signal,
              lineWidth: 2,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['macd-signal'] = 'macd-signal-series';
          }
          
          chartRef.current.redraw();
          return; // Exit early as we handled redraw
        }
        break;
        
      case 'rsi14':
        if (data?.indicators?.RSI_14?.RSI) {
          const rsiAxisIndex = addNewYAxis('RSI', 10);
          
          // Update axis with RSI-specific settings
          chartRef.current.yAxis[rsiAxisIndex].update({
            plotLines: [{
              value: 70,
              color: '#ef4444',
              width: 1,
              dashStyle: 'ShortDash',
              label: { 
                text: '70', 
                align: 'left',
                style: {
                  color: '#ef4444',
                  fontSize: '11px'
                }
              }
            }, {
              value: 30,
              color: '#10b981',
              width: 1,
              dashStyle: 'ShortDash',
              label: { 
                text: '30', 
                align: 'left',
                style: {
                  color: '#10b981',
                  fontSize: '11px'
                }
              }
            }]
          }, false);
          
          series = {
            type: 'line',
            id: 'rsi-series',
            name: 'RSI (14)',
            data: data.indicators.RSI_14.RSI,
            yAxis: rsiAxisIndex,
            color: INDICATOR_COLORS.rsi,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'adx14':
        if (data?.indicators?.ADX_14) {
          const adxAxisIndex = addNewYAxis('ADX', 15);
          
          // Add ADX line
          if (data.indicators.ADX_14.ADX) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-line-series',
              name: 'ADX',
              data: data.indicators.ADX_14.ADX,
              yAxis: adxAxisIndex,
              color: INDICATOR_COLORS.adx.adx,
              lineWidth: 2,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['adx-line'] = 'adx-line-series';
          }
          
          // Add DI+ line
          if (data.indicators.ADX_14['DI+']) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-plus-series',
              name: 'DI+',
              data: data.indicators.ADX_14['DI+'],
              yAxis: adxAxisIndex,
              color: INDICATOR_COLORS.adx.plusDI,
              lineWidth: 1,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['adx-plus'] = 'adx-plus-series';
          }
          
          // Add DI- line
          if (data.indicators.ADX_14['DI-']) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-minus-series',
              name: 'DI-',
              data: data.indicators.ADX_14['DI-'],
              yAxis: adxAxisIndex,
              color: INDICATOR_COLORS.adx.minusDI,
              lineWidth: 1,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['adx-minus'] = 'adx-minus-series';
          }
          
          chartRef.current.redraw();
          return; // Exit early as we handled redraw
        }
        break;
    }
    
    if (series) {
      chartRef.current.addSeries(series, true);
      indicatorSeriesIds.current[indicatorType] = series.id;
    }
  }, [addNewYAxis]);

  // Remove indicator dynamically
  const removeIndicator = useCallback((indicatorType: string) => {
    if (!chartRef.current) return;
    
    // Handle multi-series indicators
    if (indicatorType === 'bb20') {
      ['bb20', 'bb20-range'].forEach(id => {
        const seriesId = indicatorSeriesIds.current[id];
        if (seriesId) {
          const series = chartRef.current!.get(seriesId);
          if (series && 'remove' in series) {
            series.remove(false);
          }
          delete indicatorSeriesIds.current[id];
        }
      });
    } else if (indicatorType === 'macd') {
      ['macd-histogram', 'macd-line', 'macd-signal'].forEach(id => {
        const seriesId = indicatorSeriesIds.current[id];
        if (seriesId) {
          const series = chartRef.current!.get(seriesId);
          if (series && 'remove' in series) {
            series.remove(false);
          }
          delete indicatorSeriesIds.current[id];
        }
      });
      // Remove MACD axis
      const axisIndex = yAxisManager.current.oscillatorAxes.get('MACD');
      if (axisIndex !== undefined && chartRef.current.yAxis[axisIndex]) {
        chartRef.current.yAxis[axisIndex].remove(false);
        yAxisManager.current.oscillatorAxes.delete('MACD');
      }
    } else if (indicatorType === 'adx14') {
      ['adx-line', 'adx-plus', 'adx-minus'].forEach(id => {
        const seriesId = indicatorSeriesIds.current[id];
        if (seriesId) {
          const series = chartRef.current!.get(seriesId);
          if (series && 'remove' in series) {
            series.remove(false);
          }
          delete indicatorSeriesIds.current[id];
        }
      });
      // Remove ADX axis
      const axisIndex = yAxisManager.current.oscillatorAxes.get('ADX');
      if (axisIndex !== undefined && chartRef.current.yAxis[axisIndex]) {
        chartRef.current.yAxis[axisIndex].remove(false);
        yAxisManager.current.oscillatorAxes.delete('ADX');
      }
    } else {
      // Single series indicator
      const seriesId = indicatorSeriesIds.current[indicatorType];
      if (seriesId) {
        const series = chartRef.current.get(seriesId);
        if (series && 'remove' in series) {
          series.remove(false);
        }
        delete indicatorSeriesIds.current[indicatorType];
      }
      
      // Remove associated axis if it's an oscillator
      if (indicatorType === 'rsi14') {
        const axisIndex = yAxisManager.current.oscillatorAxes.get('RSI');
        if (axisIndex !== undefined && chartRef.current.yAxis[axisIndex]) {
          chartRef.current.yAxis[axisIndex].remove(false);
          yAxisManager.current.oscillatorAxes.delete('RSI');
        }
      } else if (indicatorType === 'volume') {
        const axisIndex = yAxisManager.current.oscillatorAxes.get('Volume');
        if (axisIndex !== undefined && chartRef.current.yAxis[axisIndex]) {
          chartRef.current.yAxis[axisIndex].remove(false);
          yAxisManager.current.oscillatorAxes.delete('Volume');
        }
      }
    }
    
    chartRef.current.redraw();
  }, []);

  // Create chart
  const createChart = useCallback((data?: ChartData) => {
    if (!chartContainerRef.current || !window.Highcharts) {
      console.error('[MarketChart] Cannot create chart:', {
        hasContainer: !!chartContainerRef.current,
        hasHighcharts: !!window.Highcharts
      });
      return;
    }
    
    // Ensure container is in DOM
    if (!document.body.contains(chartContainerRef.current)) {
      console.error('[MarketChart] Container not in DOM when creating chart');
      return;
    }
    
    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
      indicatorSeriesIds.current = {};
      yAxisManager.current.oscillatorAxes.clear();
    }
    
    const config = buildChartConfig();
    
    // Set initial data if provided
    if (data?.ohlc) {
      config.series![0].data = data.ohlc;
    }
    
    console.log('[MarketChart] Creating chart with container:', chartContainerRef.current);
    
    // Create chart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef.current = (window.Highcharts as any).stockChart(chartContainerRef.current, config);
    
    // Force reflow to ensure proper sizing
    if (chartRef.current && chartRef.current.reflow) {
      setTimeout(() => {
        if (chartRef.current && chartRef.current.reflow) {
          chartRef.current.reflow();
        }
      }, 10);
    }
    
    // Add indicators based on current state
    Object.entries(indicators).forEach(([key, enabled]) => {
      if (enabled && data) {
        addIndicator(key, data);
      }
    });
  }, [buildChartConfig, indicators, addIndicator]);

  // Update chart data
  const updateChartData = useCallback((data: ChartData) => {
    if (!chartRef.current) return;
    
    // Update main series
    const mainSeries = chartRef.current.get('main-series');
    if (mainSeries && 'setData' in mainSeries) {
      mainSeries.setData(data.ohlc, true);
    }
    
    // Update volume if enabled
    if (indicators.volume && data.volume) {
      const volumeSeries = chartRef.current.get('volume-series');
      if (volumeSeries && 'setData' in volumeSeries) {
        volumeSeries.setData(data.volume, true);
      }
    }
  }, [indicators.volume]);

  // Generate dummy data for testing
  const generateDummyData = useCallback((): ChartData => {
    const ohlc: number[][] = [];
    const volume: number[][] = [];
    
    // Start date - 1 year ago
    let date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    date = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    let close = 150; // Starting price
    
    // Generate 365 days of data
    for (let i = 0; i < 365; i++) {
      const timestamp = date.getTime();
      
      // Random walk for price
      const change = (Math.random() - 0.48) * 4; // Slight upward bias
      close = Math.max(close + change, 10); // Minimum price of $10
      
      const high = close + Math.random() * 2;
      const low = close - Math.random() * 2;
      const open = low + Math.random() * (high - low);
      
      ohlc.push([
        timestamp,
        Math.round(open * 100) / 100,
        Math.round(high * 100) / 100,
        Math.round(low * 100) / 100,
        Math.round(close * 100) / 100
      ]);
      
      // Random volume between 10M and 50M
      volume.push([
        timestamp,
        Math.floor(10000000 + Math.random() * 40000000)
      ]);
      
      // Next day
      date.setDate(date.getDate() + 1);
    }
    
    return { ohlc, volume };
  }, []);

  // Load chart data
  const loadChartData = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    // TEMPORARY: Always use dummy data for testing
    console.log('[MarketChart] Using dummy data for testing...');
    
    // Generate dummy data
    const dummyData = generateDummyData();
    
    // Use setTimeout to ensure the container is mounted and check container exists
    setTimeout(() => {
      if (!chartContainerRef.current) {
        console.error('[MarketChart] Container ref is null after timeout');
        setLoading(false);
        return;
      }
      
      // Ensure container is in the DOM
      if (!document.body.contains(chartContainerRef.current)) {
        console.error('[MarketChart] Container is not in DOM');
        setLoading(false);
        return;
      }
      
      console.log('[MarketChart] Container is ready, creating/updating chart');
      
      if (chartRef.current) {
        updateChartData(dummyData);
        
        // Re-add indicators with new data
        Object.entries(indicators).forEach(([key, enabled]) => {
          if (enabled) {
            const seriesId = indicatorSeriesIds.current[key];
            if (!seriesId || !chartRef.current!.get(seriesId)) {
              // Indicator not added yet or was removed
              addIndicator(key, dummyData);
            }
          }
        });
      } else {
        // Create new chart with dummy data
        createChart(dummyData);
      }
      setLoading(false);
    }, 200);
    
    // Original API code commented out for testing
    /*
    try {
      // Determine which indicator set to request based on active indicators
      let indicatorSet = 'chart_basic';
      if (indicators.adx14) {
        indicatorSet = 'chart_full';
      } else if (indicators.rsi14 || indicators.macd) {
        indicatorSet = 'chart_advanced';
      }
      
      const params = new URLSearchParams({
        indicators: indicatorSet
      });
      
      const response = await fetch(`/api/symbols/${symbol}/chart?${params}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.ohlc && result.ohlc.length > 0) {
        // Map volume data properly
        const chartData: ChartData = {
          ohlc: result.ohlc,
          volume: result.volume || result.ohlc.map((point: number[]) => [point[0], 0]),
          indicators: result.indicators
        };
        
        if (chartRef.current) {
          updateChartData(chartData);
          
          // Re-add indicators with new data
          Object.entries(indicators).forEach(([key, enabled]) => {
            if (enabled) {
              const seriesId = indicatorSeriesIds.current[key];
              if (!seriesId || !chartRef.current!.get(seriesId)) {
                // Indicator not added yet or was removed
                addIndicator(key, chartData);
              }
            }
          });
        } else {
          // Create new chart
          createChart(chartData);
        }
      } else {
        setError('No data available');
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      console.log('Using dummy data for testing...');
      
      // Use dummy data instead of showing error
      const dummyData = generateDummyData();
      
      // Use setTimeout to ensure the container is mounted
      setTimeout(() => {
        if (chartRef.current) {
          updateChartData(dummyData);
        } else {
          // Create new chart with dummy data
          createChart(dummyData);
        }
      }, 100);
      
      // Don't set error when using dummy data
      setError(null);
    } finally {
      setLoading(false);
    }
    */
  }, [symbol, isVisible, indicators, createChart, updateChartData, addIndicator, generateDummyData]);

  // Handle chart type changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    const mainSeries = chartRef.current.get('main-series');
    if (mainSeries && 'update' in mainSeries) {
      mainSeries.update({
        type: chartType
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any, true);
    }
  }, [chartType]);

  // Handle view type changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    const groupingConfig = viewType === 'weekly' ? {
      forced: true,
      units: [['week', [1]]]
    } : {
      enabled: false
    };
    
    chartRef.current.series.forEach(series => {
      if (series.options.id !== 'navigator-series') {
        series.update({
          dataGrouping: groupingConfig
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any, false);
      }
    });
    
    chartRef.current.redraw();
  }, [viewType]);

  // Handle indicator changes
  useEffect(() => {
    if (!chartRef.current || !highchartsLoaded) return;
    
    // Check each indicator
    Object.entries(indicators).forEach(([key, enabled]) => {
      const seriesId = indicatorSeriesIds.current[key];
      const seriesExists = seriesId && chartRef.current!.get(seriesId);
      
      if (enabled && !seriesExists) {
        // Need to add indicator - but we need the data
        loadChartData(); // This will add missing indicators
      } else if (!enabled && seriesExists) {
        // Need to remove indicator
        removeIndicator(key);
      }
    });
  }, [indicators, highchartsLoaded, removeIndicator, loadChartData]);

  // Initial load
  useEffect(() => {
    if (highchartsLoaded && isVisible && symbol) {
      // Wait a bit to ensure container is ready
      const timer = setTimeout(() => {
        if (chartContainerRef.current && document.body.contains(chartContainerRef.current)) {
          loadChartData();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (chartRef.current) {
          chartRef.current.destroy();
          chartRef.current = null;
        }
      };
    }
  }, [symbol, isVisible, highchartsLoaded, loadChartData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  if (!isClient || !isVisible) {
    return null;
  }

  return (
    <div className="w-full h-full market-chart-container">
      {!highchartsLoaded && (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chart library...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}
      
      <div 
        ref={chartContainerRef} 
        className="w-full bg-[#1a1a1a] rounded-lg shadow-lg p-2 border border-gray-800"
        style={{ 
          height: `${calculateChartHeight()}px`,
          width: '100%',
          position: 'relative',
          display: highchartsLoaded && !error ? 'block' : 'none'
        }}
      />
    </div>
  );
}