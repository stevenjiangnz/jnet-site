import logging
import time
from datetime import date, timedelta
from typing import Optional, List, Dict
import yfinance as yf
from app.core.exceptions import DataFetchError, SymbolNotFoundError
from app.models.stock import StockDataPoint
from app.config import settings

logger = logging.getLogger(__name__)


class DataFetcher:
    def __init__(self):
        self._last_call_time = 0
        self._call_count = 0

    def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        current_time = time.time()

        if current_time - self._last_call_time > settings.rate_limit_period:
            self._call_count = 0
            self._last_call_time = current_time

        if self._call_count >= settings.rate_limit_calls:
            sleep_time = settings.rate_limit_period - (
                current_time - self._last_call_time
            )
            if sleep_time > 0:
                logger.info(
                    f"Rate limit reached, sleeping for {sleep_time:.2f} seconds"
                )
                time.sleep(sleep_time)
                self._call_count = 0
                self._last_call_time = time.time()

        self._call_count += 1

    def fetch_stock_data(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[StockDataPoint]:
        """
        Fetch stock data from Yahoo Finance

        Args:
            symbol: Stock symbol (e.g., 'AAPL')
            start_date: Start date for data fetch (default: 1 year ago)
            end_date: End date for data fetch (default: today)

        Returns:
            List of StockDataPoint objects

        Raises:
            SymbolNotFoundError: If symbol is not found
            DataFetchError: If data fetching fails
        """
        try:
            self._check_rate_limit()

            if not start_date:
                start_date = date.today() - timedelta(days=365)
            if not end_date:
                end_date = date.today()

            logger.info(f"Fetching data for {symbol} from {start_date} to {end_date}")

            ticker = yf.Ticker(symbol.upper())

            # Fetch historical data
            df = ticker.history(
                start=start_date.strftime("%Y-%m-%d"),
                end=(end_date + timedelta(days=1)).strftime("%Y-%m-%d"),
                interval="1d",
                auto_adjust=False,
            )

            if df.empty:
                info = ticker.info
                if not info or "symbol" not in info:
                    raise SymbolNotFoundError(f"Symbol {symbol} not found")
                raise DataFetchError(
                    f"No data available for {symbol} in the specified date range"
                )

            # Convert DataFrame to list of StockDataPoint
            data_points = []
            for idx, row in df.iterrows():
                data_point = StockDataPoint(
                    date=idx.date(),
                    open=round(row["Open"], 2),
                    high=round(row["High"], 2),
                    low=round(row["Low"], 2),
                    close=round(row["Close"], 2),
                    adj_close=round(row["Adj Close"], 2),
                    volume=int(row["Volume"]),
                )
                data_points.append(data_point)

            logger.info(
                f"Successfully fetched {len(data_points)} data points for {symbol}"
            )
            return data_points

        except SymbolNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {str(e)}")
            raise DataFetchError(f"Failed to fetch data for {symbol}: {str(e)}")

    def validate_symbol(self, symbol: str) -> bool:
        """
        Validate if a symbol exists

        Args:
            symbol: Stock symbol to validate

        Returns:
            True if symbol exists, False otherwise
        """
        try:
            self._check_rate_limit()
            ticker = yf.Ticker(symbol.upper())
            info = ticker.info
            return bool(info and "symbol" in info)
        except Exception as e:
            logger.error(f"Error validating symbol {symbol}: {str(e)}")
            return False

    def fetch_bulk_data(
        self,
        symbols: List[str],
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> Dict[str, List[StockDataPoint]]:
        """
        Fetch data for multiple symbols

        Args:
            symbols: List of stock symbols
            start_date: Start date for data fetch
            end_date: End date for data fetch

        Returns:
            Dictionary mapping symbol to list of StockDataPoint objects
        """
        results = {}
        failed_symbols = []

        for symbol in symbols:
            try:
                data = self.fetch_stock_data(symbol, start_date, end_date)
                results[symbol] = data
            except Exception as e:
                logger.error(f"Failed to fetch data for {symbol}: {str(e)}")
                failed_symbols.append(symbol)

        if failed_symbols:
            logger.warning(
                f"Failed to fetch data for symbols: {', '.join(failed_symbols)}"
            )

        return results


# Singleton instance
data_fetcher = DataFetcher()
