"""Verify that ADX_14 includes DI+ and DI- in default indicators."""

import asyncio
from app.services.download import StockDataDownloader
from app.indicators.config import DEFAULT_INDICATORS


async def verify_adx_components():
    """Verify ADX components are included."""
    print("DEFAULT_INDICATORS:", DEFAULT_INDICATORS)
    print("\nADX_14 is in defaults:", "ADX_14" in DEFAULT_INDICATORS)

    # Download sample data
    downloader = StockDataDownloader()
    stock_data = await downloader.download_symbol("MSFT", period="6mo")

    if stock_data and stock_data.indicators and "ADX_14" in stock_data.indicators:
        adx_data = stock_data.indicators["ADX_14"]

        # Check structure
        print("\nADX_14 indicator structure:")
        print(f"- Name: {adx_data.get('name')}")
        print(f"- Display Name: {adx_data.get('display_name')}")
        print(f"- Category: {adx_data.get('category')}")

        # Check a recent value
        if adx_data.get("values"):
            recent_values = [
                v for v in adx_data["values"][-5:] if v["values"].get("ADX") is not None
            ]

            if recent_values:
                latest = recent_values[-1]
                print(f"\nLatest values (Date: {latest['date']}):")
                print(f"- ADX: {latest['values'].get('ADX')}")
                print(f"- DI+: {latest['values'].get('DI+')}")
                print(f"- DI-: {latest['values'].get('DI-')}")

                # Verify all three components exist
                print("\nVerification:")
                print(f"- Has ADX: {'ADX' in latest['values']}")
                print(f"- Has DI+: {'DI+' in latest['values']}")
                print(f"- Has DI-: {'DI-' in latest['values']}")
    else:
        print("\nNo ADX data found!")


if __name__ == "__main__":
    asyncio.run(verify_adx_components())
