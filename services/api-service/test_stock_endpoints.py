#!/usr/bin/env python3
"""Test stock data endpoints"""

import httpx
import asyncio
import json
from datetime import datetime, timedelta

API_KEY = "dev-api-key"
BASE_URL = "http://localhost:8002"


async def test_stock_endpoints():
    headers = {"X-API-Key": API_KEY}
    
    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        # Test 1: Get stock data
        print("1. Testing stock data endpoint...")
        try:
            response = await client.get(
                f"{BASE_URL}/api/v1/stock/AAPL/data",
                headers=headers,
                params={
                    "interval": "1d",
                    "limit": 10
                }
            )
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Stock Data: Got {len(data['data'])} records for {data['symbol']}")
                print(f"  Latest close: ${data['data'][-1]['close']}")
            else:
                print(f"✗ Stock Data: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Stock Data Error: {e}")
        
        # Test 2: Get stock quote
        print("\n2. Testing stock quote endpoint...")
        try:
            response = await client.get(
                f"{BASE_URL}/api/v1/stock/AAPL/quote",
                headers=headers
            )
            if response.status_code == 200:
                quote = response.json()
                print(f"✓ Quote: {quote['symbol']} @ ${quote['price']} ({quote['changePercent']:+.2f}%)")
            else:
                print(f"✗ Quote: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Quote Error: {e}")
        
        # Test 3: Get chart data with indicators
        print("\n3. Testing chart data with indicators...")
        try:
            chart_request = {
                "symbol": "AAPL",
                "interval": "1d",
                "indicators": [
                    {"indicator": "sma", "period": 20},
                    {"indicator": "rsi", "period": 14},
                    {"indicator": "macd"},
                    {"indicator": "bollinger_bands", "period": 20, "params": {"std": 2}}
                ]
            }
            
            response = await client.post(
                f"{BASE_URL}/api/v1/stock/AAPL/chart",
                headers=headers,
                json=chart_request
            )
            
            if response.status_code == 200:
                chart_data = response.json()
                print(f"✓ Chart Data: Got {len(chart_data['ohlcv'])} candlesticks")
                if chart_data.get('indicators'):
                    print("  Indicators:")
                    for ind_name, ind_data in chart_data['indicators'].items():
                        print(f"    - {ind_name}: {ind_data.get('name', ind_name)}")
            else:
                print(f"✗ Chart Data: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Chart Data Error: {e}")
        
        # Test 4: Batch quotes
        print("\n4. Testing batch quotes...")
        try:
            response = await client.post(
                f"{BASE_URL}/api/v1/stock/batch/quotes",
                headers=headers,
                json=["AAPL", "GOOGL", "MSFT", "INVALID_SYMBOL"]
            )
            
            if response.status_code == 200:
                batch = response.json()
                print(f"✓ Batch Quotes: {batch['success']}/{batch['total']} successful")
                for symbol, quote in batch['quotes'].items():
                    print(f"  - {symbol}: ${quote['price']} ({quote['changePercent']:+.2f}%)")
                if batch['errors']:
                    print(f"  Failed symbols: {[e['symbol'] for e in batch['errors']]}")
            else:
                print(f"✗ Batch Quotes: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"✗ Batch Quotes Error: {e}")
        
        # Test 5: Test different intervals
        print("\n5. Testing different intervals...")
        intervals = ["1m", "5m", "1h", "1d", "1w"]
        for interval in intervals:
            try:
                response = await client.get(
                    f"{BASE_URL}/api/v1/stock/AAPL/data",
                    headers=headers,
                    params={
                        "interval": interval,
                        "limit": 5
                    }
                )
                if response.status_code == 200:
                    data = response.json()
                    print(f"✓ Interval {interval}: Got {len(data['data'])} records")
                else:
                    print(f"✗ Interval {interval}: {response.status_code}")
            except Exception as e:
                print(f"✗ Interval {interval} Error: {e}")


if __name__ == "__main__":
    print("Testing Stock Data Endpoints\n" + "="*40 + "\n")
    asyncio.run(test_stock_endpoints())
    print("\n" + "="*40 + "\nTests completed!")