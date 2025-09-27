import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi import Query as QueryParam

from app.config import settings
from app.core.analysis.indicators import IndicatorCalculator
from app.core.http_client import stock_data_client
from app.models.stock import (
    OHLCV,
    ChartDataRequest,
    ChartDataResponse,
    Interval,
    StockDataResponse,
)
from app.services.stock_data import StockDataService

router = APIRouter()
logger = logging.getLogger(__name__)


async def _fetch_stock_data(
    symbol: str,
    interval: str = "1d",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: Optional[int] = None,
) -> List[OHLCV]:
    """Internal function to fetch stock data."""
    # Default date range if not provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        # Default to 1 year of data
        start_date = end_date - timedelta(days=365)

    stock_service = StockDataService()
    try:
        data = await stock_service.get_stock_data(
            symbol=symbol.upper(),
            start_date=start_date,
            end_date=end_date,
            interval=interval,
        )
    finally:
        await stock_service.close()

    # Convert to OHLCV format
    ohlcv_data = []
    for item in data:
        ohlcv_data.append(
            OHLCV(
                timestamp=datetime.fromisoformat(item["date"]),
                open=item["open"],
                high=item["high"],
                low=item["low"],
                close=item["close"],
                volume=item["volume"],
            )
        )

    # Limit results if specified
    if limit:
        ohlcv_data = ohlcv_data[-limit:]

    return ohlcv_data


@router.get("/{symbol}/data", response_model=StockDataResponse)
async def get_stock_data(
    symbol: str,
    interval: Interval = QueryParam(default=Interval.ONE_DAY),
    start_date: Optional[datetime] = QueryParam(default=None),
    end_date: Optional[datetime] = QueryParam(default=None),
    limit: Optional[int] = QueryParam(default=500),
) -> StockDataResponse:
    """Get raw OHLCV data for a stock symbol."""
    try:
        ohlcv_data = await _fetch_stock_data(
            symbol=symbol,
            interval=interval.value,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )

        return StockDataResponse(
            symbol=symbol.upper(),
            interval=interval.value,
            data=ohlcv_data,
            metadata={
                "total_records": len(ohlcv_data),
                "start_date": ohlcv_data[0].timestamp if ohlcv_data else None,
                "end_date": ohlcv_data[-1].timestamp if ohlcv_data else None,
            },
        )

    except Exception as e:
        logger.error(f"Failed to fetch stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{symbol}/chart", response_model=ChartDataResponse)
async def get_chart_data(symbol: str, request: ChartDataRequest) -> ChartDataResponse:
    """Get formatted chart data with optional indicators for Highcharts."""
    try:
        # Get stock data
        ohlcv_data = await _fetch_stock_data(
            symbol=symbol,
            interval=request.interval.value,
            start_date=request.start_date,
            end_date=request.end_date,
        )

        # Format for Highcharts
        ohlcv = []
        volume = []

        for candle in ohlcv_data:
            timestamp = int(candle.timestamp.timestamp() * 1000)  # JavaScript timestamp
            ohlcv.append(
                [timestamp, candle.open, candle.high, candle.low, candle.close]
            )
            volume.append([timestamp, candle.volume])

        # Calculate indicators if requested
        indicators_data = {}
        if request.indicators and ohlcv_data:
            calculator = IndicatorCalculator(ohlcv_data)

            for indicator_req in request.indicators:
                try:
                    result = await calculator.calculate(
                        indicator=indicator_req.indicator,
                        period=indicator_req.period,
                        params=indicator_req.params,
                    )
                    indicators_data[indicator_req.indicator.value] = result
                except Exception as e:
                    logger.error(f"Failed to calculate {indicator_req.indicator}: {e}")
                    # Continue with other indicators

        return ChartDataResponse(
            symbol=symbol.upper(),
            interval=request.interval.value,
            ohlcv=ohlcv,
            volume=volume,
            indicators=indicators_data,
            metadata={
                "total_records": len(ohlcv_data),
                "start_date": ohlcv_data[0].timestamp if ohlcv_data else None,
                "end_date": ohlcv_data[-1].timestamp if ohlcv_data else None,
            },
        )

    except Exception as e:
        logger.error(f"Failed to generate chart data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """Get latest quote for a stock symbol."""
    try:
        # Get last 2 days of data
        ohlcv_data = await _fetch_stock_data(symbol=symbol, interval="1d", limit=2)

        if not ohlcv_data:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")

        current = ohlcv_data[-1]
        previous = ohlcv_data[-2] if len(ohlcv_data) > 1 else current

        change = current.close - previous.close
        change_percent = (change / previous.close) * 100 if previous.close != 0 else 0

        return {
            "symbol": symbol.upper(),
            "price": current.close,
            "open": current.open,
            "high": current.high,
            "low": current.low,
            "volume": current.volume,
            "change": round(change, 2),
            "changePercent": round(change_percent, 2),
            "timestamp": current.timestamp,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch quote for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch/quotes")
async def get_batch_quotes(symbols: List[str]) -> Dict[str, Any]:
    """Get quotes for multiple symbols."""
    quotes = {}
    errors = []

    for symbol in symbols:
        try:
            quote = await get_stock_quote(symbol)
            quotes[symbol.upper()] = quote
        except Exception as e:
            logger.error(f"Failed to fetch quote for {symbol}: {e}")
            errors.append({"symbol": symbol, "error": str(e)})

    return {
        "quotes": quotes,
        "errors": errors,
        "total": len(symbols),
        "success": len(quotes),
        "failed": len(errors),
    }


@router.get("/catalog")
async def get_stock_catalog() -> Dict[str, Any]:
    """
    Get the complete catalog of available stock data.

    Returns:
        Catalog with all symbols, their date ranges, and availability information.
    """
    try:
        response = await stock_data_client.get("/api/v1/catalog")
        result: Dict[str, Any] = response.json()
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error from stock data service: {e}")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail="Catalog not found")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Stock data service error: {e.response.text}",
        )
    except httpx.ConnectError as e:
        logger.error(f"Connection error to stock data service: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Cannot connect to stock data service at {settings.stock_data_service_url}",
        )
    except Exception as e:
        logger.error(f"Failed to fetch catalog: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch catalog from stock data service: {str(e)}",
        )


@router.get("/catalog/symbol/{symbol}")
async def get_symbol_info(symbol: str) -> Dict[str, Any]:
    """
    Get catalog information for a specific symbol.

    Args:
        symbol: Stock symbol to get information for

    Returns:
        Symbol information including date range and availability
    """
    try:
        # First get the full catalog
        catalog = await get_stock_catalog()

        # Find the specific symbol
        symbol_upper = symbol.upper()
        symbols_list: List[Dict[str, Any]] = catalog.get("symbols", [])
        for symbol_info in symbols_list:
            if symbol_info["symbol"] == symbol_upper:
                return symbol_info

        raise HTTPException(
            status_code=404, detail=f"Symbol {symbol_upper} not found in catalog"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch symbol info for {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail="Failed to fetch symbol information"
        )


@router.post("/catalog/rebuild")
async def rebuild_catalog() -> Dict[str, Any]:
    """
    Rebuild the stock data catalog by scanning all stored data.

    This is useful for:
    - Fixing inconsistencies after manual data operations
    - Initial setup after bulk data import
    - Recovering from catalog corruption

    Note: This operation may take some time for large datasets.

    Returns:
        Status and summary of the rebuild operation
    """
    try:
        # Use POST method since this is a rebuild operation, with longer timeout
        response = await stock_data_client.post(
            "/api/v1/catalog/rebuild", timeout=300.0  # 5 minute timeout for rebuild
        )
        result: Dict[str, Any] = response.json()
        return result
    except (httpx.ReadTimeout, httpx.ConnectTimeout):
        raise HTTPException(
            status_code=504,
            detail="Catalog rebuild timed out. The operation may still be running in the background.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Stock data service error: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Failed to rebuild catalog: {e}")
        raise HTTPException(status_code=500, detail="Failed to rebuild catalog")


@router.get("/available-symbols")
async def get_available_symbols() -> Dict[str, Any]:
    """
    Get a simple list of available symbols.

    This is a convenience endpoint that returns just the symbol names
    from the catalog for use in dropdowns, autocomplete, etc.

    Returns:
        List of available symbols and total count
    """
    try:
        catalog = await get_stock_catalog()
        symbols = [s["symbol"] for s in catalog.get("symbols", [])]

        return {
            "symbols": sorted(symbols),
            "count": len(symbols),
            "last_updated": catalog.get("last_updated"),
        }
    except Exception as e:
        logger.error(f"Failed to fetch available symbols: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available symbols")


@router.get("/download/{symbol}")
async def download_symbol_data(
    symbol: str,
    period: str = QueryParam(
        "1y",
        description="Download period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)",
    ),
    start_date: Optional[str] = QueryParam(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = QueryParam(None, description="End date (YYYY-MM-DD)"),
) -> Dict[str, Any]:
    """
    Download historical data for a stock symbol.

    This proxies the request to the stock-data-service download endpoint.
    """
    try:
        # Build query parameters
        params = {"period": period}
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date

        response = await stock_data_client.get(
            f"/api/v1/download/{symbol.upper()}",
            params=params,
            timeout=60.0,  # Longer timeout for downloads
        )
        result: Dict[str, Any] = response.json()
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error downloading {symbol}: {e}")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to download symbol: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Failed to download symbol {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to download symbol {symbol}"
        )


@router.post("/download/{symbol}/incremental")
async def download_incremental_symbol_data(symbol: str) -> Dict[str, Any]:
    """
    Download and append new price data to existing files.

    This proxies the request to the stock-data-service incremental download endpoint.
    Downloads from (latest_date - 1) to tomorrow to ensure no gaps.
    """
    try:
        response = await stock_data_client.post(
            f"/api/v1/download/{symbol.upper()}/incremental",
            timeout=60.0,  # Longer timeout for downloads
        )
        result: Dict[str, Any] = response.json()
        return result
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error in incremental download for {symbol}: {e}")
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        elif e.response.status_code == 400:
            raise HTTPException(
                status_code=400, detail=f"Invalid symbol format: {symbol}"
            )
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"Failed to download incremental data: {e.response.text}",
        )
    except Exception as e:
        logger.error(f"Failed to download incremental data for {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to download incremental data for {symbol}"
        )


@router.get("/{symbol}/chart")
async def get_chart_data_with_indicators(
    symbol: str,
    period: str = QueryParam(
        default="1y", description="Time period (1mo, 3mo, 6mo, 1y, 2y, 5y, max)"
    ),
    indicators: str = QueryParam(
        default="chart_basic",
        description="Indicator set (chart_basic, chart_advanced, chart_full)",
    ),
) -> Dict[str, Any]:
    """
    Get chart data with technical indicators from stock-data-service.

    This endpoint proxies to the stock-data-service chart endpoint which returns
    data optimized for charting with pre-calculated technical indicators.
    """
    try:
        # Use the shared client with authentication headers
        response = await stock_data_client.get(
            f"/api/v1/chart/{symbol}",
            params={"period": period, "indicators": indicators},
            timeout=30.0,
        )

        result: Dict[str, Any] = response.json()
        return result

    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        else:
            logger.error(
                f"Stock data service returned {e.response.status_code}: {e.response.text}"
            )
            raise HTTPException(
                status_code=e.response.status_code,
                detail="Failed to fetch chart data from stock data service",
            )
    except httpx.TimeoutException:
        logger.error(f"Timeout fetching chart data for {symbol}")
        raise HTTPException(
            status_code=504, detail="Request to stock data service timed out"
        )
    except Exception as e:
        logger.error(f"Failed to fetch chart data for {symbol}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch chart data: {str(e)}"
        )
