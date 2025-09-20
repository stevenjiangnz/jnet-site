import logging
from datetime import datetime
from typing import Any, Dict, List

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class StockDataService:
    def __init__(self) -> None:
        self.base_url = settings.stock_data_service_url
        self.headers = {"X-API-Key": settings.stock_data_service_api_key}
        self.client = httpx.AsyncClient(timeout=30.0, headers=self.headers)

    async def get_stock_data(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        interval: str = "1d",
    ) -> List[Dict[str, Any]]:
        try:
            url = f"{self.base_url}/api/v1/data/{symbol}"
            params = {
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "interval": interval,
            }
            response = await self.client.get(url, params=params)
            response.raise_for_status()
            result = response.json()

            # Extract data_points from the response
            data_points: List[Dict[str, Any]] = result.get("data_points", [])

            return data_points
        except Exception as e:
            logger.error(f"Stock data service unavailable for {symbol}: {e}")
            # Re-raise the exception instead of returning mock data
            raise

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


async def check_stock_data_service() -> bool:
    try:
        headers = {"X-API-Key": settings.stock_data_service_api_key}
        async with httpx.AsyncClient(timeout=5.0, headers=headers) as client:
            response = await client.get(f"{settings.stock_data_service_url}/health")
            return response.status_code == 200
    except Exception:
        return False
