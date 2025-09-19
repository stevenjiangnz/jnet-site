#!/usr/bin/env python3
"""Script to rebuild the data catalog from existing GCS data."""

import asyncio
import logging
import sys
from pathlib import Path

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.catalog_manager import CatalogManager

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


async def main():
    """Main function to rebuild the catalog."""
    logger.info("Starting catalog rebuild...")

    catalog_manager = CatalogManager()
    catalog = await catalog_manager.rebuild_catalog()

    if catalog:
        logger.info("=" * 60)
        logger.info("CATALOG REBUILD SUCCESSFUL")
        logger.info("=" * 60)
        logger.info(f"Total symbols: {catalog.symbol_count}")
        logger.info(f"Last updated: {catalog.last_updated}")
        logger.info("")
        logger.info("Symbol details:")
        logger.info("-" * 60)

        # Sort symbols for display
        sorted_symbols = sorted(catalog.symbols, key=lambda x: x.symbol)

        for symbol_summary in sorted_symbols:
            logger.info(
                f"{symbol_summary.symbol:6s} | "
                f"{symbol_summary.start_date} to {symbol_summary.end_date} | "
                f"{symbol_summary.total_days:4d} days | "
                f"Weekly: {'Yes' if symbol_summary.has_weekly else 'No'}"
            )

        logger.info("=" * 60)
    else:
        logger.error("Failed to rebuild catalog")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
