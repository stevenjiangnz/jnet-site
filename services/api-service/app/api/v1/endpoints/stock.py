from fastapi import APIRouter, HTTPException
from fastapi import Query as QueryParam
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging

from app.models.stock import (
    StockDataRequest, 
    StockDataResponse,
    ChartDataRequest,
    ChartDataResponse,
    OHLCV,
    Interval
)
from app.services.stock_data import StockDataService
from app.core.analysis.indicators import IndicatorCalculator


router = APIRouter()
logger = logging.getLogger(__name__)


async def _fetch_stock_data(
    symbol: str,
    interval: str = "1d",
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: Optional[int] = None
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
            interval=interval
        )
    finally:
        await stock_service.close()
    
    # Convert to OHLCV format
    ohlcv_data = []
    for item in data:
        ohlcv_data.append(OHLCV(
            timestamp=datetime.fromisoformat(item["date"]),
            open=item["open"],
            high=item["high"],
            low=item["low"],
            close=item["close"],
            volume=item["volume"]
        ))
    
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
    limit: Optional[int] = QueryParam(default=500)
) -> StockDataResponse:
    """Get raw OHLCV data for a stock symbol."""
    try:
        ohlcv_data = await _fetch_stock_data(
            symbol=symbol,
            interval=interval.value,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )
        
        return StockDataResponse(
            symbol=symbol.upper(),
            interval=interval.value,
            data=ohlcv_data,
            metadata={
                "total_records": len(ohlcv_data),
                "start_date": ohlcv_data[0].timestamp if ohlcv_data else None,
                "end_date": ohlcv_data[-1].timestamp if ohlcv_data else None
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to fetch stock data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{symbol}/chart", response_model=ChartDataResponse)
async def get_chart_data(
    symbol: str,
    request: ChartDataRequest
) -> ChartDataResponse:
    """Get formatted chart data with optional indicators for Highcharts."""
    try:
        # Get stock data
        ohlcv_data = await _fetch_stock_data(
            symbol=symbol,
            interval=request.interval.value,
            start_date=request.start_date,
            end_date=request.end_date
        )
        
        # Format for Highcharts
        ohlcv = []
        volume = []
        
        for candle in ohlcv_data:
            timestamp = int(candle.timestamp.timestamp() * 1000)  # JavaScript timestamp
            ohlcv.append([
                timestamp,
                candle.open,
                candle.high,
                candle.low,
                candle.close
            ])
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
                        params=indicator_req.params
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
                "end_date": ohlcv_data[-1].timestamp if ohlcv_data else None
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to generate chart data for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/quote")
async def get_stock_quote(symbol: str) -> Dict[str, Any]:
    """Get latest quote for a stock symbol."""
    try:
        # Get last 2 days of data
        ohlcv_data = await _fetch_stock_data(
            symbol=symbol,
            interval="1d",
            limit=2
        )
        
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
            "timestamp": current.timestamp
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
        "failed": len(errors)
    }