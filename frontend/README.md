This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Market Chart Component

The Market Chart component (`src/components/charts/MarketChart.tsx`) provides a professional financial charting interface using Highcharts Stock.

### Features

- **Dark Theme**: Easy-on-the-eyes dark background (#1a1a1a) with high contrast
- **Chart Types**: Candlestick, Line, and Area charts
- **Technical Indicators**:
  - Price Overlays: SMA (20, 50, 200), EMA (20), Bollinger Bands
  - Volume indicator with purple-themed bars
  - Oscillators: MACD, RSI (14), ADX (14)
- **Time Frames**: Daily and Weekly views
- **Date Ranges**: 1M, 3M, 6M, 1Y, 3Y, All
- **Interactive Controls**: Zoom, pan, and date range selection
- **Responsive Design**: Adapts to different screen sizes

### Styling

The chart uses a modern dark theme with:
- Green (#10b981) for bullish candles/movements
- Red (#ef4444) for bearish candles/movements
- Purple (#8b5cf6) for UI elements and volume
- Amber (#fbbf24), Blue (#3b82f6), and Purple (#a855f7) for various indicators
- Light gray (#a0a0a0) for text and labels
- Subtle grid lines (#2a2a2a) for better readability

### Usage

The MarketChart component is used in the Market page (`src/app/market/market-content-enhanced.tsx`) and accepts the following props:

```tsx
interface MarketChartProps {
  symbol: string;
  isVisible: boolean;
  indicators: {
    volume: boolean;
    sma20: boolean;
    sma50: boolean;
    sma200: boolean;
    ema20: boolean;
    bb20: boolean;
    macd: boolean;
    rsi14: boolean;
    adx14: boolean;
  };
  viewType: 'daily' | 'weekly';
  dateRange: string;
  chartType: 'candlestick' | 'line' | 'area';
  onDataPointSelect?: (point: DataPoint) => void;
}
```

### Development Notes

- The chart uses dynamic imports to avoid SSR issues with Highcharts
- Chart data is fetched from the API based on the selected symbol and date range
- The chart automatically adjusts height based on active indicators
- Fixed pixel-based positioning system for all chart panes to prevent overlap
- Navigator position is dynamically calculated based on active oscillators
- Extra 60px spacing is added between oscillators and navigator to ensure clear separation
