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
    const priceHeight = 400; // Price chart height
    let additionalHeight = 0;
    
    if (indicators.volume) additionalHeight += 120; // Volume panel
    if (indicators.macd) additionalHeight += 200; // MACD panel
    if (indicators.rsi14) additionalHeight += 120; // RSI panel
    if (indicators.adx14) additionalHeight += 120; // ADX panel
    
    // Add space for navigator (40px height + 25px margin + extra padding)
    const navigatorHeight = 80;
    
    return priceHeight + additionalHeight + navigatorHeight + 50; // +50 for margins
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
        height: '60%', // Initial height for price panel
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
          lineWidth: 1
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
    
    // Check if axis already exists
    const existingAxisIndex = yAxisManager.current.oscillatorAxes.get(title);
    if (existingAxisIndex !== undefined) {
      return existingAxisIndex;
    }
    
    // Define panel configuration
    const panelConfig = {
      'Volume': { height: 12, order: 1 },
      'MACD': { height: 20, order: 2 },
      'RSI': { height: 12, order: 3 },
      'ADX': { height: 12, order: 4 }
    };
    
    const config = panelConfig[title] || { height: 15, order: 5 };
    const gap = 1;
    
    // Get current axes
    const axes = chartRef.current.yAxis;
    
    // Collect all panels info
    const panels: Array<{ name: string; height: number; order: number }> = [
      { name: 'Price', height: 0, order: 0 } // Height will be calculated
    ];
    
    // Add existing indicator panels
    for (let i = 1; i < axes.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axisOptions = axes[i].userOptions as any;
      const axisTitle = axisOptions.title?.text || 'Unknown';
      const existingConfig = panelConfig[axisTitle] || { height: 15, order: 5 };
      panels.push({
        name: axisTitle,
        height: existingConfig.height,
        order: existingConfig.order
      });
    }
    
    // Add the new panel
    panels.push({
      name: title,
      height: config.height,
      order: config.order
    });
    
    // Sort panels by order
    panels.sort((a, b) => a.order - b.order);
    
    // Calculate total indicator height
    const totalIndicatorHeight = panels
      .filter(p => p.name !== 'Price')
      .reduce((sum, p) => sum + p.height, 0);
    
    // Calculate gaps
    const totalGaps = (panels.length - 1) * gap;
    
    // Calculate price panel height
    const priceHeight = 100 - totalIndicatorHeight - totalGaps;
    panels[0].height = Math.max(35, priceHeight); // Ensure price panel is at least 35%
    
    // If we exceed 100%, scale down all panels proportionally
    const totalHeight = panels.reduce((sum, p) => sum + p.height, 0) + totalGaps;
    if (totalHeight > 100) {
      const scale = (100 - totalGaps) / (totalHeight - totalGaps);
      panels.forEach(p => {
        p.height = Math.floor(p.height * scale);
      });
    }
    
    // Calculate positions
    let currentTop = 0;
    const updates: Array<{ index: number; top: number; height: number }> = [];
    
    // Map panel names to axis indices
    const nameToIndex = new Map<string, number>();
    nameToIndex.set('Price', 0);
    for (let i = 1; i < axes.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const axisOptions = axes[i].userOptions as any;
      nameToIndex.set(axisOptions.title?.text || '', i);
    }
    
    // Prepare updates for existing axes
    for (const panel of panels) {
      if (panel.name !== title) {
        const idx = nameToIndex.get(panel.name);
        if (idx !== undefined) {
          updates.push({
            index: idx,
            top: currentTop,
            height: panel.height
          });
        }
      }
      currentTop += panel.height + (panel === panels[panels.length - 1] ? 0 : gap);
    }
    
    // Find position for new axis
    const newPanelIndex = panels.findIndex(p => p.name === title);
    let newPanelTop = 0;
    for (let i = 0; i < newPanelIndex; i++) {
      newPanelTop += panels[i].height + gap;
    }
    
    // Update all existing axes
    for (const update of updates) {
      chartRef.current.yAxis[update.index].update({
        height: `${update.height}%`,
        top: `${update.top}%`
      }, false);
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
      top: `${newPanelTop}%`,
      height: `${config.height}%`,
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
            lineWidth: 1,
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
            lineWidth: 1,
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
            lineWidth: 1,
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
              lineWidth: 1,
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
              lineWidth: 1,
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
            lineWidth: 1,
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
              lineWidth: 1,
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
      chartRef.current.addSeries(series, false); // Don't redraw yet
      indicatorSeriesIds.current[indicatorType] = series.id;
      chartRef.current.redraw(); // Redraw once after all operations
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
    // Add indicators in a specific order to ensure proper layout
    const indicatorOrder = ['volume', 'sma20', 'sma50', 'sma200', 'ema20', 'bb20', 'macd', 'rsi14', 'adx14'];
    indicatorOrder.forEach(key => {
      if (indicators[key as keyof typeof indicators] && data) {
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
        indicators: indicatorSet,
        period: dateRange.toLowerCase() === 'all' ? '5y' : dateRange.toLowerCase()
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
          
          // Always create a new chart when data is loaded
          // This ensures proper initialization when switching symbols
          createChart(chartData);
          setLoading(false);
        }, 200);
      } else {
        setError('No data available');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading chart data:', err);
      setError('Failed to load chart data');
      setLoading(false);
    }
  }, [isVisible, symbol, indicators, dateRange, createChart, updateChartData, addIndicator]);

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

  // Initial load and reload on dateRange change
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
          // Reset the axis manager and indicator tracking
          indicatorSeriesIds.current = {};
          yAxisManager.current.oscillatorAxes.clear();
        }
      };
    }
  }, [symbol, isVisible, highchartsLoaded, dateRange, loadChartData]);

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
    <div className="w-full market-chart-container relative mb-12">
      {!highchartsLoaded && (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chart library...</p>
          </div>
        </div>
      )}
      
      {loading && highchartsLoaded && (
        <div className="absolute inset-0 flex justify-center items-center z-50 bg-black/50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading chart data...</p>
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