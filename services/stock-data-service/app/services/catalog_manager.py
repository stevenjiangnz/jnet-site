"""Manager for stock data catalog/summary file."""

import logging
from datetime import datetime
from typing import Optional

from app.models.summary import DataCatalog, SymbolSummary
from app.models.stock_data import StockDataFile, WeeklyDataFile
from app.services.gcs_storage import GCSStorageManager
from app.services.storage_paths import StoragePaths

logger = logging.getLogger(__name__)


class CatalogManager:
    """Manages the stock data catalog/summary file in GCS."""

    CATALOG_PATH = "metadata/catalog.json"

    def __init__(self):
        """Initialize catalog manager."""
        self.storage = GCSStorageManager()

    async def get_catalog(self) -> Optional[DataCatalog]:
        """
        Retrieve the catalog from GCS.

        Returns:
            DataCatalog object or None if not found
        """
        try:
            catalog_dict = await self.storage.download_json(self.CATALOG_PATH)

            if catalog_dict:
                # Convert ISO strings back to datetime objects
                catalog_dict["last_updated"] = datetime.fromisoformat(
                    catalog_dict["last_updated"]
                )

                # Convert symbol dates
                for symbol in catalog_dict.get("symbols", []):
                    symbol["start_date"] = datetime.fromisoformat(
                        symbol["start_date"]
                    ).date()
                    symbol["end_date"] = datetime.fromisoformat(
                        symbol["end_date"]
                    ).date()
                    symbol["last_updated"] = datetime.fromisoformat(
                        symbol["last_updated"]
                    )

                return DataCatalog(**catalog_dict)

            # Create new catalog if none exists
            logger.info("No catalog found, creating new one")
            return DataCatalog(
                last_updated=datetime.utcnow(), symbol_count=0, symbols=[]
            )

        except Exception as e:
            logger.error(f"Error retrieving catalog: {str(e)}")
            # Return empty catalog on error
            return DataCatalog(
                last_updated=datetime.utcnow(), symbol_count=0, symbols=[]
            )

    async def update_catalog_for_symbol(
        self, symbol: str, force_rescan: bool = True
    ) -> bool:
        """
        Update catalog by rescanning a specific symbol's data.
        This ensures the catalog always reflects the true state of the files.

        Args:
            symbol: Stock symbol to update
            force_rescan: Always rescan the symbol data from GCS

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get current catalog
            catalog = await self.get_catalog()
            if not catalog:
                catalog = DataCatalog(
                    last_updated=datetime.utcnow(), symbol_count=0, symbols=[]
                )

            # Check if daily data exists for this symbol
            daily_path = StoragePaths.get_daily_path(symbol)
            daily_exists = await self.storage.blob_exists(daily_path)

            if not daily_exists:
                # Symbol was deleted or doesn't exist - remove from catalog
                catalog.symbols = [s for s in catalog.symbols if s.symbol != symbol]
                catalog.symbol_count = len(catalog.symbols)
                catalog.last_updated = datetime.utcnow()

                logger.info(f"Removed {symbol} from catalog (no data file found)")
            else:
                # Download and scan the actual data file
                data_dict = await self.storage.download_json(daily_path)
                if not data_dict:
                    logger.warning(f"Could not read data for {symbol}")
                    return False

                # Check if weekly data exists
                weekly_path = StoragePaths.get_weekly_path(symbol)
                has_weekly = await self.storage.blob_exists(weekly_path)

                # Create symbol summary from actual file data
                symbol_summary = SymbolSummary(
                    symbol=symbol,
                    start_date=datetime.fromisoformat(
                        data_dict["data_range"]["start"]
                    ).date(),
                    end_date=datetime.fromisoformat(
                        data_dict["data_range"]["end"]
                    ).date(),
                    total_days=len(data_dict["data_points"]),
                    has_weekly=has_weekly,
                    last_updated=datetime.fromisoformat(data_dict["last_updated"]),
                )

                # Add or update in catalog
                catalog.add_or_update_symbol(symbol_summary)

                logger.info(f"Updated catalog for symbol {symbol} from file scan")

            # Save updated catalog to GCS
            success = await self.storage.upload_json(
                self.CATALOG_PATH, catalog.to_dict()
            )

            if success:
                logger.info(f"Successfully saved updated catalog")
            else:
                logger.error(f"Failed to save updated catalog")

            return success

        except Exception as e:
            logger.error(f"Error updating catalog for {symbol}: {str(e)}")
            return False

    async def rebuild_catalog(self) -> Optional[DataCatalog]:
        """
        Rebuild the entire catalog by scanning all stored data.
        Useful for fixing inconsistencies or initial setup.

        Returns:
            Updated DataCatalog or None if failed
        """
        try:
            logger.info("Rebuilding catalog from stored data...")

            # Create new catalog
            catalog = DataCatalog(
                last_updated=datetime.utcnow(), symbol_count=0, symbols=[]
            )

            # Get all daily data files
            daily_blobs = await self.storage.list_blobs(
                prefix=StoragePaths.DAILY_PREFIX
            )

            for blob_name in daily_blobs:
                symbol = StoragePaths.extract_symbol_from_path(blob_name)
                if not symbol:
                    continue

                try:
                    # Get metadata for the blob
                    metadata = await self.storage.get_blob_metadata(blob_name)
                    if not metadata:
                        continue

                    # Download the data file to get details
                    data_dict = await self.storage.download_json(blob_name)
                    if not data_dict:
                        continue

                    # Check if weekly data exists
                    weekly_path = StoragePaths.get_weekly_path(symbol)
                    has_weekly = await self.storage.blob_exists(weekly_path)

                    # Create symbol summary
                    symbol_summary = SymbolSummary(
                        symbol=symbol,
                        start_date=datetime.fromisoformat(
                            data_dict["data_range"]["start"]
                        ).date(),
                        end_date=datetime.fromisoformat(
                            data_dict["data_range"]["end"]
                        ).date(),
                        total_days=len(data_dict["data_points"]),
                        has_weekly=has_weekly,
                        last_updated=datetime.fromisoformat(data_dict["last_updated"]),
                    )

                    catalog.symbols.append(symbol_summary)
                    logger.info(f"Added {symbol} to catalog")

                except Exception as e:
                    logger.error(f"Error processing {symbol}: {str(e)}")
                    continue

            # Update counts
            catalog.symbol_count = len(catalog.symbols)

            # Save to GCS
            success = await self.storage.upload_json(
                self.CATALOG_PATH, catalog.to_dict()
            )

            if success:
                logger.info(f"Rebuilt catalog with {catalog.symbol_count} symbols")
                return catalog
            else:
                logger.error("Failed to save rebuilt catalog")
                return None

        except Exception as e:
            logger.error(f"Error rebuilding catalog: {str(e)}")
            return None
