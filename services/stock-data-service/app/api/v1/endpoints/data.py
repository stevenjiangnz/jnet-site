import logging
import json
from datetime import date, datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from app.models.responses import SymbolListResponse
from app.services.download import StockDataDownloader
from app.services.simple_cache import get_cache
from app.services.cache_keys import CacheKeys
from app.config.redis_config import (
    CACHE_TTL_LATEST_PRICE,
    CACHE_TTL_RECENT_DATA,
    CACHE_TTL_SYMBOL_LIST
)
from app.utils.validators import validate_symbol

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/data/{symbol}")
async def get_symbol_data(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Start date for data range"),
    end_date: Optional[date] = Query(None, description="End date for data range"),
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
    
    # Cache the full data if no date range specified
    if not start_date and not end_date:
        cache_key = CacheKeys.daily_data(symbol)
        await cache.set_json(cache_key, response_data, CACHE_TTL_RECENT_DATA)
    
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
    await cache.set_json(cache_key, symbols, CACHE_TTL_SYMBOL_LIST)

    return SymbolListResponse(symbols=symbols, count=len(symbols))


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
        "change_percent": round(((latest.close - latest.open) / latest.open) * 100, 2)
    }
    
    # Cache with short TTL
    await cache.set_json(cache_key, latest_price, CACHE_TTL_LATEST_PRICE)
    
    return JSONResponse(content=latest_price)


@router.get("/data/{symbol}/recent")
async def get_recent_data(
    symbol: str,
    days: int = Query(30, ge=1, le=365, description="Number of recent days")
):
    """
    Get recent data for a symbol with caching
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    cache = get_cache()
    downloader = StockDataDownloader()
    
    # Check cache
    cache_key = CacheKeys.recent_data(symbol, days)
    cached_data = await cache.get_json(cache_key)
    
    if cached_data:
        logger.info(f"Cache hit for {symbol} recent {days} days")
        return JSONResponse(content=cached_data)
    
    # Get full data from GCS
    stock_data = await downloader.get_symbol_data(symbol)
    
    if not stock_data or not stock_data.data_points:
        raise HTTPException(
            status_code=404, detail=f"No data found for symbol {symbol}"
        )
    
    # Filter to recent days
    cutoff_date = datetime.now().date() - timedelta(days=days)
    recent_points = [p for p in stock_data.data_points if p.date >= cutoff_date]
    
    response = {
        "symbol": symbol.upper(),
        "days": days,
        "data_points": [p.dict() for p in recent_points],
        "start_date": recent_points[0].date.isoformat() if recent_points else None,
        "end_date": recent_points[-1].date.isoformat() if recent_points else None,
        "record_count": len(recent_points)
    }
    
    # Cache with medium TTL
    await cache.set_json(cache_key, response, CACHE_TTL_RECENT_DATA)
    
    return JSONResponse(content=response)
