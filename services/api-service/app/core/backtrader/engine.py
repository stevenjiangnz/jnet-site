import logging
from typing import Any, Dict

from app.models.backtest import BacktestRequest
from app.services.stock_data import StockDataService

logger = logging.getLogger(__name__)


class BacktestEngine:
    def __init__(self) -> None:
        self.stock_data_service = StockDataService()

    async def run(self, request: BacktestRequest) -> Dict[str, Any]:
        try:
            # Fetch stock data
            await self.stock_data_service.get_multiple_stocks(
                request.symbols, request.start_date, request.end_date
            )

            # TODO: Convert data to backtrader format
            # TODO: Create cerebro instance
            # TODO: Add data feeds
            # TODO: Add strategy
            # TODO: Run backtest
            # TODO: Extract results

            return {
                "total_return": 0.0,
                "sharpe_ratio": 0.0,
                "max_drawdown": 0.0,
                "win_rate": 0.0,
                "trades": [],
                "equity_curve": [],
            }

        except Exception as e:
            logger.error(f"Backtest failed: {e}")
            raise
        finally:
            await self.stock_data_service.close()
