# Frontend Integration Guide

This guide shows how to integrate the API service stock endpoints with the Next.js frontend using Highcharts.

## Stock Data Endpoints

### 1. Get Stock Data
```
GET /api/v1/stock/{symbol}/data
```

Query parameters:
- `interval`: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1mo (default: 1d)
- `start_date`: ISO 8601 datetime
- `end_date`: ISO 8601 datetime
- `limit`: Number of records (default: 500)

### 2. Get Stock Quote
```
GET /api/v1/stock/{symbol}/quote
```

### 3. Get Chart Data with Indicators
```
POST /api/v1/stock/{symbol}/chart
```

Request body:
```json
{
  "symbol": "AAPL",
  "interval": "1d",
  "start_date": "2024-01-01T00:00:00",
  "end_date": "2024-12-31T23:59:59",
  "indicators": [
    {
      "indicator": "sma",
      "period": 20
    },
    {
      "indicator": "rsi",
      "period": 14
    },
    {
      "indicator": "macd"
    },
    {
      "indicator": "bollinger_bands",
      "period": 20,
      "params": {"std": 2}
    }
  ]
}
```

### 4. Get Batch Quotes
```
POST /api/v1/stock/batch/quotes
```

Request body:
```json
["AAPL", "GOOGL", "MSFT", "TSLA"]
```

## Frontend Example (Next.js)

### API Client
```typescript
// lib/api/stock.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export interface StockQuote {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface ChartData {
  symbol: string;
  interval: string;
  ohlcv: number[][];
  volume: number[][];
  indicators?: Record<string, any>;
}

export class StockAPI {
  private headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY || '',
  };

  async getQuote(symbol: string): Promise<StockQuote> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stock/${symbol}/quote`, {
      headers: this.headers,
    });
    if (!response.ok) throw new Error('Failed to fetch quote');
    return response.json();
  }

  async getChartData(
    symbol: string,
    interval: string = '1d',
    indicators?: any[]
  ): Promise<ChartData> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stock/${symbol}/chart`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        symbol,
        interval,
        indicators,
      }),
    });
    if (!response.ok) throw new Error('Failed to fetch chart data');
    return response.json();
  }

  async getBatchQuotes(symbols: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/stock/batch/quotes`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(symbols),
    });
    if (!response.ok) throw new Error('Failed to fetch batch quotes');
    return response.json();
  }
}

export const stockAPI = new StockAPI();
```

### React Hook
```typescript
// hooks/useStockChart.ts
import { useState, useEffect } from 'react';
import { stockAPI, ChartData } from '@/lib/api/stock';

export function useStockChart(
  symbol: string,
  interval: string = '1d',
  indicators?: any[]
) {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const chartData = await stockAPI.getChartData(symbol, interval, indicators);
        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    if (symbol) {
      fetchData();
    }
  }, [symbol, interval, indicators]);

  return { data, loading, error };
}
```

### Highcharts Component
```tsx
// components/StockChart.tsx
import React, { useEffect, useRef } from 'react';
import Highcharts from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import { useStockChart } from '@/hooks/useStockChart';

// Import Highcharts modules
require('highcharts/indicators/indicators')(Highcharts);
require('highcharts/indicators/rsi')(Highcharts);
require('highcharts/indicators/macd')(Highcharts);
require('highcharts/indicators/bollinger-bands')(Highcharts);

interface StockChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  indicators?: string[];
}

export const StockChart: React.FC<StockChartProps> = ({
  symbol,
  interval = '1d',
  height = 600,
  indicators = ['sma', 'volume'],
}) => {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  
  const { data, loading, error } = useStockChart(symbol, interval, [
    { indicator: 'sma', period: 20 },
    { indicator: 'rsi', period: 14 },
    { indicator: 'macd' },
    { indicator: 'bollinger_bands', period: 20, params: { std: 2 } },
  ]);

  const options: Highcharts.Options = {
    title: {
      text: `${symbol} - ${interval}`,
    },
    rangeSelector: {
      selected: 1,
    },
    yAxis: [
      {
        labels: { align: 'right', x: -3 },
        title: { text: 'OHLC' },
        height: '60%',
        lineWidth: 2,
        resize: { enabled: true },
      },
      {
        labels: { align: 'right', x: -3 },
        title: { text: 'Volume' },
        top: '65%',
        height: '20%',
        offset: 0,
        lineWidth: 2,
      },
      {
        labels: { align: 'right', x: -3 },
        title: { text: 'RSI' },
        top: '87%',
        height: '13%',
        offset: 0,
        lineWidth: 2,
      },
    ],
    tooltip: {
      split: true,
    },
    series: data ? [
      {
        type: 'candlestick',
        name: symbol,
        data: data.ohlcv,
        yAxis: 0,
      },
      {
        type: 'column',
        name: 'Volume',
        data: data.volume,
        yAxis: 1,
        color: 'rgba(144, 183, 251, 0.5)',
      },
      // Add SMA if available
      ...(data.indicators?.sma ? [{
        type: 'line',
        name: data.indicators.sma.name,
        data: data.indicators.sma.data,
        yAxis: 0,
        color: '#FF6B6B',
      }] : []),
      // Add RSI if available
      ...(data.indicators?.rsi ? [{
        type: 'line',
        name: data.indicators.rsi.name,
        data: data.indicators.rsi.data,
        yAxis: 2,
        color: '#4ECDC4',
      }] : []),
    ] : [],
  };

  if (loading) return <div>Loading chart...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <HighchartsReact
      highcharts={Highcharts}
      constructorType={'stockChart'}
      options={options}
      ref={chartRef}
    />
  );
};
```

### Usage in Page
```tsx
// pages/stock/[symbol].tsx
import { useRouter } from 'next/router';
import { StockChart } from '@/components/StockChart';
import { useStockQuote } from '@/hooks/useStockQuote';

export default function StockPage() {
  const router = useRouter();
  const { symbol } = router.query;
  const { quote, loading, error } = useStockQuote(symbol as string);

  if (!symbol) return <div>No symbol provided</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{symbol}</h1>
      
      {quote && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-2xl font-semibold">${quote.price}</span>
              <span className={`ml-2 ${quote.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {quote.change >= 0 ? '+' : ''}{quote.change} ({quote.changePercent}%)
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Volume: {quote.volume.toLocaleString()}
            </div>
          </div>
        </div>
      )}
      
      <StockChart symbol={symbol as string} height={600} />
    </div>
  );
}
```

## Available Indicators

- **SMA** (Simple Moving Average): `{ indicator: "sma", period: 20 }`
- **EMA** (Exponential Moving Average): `{ indicator: "ema", period: 20 }`
- **RSI** (Relative Strength Index): `{ indicator: "rsi", period: 14 }`
- **MACD**: `{ indicator: "macd", params: { fast: 12, slow: 26, signal: 9 } }`
- **Bollinger Bands**: `{ indicator: "bollinger_bands", period: 20, params: { std: 2 } }`
- **ATR** (Average True Range): `{ indicator: "atr", period: 14 }`
- **Stochastic**: `{ indicator: "stochastic", params: { k_period: 14, d_period: 3 } }`
- **ADX** (Average Directional Index): `{ indicator: "adx", period: 14 }`
- **OBV** (On Balance Volume): `{ indicator: "obv" }`

## Error Handling

Always include proper error handling:

```typescript
try {
  const data = await stockAPI.getChartData('AAPL', '1d', indicators);
  // Process data
} catch (error) {
  console.error('Failed to fetch stock data:', error);
  // Show user-friendly error message
}
```

## Authentication

Make sure to include the API key in your environment variables:

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8002
NEXT_PUBLIC_API_KEY=your-api-key
```