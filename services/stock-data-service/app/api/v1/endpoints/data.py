import logging
import json
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from app.models.responses import SymbolListResponse
from app.services.download import StockDataDownloader
from app.services.simple_cache import get_cache
from app.services.cache_keys import CacheKeys
from app.config import RedisConfig
from app.utils.validators import validate_symbol
from app.indicators.indicator_sets import IndicatorSetManager

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Redis config for TTL values
redis_config = RedisConfig()


@router.get("/data/{symbol}")
async def get_symbol_data(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Start date for data range"),
    end_date: Optional[date] = Query(None, description="End date for data range"),
    indicators: Optional[str] = Query(
        None,
        description="Indicators to include (e.g., 'SMA_20,RSI_14' or 'chart_basic' or 'all')",
    ),
):
    """
    Retrieve stored data for a stock symbol from GCS with caching
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    downloader = StockDataDownloader()
    cache = get_cache()

    # Check cache first if no specific date range requested
    if not start_date and not end_date:
        cache_key = CacheKeys.daily_data(symbol)
        cached_data = await cache.get_json(cache_key)
        if cached_data:
            logger.info(f"Cache hit for {symbol} daily data")
            return JSONResponse(content=cached_data)

    # Get data from GCS
    stock_data = await downloader.get_symbol_data(symbol)

    if not stock_data:
        raise HTTPException(
            status_code=404, detail=f"No data found for symbol {symbol}"
        )

    # Filter by date range if specified
    if start_date or end_date:
        filtered_points = []
        for point in stock_data.data_points:
            if start_date and point.date < start_date:
                continue
            if end_date and point.date > end_date:
                continue
            filtered_points.append(point)
        stock_data.data_points = filtered_points

    # Convert to dict for response
    response_data = stock_data.to_dict()

    # Filter indicators if requested
    if indicators:
        requested_indicators = IndicatorSetManager.get_indicators(indicators)
        if response_data.get("indicators"):
            # Filter to only requested indicators
            filtered_indicators = {
                name: data
                for name, data in response_data["indicators"].items()
                if name in requested_indicators
            }
            response_data["indicators"] = filtered_indicators
    elif indicators == "":
        # Empty string means no indicators
        response_data.pop("indicators", None)

    # Cache the full data if no date range specified
    if not start_date and not end_date and not indicators:
        cache_key = CacheKeys.daily_data(symbol)
        await cache.set_json(
            cache_key, response_data, redis_config.cache_ttl_recent_data
        )

    return JSONResponse(content=response_data)


@router.get("/list", response_model=SymbolListResponse)
async def list_symbols():
    """
    List all symbols with available data in GCS
    """
    cache = get_cache()

    # Check cache first
    cache_key = CacheKeys.symbol_list()
    cached_symbols = await cache.get_json(cache_key)

    if cached_symbols:
        logger.info("Cache hit for symbol list")
        return SymbolListResponse(symbols=cached_symbols, count=len(cached_symbols))

    # Get from GCS
    downloader = StockDataDownloader()
    symbols = await downloader.list_available_symbols()

    # Cache the list
    await cache.set_json(cache_key, symbols, redis_config.cache_ttl_symbol_list)

    return SymbolListResponse(symbols=symbols, count=len(symbols))


@router.get("/chart/{symbol}")
async def get_chart_data(
    symbol: str,
    period: str = Query("1y", description="Time period (1mo, 3mo, 6mo, 1y, 2y, 5y)"),
    indicators: str = Query(
        "chart_basic",
        description="Indicator set (chart_basic, chart_advanced, chart_full)",
    ),
):
    """
    Get data optimized for charting with indicators in chart-friendly format
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    downloader = StockDataDownloader()

    # Get data
    stock_data = await downloader.get_symbol_data(symbol)
    if not stock_data:
        raise HTTPException(
            status_code=404, detail=f"No data found for symbol {symbol}"
        )

    # Calculate date range based on period
    end_date = date.today()
    if period == "1mo":
        start_date = end_date - timedelta(days=30)
    elif period == "3mo":
        start_date = end_date - timedelta(days=90)
    elif period == "6mo":
        start_date = end_date - timedelta(days=180)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    elif period == "2y":
        start_date = end_date - timedelta(days=730)
    elif period == "5y":
        start_date = end_date - timedelta(days=1825)
    else:
        start_date = end_date - timedelta(days=365)  # Default to 1 year

    # Filter data points by date
    filtered_points = [
        point for point in stock_data.data_points if point.date >= start_date
    ]

    # Convert to chart format
    ohlc = []
    volume = []

    for point in filtered_points:
        timestamp = int(
            datetime.combine(point.date, datetime.min.time()).timestamp() * 1000
        )
        ohlc.append([timestamp, point.open, point.high, point.low, point.close])
        volume.append([timestamp, point.volume])

    # Process indicators
    chart_indicators = {}
    requested_indicators = IndicatorSetManager.get_indicators(indicators)

    if stock_data.indicators:
        for ind_name in requested_indicators:
            if ind_name in stock_data.indicators:
                ind_data = stock_data.indicators[ind_name]
                # Convert to chart format
                chart_format = {}

                for value in ind_data.get("values", []):
                    value_date = datetime.fromisoformat(value["date"]).date()
                    if value_date >= start_date:
                        timestamp = int(
                            datetime.combine(
                                value_date, datetime.min.time()
                            ).timestamp()
                            * 1000
                        )

                        for output_name, output_value in value["values"].items():
                            if output_value is not None:
                                if output_name not in chart_format:
                                    chart_format[output_name] = []
                                chart_format[output_name].append(
                                    [timestamp, output_value]
                                )

                if chart_format:
                    chart_indicators[ind_name] = chart_format

    return {
        "symbol": symbol,
        "period": period,
        "ohlc": ohlc,
        "volume": volume,
        "indicators": chart_indicators,
    }


@router.get("/indicators")
async def list_indicators():
    """
    List all available technical indicators with their metadata
    """
    from app.indicators.config import INDICATOR_METADATA, INDICATOR_SETS

    return {
        "indicators": [
            {
                "name": name,
                "category": metadata.get("category"),
                "display_name": metadata.get("display_name"),
                "description": metadata.get("description"),
                "outputs": metadata.get("outputs", []),
            }
            for name, metadata in INDICATOR_METADATA.items()
        ],
        "indicator_sets": INDICATOR_SETS,
    }


@router.get("/data/{symbol}/latest")
async def get_latest_price(
    symbol: str,
):
    """
    Get latest price for a symbol with aggressive caching
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    cache = get_cache()
    downloader = StockDataDownloader()

    # Check cache first
    cache_key = CacheKeys.latest_price(symbol)
    cached_price = await cache.get_json(cache_key)

    if cached_price:
        logger.info(f"Cache hit for {symbol} latest price")
        return JSONResponse(content=cached_price)

    # Get full data from GCS
    stock_data = await downloader.get_symbol_data(symbol)

    if not stock_data or not stock_data.data_points:
        raise HTTPException(
            status_code=404, detail=f"No data found for symbol {symbol}"
        )

    # Get latest data point
    latest = stock_data.data_points[-1]
    latest_price = {
        "symbol": symbol.upper(),
        "date": latest.date.isoformat(),
        "price": latest.close,
        "open": latest.open,
        "high": latest.high,
        "low": latest.low,
        "volume": latest.volume,
        "change": round(latest.close - latest.open, 2),
        "change_percent": round(((latest.close - latest.open) / latest.open) * 100, 2),
    }

    # Cache with short TTL
    await cache.set_json(cache_key, latest_price, redis_config.cache_ttl_latest_price)

    return JSONResponse(content=latest_price)


@router.get("/data/{symbol}/recent")
async def get_recent_data(
    symbol: str,
    days: int = Query(
        300, ge=1, le=3650, description="Number of recent days (default: 300)"
    ),
    start_date: Optional[date] = Query(None, description="Start date for data range"),
    end_date: Optional[date] = Query(None, description="End date for data range"),
):
    """
    Get recent data for a symbol with caching.

    Can be used in two ways:
    1. With 'days' parameter - returns last N days of data
    2. With 'start_date' and/or 'end_date' - returns data within date range

    If both are provided, date range takes precedence.
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    cache = get_cache()
    downloader = StockDataDownloader()

    # Determine cache key based on parameters
    if start_date or end_date:
        cache_key = f"data:recent:{symbol}:{start_date}:{end_date}"
    else:
        cache_key = CacheKeys.recent_data(symbol, days)

    cached_data = await cache.get_json(cache_key)

    if cached_data:
        logger.info(f"Cache hit for {symbol} recent data")
        return JSONResponse(content=cached_data)

    # Get full data from GCS
    stock_data = await downloader.get_symbol_data(symbol)

    if not stock_data or not stock_data.data_points:
        raise HTTPException(
            status_code=404, detail=f"No data found for symbol {symbol}"
        )

    # Filter data based on parameters
    if start_date or end_date:
        # Use date range filtering
        recent_points = []
        for p in stock_data.data_points:
            if start_date and p.date < start_date:
                continue
            if end_date and p.date > end_date:
                continue
            recent_points.append(p)
    else:
        # Use days filtering
        cutoff_date = datetime.now().date() - timedelta(days=days)
        recent_points = [p for p in stock_data.data_points if p.date >= cutoff_date]

    # Convert data points to JSON-serializable format
    data_points_json = []
    for point in recent_points:
        data_points_json.append(
            {
                "date": point.date.isoformat(),
                "open": point.open,
                "high": point.high,
                "low": point.low,
                "close": point.close,
                "adj_close": point.adj_close,
                "volume": point.volume,
            }
        )

    response = {
        "symbol": symbol.upper(),
        "days": days if not (start_date or end_date) else None,
        "data_points": data_points_json,
        "start_date": recent_points[0].date.isoformat() if recent_points else None,
        "end_date": recent_points[-1].date.isoformat() if recent_points else None,
        "record_count": len(recent_points),
    }

    # Cache with medium TTL
    await cache.set_json(cache_key, response, redis_config.cache_ttl_recent_data)

    return JSONResponse(content=response)


@router.get("/weekly/{symbol}")
async def get_weekly_data(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Start date for data range"),
    end_date: Optional[date] = Query(None, description="End date for data range"),
):
    """
    Retrieve weekly aggregated data for a stock symbol
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    downloader = StockDataDownloader()
    cache = get_cache()

    # Check cache first if no specific date range requested
    if not start_date and not end_date:
        cache_key = CacheKeys.weekly_data(symbol)
        cached_data = await cache.get_json(cache_key)
        if cached_data:
            logger.info(f"Cache hit for {symbol} weekly data")
            return JSONResponse(content=cached_data)

    # Get weekly data from GCS
    weekly_data = await downloader.get_weekly_data(symbol)

    if not weekly_data:
        raise HTTPException(
            status_code=404, detail=f"No weekly data found for symbol {symbol}"
        )

    # Filter by date range if specified
    if start_date or end_date:
        filtered_points = []
        for point in weekly_data.data_points:
            if start_date and point.week_ending < start_date:
                continue
            if end_date and point.week_start > end_date:
                continue
            filtered_points.append(point)
        weekly_data.data_points = filtered_points

    # Convert to dict for response
    response_data = weekly_data.to_dict()

    # Cache the full data if no date range specified
    if not start_date and not end_date:
        cache_key = CacheKeys.weekly_data(symbol)
        await cache.set_json(
            cache_key, response_data, redis_config.cache_ttl_recent_data
        )

    return JSONResponse(content=response_data)


@router.get("/weekly/{symbol}/latest")
async def get_latest_weekly(symbol: str):
    """
    Get the latest weekly data point for a symbol
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    cache = get_cache()
    downloader = StockDataDownloader()

    # Check cache first
    cache_key = f"weekly:latest:{symbol}"
    cached_data = await cache.get_json(cache_key)

    if cached_data:
        logger.info(f"Cache hit for {symbol} latest weekly data")
        return JSONResponse(content=cached_data)

    # Get weekly data from GCS
    weekly_data = await downloader.get_weekly_data(symbol)

    if not weekly_data or not weekly_data.data_points:
        raise HTTPException(
            status_code=404, detail=f"No weekly data found for symbol {symbol}"
        )

    # Get latest week
    latest = weekly_data.data_points[-1]
    latest_weekly = {
        "symbol": symbol.upper(),
        "week_start": latest.week_start.isoformat(),
        "week_ending": latest.week_ending.isoformat(),
        "open": latest.open,
        "high": latest.high,
        "low": latest.low,
        "close": latest.close,
        "adj_close": latest.adj_close,
        "volume": latest.volume,
        "trading_days": latest.trading_days,
        "change": round(latest.close - latest.open, 2),
        "change_percent": round(((latest.close - latest.open) / latest.open) * 100, 2),
    }

    # Cache with medium TTL
    await cache.set_json(cache_key, latest_weekly, redis_config.cache_ttl_recent_data)

    return JSONResponse(content=latest_weekly)
