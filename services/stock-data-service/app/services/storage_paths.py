"""Storage path management for stock data in GCS."""


class StoragePaths:
    """Centralized management of GCS storage paths."""

    # Base prefixes for different data types
    DAILY_PREFIX = "stock-data/daily/"
    WEEKLY_PREFIX = "stock-data/weekly/"
    METADATA_PREFIX = "stock-data/metadata/"

    # Metadata file names
    PROFILE_FILE = "profile.json"
    SYMBOL_INDEX_FILE = "symbol-index.json"

    @staticmethod
    def get_daily_path(symbol: str) -> str:
        """Get the GCS path for a symbol's daily data.

        Args:
            symbol: Stock symbol (e.g., 'AAPL')

        Returns:
            GCS path string (e.g., 'stock-data/daily/AAPL.json')
        """
        return f"{StoragePaths.DAILY_PREFIX}{symbol.upper()}.json"

    @staticmethod
    def get_weekly_path(symbol: str) -> str:
        """Get the GCS path for a symbol's weekly data.

        Args:
            symbol: Stock symbol (e.g., 'AAPL')

        Returns:
            GCS path string (e.g., 'stock-data/weekly/AAPL.json')
        """
        return f"{StoragePaths.WEEKLY_PREFIX}{symbol.upper()}.json"

    @staticmethod
    def get_profile_path() -> str:
        """Get the GCS path for the system profile.

        Returns:
            GCS path string (e.g., 'stock-data/metadata/profile.json')
        """
        return f"{StoragePaths.METADATA_PREFIX}{StoragePaths.PROFILE_FILE}"

    @staticmethod
    def get_symbol_index_path() -> str:
        """Get the GCS path for the symbol index.

        Returns:
            GCS path string (e.g., 'stock-data/metadata/symbol-index.json')
        """
        return f"{StoragePaths.METADATA_PREFIX}{StoragePaths.SYMBOL_INDEX_FILE}"

    @staticmethod
    def extract_symbol_from_path(path: str) -> str:
        """Extract symbol from a storage path.

        Args:
            path: GCS path (e.g., 'stock-data/daily/AAPL.json')

        Returns:
            Symbol string (e.g., 'AAPL') or empty string if invalid path
        """
        if path.endswith(".json"):
            # Remove .json extension
            path_without_ext = path[:-5]
            # Get last part after /
            parts = path_without_ext.split("/")
            if parts:
                return parts[-1]
        return ""

    @staticmethod
    def is_daily_path(path: str) -> bool:
        """Check if a path is for daily data."""
        return path.startswith(StoragePaths.DAILY_PREFIX)

    @staticmethod
    def is_weekly_path(path: str) -> bool:
        """Check if a path is for weekly data."""
        return path.startswith(StoragePaths.WEEKLY_PREFIX)

    @staticmethod
    def is_metadata_path(path: str) -> bool:
        """Check if a path is for metadata."""
        return path.startswith(StoragePaths.METADATA_PREFIX)
