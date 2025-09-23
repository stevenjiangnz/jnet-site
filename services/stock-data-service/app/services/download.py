"""Stock data download service with GCS storage."""

import logging
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
import yfinance as yf
import pandas as pd

from app.models.stock_data import (
    StockDataFile,
    StockDataPoint,
    DataRange,
    StockMetadata,
    WeeklyDataFile,
)
from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths
from app.services.simple_cache import get_cache
from app.services.cache_keys import CacheKeys
from app.services.weekly_aggregator import WeeklyAggregator
from app.services.catalog_manager import CatalogManager
from app.indicators.calculator import IndicatorCalculator
from app.indicators.config import DEFAULT_INDICATORS
from app.config import settings

logger = logging.getLogger(__name__)


class StockDataDownloader:
    """Service for downloading stock data from Yahoo Finance and storing in GCS."""

    def __init__(self):
        """Initialize the downloader with GCS storage."""
        self.storage = GCSStorageManager()
        self.weekly_aggregator = WeeklyAggregator()
        self.catalog_manager = CatalogManager()
        self.indicator_calculator = IndicatorCalculator()
        self.calculate_indicators_enabled = getattr(
            settings, "ENABLE_INDICATOR_CALCULATION", True
        )
        self.default_indicators = DEFAULT_INDICATORS

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

            # Calculate indicators if enabled
            if self.calculate_indicators_enabled:
                logger.info(f"Calculating indicators for {symbol}")
                indicators = await self.indicator_calculator.calculate_for_data(
                    stock_data, self.default_indicators
                )
                # Convert indicator models to dict for storage
                stock_data.indicators = {
                    name: indicator_data.model_dump(mode="json")
                    for name, indicator_data in indicators.items()
                }
                logger.info(f"Calculated {len(indicators)} indicators for {symbol}")

            # Store in GCS
            storage_path = StoragePaths.get_daily_path(symbol)
            success = await self.storage.upload_json(storage_path, stock_data.to_dict())

            if success:
                logger.info(f"Successfully stored {symbol} data to GCS")

                # Process and store weekly data
                await self._process_weekly_data(stock_data)

                # Update catalog by rescanning this symbol's data
                await self.catalog_manager.update_catalog_for_symbol(symbol)

                # Invalidate cache after successful upload
                cache = get_cache()
                cache_key = CacheKeys.daily_data(symbol)
                await cache.delete(cache_key)
                # Also invalidate symbol list cache since catalog changed
                await cache.delete(CacheKeys.symbol_list())
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

    async def get_weekly_data(self, symbol: str) -> Optional[WeeklyDataFile]:
        """
        Retrieve stored weekly data for a symbol from GCS.

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

            # Skip rows with zero or negative prices
            open_price = row["Open"]
            high_price = row["High"]
            low_price = row["Low"]
            close_price = row["Close"]
            adj_close_price = row.get("Adj Close", row["Close"])

            if (
                open_price <= 0
                or high_price <= 0
                or low_price <= 0
                or close_price <= 0
                or adj_close_price <= 0
            ):
                logger.warning(
                    f"Skipping {symbol} data point on {idx.date()} due to zero/negative prices"
                )
                continue

            point = StockDataPoint(
                date=idx.date(),
                open=round(open_price, 2),
                high=round(high_price, 2),
                low=round(low_price, 2),
                close=round(close_price, 2),
                adj_close=round(adj_close_price, 2),
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

    async def download_incremental_for_symbol(self, symbol: str) -> Dict[str, any]:
        """
        Download and append new price data to existing files.
        Downloads from (latest_date - 1) to tomorrow to ensure no gaps.

        Args:
            symbol: Stock symbol

        Returns:
            Dict with status, new_data_points count, date_range, and any warnings
        """
        try:
            logger.info(f"Starting incremental download for {symbol}")

            # Get existing data
            existing_data = await self.get_symbol_data(symbol)
            if not existing_data or not existing_data.data_points:
                logger.warning(
                    f"No existing data for {symbol}, falling back to full download"
                )
                result = await self.download_symbol(symbol, period="1y")
                return {
                    "status": "fallback_full_download",
                    "new_data_points": len(result.data_points) if result else 0,
                    "date_range": None,
                    "warnings": ["No existing data found, performed full download"],
                }

            # Calculate download range
            latest_date = existing_data.data_points[-1].date
            start_date, end_date = self._calculate_incremental_range(latest_date)

            logger.info(f"Downloading {symbol} from {start_date} to {end_date}")

            # Download new data
            ticker = yf.Ticker(symbol)
            df = ticker.history(start=start_date, end=end_date)

            if df.empty:
                logger.info(f"No new data available for {symbol}")
                return {
                    "status": "no_new_data",
                    "new_data_points": 0,
                    "date_range": f"{start_date} to {end_date}",
                    "warnings": [],
                }

            # Convert new data to our format
            new_data_points = self._convert_dataframe_to_points(df)

            # Merge with existing data
            merged_data, stats = self._merge_price_data(
                existing_data.data_points, new_data_points
            )

            # Update the existing data structure
            updated_data = StockDataFile(
                symbol=existing_data.symbol,
                data_type=existing_data.data_type,
                last_updated=datetime.utcnow(),
                data_range=DataRange(
                    start=merged_data[0].date, end=merged_data[-1].date
                ),
                data_points=merged_data,
                metadata=StockMetadata(
                    total_records=len(merged_data),
                    trading_days=len(merged_data),
                    source="yahoo_finance",
                ),
                indicators=existing_data.indicators,  # Preserve existing indicators
            )

            # Recalculate indicators if enabled and we have new data
            if self.calculate_indicators_enabled and stats["new_points"] > 0:
                logger.info(f"Recalculating indicators for {symbol}")
                indicators = await self.indicator_calculator.calculate_for_data(
                    updated_data, self.default_indicators
                )
                updated_data.indicators = {
                    name: indicator_data.model_dump(mode="json")
                    for name, indicator_data in indicators.items()
                }

            # Store updated data in GCS
            storage_path = StoragePaths.get_daily_path(symbol)
            success = await self.storage.upload_json(
                storage_path, updated_data.to_dict()
            )

            if not success:
                logger.error(f"Failed to store updated data for {symbol}")
                return {
                    "status": "storage_error",
                    "new_data_points": 0,
                    "date_range": f"{start_date} to {end_date}",
                    "warnings": ["Failed to store updated data"],
                }

            # Process weekly data if we have new points
            if stats["new_points"] > 0:
                await self._process_weekly_data(updated_data)

            # Update catalog
            await self.catalog_manager.update_catalog_for_symbol(symbol)

            # Invalidate cache
            cache = get_cache()
            cache_key = CacheKeys.daily_data(symbol)
            await cache.delete(cache_key)
            await cache.delete(CacheKeys.symbol_list())
            await cache.delete(CacheKeys.catalog())

            logger.info(
                f"Successfully completed incremental download for {symbol}: {stats['new_points']} new points"
            )

            return {
                "status": "success",
                "new_data_points": stats["new_points"],
                "date_range": f"{start_date} to {end_date}",
                "warnings": stats["warnings"],
                "duplicates_removed": stats["duplicates"],
                "total_points": len(merged_data),
            }

        except Exception as e:
            logger.error(f"Error in incremental download for {symbol}: {str(e)}")
            return {
                "status": "error",
                "new_data_points": 0,
                "date_range": None,
                "warnings": [f"Download failed: {str(e)}"],
            }

    def _calculate_incremental_range(self, latest_date: date) -> Tuple[date, date]:
        """
        Calculate the date range for incremental download.
        Start from (latest_date - 1) to ensure overlap and catch any missed data.
        End at tomorrow to get the most recent data available.

        Args:
            latest_date: Last date in existing data

        Returns:
            Tuple of (start_date, end_date)
        """
        start_date = latest_date - timedelta(days=1)
        end_date = date.today() + timedelta(days=1)
        return start_date, end_date

    def _convert_dataframe_to_points(self, df: pd.DataFrame) -> List[StockDataPoint]:
        """
        Convert pandas DataFrame to list of StockDataPoint objects.

        Args:
            df: DataFrame from yfinance

        Returns:
            List of StockDataPoint objects
        """
        data_points = []

        for idx, row in df.iterrows():
            # Skip rows with NaN values
            if row.isna().any():
                continue

            # Skip rows with zero or negative prices
            open_price = row["Open"]
            high_price = row["High"]
            low_price = row["Low"]
            close_price = row["Close"]
            adj_close_price = row.get("Adj Close", row["Close"])

            if (
                open_price <= 0
                or high_price <= 0
                or low_price <= 0
                or close_price <= 0
                or adj_close_price <= 0
            ):
                logger.warning(
                    f"Skipping data point on {idx.date()} due to zero/negative prices"
                )
                continue

            point = StockDataPoint(
                date=idx.date(),
                open=round(open_price, 2),
                high=round(high_price, 2),
                low=round(low_price, 2),
                close=round(close_price, 2),
                adj_close=round(adj_close_price, 2),
                volume=int(row["Volume"]),
            )
            data_points.append(point)

        return data_points

    def _merge_price_data(
        self, existing_points: List[StockDataPoint], new_points: List[StockDataPoint]
    ) -> Tuple[List[StockDataPoint], Dict[str, any]]:
        """
        Merge new data with existing data, removing duplicates and ensuring chronological order.

        Args:
            existing_points: Existing data points
            new_points: New data points to merge

        Returns:
            Tuple of (merged_data_points, statistics)
        """
        # Create a dictionary of existing points by date for fast lookup
        existing_by_date = {point.date: point for point in existing_points}

        # Track statistics
        duplicates_removed = 0
        new_points_added = 0
        warnings = []

        # Add new points, skipping duplicates
        for new_point in new_points:
            if new_point.date in existing_by_date:
                # Check if the data is significantly different
                existing_point = existing_by_date[new_point.date]
                if self._is_significantly_different(existing_point, new_point):
                    # Update with newer data
                    existing_by_date[new_point.date] = new_point
                    warnings.append(
                        f"Updated data for {new_point.date} (significant difference detected)"
                    )
                else:
                    duplicates_removed += 1
            else:
                existing_by_date[new_point.date] = new_point
                new_points_added += 1

        # Convert back to sorted list
        merged_points = sorted(existing_by_date.values(), key=lambda x: x.date)

        # Check for gaps in trading days (optional warning)
        gaps = self._check_for_gaps(merged_points)
        if gaps:
            warnings.extend(
                [f"Potential gap detected: {gap}" for gap in gaps[:3]]
            )  # Limit warnings

        stats = {
            "new_points": new_points_added,
            "duplicates": duplicates_removed,
            "warnings": warnings,
            "total_points": len(merged_points),
        }

        return merged_points, stats

    def _is_significantly_different(
        self, point1: StockDataPoint, point2: StockDataPoint
    ) -> bool:
        """
        Check if two data points for the same date are significantly different.

        Args:
            point1: First data point
            point2: Second data point

        Returns:
            True if significantly different
        """
        # Consider 1% difference in close price as significant
        close_diff = abs(point1.close - point2.close) / point1.close
        volume_diff = abs(point1.volume - point2.volume) / max(point1.volume, 1)

        return close_diff > 0.01 or volume_diff > 0.1

    def _check_for_gaps(self, data_points: List[StockDataPoint]) -> List[str]:
        """
        Check for unusual gaps in trading days (more than 5 days between consecutive points).

        Args:
            data_points: Sorted list of data points

        Returns:
            List of gap descriptions
        """
        gaps = []

        for i in range(1, len(data_points)):
            prev_date = data_points[i - 1].date
            curr_date = data_points[i].date
            gap_days = (curr_date - prev_date).days

            # Only report gaps longer than 5 days (likely holidays/weekends are normal)
            if gap_days > 5:
                gaps.append(f"{prev_date} to {curr_date} ({gap_days} days)")

            # Limit to prevent too many warnings
            if len(gaps) >= 5:
                break

        return gaps

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

            # Calculate indicators for weekly data if enabled
            if self.calculate_indicators_enabled:
                logger.info(f"Calculating weekly indicators for {daily_data.symbol}")
                indicators = await self.indicator_calculator.calculate_for_data(
                    weekly_data, self.default_indicators
                )
                # Convert indicator models to dict for storage
                weekly_data.indicators = {
                    name: indicator_data.model_dump(mode="json")
                    for name, indicator_data in indicators.items()
                }
                logger.info(
                    f"Calculated {len(indicators)} weekly indicators for {daily_data.symbol}"
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
