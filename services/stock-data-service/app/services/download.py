"""Stock data download service with GCS storage."""

import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import yfinance as yf
import pandas as pd

from app.models.stock_data import (
    StockDataFile,
    StockDataPoint,
    DataRange,
    StockMetadata,
    WeeklyDataFile,
    WeeklyDataPoint,
)
from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths
from app.services.simple_cache import get_cache
from app.services.cache_keys import CacheKeys
from app.services.weekly_aggregator import WeeklyAggregator

logger = logging.getLogger(__name__)


class StockDataDownloader:
    """Service for downloading stock data from Yahoo Finance and storing in GCS."""

    def __init__(self):
        """Initialize the downloader with GCS storage."""
        self.storage = GCSStorageManager()
        self.weekly_aggregator = WeeklyAggregator()

    async def download_symbol(
        self,
        symbol: str,
        period: str = "max",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Optional[StockDataFile]:
        """
        Download stock data for a symbol and store in GCS.

        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            period: Download period ('1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max')
            start_date: Start date for custom range
            end_date: End date for custom range

        Returns:
            StockDataFile object if successful, None otherwise
        """
        try:
            logger.info(f"Downloading data for {symbol}")

            # Create ticker object
            ticker = yf.Ticker(symbol)

            # Download data
            if start_date and end_date:
                df = ticker.history(start=start_date, end=end_date)
            else:
                df = ticker.history(period=period)

            if df.empty:
                logger.warning(f"No data returned for {symbol}")
                return None

            # Convert DataFrame to our data model
            stock_data = await self._convert_to_stock_data(symbol, df)

            # Store in GCS
            storage_path = StoragePaths.get_daily_path(symbol)
            success = await self.storage.upload_json(storage_path, stock_data.to_dict())

            if success:
                logger.info(f"Successfully stored {symbol} data to GCS")

                # Process and store weekly data
                await self._process_weekly_data(stock_data)

                # Invalidate cache after successful upload
                cache = get_cache()
                cache_key = CacheKeys.daily_data(symbol)
                await cache.delete(cache_key)
                logger.info(f"Invalidated cache for {symbol}")

                return stock_data
            else:
                logger.error(f"Failed to store {symbol} data to GCS")
                return None

        except Exception as e:
            logger.error(f"Error downloading {symbol}: {str(e)}")
            return None

    async def download_multiple(
        self, symbols: List[str], period: str = "1y"
    ) -> Dict[str, bool]:
        """
        Download data for multiple symbols.

        Args:
            symbols: List of stock symbols
            period: Download period

        Returns:
            Dictionary mapping symbol to success status
        """
        results = {}

        for symbol in symbols:
            try:
                stock_data = await self.download_symbol(symbol, period=period)
                results[symbol] = stock_data is not None
            except Exception as e:
                logger.error(f"Failed to download {symbol}: {str(e)}")
                results[symbol] = False

        return results

    async def get_symbol_data(self, symbol: str) -> Optional[StockDataFile]:
        """
        Retrieve stored data for a symbol from GCS.

        Args:
            symbol: Stock symbol

        Returns:
            StockDataFile object or None if not found
        """
        try:
            storage_path = StoragePaths.get_daily_path(symbol)
            data_dict = await self.storage.download_json(storage_path)

            if data_dict:
                # Convert date strings back to date objects
                for point in data_dict["data_points"]:
                    point["date"] = datetime.fromisoformat(point["date"]).date()

                data_dict["data_range"]["start"] = datetime.fromisoformat(
                    data_dict["data_range"]["start"]
                ).date()
                data_dict["data_range"]["end"] = datetime.fromisoformat(
                    data_dict["data_range"]["end"]
                ).date()

                data_dict["last_updated"] = datetime.fromisoformat(
                    data_dict["last_updated"]
                )

                return StockDataFile(**data_dict)

            return None

        except Exception as e:
            logger.error(f"Error retrieving data for {symbol}: {str(e)}")
            return None

    async def list_available_symbols(self) -> List[str]:
        """
        List all symbols with data in GCS.

        Returns:
            List of symbol strings
        """
        try:
            blobs = await self.storage.list_blobs(prefix=StoragePaths.DAILY_PREFIX)
            symbols = []

            for blob_name in blobs:
                symbol = StoragePaths.extract_symbol_from_path(blob_name)
                if symbol:
                    symbols.append(symbol)

            return sorted(symbols)

        except Exception as e:
            logger.error(f"Error listing symbols: {str(e)}")
            return []

    async def _convert_to_stock_data(
        self, symbol: str, df: pd.DataFrame
    ) -> StockDataFile:
        """
        Convert pandas DataFrame to StockDataFile model.

        Args:
            symbol: Stock symbol
            df: DataFrame from yfinance

        Returns:
            StockDataFile object
        """
        # Convert DataFrame to list of data points
        data_points = []

        for idx, row in df.iterrows():
            # Skip rows with NaN values
            if row.isna().any():
                continue

            point = StockDataPoint(
                date=idx.date(),
                open=round(row["Open"], 2),
                high=round(row["High"], 2),
                low=round(row["Low"], 2),
                close=round(row["Close"], 2),
                adj_close=round(row.get("Adj Close", row["Close"]), 2),
                volume=int(row["Volume"]),
            )
            data_points.append(point)

        # Sort by date
        data_points.sort(key=lambda x: x.date)

        # Create metadata
        metadata = StockMetadata(
            total_records=len(data_points),
            trading_days=len(data_points),
            source="yahoo_finance",
        )

        # Create data range
        if data_points:
            data_range = DataRange(start=data_points[0].date, end=data_points[-1].date)
        else:
            # Empty data
            today = date.today()
            data_range = DataRange(start=today, end=today)

        # Create the complete file object
        return StockDataFile(
            symbol=symbol.upper(),
            data_type="daily",
            last_updated=datetime.utcnow(),
            data_range=data_range,
            data_points=data_points,
            metadata=metadata,
        )

    async def download_latest_for_symbol(self, symbol: str) -> bool:
        """
        Download only the latest data for a symbol (last 5 days).
        Useful for daily updates.

        Args:
            symbol: Stock symbol

        Returns:
            True if successful, False otherwise
        """
        try:
            result = await self.download_symbol(symbol, period="5d")
            return result is not None
        except Exception as e:
            logger.error(f"Error downloading latest data for {symbol}: {str(e)}")
            return False

    async def _process_weekly_data(self, daily_data: StockDataFile) -> bool:
        """
        Process daily data into weekly aggregates and store in GCS.

        Args:
            daily_data: Daily stock data file

        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Processing weekly data for {daily_data.symbol}")

            # Aggregate daily data to weekly
            weekly_points = self.weekly_aggregator.aggregate_to_weekly(
                daily_data.data_points
            )

            if not weekly_points:
                logger.warning(f"No weekly data generated for {daily_data.symbol}")
                return False

            # Create weekly data file
            weekly_data = WeeklyDataFile(
                symbol=daily_data.symbol,
                data_type="weekly",
                last_updated=datetime.utcnow(),
                data_range=daily_data.data_range,  # Same range as daily
                data_points=weekly_points,
                metadata=StockMetadata(
                    total_records=len(weekly_points),
                    trading_days=daily_data.metadata.trading_days,
                    source="yahoo_finance",
                ),
            )

            # Store in GCS
            storage_path = StoragePaths.get_weekly_path(daily_data.symbol)
            success = await self.storage.upload_json(
                storage_path, weekly_data.to_dict()
            )

            if success:
                logger.info(
                    f"Successfully stored weekly data for {daily_data.symbol} to GCS"
                )

                # Invalidate weekly cache
                cache = get_cache()
                cache_key = CacheKeys.weekly_data(daily_data.symbol)
                await cache.delete(cache_key)

            return success

        except Exception as e:
            logger.error(
                f"Error processing weekly data for {daily_data.symbol}: {str(e)}"
            )
            return False

    async def get_weekly_data(self, symbol: str) -> Optional[WeeklyDataFile]:
        """
        Retrieve weekly data for a symbol from GCS.

        Args:
            symbol: Stock symbol

        Returns:
            WeeklyDataFile object or None if not found
        """
        try:
            storage_path = StoragePaths.get_weekly_path(symbol)
            data_dict = await self.storage.download_json(storage_path)

            if data_dict:
                # Convert date strings back to date objects
                for point in data_dict["data_points"]:
                    point["week_ending"] = datetime.fromisoformat(
                        point["week_ending"]
                    ).date()
                    point["week_start"] = datetime.fromisoformat(
                        point["week_start"]
                    ).date()

                data_dict["data_range"]["start"] = datetime.fromisoformat(
                    data_dict["data_range"]["start"]
                ).date()
                data_dict["data_range"]["end"] = datetime.fromisoformat(
                    data_dict["data_range"]["end"]
                ).date()

                data_dict["last_updated"] = datetime.fromisoformat(
                    data_dict["last_updated"]
                )

                return WeeklyDataFile(**data_dict)

            return None

        except Exception as e:
            logger.error(f"Error retrieving weekly data for {symbol}: {str(e)}")
            return None
