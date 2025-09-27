"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  indicators?: {
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
  indicatorSet?: 'chart_basic' | 'chart_advanced' | 'chart_full';
  theme?: 'light' | 'dark';
  viewType?: 'daily' | 'weekly'; // Not used currently - data grouping is controlled by Highcharts buttons
  dateRange?: string;
  chartType?: 'candlestick' | 'line' | 'area'; // Optional, defaults to candlestick
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
  volume: (number[] | { x: number; y: number; color: string })[]; // Can be number[][] or array of {x: number, y: number, color: string}
  indicators?: {
    SMA_20?: { SMA: number[][] };
    SMA_50?: { SMA: number[][] };
    SMA_200?: { SMA: number[][] };
    EMA_20?: { EMA: number[][] };
    BB_20?: { upper: number[][], middle: number[][], lower: number[][] };
    MACD?: { MACD: number[][], signal: number[][], histogram: number[][] };
    RSI_14?: { RSI: number[][] };
    ADX_14?: { ADX: number[][], 'DI+': number[][], 'DI-': number[][] };
  };
}

// Central configuration for all pane heights (in pixels)
const PANE_HEIGHTS = {
  price: 400,      // Main price chart
  volume: 120,     // Volume bars
  macd: 180,       // MACD oscillator
  rsi: 120,        // RSI oscillator
  adx: 150,        // ADX oscillator
  navigator: 60,   // Bottom timeline navigator
  margins: 40,     // Total margins and padding
  topMargin: 10,   // Minimal top margin for very compact layout
  rangeSelector: 55 // Space for range selector buttons and inputs
};

// Theme configurations
const THEMES = {
  dark: {
    backgroundColor: '#1a1a1a',
    textColor: '#ffffff',
    labelColor: '#a0a0a0',
    gridLineColor: '#2a2a2a',
    lineColor: '#404040',
    buttonFill: '#2d2d2d',
    buttonStroke: '#404040',
    buttonHoverFill: '#3d3d3d',
    buttonHoverStroke: '#505050',
    buttonSelectFill: '#4f46e5',
    buttonSelectStroke: '#4f46e5',
    inputBoxBorderColor: '#404040',
    inputBackgroundColor: '#2d2d2d',
    inputColor: '#e0e0e0',
    navigatorMaskFill: 'rgba(139, 92, 246, 0.1)',
    navigatorSeriesColor: '#8b5cf6',
    navigatorHandlesColor: '#8b5cf6',
    scrollbarColors: {
      barBackgroundColor: '#404040',
      barBorderColor: '#404040',
      buttonBackgroundColor: '#2d2d2d',
      buttonBorderColor: '#404040',
      trackBackgroundColor: '#1a1a1a',
      trackBorderColor: '#404040',
      buttonArrowColor: '#a0a0a0'
    },
    tooltipBackgroundColor: 'rgba(30, 30, 30, 0.95)',
    tooltipBorderColor: '#404040',
    tooltipTextColor: '#ffffff',
    candleColors: {
      downColor: '#ef4444',
      upColor: '#10b981'
    },
    volumeColor: 'rgba(139, 92, 246, 0.3)',
    plotLineColors: {
      rsi70: '#ef4444',
      rsi30: '#10b981'
    }
  },
  light: {
    backgroundColor: '#ffffff',
    textColor: '#000000',
    labelColor: '#666666',
    gridLineColor: '#e0e0e0',
    lineColor: '#cccccc',
    buttonFill: '#f0f0f0',
    buttonStroke: '#cccccc',
    buttonHoverFill: '#e0e0e0',
    buttonHoverStroke: '#bbbbbb',
    buttonSelectFill: '#4f46e5',
    buttonSelectStroke: '#4f46e5',
    inputBoxBorderColor: '#cccccc',
    inputBackgroundColor: '#f5f5f5',
    inputColor: '#333333',
    navigatorMaskFill: 'rgba(79, 70, 229, 0.1)',
    navigatorSeriesColor: '#4f46e5',
    navigatorHandlesColor: '#4f46e5',
    scrollbarColors: {
      barBackgroundColor: '#cccccc',
      barBorderColor: '#cccccc',
      buttonBackgroundColor: '#f0f0f0',
      buttonBorderColor: '#cccccc',
      trackBackgroundColor: '#f5f5f5',
      trackBorderColor: '#cccccc',
      buttonArrowColor: '#666666'
    },
    tooltipBackgroundColor: 'rgba(255, 255, 255, 0.95)',
    tooltipBorderColor: '#cccccc',
    tooltipTextColor: '#000000',
    candleColors: {
      downColor: '#ef4444',
      upColor: '#22c55e'
    },
    volumeColor: 'rgba(79, 70, 229, 0.3)',
    plotLineColors: {
      rsi70: '#ef4444',
      rsi30: '#22c55e'
    }
  }
};

// Indicator colors configuration (theme-independent)
const INDICATOR_COLORS = {
  sma20: '#fbbf24',  // Amber
  sma50: '#3b82f6',  // Blue
  sma200: '#a855f7', // Purple
  ema20: '#f97316',  // Orange
  bb: {
    upper: '#a855f7',     // Solid purple for upper band
    middle: '#8b5cf6',    // Slightly darker purple for middle
    lower: '#a855f7'      // Solid purple for lower band
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

// Map indicatorSet to individual indicators
const getIndicatorsFromSet = (indicatorSet?: string) => {
  switch (indicatorSet) {
    case 'chart_basic':
      return {
        volume: true,
        sma20: true,
        sma50: true,
        sma200: false,
        ema20: false,
        bb20: false,
        macd: false,
        rsi14: false,
        adx14: false
      };
    case 'chart_advanced':
      return {
        volume: true,
        sma20: true,
        sma50: true,
        sma200: false,
        ema20: false,
        bb20: true,
        macd: true,
        rsi14: true,
        adx14: false
      };
    case 'chart_full':
      return {
        volume: true,
        sma20: true,
        sma50: true,
        sma200: true,
        ema20: true,
        bb20: true,
        macd: true,
        rsi14: true,
        adx14: true
      };
    default:
      return null;
  }
};

export default function MarketChart({
  symbol,
  isVisible,
  indicators: propIndicators,
  indicatorSet,
  theme = 'dark',
  viewType, // eslint-disable-line @typescript-eslint/no-unused-vars
  dateRange = '1Y',
  chartType = 'candlestick', // Default to candlestick
  onDataPointSelect // eslint-disable-line @typescript-eslint/no-unused-vars
}: MarketChartProps) {
  // Determine indicators to use based on indicatorSet or individual props
  const indicators = useMemo(() => {
    if (indicatorSet) {
      return getIndicatorsFromSet(indicatorSet);
    }
    return propIndicators || {
      volume: false,
      sma20: false,
      sma50: false,
      sma200: false,
      ema20: false,
      bb20: false,
      macd: false,
      rsi14: false,
      adx14: false
    };
  }, [indicatorSet, propIndicators]);
  const [isClient, setIsClient] = useState(false);
  const [highchartsLoaded, setHighchartsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  
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

  // Calculate dynamic chart height with fixed heights for each pane
  const calculateChartHeight = useCallback(() => {
    let totalHeight = PANE_HEIGHTS.price + PANE_HEIGHTS.navigator + PANE_HEIGHTS.margins + PANE_HEIGHTS.topMargin + PANE_HEIGHTS.rangeSelector;
    
    // Volume is now merged into price pane, so don't add its height
    if (indicators.macd) totalHeight += PANE_HEIGHTS.macd;
    if (indicators.rsi14) totalHeight += PANE_HEIGHTS.rsi;
    if (indicators.adx14) totalHeight += PANE_HEIGHTS.adx;
    
    // Add extra spacing for navigator when oscillators are present
    const hasOscillators = indicators.macd || indicators.rsi14 || indicators.adx14;
    if (hasOscillators) {
      totalHeight += 60; // Match the extra spacing in calculateNavigatorTop
    }
    
    return totalHeight;
  }, [indicators]);

  // Calculate navigator position dynamically based on oscillators
  const calculateNavigatorTop = useCallback(() => {
    let topPosition = PANE_HEIGHTS.rangeSelector + PANE_HEIGHTS.price;
    
    // Add heights for all active oscillators (volume is now merged into price)
    if (indicators.macd) topPosition += PANE_HEIGHTS.macd;
    if (indicators.rsi14) topPosition += PANE_HEIGHTS.rsi;
    if (indicators.adx14) topPosition += PANE_HEIGHTS.adx;
    
    // Add extra spacing before navigator when oscillators are present
    const hasOscillators = indicators.macd || indicators.rsi14 || indicators.adx14;
    if (hasOscillators) {
      topPosition += 60; // Extra spacing to prevent overlap
    }
    
    return topPosition;
  }, [indicators]);

  // Build chart configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildChartConfig = useCallback((): any => {
    const themeConfig = THEMES[theme];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = {
      chart: {
        backgroundColor: themeConfig.backgroundColor,
        height: calculateChartHeight(),
        marginTop: 10,  // Minimal top margin for very compact layout
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
          { type: 'all', text: 'All' },
        ],
        selected: 2, // Default to 6M view
        inputEnabled: true,
        verticalAlign: 'top',
        y: 15,  // Add vertical offset to position below title
        buttonTheme: {
          fill: themeConfig.buttonFill,
          stroke: themeConfig.buttonStroke,
          'stroke-width': 1,
          r: 4,
          style: {
            color: themeConfig.labelColor,
            fontWeight: 'normal',
            fontSize: '12px'
          },
          states: {
            hover: {
              fill: themeConfig.buttonHoverFill,
              stroke: themeConfig.buttonHoverStroke,
              style: {
                color: themeConfig.textColor,
                cursor: 'pointer'
              }
            },
            select: {
              fill: themeConfig.buttonSelectFill,
              stroke: themeConfig.buttonSelectStroke,
              style: {
                color: '#ffffff',
                fontWeight: '500'
              }
            }
          }
        },
        inputBoxBorderColor: themeConfig.inputBoxBorderColor,
        inputBoxHeight: 32,
        inputBoxWidth: 120,
        inputStyle: {
          backgroundColor: themeConfig.inputBackgroundColor,
          color: themeConfig.inputColor,
          fontSize: '12px'
        },
        labelStyle: {
          color: themeConfig.labelColor,
          fontSize: '12px'
        }
      },
      
      title: {
        text: `${symbol} Stock Price`,
        style: {
          color: themeConfig.textColor,
          fontSize: '18px',
          fontWeight: '500'
        }
      },
      
      yAxis: [{
        // Price axis with fixed pixel height
        labels: { 
          align: 'right', 
          x: -3,
          style: {
            color: themeConfig.labelColor,
            fontSize: '12px'
          }
        },
        title: { 
          text: 'Price',
          style: {
            color: themeConfig.labelColor,
            fontSize: '12px'
          }
        },
        top: 55,  // Position below range selector (10px marginTop + 15px rangeSelector y + 30px spacing)
        height: PANE_HEIGHTS.price,
        lineWidth: 0,
        id: 'price-axis',
        gridLineColor: themeConfig.gridLineColor,
        gridLineWidth: 1,
        lineColor: themeConfig.lineColor
      }],
      
      plotOptions: {
        series: {
          dataGrouping: {
            enabled: true,
            forced: false, // Don't force grouping, let user control it
            units: [['day', [1]], ['week', [1]], ['month', [1]]]
          }
        },
        candlestick: {
          color: themeConfig.candleColors.downColor,
          upColor: themeConfig.candleColors.upColor,
          lineColor: themeConfig.candleColors.downColor,
          upLineColor: themeConfig.candleColors.upColor
        },
        column: {
          color: themeConfig.volumeColor,
          borderColor: 'transparent'
        },
        line: {
          lineWidth: 1
        }
      },
      
      exporting: {
        enabled: true,  // Enable exporting module
        buttons: {
          contextButton: {
            enabled: false  // Disable default menu button
          },
          dailyBtn: {
            text: 'D',
            x: -90,
            onclick: function(this: Highcharts.Chart) {
              this.series.forEach(function(series: Highcharts.Series) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (series as any).update({
                  dataGrouping: {
                    forced: true,
                    units: [['day', [1]]]
                  }
                }, false);
              });
              this.redraw();
            },
            theme: {
              fill: themeConfig.buttonFill,
              stroke: themeConfig.buttonStroke,
              'stroke-width': 1,
              r: 4,
              style: {
                color: themeConfig.labelColor,
                fontSize: '12px'
              },
              states: {
                hover: {
                  fill: themeConfig.buttonHoverFill,
                  style: {
                    color: themeConfig.textColor
                  }
                }
              }
            }
          },
          weeklyBtn: {
            text: 'W',
            x: -60,
            onclick: function(this: Highcharts.Chart) {
              this.series.forEach(function(series: Highcharts.Series) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (series as any).update({
                  dataGrouping: {
                    forced: true,
                    units: [['week', [1]]]
                  }
                }, false);
              });
              this.redraw();
            },
            theme: {
              fill: themeConfig.buttonFill,
              stroke: themeConfig.buttonStroke,
              'stroke-width': 1,
              r: 4,
              style: {
                color: themeConfig.labelColor,
                fontSize: '12px'
              },
              states: {
                hover: {
                  fill: themeConfig.buttonHoverFill,
                  style: {
                    color: themeConfig.textColor
                  }
                }
              }
            }
          },
          monthlyBtn: {
            text: 'M',
            x: -30,
            onclick: function(this: Highcharts.Chart) {
              this.series.forEach(function(series: Highcharts.Series) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (series as any).update({
                  dataGrouping: {
                    forced: true,
                    units: [['month', [1]]]
                  }
                }, false);
              });
              this.redraw();
            },
            theme: {
              fill: themeConfig.buttonFill,
              stroke: themeConfig.buttonStroke,
              'stroke-width': 1,
              r: 4,
              style: {
                color: themeConfig.labelColor,
                fontSize: '12px'
              },
              states: {
                hover: {
                  fill: themeConfig.buttonHoverFill,
                  style: {
                    color: themeConfig.textColor
                  }
                }
              }
            }
          }
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
          color: themeConfig.labelColor,
          fontSize: '12px'
        },
        itemHoverStyle: {
          color: themeConfig.textColor
        },
        itemHiddenStyle: {
          color: theme === 'dark' ? '#606060' : '#cccccc'
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
        lineColor: themeConfig.lineColor,
        tickColor: themeConfig.lineColor,
        labels: {
          style: {
            color: themeConfig.labelColor,
            fontSize: '12px'
          }
        }
      },
      
      // Navigator styling with dynamic positioning
      navigator: {
        enabled: true,
        maskFill: themeConfig.navigatorMaskFill,
        series: {
          color: themeConfig.navigatorSeriesColor,
          lineColor: themeConfig.navigatorSeriesColor,
          lineWidth: 1
        },
        xAxis: {
          gridLineColor: themeConfig.gridLineColor,
          labels: {
            style: {
              color: themeConfig.labelColor,
              fontSize: '11px'
            }
          }
        },
        yAxis: {
          top: calculateNavigatorTop()
        },
        handles: {
          backgroundColor: themeConfig.navigatorHandlesColor,
          borderColor: themeConfig.navigatorHandlesColor,
          borderRadius: 2
        },
        height: 40,
        margin: 40
      },
      
      // Scrollbar styling
      scrollbar: {
        barBackgroundColor: themeConfig.scrollbarColors.barBackgroundColor,
        barBorderColor: themeConfig.scrollbarColors.barBorderColor,
        buttonBackgroundColor: themeConfig.scrollbarColors.buttonBackgroundColor,
        buttonBorderColor: themeConfig.scrollbarColors.buttonBorderColor,
        trackBackgroundColor: themeConfig.scrollbarColors.trackBackgroundColor,
        trackBorderColor: themeConfig.scrollbarColors.trackBorderColor,
        buttonArrowColor: themeConfig.scrollbarColors.buttonArrowColor
      },
      
      // Tooltip styling
      tooltip: {
        split: true,
        crosshairs: true,
        backgroundColor: themeConfig.tooltipBackgroundColor,
        borderWidth: 1,
        borderColor: themeConfig.tooltipBorderColor,
        style: {
          color: themeConfig.tooltipTextColor,
          fontSize: '12px'
        },
        shadow: true
      }
    };
    
    return config;
  }, [symbol, calculateChartHeight, calculateNavigatorTop, chartType, theme]);

  // Add new Y-axis for oscillators with fixed pixel positioning
  const addNewYAxis = useCallback((title: string): number => {
    if (!chartRef.current) return -1;
    
    const themeConfig = THEMES[theme];
    
    // Check if an axis with this title already exists
    const existingAxisIndex = yAxisManager.current.oscillatorAxes.get(title);
    if (existingAxisIndex !== undefined) {
      // Verify the axis still exists in the chart
      if (chartRef.current.yAxis[existingAxisIndex]) {
        return existingAxisIndex;
      }
      // If the axis was removed, clear it from our tracking
      yAxisManager.current.oscillatorAxes.delete(title);
    }
    
    // Calculate position based on existing oscillators
    const existingOscillators = Array.from(yAxisManager.current.oscillatorAxes.keys());
    let topPosition = PANE_HEIGHTS.rangeSelector + PANE_HEIGHTS.price; // Start after range selector and price axis
    
    // Add heights of existing oscillators to calculate position (exclude Volume since it's merged)
    for (const axisTitle of existingOscillators) {
      if (axisTitle === 'Volume') continue; // Skip volume as it's merged into price
      
      const height = 
        axisTitle === 'MACD' ? PANE_HEIGHTS.macd :
        axisTitle === 'RSI' ? PANE_HEIGHTS.rsi :
        axisTitle === 'ADX' ? PANE_HEIGHTS.adx : 120;
      topPosition += height;
    }
    
    // Get height for the new oscillator
    const oscillatorHeight = 
      title === 'MACD' ? PANE_HEIGHTS.macd :
      title === 'RSI' ? PANE_HEIGHTS.rsi :
      title === 'ADX' ? PANE_HEIGHTS.adx : 120;
    
    // Add new axis with fixed pixel positioning
    const newAxis: Highcharts.YAxisOptions = {
      labels: { 
        align: 'right', 
        x: -3,
        style: {
          color: themeConfig.labelColor,
          fontSize: '11px'
        }
      },
      title: { 
        text: title,
        style: {
          color: themeConfig.labelColor,
          fontSize: '12px'
        }
      },
      top: topPosition,
      height: oscillatorHeight,
      offset: 0,
      lineWidth: 0,
      gridLineColor: themeConfig.gridLineColor,
      gridLineWidth: 1,
      lineColor: themeConfig.lineColor
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axis = chartRef.current.addAxis(newAxis as any, false, false);
    const axisIndex = chartRef.current.yAxis.indexOf(axis);
    
    yAxisManager.current.oscillatorAxes.set(title, axisIndex);
    
    // Resize chart to accommodate new panel
    const newHeight = calculateChartHeight();
    chartRef.current.setSize(undefined, newHeight, false);
    
    // Update navigator position
    // @ts-expect-error Navigator exists on Highstock chart instance
    if (chartRef.current.navigator) {
      // @ts-expect-error Navigator exists on Highstock chart instance
      chartRef.current.navigator.yAxis.update({
        top: calculateNavigatorTop()
      }, true);
    }
    
    return axisIndex;
  }, [calculateChartHeight, calculateNavigatorTop, theme]);


  // Add indicator dynamically
  const addIndicator = useCallback((indicatorType: string, data?: ChartData) => {
    if (!chartRef.current) return;
    
    const themeConfig = THEMES[theme];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let series: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seriesOptions: any = {
      animation: { duration: 200 }
    };
    
    switch (indicatorType) {
      case 'volume':
        // Add a secondary y-axis on the price pane for volume
        if (!chartRef.current.get('volume-axis')) {
          // Calculate max volume first
          const volumeData = data?.volume || [];
          let maxVolume = 0;
          volumeData.forEach(point => {
            let vol: number;
            if (Array.isArray(point)) {
              vol = point[1];
            } else {
              vol = point.y;
            }
            if (vol > maxVolume) maxVolume = vol;
          });
          
          chartRef.current.addAxis({
            id: 'volume-axis',
            labels: {
              align: 'left',
              x: 3,
              style: {
                color: themeConfig.labelColor,
                fontSize: '11px'
              },
              // Format volume labels to be more compact
              formatter: function() {
                const value = this.value as number;
                if (value >= 1000000000) {
                  return (value / 1000000000).toFixed(1) + 'B';
                } else if (value >= 1000000) {
                  return (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                  return (value / 1000).toFixed(0) + 'K';
                }
                return value.toString();
              }
            },
            title: {
              text: 'Volume',
              style: {
                color: themeConfig.labelColor,
                fontSize: '12px'
              }
            },
            top: 55, // Same as price axis
            height: PANE_HEIGHTS.price, // Same height as price
            opposite: true,
            lineWidth: 0,
            gridLineWidth: 0,
            // Use very high max to make volume bars much smaller (only 10% of pane)
            min: 0,
            max: maxVolume * 10, // 10x multiplier = bars use only 10% of height
            tickInterval: maxVolume * 2.5, // Show 4 tick marks
            endOnTick: false,
            startOnTick: true,
            showLastLabel: false // Hide top label to reduce clutter
          }, false, false);
        }
        
        const volumeAxisIndex = chartRef.current.yAxis.findIndex(axis => axis.options.id === 'volume-axis');
        
        series = {
          type: 'column',
          id: 'volume-series',
          name: 'Volume',
          data: data?.volume || [],
          yAxis: volumeAxisIndex,
          turboThreshold: 0, // Disable threshold to support color objects
          dataGrouping: {
            enabled: true,
            units: [['day', [1]], ['week', [1]], ['month', [1]]]
          },
          borderColor: 'transparent',
          opacity: 1, // Full opacity for vivid colors
          groupPadding: 0,
          pointPadding: 0.1,
          borderWidth: 0,
          zIndex: -1, // Place behind price series
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
        
      case 'ema20':
        if (data?.indicators?.EMA_20?.EMA) {
          series = {
            type: 'line',
            id: 'ema20-series',
            name: 'EMA (20)',
            data: data.indicators.EMA_20.EMA,
            yAxis: 0,
            color: INDICATOR_COLORS.ema20,
            lineWidth: 1,
            ...seriesOptions
          };
        }
        break;
        
      case 'bb20':
        if (data?.indicators?.BB_20) {
          // Add upper band line
          if (data.indicators.BB_20.upper) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'bb-upper-series',
              name: 'BB Upper',
              data: data.indicators.BB_20.upper,
              yAxis: 0,
              color: INDICATOR_COLORS.bb.upper,
              lineWidth: 1,
              dashStyle: 'Solid',
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['bb20-upper'] = 'bb-upper-series';
          }
          
          // Add lower band line
          if (data.indicators.BB_20.lower) {
            chartRef.current.addSeries({
              type: 'line',
              id: 'bb-lower-series',
              name: 'BB Lower',
              data: data.indicators.BB_20.lower,
              yAxis: 0,
              color: INDICATOR_COLORS.bb.lower,
              lineWidth: 1,
              dashStyle: 'Solid',
              ...seriesOptions
            }, false);
            indicatorSeriesIds.current['bb20-lower'] = 'bb-lower-series';
          }
          
          // Remove the arearange implementation - just use the two lines
          // The user correctly pointed out that BB only needs two lines, not a filled area
          
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
          
          // Trigger redraw after adding all BB series
          chartRef.current.redraw();
          return; // Exit early as we handled redraw
        }
        break;
        
      case 'macd':
        if (data?.indicators?.MACD) {
          const macdAxisIndex = addNewYAxis('MACD');
          
          // Add histogram with zones for color based on positive/negative values
          if (data.indicators.MACD.histogram) {
            chartRef.current.addSeries({
              type: 'column',
              id: 'macd-histogram-series',
              name: 'MACD Histogram',
              data: data.indicators.MACD.histogram,
              yAxis: macdAxisIndex,
              zones: [{
                value: 0,
                color: '#ef4444' // Red for negative values
              }, {
                color: '#22c55e' // Green for positive values
              }],
              borderColor: 'transparent',
              borderWidth: 0,
              groupPadding: 0.2,
              pointPadding: 0.1,
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
          const rsiAxisIndex = addNewYAxis('RSI');
          
          // Update axis with RSI-specific settings
          chartRef.current.yAxis[rsiAxisIndex].update({
            plotLines: [{
              value: 70,
              color: themeConfig.plotLineColors.rsi70,
              width: 1,
              dashStyle: 'ShortDash',
              label: { 
                text: '70', 
                align: 'left',
                style: {
                  color: themeConfig.plotLineColors.rsi70,
                  fontSize: '11px'
                }
              }
            }, {
              value: 30,
              color: themeConfig.plotLineColors.rsi30,
              width: 1,
              dashStyle: 'ShortDash',
              label: { 
                text: '30', 
                align: 'left',
                style: {
                  color: themeConfig.plotLineColors.rsi30,
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
          const adxAxisIndex = addNewYAxis('ADX');
          
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
  }, [addNewYAxis, theme]);

  // Remove indicator dynamically
  const removeIndicator = useCallback((indicatorType: string) => {
    if (!chartRef.current) return;
    
    // Handle multi-series indicators
    if (indicatorType === 'bb20') {
      ['bb20', 'bb20-upper', 'bb20-lower'].forEach(id => {
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
    
    // Update chart height and navigator position dynamically
    const newHeight = calculateChartHeight();
    const newNavigatorTop = calculateNavigatorTop();
    
    // Check if chart still exists before updating
    if (!chartRef.current) {
      console.warn('[MarketChart] Chart reference lost during indicator removal');
      return;
    }
    
    // Update chart size
    chartRef.current.setSize(undefined, newHeight, false);
    
    // Update navigator position
    // @ts-expect-error Navigator exists on Highstock chart instance
    if (chartRef.current.navigator && chartRef.current.navigator.yAxis) {
      // @ts-expect-error Navigator exists on Highstock chart instance
      chartRef.current.navigator.yAxis.update({
        top: newNavigatorTop
      }, false);
    }
    
    // Single redraw after all updates
    chartRef.current.redraw();
  }, [calculateChartHeight, calculateNavigatorTop]);

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



  // Load chart data
  const loadChartData = useCallback(async () => {
    if (!isVisible) return;
    
    setLoading(true);
    setError(null);
    
    const themeConfig = THEMES[theme];
    
    try {
      // Always fetch all indicators (chart_full) to enable client-side toggling
      const params = new URLSearchParams({
        indicators: 'chart_full',
        period: dateRange.toLowerCase()
      });
      
      const response = await fetch(`/api/symbols/${symbol}/chart?${params}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.ohlc && result.ohlc.length > 0) {
        // Process volume data with colors based on candlestick movement
        let processedVolume: (number[] | { x: number; y: number; color: string })[] = [];
        if (result.volume && result.ohlc) {
          processedVolume = result.volume.map((vol: number[], index: number) => {
            const ohlcPoint = result.ohlc[index];
            if (ohlcPoint) {
              // ohlcPoint format: [timestamp, open, high, low, close]
              const isUp = ohlcPoint[4] >= ohlcPoint[1]; // close >= open
              return {
                x: vol[0],
                y: vol[1],
                color: isUp ? themeConfig.candleColors.upColor : themeConfig.candleColors.downColor
              };
            }
            return vol;
          });
        } else {
          processedVolume = result.ohlc.map((point: number[]) => [point[0], 0]);
        }
        
        // Map volume data properly
        const data: ChartData = {
          ohlc: result.ohlc,
          volume: processedVolume,
          indicators: result.indicators
        };
        
        // Store chart data for client-side indicator toggling
        setChartData(data);
        
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
          createChart(data);
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
  }, [isVisible, symbol, dateRange, createChart, theme]);

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

  // Handle view type changes - removed since we're using Highcharts buttons now

  // Handle indicator changes
  useEffect(() => {
    if (!chartRef.current || !highchartsLoaded || !chartData) return;
    
    // Check each indicator
    Object.entries(indicators).forEach(([key, enabled]) => {
      let seriesExists = false;
      
      // Check series existence based on indicator type
      if (key === 'macd') {
        // MACD has multiple series - check if any of them exist
        const macdSeries = ['macd-histogram', 'macd-line', 'macd-signal'].some(id => {
          const seriesId = indicatorSeriesIds.current[id];
          return seriesId && chartRef.current!.get(seriesId);
        });
        seriesExists = macdSeries;
      } else if (key === 'bb20') {
        // Bollinger Bands has multiple series
        const bbSeries = ['bb20', 'bb20-upper', 'bb20-lower'].some(id => {
          const seriesId = indicatorSeriesIds.current[id];
          return seriesId && chartRef.current!.get(seriesId);
        });
        seriesExists = bbSeries;
      } else if (key === 'adx14') {
        // ADX has multiple series
        const adxSeries = ['adx-line', 'adx-plus', 'adx-minus'].some(id => {
          const seriesId = indicatorSeriesIds.current[id];
          return seriesId && chartRef.current!.get(seriesId);
        });
        seriesExists = adxSeries;
      } else {
        // Single series indicators
        const seriesId = indicatorSeriesIds.current[key];
        seriesExists = !!(seriesId && chartRef.current!.get(seriesId));
      }
      
      if (enabled && !seriesExists) {
        // Add indicator using existing data
        addIndicator(key, chartData);
      } else if (!enabled && seriesExists) {
        // Remove indicator
        removeIndicator(key);
      }
    });
  }, [indicators, highchartsLoaded, chartData, addIndicator, removeIndicator]);

  // Initial load and reload on symbol/dateRange change
  useEffect(() => {
    if (highchartsLoaded && isVisible && symbol) {
      // Capture ref values at effect creation time
      const manager = yAxisManager.current;
      
      // Clear chart data when symbol changes
      setChartData(null);
      
      // Wait a bit to ensure container is ready
      const timer = setTimeout(() => {
        if (chartContainerRef.current && document.body.contains(chartContainerRef.current)) {
          loadChartData();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        // Use captured refs
        const chart = chartRef.current;
        
        if (chart) {
          chart.destroy();
          chartRef.current = null;
          // Reset the axis manager and indicator tracking
          indicatorSeriesIds.current = {};
          if (manager) {
            manager.oscillatorAxes.clear();
          }
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, isVisible, highchartsLoaded, dateRange]);


  // Cleanup on unmount
  useEffect(() => {
    // Capture ref to avoid stale closure warning
    const chart = chartRef.current;
    
    return () => {
      if (chart) {
        chart.destroy();
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
        className={`w-full rounded-lg shadow-lg p-2 ${theme === 'dark' ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'}`}
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