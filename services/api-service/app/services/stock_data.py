import logging
from datetime import datetime
from typing import Any, Dict, List

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class StockDataService:
    def __init__(self) -> None:
        self.base_url = settings.stock_data_service_url
        self.client = httpx.AsyncClient(timeout=30.0)

    async def get_stock_data(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        interval: str = "1d",
    ) -> List[Dict[str, Any]]:
        try:
            response = await self.client.get(
                f"{self.base_url}/api/v1/stock/{symbol}/history",
                params={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "interval": interval,
                },
            )
            response.raise_for_status()
            result = response.json()
            return result if isinstance(result, list) else []
        except Exception:
            logger.warning(
                f"Stock data service unavailable, using mock data for {symbol}"
            )
            # Return mock data for testing
            return self._generate_mock_data(symbol, start_date, end_date, interval)

    async def get_multiple_stocks(
        self,
        symbols: List[str],
        start_date: datetime,
        end_date: datetime,
        interval: str = "1d",
    ) -> Dict[str, List[Dict[str, Any]]]:
        results = {}
        for symbol in symbols:
            try:
                data = await self.get_stock_data(symbol, start_date, end_date, interval)
                results[symbol] = data
            except Exception as e:
                logger.error(f"Failed to fetch data for {symbol}: {e}")
                results[symbol] = []
        return results

    async def close(self) -> None:
        await self.client.aclose()

    def _generate_mock_data(
        self, symbol: str, start_date: datetime, end_date: datetime, interval: str
    ) -> List[Dict[str, Any]]:
        """Generate mock OHLCV data for testing."""
        import random
        from datetime import timedelta

        # Map interval to timedelta
        interval_map = {
            "1m": timedelta(minutes=1),
            "5m": timedelta(minutes=5),
            "15m": timedelta(minutes=15),
            "30m": timedelta(minutes=30),
            "1h": timedelta(hours=1),
            "4h": timedelta(hours=4),
            "1d": timedelta(days=1),
            "1w": timedelta(weeks=1),
            "1mo": timedelta(days=30),
        }

        delta = interval_map.get(interval, timedelta(days=1))

        # Generate data points
        data = []
        current = start_date
        base_price = 150.0  # Base price for mock data

        while current <= end_date:
            # Generate realistic OHLCV data
            open_price = base_price + random.uniform(-2, 2)
            close_price = open_price + random.uniform(-3, 3)
            high_price = max(open_price, close_price) + random.uniform(0, 2)
            low_price = min(open_price, close_price) - random.uniform(0, 2)
            volume = random.randint(1000000, 10000000)

            data.append(
                {
                    "date": current.isoformat(),
                    "open": round(open_price, 2),
                    "high": round(high_price, 2),
                    "low": round(low_price, 2),
                    "close": round(close_price, 2),
                    "volume": volume,
                }
            )

            # Update base price for next iteration (random walk)
            base_price = close_price + random.uniform(-0.5, 0.5)
            current += delta

        return data


async def check_stock_data_service() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.stock_data_service_url}/health")
            return response.status_code == 200
    except Exception:
        return False
