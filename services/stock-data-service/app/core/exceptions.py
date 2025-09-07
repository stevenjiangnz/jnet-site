class StockDataServiceException(Exception):
    """Base exception for Stock Data Service"""

    pass


class DataFetchError(StockDataServiceException):
    """Raised when data fetching fails"""

    pass


class SymbolNotFoundError(StockDataServiceException):
    """Raised when a stock symbol is not found"""

    pass


class StorageError(StockDataServiceException):
    """Raised when storage operations fail"""

    pass


class RateLimitError(StockDataServiceException):
    """Raised when rate limit is exceeded"""

    pass
