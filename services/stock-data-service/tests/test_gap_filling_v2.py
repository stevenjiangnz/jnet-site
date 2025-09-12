import pytest
import httpx
import asyncio
from datetime import datetime, timedelta
import pandas as pd


async def download_data(symbol: str, start_date: str, end_date: str):
    """Download data for a specific date range"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"http://localhost:9001/api/v1/download/{symbol}",
            params={
                "start_date": start_date,
                "end_date": end_date
            }
        )
        return response.json()


async def get_data(symbol: str, start_date: str = None, end_date: str = None):
    """Get data for a specific date range"""
    async with httpx.AsyncClient() as client:
        params = {"symbol": symbol}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        response = await client.get(
            "http://localhost:9001/api/v1/data",
            params=params
        )
        return response.json()


def check_for_gaps(data_points: list, expected_start: str, expected_end: str):
    """Check if there are any gaps in the data"""
    if not data_points:
        return []
    
    # Convert to DataFrame for easier analysis
    df = pd.DataFrame(data_points)
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    # Create a date range of all expected trading days
    start = pd.to_datetime(expected_start)
    end = pd.to_datetime(expected_end)
    all_dates = pd.date_range(start=start, end=end, freq='B')  # B = business days
    
    # Find actual dates in data
    actual_dates = pd.to_datetime(df['date'].unique())
    
    # Find missing dates (gaps)
    missing_dates = []
    for date in all_dates:
        if date not in actual_dates:
            # Check if it's not a holiday (simple check - you might want to use a holiday calendar)
            missing_dates.append(date.strftime('%Y-%m-%d'))
    
    return missing_dates


async def test_gap_filling():
    """Test downloading data in segments and verify no gaps"""
    symbol = "AAPL"
    
    print("\n=== Testing Gap Filling Functionality ===\n")
    
    # Step 1: Download first segment (Jan 2022)
    print("1. Downloading Jan 10-30, 2022...")
    result1 = await download_data(symbol, "2022-01-10", "2022-01-30")
    print(f"   Downloaded {result1.get('records', 0)} records")
    
    # Wait a bit
    await asyncio.sleep(1)
    
    # Step 2: Download second segment (May-Aug 2022)
    print("\n2. Downloading May 1 - Aug 1, 2022...")
    result2 = await download_data(symbol, "2022-05-01", "2022-08-01")
    print(f"   Downloaded {result2.get('records', 0)} records")
    
    # Wait a bit
    await asyncio.sleep(1)
    
    # Step 3: Download last 20 years
    print("\n3. Downloading last 20 years of data...")
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365*20)
    result3 = await download_data(
        symbol, 
        start_date.strftime('%Y-%m-%d'), 
        end_date.strftime('%Y-%m-%d')
    )
    print(f"   Downloaded {result3.get('records', 0)} records")
    
    # Step 4: Get all data and check for gaps
    print("\n4. Checking for gaps in 2022 data...")
    
    # Get AAPL data from the API
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://localhost:9001/api/v1/data/{symbol}")
        full_data = response.json()
    
    if full_data and 'data_points' in full_data:
        # Filter data points to 2022
        data_points_2022 = [
            dp for dp in full_data['data_points'] 
            if dp['date'].startswith('2022')
        ]
        print(f"   Retrieved {len(data_points_2022)} data points for 2022")
        
        if data_points_2022:
            gaps = check_for_gaps(data_points_2022, "2022-01-01", "2022-12-31")
            
            # Filter out known holidays (simplified - you'd want a proper holiday calendar)
            known_holidays_2022 = [
                "2022-01-17",  # MLK Day
                "2022-02-21",  # Presidents Day
                "2022-04-15",  # Good Friday
                "2022-05-30",  # Memorial Day
                "2022-06-20",  # Juneteenth (observed)
                "2022-07-04",  # Independence Day
                "2022-09-05",  # Labor Day
                "2022-11-24",  # Thanksgiving
                "2022-11-25",  # Day after Thanksgiving
                "2022-12-26",  # Christmas (observed)
            ]
            
            real_gaps = [gap for gap in gaps if gap not in known_holidays_2022]
            
            print(f"   Missing dates (excluding holidays): {len(real_gaps)}")
            
            if real_gaps:
                print("\n   ⚠️  GAPS FOUND:")
                for gap in real_gaps[:10]:  # Show first 10 gaps
                    print(f"      - {gap}")
                if len(real_gaps) > 10:
                    print(f"      ... and {len(real_gaps) - 10} more")
            else:
                print("\n   ✓ NO GAPS FOUND! All trading days have data.")
        else:
            print("   No data points found for 2022")
    else:
        print("   No data retrieved")
    
    # Step 5: Verify continuous data
    print("\n5. Verifying data continuity...")
    
    # Check specific ranges that should be filled
    ranges_to_check = [
        ("2022-01-10", "2022-01-30"),
        ("2022-04-25", "2022-05-05"),  # Gap between Jan and May downloads
        ("2022-07-25", "2022-08-10"),   # Around the end of May-Aug download
    ]
    
    for start, end in ranges_to_check:
        if full_data and 'data_points' in full_data:
            # Filter data for the specific range
            range_data = [
                dp for dp in full_data['data_points']
                if start <= dp['date'] <= end
            ]
            if range_data:
                df = pd.DataFrame(range_data)
                print(f"\n   Range {start} to {end}:")
                print(f"   - Data points: {len(df)}")
                print(f"   - First date: {df['date'].min()}")
                print(f"   - Last date: {df['date'].max()}")
    
    print("\n=== Gap Filling Test Complete ===\n")


async def test_gap_detection():
    """Test the gap detection functionality"""
    symbol = "MSFT"
    
    print("\n=== Testing Gap Detection ===\n")
    
    # First, clear any existing data by downloading a small range
    print("1. Setting up test data with intentional gaps...")
    
    # Download three separate ranges with gaps between them
    await download_data(symbol, "2023-01-01", "2023-01-15")
    await asyncio.sleep(0.5)
    await download_data(symbol, "2023-02-01", "2023-02-15")
    await asyncio.sleep(0.5)
    await download_data(symbol, "2023-03-01", "2023-03-15")
    
    # Now check for gaps
    print("\n2. Checking for gaps in Q1 2023...")
    
    # Get MSFT data
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://localhost:9001/api/v1/data/{symbol}")
        full_data = response.json()
    
    if full_data and 'data_points' in full_data:
        # Filter to Q1 2023
        data_q1 = [
            dp for dp in full_data['data_points']
            if dp['date'].startswith('2023-01') or 
               dp['date'].startswith('2023-02') or 
               dp['date'].startswith('2023-03')
        ]
        
        if data_q1:
            gaps = check_for_gaps(data_q1, "2023-01-01", "2023-03-31")
            print(f"   Found {len(gaps)} missing dates in Q1 2023")
            
            # Now fill the gaps
            print("\n3. Filling gaps by downloading full Q1 2023...")
            result = await download_data(symbol, "2023-01-01", "2023-03-31")
            print(f"   Downloaded {result.get('records', 0)} records")
            
            # Check again
            print("\n4. Verifying gaps are filled...")
            response = await client.get(f"http://localhost:9001/api/v1/data/{symbol}")
            full_data_after = response.json()
            
            if full_data_after and 'data_points' in full_data_after:
                data_q1_after = [
                    dp for dp in full_data_after['data_points']
                    if dp['date'].startswith('2023-01') or 
                       dp['date'].startswith('2023-02') or 
                       dp['date'].startswith('2023-03')
                ]
                gaps_after = check_for_gaps(data_q1_after, "2023-01-01", "2023-03-31")
                print(f"   Missing dates after filling: {len(gaps_after)}")
    
    print("\n=== Gap Detection Test Complete ===\n")


if __name__ == "__main__":
    print("Make sure the stock-data service is running on http://localhost:9001")
    print("This test will download real data from Yahoo Finance")
    print("Starting tests...\n")
    
    # Run the tests
    asyncio.run(test_gap_filling())
    asyncio.run(test_gap_detection())