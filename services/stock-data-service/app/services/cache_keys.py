"""Cache key management for consistent key generation."""

from datetime import date
from typing import Optional


class CacheKeys:
    """Centralized cache key generation."""

    @staticmethod
    def latest_price(symbol: str) -> str:
        """
        Generate cache key for latest price data.

        Args:
            symbol: Stock symbol

        Returns:
            Cache key string
        """
        return f"price:latest:{symbol.upper()}"

    @staticmethod
    def recent_data(symbol: str, days: int = 30) -> str:
        """
        Generate cache key for recent data.

        Args:
            symbol: Stock symbol
            days: Number of recent days

        Returns:
            Cache key string
        """
        return f"data:recent:{symbol.upper()}:{days}"

    @staticmethod
    def symbol_list() -> str:
        """
        Generate cache key for symbol list.

        Returns:
            Cache key string
        """
        return "symbols:list"

    @staticmethod
    def symbol_info(symbol: str) -> str:
        """
        Generate cache key for symbol information.

        Args:
            symbol: Stock symbol

        Returns:
            Cache key string
        """
        return f"symbol:info:{symbol.upper()}"

    @staticmethod
    def daily_data(
        symbol: str, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> str:
        """
        Generate cache key for daily data query.

        Args:
            symbol: Stock symbol
            start_date: Start date for range
            end_date: End date for range

        Returns:
            Cache key string
        """
        key = f"data:daily:{symbol.upper()}"

        if start_date:
            key += f":{start_date.isoformat()}"
        if end_date:
            key += f":{end_date.isoformat()}"

        return key

    @staticmethod
    def weekly_data(
        symbol: str, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> str:
        """
        Generate cache key for weekly data query.

        Args:
            symbol: Stock symbol
            start_date: Start date for range
            end_date: End date for range

        Returns:
            Cache key string
        """
        key = f"data:weekly:{symbol.upper()}"

        if start_date:
            key += f":{start_date.isoformat()}"
        if end_date:
            key += f":{end_date.isoformat()}"

        return key

    @staticmethod
    def system_profile() -> str:
        """
        Generate cache key for system profile.

        Returns:
            Cache key string
        """
        return "system:profile"

    @staticmethod
    def symbol_quality(symbol: str) -> str:
        """
        Generate cache key for symbol data quality metrics.

        Args:
            symbol: Stock symbol

        Returns:
            Cache key string
        """
        return f"quality:{symbol.upper()}"

    @staticmethod
    def pattern_for_symbol(symbol: str) -> str:
        """
        Generate pattern to match all cache entries for a symbol.

        Args:
            symbol: Stock symbol

        Returns:
            Pattern string for cache clearing
        """
        return f"*:{symbol.upper()}*"
