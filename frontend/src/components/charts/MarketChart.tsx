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
  sma20: '#FF6B6B',
  sma50: '#4ECDC4',
  sma200: '#45B7D1',
  ema20: '#F39C12',
  bb: {
    upper: 'rgba(170,170,170,0.3)',
    middle: '#888888',
    lower: 'rgba(170,170,170,0.3)',
    fill: 'rgba(170,170,170,0.1)'
  },
  macd: {
    macd: '#26A69A',
    signal: '#EF5350',
    histogram: '#78909C'
  },
  rsi: '#9C27B0',
  adx: {
    adx: '#FF9800',
    plusDI: '#4CAF50',
    minusDI: '#F44336'
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
        backgroundColor: 'transparent',
        height: calculateChartHeight(),
        style: {
          fontFamily: 'Arial, sans-serif'
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
          fill: '#2a2a2a',
          stroke: '#3a3a3a',
          style: {
            color: '#808080'
          },
          states: {
            hover: {
              fill: '#3a3a3a',
              style: {
                color: '#e0e0e0'
              }
            },
            select: {
              fill: '#5c4cdb',
              style: {
                color: '#ffffff'
              }
            }
          }
        },
        inputBoxBorderColor: '#3a3a3a',
        inputStyle: {
          backgroundColor: '#2a2a2a',
          color: '#e0e0e0'
        },
        labelStyle: {
          color: '#808080'
        }
      },
      
      title: {
        text: `${symbol} Stock Price`,
        style: {
          color: '#e0e0e0'
        }
      },
      
      yAxis: [{
        // Price axis
        labels: { 
          align: 'right', 
          x: -3,
          style: {
            color: '#808080'
          }
        },
        title: { 
          text: 'Price',
          style: {
            color: '#808080'
          }
        },
        height: '60%',
        lineWidth: 2,
        id: 'price-axis',
        gridLineColor: '#333333',
        lineColor: '#333333'
      }],
      
      plotOptions: {
        series: {
          dataGrouping: {
            enabled: viewType === 'weekly',
            units: viewType === 'weekly' ? [['week', [1]]] : undefined
          }
        },
        candlestick: {
          color: '#FF4444',
          upColor: '#44FF44',
          lineColor: '#FF4444',
          upLineColor: '#44FF44'
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
          color: '#808080'
        },
        itemHoverStyle: {
          color: '#e0e0e0'
        },
        enabled: true,
        align: 'center',
        verticalAlign: 'bottom',
        layout: 'horizontal'
      },
      
      tooltip: {
        split: true,
        crosshairs: true
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
        lineColor: '#333333',
        tickColor: '#333333',
        labels: {
          style: {
            color: '#808080'
          }
        }
      },
      
      // Navigator styling
      navigator: {
        maskFill: 'rgba(255, 255, 255, 0.1)',
        series: {
          color: '#5c4cdb',
          lineColor: '#5c4cdb'
        },
        xAxis: {
          gridLineColor: '#333333',
          labels: {
            style: {
              color: '#808080'
            }
          }
        },
        handles: {
          backgroundColor: '#5c4cdb',
          borderColor: '#3a3a3a'
        }
      },
      
      // Scrollbar styling
      scrollbar: {
        barBackgroundColor: '#2a2a2a',
        barBorderColor: '#3a3a3a',
        buttonBackgroundColor: '#2a2a2a',
        buttonBorderColor: '#3a3a3a',
        trackBackgroundColor: '#1a1a1a',
        trackBorderColor: '#333333'
      },
      
      // Tooltip styling
      tooltip: {
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        style: {
          color: '#e0e0e0'
        },
        borderColor: '#3a3a3a'
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
          color: '#808080'
        }
      },
      title: { 
        text: title,
        style: {
          color: '#808080'
        }
      },
      top: `${currentTop}%`,
      height: `${height}%`,
      offset: 0,
      lineWidth: 2,
      gridLineColor: '#333333',
      lineColor: '#333333'
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axis = chartRef.current.addAxis(newAxis as any, false, false);
    const axisIndex = chartRef.current.yAxis.indexOf(axis);
    
    yAxisManager.current.oscillatorAxes.set(title, axisIndex);
    chartRef.current.redraw();
    
    return axisIndex;
  }, []);

  // Add indicator dynamically
  const addIndicator = useCallback((indicatorType: string, data?: ChartData['indicators']) => {
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
            color: 'rgba(100,100,100,0.5)',
            ...seriesOptions
          };
        }
        break;
        
      case 'sma20':
        if (data?.SMA_20?.SMA) {
          series = {
            type: 'line',
            id: 'sma20-series',
            name: 'SMA (20)',
            data: data.SMA_20.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma20,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'sma50':
        if (data?.SMA_50?.SMA) {
          series = {
            type: 'line',
            id: 'sma50-series',
            name: 'SMA (50)',
            data: data.SMA_50.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma50,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'sma200':
        if (data?.SMA_200?.SMA) {
          series = {
            type: 'line',
            id: 'sma200-series',
            name: 'SMA (200)',
            data: data.SMA_200.SMA,
            yAxis: 0,
            color: INDICATOR_COLORS.sma200,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'bb20':
        if (data?.BB_20) {
          // Add fill area
          if (data.BB_20.upper && data.BB_20.lower) {
            chartRef.current.addSeries({
              type: 'arearange',
              id: 'bb-range-series',
              name: 'BB Bands',
              data: data.BB_20.upper.map((point, i) => {
                return [point[0], data.BB_20!.lower[i][1], point[1]];
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
          if (data.BB_20.middle) {
            series = {
              type: 'line',
              id: 'bb-middle-series',
              name: 'BB Middle',
              data: data.BB_20.middle,
              yAxis: 0,
              color: INDICATOR_COLORS.bb.middle,
              lineWidth: 1,
              dashStyle: 'shortdot',
              ...seriesOptions
            };
          }
        }
        break;
        
      case 'macd':
        if (data?.MACD) {
          const macdAxisIndex = addNewYAxis('MACD', 15);
          
          // Add histogram
          if (data.MACD.histogram) {
            chartRef.current.addSeries({
              type: 'column',
              id: 'macd-histogram-series',
              name: 'MACD Histogram',
              data: data.MACD.histogram,
              yAxis: macdAxisIndex,
              color: INDICATOR_COLORS.macd.histogram,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['macd-histogram'] = 'macd-histogram-series';
          }
          
          // Add MACD line
          if (data.MACD.MACD) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'macd-line-series',
              name: 'MACD',
              data: data.MACD.MACD,
              yAxis: macdAxisIndex,
              color: INDICATOR_COLORS.macd.macd,
              lineWidth: 2,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['macd-line'] = 'macd-line-series';
          }
          
          // Add signal line
          if (data.MACD.signal) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'macd-signal-series',
              name: 'Signal',
              data: data.MACD.signal,
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
        if (data?.RSI_14?.RSI) {
          const rsiAxisIndex = addNewYAxis('RSI', 10);
          
          // Update axis with RSI-specific settings
          chartRef.current.yAxis[rsiAxisIndex].update({
            plotLines: [{
              value: 70,
              color: '#FF4444',
              width: 1,
              dashStyle: 'shortdash',
              label: { text: '70', align: 'left' }
            }, {
              value: 30,
              color: '#44FF44',
              width: 1,
              dashStyle: 'shortdash',
              label: { text: '30', align: 'left' }
            }]
          }, false);
          
          series = {
            type: 'line',
            id: 'rsi-series',
            name: 'RSI (14)',
            data: data.RSI_14.RSI,
            yAxis: rsiAxisIndex,
            color: INDICATOR_COLORS.rsi,
            lineWidth: 2,
            ...seriesOptions
          };
        }
        break;
        
      case 'adx14':
        if (data?.ADX_14) {
          const adxAxisIndex = addNewYAxis('ADX', 15);
          
          // Add ADX line
          if (data.ADX_14.ADX) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-line-series',
              name: 'ADX',
              data: data.ADX_14.ADX,
              yAxis: adxAxisIndex,
              color: INDICATOR_COLORS.adx.adx,
              lineWidth: 2,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['adx-line'] = 'adx-line-series';
          }
          
          // Add DI+ line
          if (data.ADX_14['DI+']) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-plus-series',
              name: 'DI+',
              data: data.ADX_14['DI+'],
              yAxis: adxAxisIndex,
              color: INDICATOR_COLORS.adx.plusDI,
              lineWidth: 1,
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['adx-plus'] = 'adx-plus-series';
          }
          
          // Add DI- line
          if (data.ADX_14['DI-']) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'adx-minus-series',
              name: 'DI-',
              data: data.ADX_14['DI-'],
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
    if (!chartContainerRef.current || !window.Highcharts) return;
    
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
    
    // Create chart
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartRef.current = (window.Highcharts as any).stockChart(chartContainerRef.current, config);
    
    // Add indicators based on current state
    Object.entries(indicators).forEach(([key, enabled]) => {
      if (enabled && data) {
        addIndicator(key, data.indicators);
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

  // Load chart data
  const loadChartData = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
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
                addIndicator(key, chartData.indicators);
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
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [symbol, isVisible, indicators, createChart, updateChartData, addIndicator]);

  // Handle chart type changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    const mainSeries = chartRef.current.get('main-series');
    if (mainSeries && 'update' in mainSeries) {
      mainSeries.update({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: chartType as any
      }, true);
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
    if (highchartsLoaded && isVisible && symbol && chartContainerRef.current) {
      if (!chartRef.current) {
        createChart();
      }
      loadChartData();
    }
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [symbol, isVisible, highchartsLoaded, createChart, loadChartData]);

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
          style={{ minHeight: `${calculateChartHeight()}px` }}
        />
      )}
    </div>
  );
}