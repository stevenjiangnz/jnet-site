"""API endpoints for deleting stock data."""

import logging
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.responses import APIResponse
from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths
from app.services.simple_cache import get_cache
from app.services.cache_keys import CacheKeys
from app.utils.validators import validate_symbol

logger = logging.getLogger(__name__)
router = APIRouter()


class StockDataDeleter:
    """Service for deleting stock data from storage."""
    
    def __init__(self):
        self.storage = GCSStorageManager()
        self.cache = get_cache()
    
    async def delete_symbol(self, symbol: str) -> Dict[str, Any]:
        """
        Delete all data for a symbol including daily and weekly data.
        
        Args:
            symbol: Stock symbol to delete
            
        Returns:
            Dictionary with deletion results
        """
        symbol = symbol.upper()
        results = {
            "symbol": symbol,
            "daily_deleted": False,
            "weekly_deleted": False,
            "cache_cleared": False,
            "errors": []
        }
        
        try:
            # Delete daily data
            daily_path = StoragePaths.get_daily_path(symbol)
            if await self.storage.blob_exists(daily_path):
                daily_deleted = await self.storage.delete_blob(daily_path)
                results["daily_deleted"] = daily_deleted
                if not daily_deleted:
                    results["errors"].append("Failed to delete daily data")
            else:
                results["errors"].append("Daily data not found")
            
            # Delete weekly data
            weekly_path = StoragePaths.get_weekly_path(symbol)
            if await self.storage.blob_exists(weekly_path):
                weekly_deleted = await self.storage.delete_blob(weekly_path)
                results["weekly_deleted"] = weekly_deleted
                if not weekly_deleted:
                    results["errors"].append("Failed to delete weekly data")
            else:
                results["errors"].append("Weekly data not found")
            
            # Clear all cache entries for this symbol
            await self._clear_symbol_cache(symbol)
            results["cache_cleared"] = True
            
            # Update symbol index if it exists
            await self._update_symbol_index(symbol)
            
            return results
            
        except Exception as e:
            logger.error(f"Error deleting symbol {symbol}: {str(e)}")
            results["errors"].append(f"Unexpected error: {str(e)}")
            return results
    
    async def _clear_symbol_cache(self, symbol: str):
        """Clear all cache entries related to a symbol."""
        try:
            # Clear specific cache keys
            cache_keys = [
                CacheKeys.daily_data(symbol),
                CacheKeys.weekly_data(symbol),
                CacheKeys.latest_price(symbol),
                CacheKeys.recent_data(symbol),
                CacheKeys.symbol_info(symbol),
                CacheKeys.symbol_quality(symbol),
                f"weekly:latest:{symbol}",  # Custom key used in weekly endpoint
            ]
            
            for key in cache_keys:
                await self.cache.delete(key)
            
            # Clear symbol list cache to force refresh
            await self.cache.delete(CacheKeys.symbol_list())
            
            logger.info(f"Cleared cache entries for {symbol}")
            
        except Exception as e:
            logger.error(f"Error clearing cache for {symbol}: {str(e)}")
    
    async def _update_symbol_index(self, symbol: str):
        """Update the symbol index after deletion."""
        try:
            # Get current symbol index
            index_path = StoragePaths.get_symbol_index_path()
            index_data = await self.storage.download_json(index_path)
            
            if index_data and "symbols" in index_data:
                # Remove the symbol if it exists
                if symbol in index_data["symbols"]:
                    index_data["symbols"].remove(symbol)
                    
                    # Update the index
                    await self.storage.upload_json(index_path, index_data)
                    logger.info(f"Updated symbol index after deleting {symbol}")
            
        except Exception as e:
            # Symbol index might not exist, which is okay
            logger.debug(f"Could not update symbol index: {str(e)}")


@router.delete("/symbol/{symbol}")
async def delete_symbol(symbol: str):
    """
    Delete all data for a stock symbol.
    
    This endpoint will:
    1. Delete daily data from GCS
    2. Delete weekly data from GCS
    3. Clear all cache entries for the symbol
    4. Update symbol index if applicable
    
    Returns details about what was deleted.
    """
    # Validate symbol format
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    deleter = StockDataDeleter()
    results = await deleter.delete_symbol(symbol)
    
    # Check if anything was actually deleted
    if not results["daily_deleted"] and not results["weekly_deleted"]:
        if "Daily data not found" in results["errors"] and "Weekly data not found" in results["errors"]:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for symbol {symbol}"
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to delete data: {', '.join(results['errors'])}"
            )
    
    return APIResponse(
        status="success",
        message=f"Successfully deleted data for {symbol}",
        data=results
    )


@router.delete("/symbols")
async def delete_multiple_symbols(symbols: list[str]):
    """
    Delete data for multiple symbols.
    
    This endpoint processes multiple symbols and returns results for each.
    """
    # Validate all symbols
    invalid_symbols = [s for s in symbols if not validate_symbol(s)]
    if invalid_symbols:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid symbols: {', '.join(invalid_symbols)}"
        )
    
    deleter = StockDataDeleter()
    results = {
        "total": len(symbols),
        "successful": 0,
        "failed": 0,
        "details": []
    }
    
    for symbol in symbols:
        symbol_result = await deleter.delete_symbol(symbol)
        
        if symbol_result["daily_deleted"] or symbol_result["weekly_deleted"]:
            results["successful"] += 1
        else:
            results["failed"] += 1
        
        results["details"].append(symbol_result)
    
    return APIResponse(
        status="completed",
        message=f"Deleted {results['successful']} symbols, failed: {results['failed']}",
        data=results
    )