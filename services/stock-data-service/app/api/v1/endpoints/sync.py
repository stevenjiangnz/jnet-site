"""API endpoints for syncing weekly data."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from app.models.responses import APIResponse
from app.services.download import StockDataDownloader
from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths
from app.services.weekly_aggregator import WeeklyAggregator
from app.models.stock_data import WeeklyDataFile, StockMetadata
from app.utils.validators import validate_symbol
from datetime import datetime
from app.indicators.calculator import IndicatorCalculator
from app.indicators.config import DEFAULT_INDICATORS
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class WeeklyDataSyncer:
    """Service for syncing weekly data."""

    def __init__(self):
        self.storage = GCSStorageManager()
        self.aggregator = WeeklyAggregator()
        self.downloader = StockDataDownloader()
        self.indicator_calculator = IndicatorCalculator()
        self.calculate_indicators_enabled = getattr(
            settings, "ENABLE_INDICATOR_CALCULATION", True
        )

    async def sync_symbol(self, symbol: str, force: bool = False) -> dict:
        """Sync weekly data for a single symbol."""
        try:
            # Check if weekly data already exists
            if not force:
                weekly_data = await self.downloader.get_weekly_data(symbol)
                if weekly_data:
                    return {
                        "status": "skipped",
                        "message": f"Weekly data already exists for {symbol}",
                        "weekly_records": len(weekly_data.data_points),
                    }

            # Get daily data
            daily_data = await self.downloader.get_symbol_data(symbol)

            if not daily_data:
                return {
                    "status": "error",
                    "message": f"No daily data found for {symbol}",
                }

            # Generate weekly data
            weekly_points = self.aggregator.aggregate_to_weekly(daily_data.data_points)

            if not weekly_points:
                return {
                    "status": "error",
                    "message": f"No weekly data could be generated for {symbol}",
                }

            # Create weekly data file
            weekly_data = WeeklyDataFile(
                symbol=daily_data.symbol,
                data_type="weekly",
                last_updated=datetime.utcnow(),
                data_range=daily_data.data_range,
                data_points=weekly_points,
                metadata=StockMetadata(
                    total_records=len(weekly_points),
                    trading_days=daily_data.metadata.trading_days,
                    source=daily_data.metadata.source,
                ),
            )

            # Calculate indicators for weekly data if enabled
            if self.calculate_indicators_enabled:
                logger.info(f"Calculating weekly indicators for {symbol}")
                indicators = await self.indicator_calculator.calculate_for_data(
                    weekly_data, DEFAULT_INDICATORS
                )
                # Convert indicator models to dict for storage
                weekly_data.indicators = {
                    name: indicator_data.model_dump(mode="json")
                    for name, indicator_data in indicators.items()
                }
                logger.info(
                    f"Calculated {len(indicators)} weekly indicators for {symbol}"
                )

            # Upload to GCS
            weekly_path = StoragePaths.get_weekly_path(symbol)
            success = await self.storage.upload_json(weekly_path, weekly_data.to_dict())

            if success:
                # Invalidate cache
                from app.services.simple_cache import get_cache
                from app.services.cache_keys import CacheKeys

                cache = get_cache()
                cache_key = CacheKeys.weekly_data(symbol)
                await cache.delete(cache_key)

                return {
                    "status": "success",
                    "message": f"Successfully synced weekly data for {symbol}",
                    "daily_records": len(daily_data.data_points),
                    "weekly_records": len(weekly_points),
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to upload weekly data for {symbol}",
                }

        except Exception as e:
            logger.error(f"Error syncing {symbol}: {str(e)}")
            return {"status": "error", "message": f"Error syncing {symbol}: {str(e)}"}

    async def sync_all_symbols(self, force: bool = False) -> dict:
        """Sync weekly data for all symbols."""
        # Get all daily data files
        daily_blobs = await self.storage.list_blobs(prefix=StoragePaths.DAILY_PREFIX)

        # Extract symbols
        symbols = []
        for blob_name in daily_blobs:
            symbol = StoragePaths.extract_symbol_from_path(blob_name)
            if symbol:
                symbols.append(symbol)

        results = {
            "total": len(symbols),
            "processed": 0,
            "skipped": 0,
            "errors": 0,
            "details": [],
        }

        # Process each symbol
        for symbol in symbols:
            result = await self.sync_symbol(symbol, force)

            if result["status"] == "success":
                results["processed"] += 1
            elif result["status"] == "skipped":
                results["skipped"] += 1
            else:
                results["errors"] += 1

            results["details"].append({"symbol": symbol, **result})

        return results


@router.post("/sync/weekly/{symbol}")
async def sync_weekly_data_for_symbol(
    symbol: str,
    force: bool = Query(
        False, description="Force regeneration even if weekly data exists"
    ),
):
    """
    Sync weekly data for a specific symbol.

    This endpoint will:
    1. Check if weekly data already exists (skip if exists unless force=true)
    2. Load the daily data for the symbol
    3. Generate weekly aggregates
    4. Store the weekly data in GCS
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    syncer = WeeklyDataSyncer()
    result = await syncer.sync_symbol(symbol.upper(), force)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])

    return APIResponse(status=result["status"], message=result["message"], data=result)


@router.post("/sync/weekly")
async def sync_all_weekly_data(
    background_tasks: BackgroundTasks,
    force: bool = Query(
        False, description="Force regeneration even if weekly data exists"
    ),
):
    """
    Sync weekly data for all symbols with daily data.

    This endpoint will process all symbols that have daily data and generate
    weekly aggregates for them. This runs as a background task.
    """
    # Run sync in background
    syncer = WeeklyDataSyncer()

    # For now, run synchronously (could be moved to background task for production)
    results = await syncer.sync_all_symbols(force)

    return APIResponse(
        status="completed",
        message=f"Synced {results['processed']} symbols, skipped {results['skipped']}, errors: {results['errors']}",
        data=results,
    )


@router.get("/sync/weekly/status")
async def get_sync_status():
    """
    Get the status of weekly data sync across all symbols.

    Returns statistics about which symbols have weekly data.
    """
    storage = GCSStorageManager()

    # Get all daily data files
    daily_blobs = await storage.list_blobs(prefix=StoragePaths.DAILY_PREFIX)
    daily_symbols = set()
    for blob_name in daily_blobs:
        symbol = StoragePaths.extract_symbol_from_path(blob_name)
        if symbol:
            daily_symbols.add(symbol)

    # Get all weekly data files
    weekly_blobs = await storage.list_blobs(prefix=StoragePaths.WEEKLY_PREFIX)
    weekly_symbols = set()
    for blob_name in weekly_blobs:
        symbol = StoragePaths.extract_symbol_from_path(blob_name)
        if symbol:
            weekly_symbols.add(symbol)

    # Find symbols missing weekly data
    missing_weekly = daily_symbols - weekly_symbols

    return APIResponse(
        status="success",
        message="Weekly data sync status",
        data={
            "total_symbols_with_daily": len(daily_symbols),
            "total_symbols_with_weekly": len(weekly_symbols),
            "symbols_missing_weekly": len(missing_weekly),
            "missing_symbols": sorted(list(missing_weekly)),
            "sync_percentage": (
                round(len(weekly_symbols) / len(daily_symbols) * 100, 2)
                if daily_symbols
                else 0
            ),
        },
    )
