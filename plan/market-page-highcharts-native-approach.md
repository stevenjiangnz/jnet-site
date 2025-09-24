# Market Page Enhancement - Native Highcharts Implementation Approach

## Core Philosophy
Use Highcharts Stock native JavaScript API directly, managing the chart instance imperatively rather than through React wrappers. This provides maximum performance, flexibility, and access to all Highcharts features.

## Implementation Strategy

### 1. Chart Instance Management

```typescript
// Store chart instance as a ref
const chartRef = useRef<Highcharts.Chart | null>(null);
const chartContainerRef = useRef<HTMLDivElement>(null);

// Create chart imperatively
const createChart = useCallback((config: Highcharts.Options) => {
  if (!chartContainerRef.current || !window.Highcharts) return;
  
  // Destroy existing chart if any
  if (chartRef.current) {
    chartRef.current.destroy();
    chartRef.current = null;
  }
  
  // Create new chart instance
  chartRef.current = window.Highcharts.stockChart(
    chartContainerRef.current, 
    config
  );
}, []);

// Update chart dynamically
const updateChart = useCallback((updates: Partial<Highcharts.Options>) => {
  if (!chartRef.current) return;
  
  // Use Highcharts native update method
  chartRef.current.update(updates, true, true);
}, []);
```

### 2. Dynamic Indicator Management

Instead of recreating the chart, dynamically add/remove series:

```typescript
// Add indicator dynamically
const addIndicator = useCallback((indicatorType: string, params: any) => {
  if (!chartRef.current) return;
  
  let series: Highcharts.SeriesOptionsType;
  
  switch (indicatorType) {
    case 'sma':
      series = {
        type: 'sma',
        linkedTo: 'main-series',
        params: {
          period: params.period || 20
        },
        name: `SMA (${params.period || 20})`,
        color: params.color || '#FF6B6B'
      };
      break;
      
    case 'ema':
      series = {
        type: 'ema',
        linkedTo: 'main-series',
        params: {
          period: params.period || 20
        },
        name: `EMA (${params.period || 20})`,
        color: params.color || '#4ECDC4'
      };
      break;
      
    case 'bb':
      series = {
        type: 'bb',
        linkedTo: 'main-series',
        params: {
          period: params.period || 20,
          standardDeviation: 2
        },
        name: 'Bollinger Bands',
        bottomLine: {
          styles: { lineWidth: 1, lineColor: 'rgba(170,170,170,0.7)' }
        },
        topLine: {
          styles: { lineWidth: 1, lineColor: 'rgba(170,170,170,0.7)' }
        }
      };
      break;
      
    case 'macd':
      // MACD requires separate y-axis
      const macdAxisIndex = addNewYAxis('MACD', 80);
      series = {
        type: 'macd',
        linkedTo: 'main-series',
        yAxis: macdAxisIndex,
        params: {
          shortPeriod: 12,
          longPeriod: 26,
          signalPeriod: 9
        }
      };
      break;
      
    case 'rsi':
      const rsiAxisIndex = addNewYAxis('RSI', 10);
      series = {
        type: 'rsi',
        linkedTo: 'main-series',
        yAxis: rsiAxisIndex,
        params: {
          period: 14
        },
        zones: [{
          value: 30,
          color: '#FF4444'
        }, {
          value: 70,
          color: '#666666'
        }, {
          color: '#44FF44'
        }]
      };
      break;
  }
  
  // Add series to chart
  chartRef.current.addSeries(series, true);
  
  // Store series ID for later removal
  indicatorSeriesIds.current[indicatorType] = series.id;
}, []);

// Remove indicator dynamically
const removeIndicator = useCallback((indicatorType: string) => {
  if (!chartRef.current) return;
  
  const seriesId = indicatorSeriesIds.current[indicatorType];
  if (!seriesId) return;
  
  // Find and remove series
  const series = chartRef.current.get(seriesId);
  if (series && 'remove' in series) {
    series.remove(true);
  }
  
  // Clean up y-axis if it was dedicated to this indicator
  cleanupEmptyYAxis();
  
  delete indicatorSeriesIds.current[indicatorType];
}, []);
```

### 3. Dynamic Y-Axis Management

```typescript
const yAxisManager = useRef({
  priceAxisIndex: 0,
  volumeAxisIndex: 1,
  oscillatorAxes: new Map<string, number>()
});

const addNewYAxis = useCallback((title: string, height: number): number => {
  if (!chartRef.current) return -1;
  
  // Calculate position based on existing axes
  const currentTop = calculateNextAxisTop();
  
  const newAxis: Highcharts.YAxisOptions = {
    labels: { align: 'right', x: -3 },
    title: { text: title },
    top: `${currentTop}%`,
    height: `${height}%`,
    offset: 0,
    lineWidth: 2
  };
  
  // Add axis dynamically
  const axis = chartRef.current.addAxis(newAxis, false, false);
  const axisIndex = chartRef.current.yAxis.indexOf(axis);
  
  yAxisManager.current.oscillatorAxes.set(title, axisIndex);
  
  // Resize existing axes to accommodate new one
  redistributeAxisSpace();
  
  return axisIndex;
}, []);

const redistributeAxisSpace = useCallback(() => {
  if (!chartRef.current) return;
  
  const totalAxes = chartRef.current.yAxis.length;
  const oscillatorCount = yAxisManager.current.oscillatorAxes.size;
  
  // Dynamic height calculation
  const priceHeight = 50 - (oscillatorCount * 5); // Reduce as more oscillators added
  const volumeHeight = 15;
  const oscillatorHeight = (100 - priceHeight - volumeHeight - 5) / oscillatorCount;
  
  let currentTop = 0;
  
  // Update each axis
  chartRef.current.yAxis.forEach((axis, index) => {
    let height: number;
    
    if (index === yAxisManager.current.priceAxisIndex) {
      height = priceHeight;
    } else if (index === yAxisManager.current.volumeAxisIndex) {
      height = volumeHeight;
    } else {
      height = oscillatorHeight;
    }
    
    axis.update({
      top: `${currentTop}%`,
      height: `${height}%`
    }, false);
    
    currentTop += height + 2; // 2% gap
  });
  
  chartRef.current.redraw();
}, []);
```

### 4. Data Grouping Control

```typescript
const setDataGrouping = useCallback((viewType: 'daily' | 'weekly') => {
  if (!chartRef.current) return;
  
  const groupingConfig = viewType === 'weekly' ? {
    forced: true,
    units: [['week', [1]]]
  } : {
    enabled: false // Show daily data
  };
  
  // Update all series with new grouping
  chartRef.current.series.forEach(series => {
    if (series.options.id !== 'navigator-series') {
      series.update({
        dataGrouping: groupingConfig
      }, false);
    }
  });
  
  chartRef.current.redraw();
}, []);
```

### 5. Real-time Updates Without Recreating Chart

```typescript
// Update data without recreating chart
const updateChartData = useCallback((newData: ChartData) => {
  if (!chartRef.current) return;
  
  // Update main series data
  const mainSeries = chartRef.current.get('main-series');
  if (mainSeries && 'setData' in mainSeries) {
    mainSeries.setData(newData.ohlc, false);
  }
  
  // Update volume
  const volumeSeries = chartRef.current.get('volume-series');
  if (volumeSeries && 'setData' in volumeSeries) {
    volumeSeries.setData(newData.volume, false);
  }
  
  // Redraw once after all updates
  chartRef.current.redraw();
}, []);

// Add single point for real-time updates
const addDataPoint = useCallback((point: DataPoint) => {
  if (!chartRef.current) return;
  
  const mainSeries = chartRef.current.get('main-series');
  if (mainSeries && 'addPoint' in mainSeries) {
    mainSeries.addPoint([
      point.timestamp,
      point.open,
      point.high,
      point.low,
      point.close
    ], true, true); // animate and shift
  }
}, []);
```

### 6. Event Handling

```typescript
const setupChartEvents = useCallback(() => {
  if (!chartRef.current) return;
  
  // Click events for data point selection
  chartRef.current.update({
    plotOptions: {
      series: {
        cursor: 'pointer',
        point: {
          events: {
            click: function(event) {
              const point = this;
              setSelectedDataPoint({
                timestamp: point.x,
                open: point.open || point.y,
                high: point.high || point.y,
                low: point.low || point.y,
                close: point.close || point.y,
                volume: point.volume || 0
              });
            }
          }
        }
      }
    }
  }, false);
  
  // Custom tooltip formatter
  chartRef.current.tooltip.options.formatter = function() {
    return formatTooltipContent(this.points);
  };
}, []);
```

### 7. Performance Optimizations

```typescript
// Batch operations
const batchUpdate = useCallback((operations: Array<() => void>) => {
  if (!chartRef.current) return;
  
  // Disable animation temporarily
  const originalAnimation = chartRef.current.options.chart?.animation;
  chartRef.current.update({ chart: { animation: false } }, false);
  
  // Execute all operations
  operations.forEach(op => op());
  
  // Re-enable animation and redraw once
  chartRef.current.update({ 
    chart: { animation: originalAnimation } 
  }, true);
}, []);

// Throttled redraw for rapid updates
const throttledRedraw = useMemo(
  () => throttle(() => {
    if (chartRef.current) {
      chartRef.current.redraw();
    }
  }, 100),
  []
);
```

### 8. Chart Configuration Builder

```typescript
const buildChartConfig = useCallback((): Highcharts.Options => {
  return {
    chart: {
      animation: {
        duration: 200
      },
      events: {
        load: function() {
          // Store reference to chart internals if needed
          chartInternals.current = this;
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
      selected: 2,
      inputEnabled: true
    },
    
    yAxis: [{
      // Price axis
      labels: { align: 'right', x: -3 },
      title: { text: 'Price' },
      height: '60%',
      lineWidth: 2,
      id: 'price-axis'
    }, {
      // Volume axis
      labels: { align: 'right', x: -3 },
      title: { text: 'Volume' },
      top: '65%',
      height: '15%',
      offset: 0,
      lineWidth: 2,
      id: 'volume-axis'
    }],
    
    series: [{
      type: 'candlestick',
      id: 'main-series',
      name: selectedSymbol,
      data: [],
      dataGrouping: {
        enabled: viewType === 'daily' ? false : true,
        units: viewType === 'weekly' ? [['week', [1]]] : undefined
      }
    }, {
      type: 'column',
      id: 'volume-series',
      name: 'Volume',
      data: [],
      yAxis: 1,
      dataGrouping: {
        enabled: viewType === 'daily' ? false : true,
        units: viewType === 'weekly' ? [['week', [1]]] : undefined
      }
    }],
    
    // Responsive rules
    responsive: {
      rules: [{
        condition: {
          maxWidth: 800
        },
        chartOptions: {
          rangeSelector: {
            inputEnabled: false
          }
        }
      }]
    }
  };
}, [selectedSymbol, viewType]);
```

### 9. Complete Integration Example

```typescript
const MarketChart: React.FC<MarketChartProps> = ({ 
  symbol, 
  indicators, 
  viewType,
  dateRange 
}) => {
  const chartRef = useRef<Highcharts.Chart | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  
  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !window.Highcharts) return;
    
    const config = buildChartConfig();
    chartRef.current = window.Highcharts.stockChart(
      chartContainerRef.current, 
      config
    );
    setIsChartReady(true);
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);
  
  // Handle indicator changes
  useEffect(() => {
    if (!isChartReady) return;
    
    Object.entries(indicators).forEach(([indicator, isEnabled]) => {
      if (isEnabled) {
        addIndicator(indicator, getIndicatorParams(indicator));
      } else {
        removeIndicator(indicator);
      }
    });
  }, [indicators, isChartReady]);
  
  // Handle view type changes
  useEffect(() => {
    if (!isChartReady) return;
    setDataGrouping(viewType);
  }, [viewType, isChartReady]);
  
  // Handle data updates
  useEffect(() => {
    if (!isChartReady || !symbol) return;
    
    loadChartData(symbol).then(data => {
      updateChartData(data);
    });
  }, [symbol, dateRange, isChartReady]);
  
  return (
    <div 
      ref={chartContainerRef} 
      className="w-full h-full"
      style={{ minHeight: '600px' }}
    />
  );
};
```

## Key Benefits of Native Approach

1. **Performance**
   - Direct manipulation of chart internals
   - No React reconciliation overhead
   - Efficient batch updates

2. **Flexibility**
   - Access to all Highcharts features
   - Custom event handling
   - Dynamic series and axis management

3. **Predictability**
   - No wrapper abstraction layers
   - Direct control over chart lifecycle
   - Clear update patterns

4. **Advanced Features**
   - Custom indicators
   - Real-time updates
   - Complex interactions

## Migration from React Wrapper

If starting from a React wrapper implementation:

1. Replace wrapper component with div ref
2. Move chart config from props to imperative API calls
3. Handle lifecycle manually in useEffect
4. Convert prop changes to chart.update() calls
5. Manage series dynamically rather than through React state

This approach provides maximum control and performance while still integrating smoothly with React's component lifecycle.