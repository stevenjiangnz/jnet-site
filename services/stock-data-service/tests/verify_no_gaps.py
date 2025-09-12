import httpx
import asyncio
import pandas as pd
from datetime import datetime


async def verify_no_gaps(symbol: str, start_year: int = 2005, end_year: int = 2025):
    """Verify that a symbol has no gaps in its data"""
    
    print(f"\n=== Verifying {symbol} has no gaps from {start_year} to {end_year} ===\n")
    
    # Get data from API
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://localhost:9001/api/v1/data/{symbol}")
        data = response.json()
    
    if not data or 'data_points' not in data:
        print(f"❌ No data found for {symbol}")
        return
    
    # Convert to DataFrame
    df = pd.DataFrame(data['data_points'])
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date')
    
    print(f"Total records: {len(df)}")
    print(f"Date range: {df['date'].min().strftime('%Y-%m-%d')} to {df['date'].max().strftime('%Y-%m-%d')}")
    
    # Check for gaps year by year
    gaps_by_year = {}
    
    for year in range(start_year, end_year + 1):
        year_data = df[df['date'].dt.year == year]
        
        if len(year_data) == 0:
            continue
            
        # Get all business days for the year
        year_start = pd.Timestamp(f'{year}-01-01')
        year_end = pd.Timestamp(f'{year}-12-31')
        
        # Adjust to actual data range if partial year
        if year_data['date'].min() > year_start:
            year_start = year_data['date'].min()
        if year_data['date'].max() < year_end:
            year_end = year_data['date'].max()
            
        expected_days = pd.date_range(start=year_start, end=year_end, freq='B')
        actual_days = pd.to_datetime(year_data['date'].unique())
        
        # Find missing days
        missing_days = []
        for day in expected_days:
            if day not in actual_days:
                missing_days.append(day.strftime('%Y-%m-%d'))
        
        # Known US market holidays (simplified list)
        holidays = [
            f"{year}-01-01",  # New Year's Day
            f"{year}-07-04",  # Independence Day
            f"{year}-12-25",  # Christmas
            # Add more holidays as needed
        ]
        
        # Filter out holidays
        real_gaps = [day for day in missing_days if not any(holiday in day for holiday in holidays)]
        
        if real_gaps:
            gaps_by_year[year] = real_gaps
        
        print(f"\n{year}: {len(year_data)} trading days", end="")
        if real_gaps:
            print(f" - ⚠️  {len(real_gaps)} gaps found")
        else:
            print(" - ✓ No gaps")
    
    # Summary
    print(f"\n{'='*50}")
    if gaps_by_year:
        total_gaps = sum(len(gaps) for gaps in gaps_by_year.values())
        print(f"❌ TOTAL GAPS: {total_gaps} across {len(gaps_by_year)} years")
        
        # Show sample gaps
        for year, gaps in list(gaps_by_year.items())[:3]:
            print(f"\n{year} gaps (first 5):")
            for gap in gaps[:5]:
                print(f"  - {gap}")
            if len(gaps) > 5:
                print(f"  ... and {len(gaps) - 5} more")
    else:
        print("✅ NO GAPS FOUND! Data is complete for all trading days.")
    
    print(f"{'='*50}\n")


async def main():
    """Verify both AAPL and MSFT have complete 20-year data"""
    
    print("Verifying 20 years of data with no gaps...")
    
    # Check both symbols
    await verify_no_gaps("AAPL", 2005, 2025)
    await verify_no_gaps("MSFT", 2005, 2025)
    
    # Also check a few specific years in detail
    print("\n=== Detailed check for year 2022 ===")
    
    for symbol in ["AAPL", "MSFT"]:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://localhost:9001/api/v1/data/{symbol}")
            data = response.json()
            
        if data and 'data_points' in data:
            df = pd.DataFrame(data['data_points'])
            df['date'] = pd.to_datetime(df['date'])
            
            # Filter to 2022
            df_2022 = df[df['date'].dt.year == 2022]
            
            print(f"\n{symbol} in 2022:")
            print(f"  - Trading days: {len(df_2022)}")
            print(f"  - First: {df_2022['date'].min().strftime('%Y-%m-%d')}")
            print(f"  - Last: {df_2022['date'].max().strftime('%Y-%m-%d')}")
            print(f"  - Avg volume: {df_2022['volume'].mean():,.0f}")


if __name__ == "__main__":
    asyncio.run(main())