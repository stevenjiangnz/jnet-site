"""Script to sync weekly data for all existing daily data in GCS."""

import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any

from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths
from app.services.weekly_aggregator import WeeklyAggregator
from app.models.stock_data import (
    StockDataFile,
    StockDataPoint,
    WeeklyDataFile,
    DataRange,
    StockMetadata,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class WeeklyDataSync:
    """Sync weekly data for existing daily data in GCS."""
    
    def __init__(self):
        self.storage = GCSStorageManager()
        self.aggregator = WeeklyAggregator()
        self.processed_count = 0
        self.skipped_count = 0
        self.error_count = 0
    
    async def sync_all_symbols(self, force: bool = False) -> Dict[str, Any]:
        """
        Sync weekly data for all symbols with daily data.
        
        Args:
            force: If True, regenerate weekly data even if it exists
            
        Returns:
            Summary of the sync operation
        """
        logger.info("Starting weekly data sync...")
        
        # Get all daily data files
        daily_blobs = await self.storage.list_blobs(prefix=StoragePaths.DAILY_PREFIX)
        
        # Extract symbols from daily data paths
        symbols = []
        for blob_name in daily_blobs:
            symbol = StoragePaths.extract_symbol_from_path(blob_name)
            if symbol:
                symbols.append(symbol)
        
        logger.info(f"Found {len(symbols)} symbols with daily data")
        
        # Process each symbol
        for symbol in symbols:
            await self.sync_symbol(symbol, force)
        
        # Return summary
        summary = {
            "total_symbols": len(symbols),
            "processed": self.processed_count,
            "skipped": self.skipped_count,
            "errors": self.error_count,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info(f"Sync completed: {summary}")
        return summary
    
    async def sync_symbol(self, symbol: str, force: bool = False) -> bool:
        """
        Sync weekly data for a single symbol.
        
        Args:
            symbol: Stock symbol
            force: If True, regenerate weekly data even if it exists
            
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Processing {symbol}...")
            
            # Check if weekly data already exists
            if not force:
                weekly_path = StoragePaths.get_weekly_path(symbol)
                weekly_exists = await self.storage.blob_exists(weekly_path)
                
                if weekly_exists:
                    logger.info(f"Weekly data already exists for {symbol}, skipping")
                    self.skipped_count += 1
                    return True
            
            # Download daily data
            daily_path = StoragePaths.get_daily_path(symbol)
            daily_data_dict = await self.storage.download_json(daily_path)
            
            if not daily_data_dict:
                logger.warning(f"No daily data found for {symbol}")
                self.error_count += 1
                return False
            
            # Convert to StockDataFile
            daily_data = self._dict_to_stock_data(daily_data_dict)
            
            # Generate weekly data
            weekly_points = self.aggregator.aggregate_to_weekly(daily_data.data_points)
            
            if not weekly_points:
                logger.warning(f"No weekly data generated for {symbol}")
                self.error_count += 1
                return False
            
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
            
            # Upload to GCS
            weekly_path = StoragePaths.get_weekly_path(symbol)
            success = await self.storage.upload_json(
                weekly_path, weekly_data.to_dict()
            )
            
            if success:
                logger.info(
                    f"Successfully synced weekly data for {symbol}: "
                    f"{len(weekly_points)} weeks from {len(daily_data.data_points)} days"
                )
                self.processed_count += 1
                return True
            else:
                logger.error(f"Failed to upload weekly data for {symbol}")
                self.error_count += 1
                return False
                
        except Exception as e:
            logger.error(f"Error syncing {symbol}: {str(e)}")
            self.error_count += 1
            return False
    
    def _dict_to_stock_data(self, data_dict: Dict[str, Any]) -> StockDataFile:
        """Convert dictionary from GCS to StockDataFile object."""
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


async def main():
    """Run the weekly data sync."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync weekly data for existing daily data")
    parser.add_argument(
        "--force", 
        action="store_true", 
        help="Force regeneration of weekly data even if it exists"
    )
    parser.add_argument(
        "--symbol",
        type=str,
        help="Sync only a specific symbol"
    )
    
    args = parser.parse_args()
    
    sync = WeeklyDataSync()
    
    if args.symbol:
        # Sync single symbol
        success = await sync.sync_symbol(args.symbol.upper(), args.force)
        if success:
            logger.info(f"Successfully synced {args.symbol}")
        else:
            logger.error(f"Failed to sync {args.symbol}")
    else:
        # Sync all symbols
        summary = await sync.sync_all_symbols(args.force)
        
        # Print summary
        print("\n" + "="*50)
        print("Weekly Data Sync Summary")
        print("="*50)
        print(f"Total symbols found: {summary['total_symbols']}")
        print(f"Successfully processed: {summary['processed']}")
        print(f"Skipped (already exists): {summary['skipped']}")
        print(f"Errors: {summary['errors']}")
        print(f"Completed at: {summary['timestamp']}")
        print("="*50)


if __name__ == "__main__":
    asyncio.run(main())