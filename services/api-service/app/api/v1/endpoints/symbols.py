"""
Symbol management endpoints that proxy to stock-data-service.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.symbol import (
    BulkDownloadRequest,
    BulkDownloadResponse,
    DeleteSymbolsRequest,
    SymbolChartResponse,
    SymbolListResponse,
    SymbolPriceResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# Stock data service URL
STOCK_SERVICE_URL = settings.stock_data_service_url or "http://stock-data-service:9000"


@router.get("/list", response_model=SymbolListResponse)
async def list_symbols():
    """List all available symbols."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{STOCK_SERVICE_URL}/api/v1/list", timeout=30.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Error listing symbols: {e}")
        raise HTTPException(status_code=500, detail="Failed to list symbols")


@router.post("/add")
async def add_symbol(symbol: str = Query(..., description="Stock symbol to add")):
    """Add a new symbol by downloading its data."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{STOCK_SERVICE_URL}/api/v1/download/{symbol.upper()}", timeout=60.0
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error adding symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add symbol {symbol}")


@router.post("/bulk-download", response_model=BulkDownloadResponse)
async def bulk_download(request: BulkDownloadRequest):
    """Download data for multiple symbols with date range."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{STOCK_SERVICE_URL}/api/v1/bulk-download",
                json=request.dict(),
                timeout=300.0,  # 5 minutes for bulk operations
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error(f"Error in bulk download: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform bulk download")


@router.delete("/{symbol}")
async def delete_symbol(symbol: str):
    """Delete a single symbol's data."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{STOCK_SERVICE_URL}/api/v1/symbol/{symbol.upper()}", timeout=30.0
            )
            response.raise_for_status()
            return {"message": f"Symbol {symbol} deleted successfully"}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error deleting symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete symbol {symbol}")


@router.delete("/bulk", status_code=200)
async def delete_symbols(request: DeleteSymbolsRequest):
    """Delete multiple symbols' data."""
    try:
        async with httpx.AsyncClient() as client:
            # The stock-data-service expects a list in the body
            response = await client.request(
                "DELETE",
                f"{STOCK_SERVICE_URL}/api/v1/symbols",
                json=request.symbols,
                timeout=60.0,
            )
            response.raise_for_status()
            return {"message": f"Deleted {len(request.symbols)} symbols successfully"}
    except httpx.HTTPError as e:
        logger.error(f"Error deleting symbols: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete symbols")


@router.get("/{symbol}/price", response_model=SymbolPriceResponse)
async def get_symbol_price(symbol: str):
    """Get latest price for a symbol."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{STOCK_SERVICE_URL}/api/v1/data/{symbol.upper()}/latest", timeout=30.0
            )
            response.raise_for_status()
            data = response.json()

            # Transform the response to our model
            if isinstance(data, list) and len(data) > 0:
                latest = data[0]
                return SymbolPriceResponse(
                    symbol=symbol.upper(),
                    price=latest.get("close"),
                    change=latest.get("change"),
                    changePercent=latest.get("change_percent"),
                    volume=latest.get("volume"),
                    timestamp=latest.get("date"),
                )
            else:
                raise HTTPException(
                    status_code=404, detail=f"No price data for symbol {symbol}"
                )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error getting price for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get price for {symbol}")


@router.get("/{symbol}/chart", response_model=SymbolChartResponse)
async def get_symbol_chart(
    symbol: str,
    period: Optional[str] = Query(
        "1M", description="Time period: 1D, 1W, 1M, 3M, 6M, 1Y"
    ),
    indicators: Optional[List[str]] = Query(
        None, description="Technical indicators to include"
    ),
):
    """Get chart data for a symbol."""
    try:
        async with httpx.AsyncClient() as client:
            params: Dict[str, Any] = {"period": period}
            if indicators:
                params["indicators"] = ",".join(indicators)

            response = await client.get(
                f"{STOCK_SERVICE_URL}/api/v1/chart/{symbol.upper()}",
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error getting chart for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chart for {symbol}")
