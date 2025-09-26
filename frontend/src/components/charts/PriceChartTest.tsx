"use client";

import { useEffect, useRef, useState } from 'react';
import type Highcharts from 'highcharts';

// Extend Window to include Highcharts
declare global {
  interface Window {
    Highcharts?: typeof Highcharts;
  }
}

export default function PriceChartTest() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [highchartsLoaded, setHighchartsLoaded] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load Highcharts
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
  }, [isClient]);

  // Create chart with dummy data
  useEffect(() => {
    if (!highchartsLoaded || !chartContainerRef.current) return;

    // Generate dummy OHLC data
    const ohlc = [];
    const volume = [];
    
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

    // Create the chart
    try {
      // Type assertion to satisfy Highcharts API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.Highcharts as any).stockChart(chartContainerRef.current, {
        rangeSelector: {
          selected: 1
        },

        title: {
          text: 'AAPL Stock Price (Test Data)'
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
          lineWidth: 2,
          resize: {
            enabled: true
          }
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

        tooltip: {
          split: true
        },

        series: [{
          type: 'candlestick',
          name: 'AAPL',
          data: ohlc,
          dataGrouping: {
            units: [
              ['week', [1]],
              ['month', [1, 2, 3, 4, 6]]
            ]
          }
        }, {
          type: 'column',
          name: 'Volume',
          data: volume,
          yAxis: 1,
          dataGrouping: {
            units: [
              ['week', [1]],
              ['month', [1, 2, 3, 4, 6]]
            ]
          }
        }]
      });
      
      console.log('Test chart created successfully!');
    } catch (error) {
      console.error('Error creating test chart:', error);
    }
  }, [highchartsLoaded]);

  if (!isClient) return null;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Highcharts Stock Test</h2>
      {!highchartsLoaded ? (
        <p>Loading Highcharts...</p>
      ) : (
        <div ref={chartContainerRef} style={{ height: '500px' }} />
      )}
    </div>
  );
}