"""
Centralized HTTP client for making authenticated requests to internal services.
"""

import logging
from typing import Any, Dict, Optional

import httpx
from httpx import Response

from app.config import settings

logger = logging.getLogger(__name__)


class StockDataServiceClient:
    """HTTP client for communicating with stock-data-service."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.stock_data_service_url
        self.api_key = settings.stock_data_service_api_key

    @property
    def headers(self) -> Dict[str, str]:
        """Get headers with authentication."""
        return {"X-API-Key": self.api_key}

    async def get(self, path: str, **kwargs: Any) -> Response:
        """Make GET request with authentication."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("headers", {}).update(self.headers)
        kwargs.setdefault("timeout", 30.0)

        async with httpx.AsyncClient() as client:
            logger.debug(f"GET {url}")
            response = await client.get(url, **kwargs)
            response.raise_for_status()
            return response

    async def post(self, path: str, **kwargs: Any) -> Response:
        """Make POST request with authentication."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("headers", {}).update(self.headers)
        kwargs.setdefault("timeout", 30.0)

        async with httpx.AsyncClient() as client:
            logger.debug(f"POST {url}")
            response = await client.post(url, **kwargs)
            response.raise_for_status()
            return response

    async def delete(self, path: str, **kwargs: Any) -> Response:
        """Make DELETE request with authentication."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("headers", {}).update(self.headers)
        kwargs.setdefault("timeout", 30.0)

        async with httpx.AsyncClient() as client:
            logger.debug(f"DELETE {url}")
            response = await client.delete(url, **kwargs)
            response.raise_for_status()
            return response

    async def request(self, method: str, path: str, **kwargs: Any) -> Response:
        """Make arbitrary HTTP request with authentication."""
        url = f"{self.base_url}{path}"
        kwargs.setdefault("headers", {}).update(self.headers)
        kwargs.setdefault("timeout", 30.0)

        async with httpx.AsyncClient() as client:
            logger.debug(f"{method} {url}")
            response = await client.request(method, url, **kwargs)
            response.raise_for_status()
            return response


# Singleton instance
stock_data_client = StockDataServiceClient()
