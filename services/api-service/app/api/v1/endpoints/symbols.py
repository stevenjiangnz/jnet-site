"""
Symbol management endpoints that proxy to stock-data-service.
"""

import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.core.http_client import stock_data_client
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


@router.get("/list", response_model=SymbolListResponse)
async def list_symbols() -> SymbolListResponse:
    """List all available symbols."""
    try:
        response = await stock_data_client.get("/api/v1/list")
        data = response.json()
        return SymbolListResponse(**data)
    except httpx.HTTPError as e:
        logger.error(f"Error listing symbols: {e}")
        raise HTTPException(status_code=500, detail="Failed to list symbols")


@router.post("/add")
async def add_symbol(
    symbol: str = Query(..., description="Stock symbol to add")
) -> Dict[str, Any]:
    """Add a new symbol by downloading its data."""
    try:
        response = await stock_data_client.get(
            f"/api/v1/download/{symbol.upper()}",
            params={"period": "max"},
            timeout=60.0,
        )
        return response.json()  # type: ignore[no-any-return]
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error adding symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add symbol {symbol}")


@router.post("/bulk-download", response_model=BulkDownloadResponse)
async def bulk_download(request: BulkDownloadRequest) -> BulkDownloadResponse:
    """Download data for multiple symbols with date range."""
    try:
        response = await stock_data_client.post(
            "/api/v1/bulk-download",
            json=request.dict(),
            timeout=300.0,  # 5 minutes for bulk operations
        )
        data = response.json()
        return BulkDownloadResponse(**data)
    except httpx.HTTPError as e:
        logger.error(f"Error in bulk download: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform bulk download")


@router.delete("/{symbol}")
async def delete_symbol(symbol: str) -> Dict[str, str]:
    """Delete a single symbol's data."""
    try:
        await stock_data_client.delete(f"/api/v1/symbol/{symbol.upper()}")
        return {"message": f"Symbol {symbol} deleted successfully"}
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error deleting symbol {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete symbol {symbol}")


@router.delete("/bulk", status_code=200)
async def delete_symbols(request: DeleteSymbolsRequest) -> Dict[str, str]:
    """Delete multiple symbols' data."""
    try:
        # The stock-data-service expects a list in the body
        await stock_data_client.request(
            "DELETE",
            "/api/v1/symbols",
            json=request.symbols,
            timeout=60.0,
        )
        return {"message": f"Deleted {len(request.symbols)} symbols successfully"}
    except httpx.HTTPError as e:
        logger.error(f"Error deleting symbols: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete symbols")


@router.get("/{symbol}/price", response_model=SymbolPriceResponse)
async def get_symbol_price(symbol: str) -> SymbolPriceResponse:
    """Get latest price for a symbol."""
    try:
        response = await stock_data_client.get(f"/api/v1/data/{symbol.upper()}/latest")
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
) -> SymbolChartResponse:
    """Get chart data for a symbol."""
    try:
        params: Dict[str, Any] = {"period": period}
        if indicators:
            params["indicators"] = ",".join(indicators)

        response = await stock_data_client.get(
            f"/api/v1/chart/{symbol.upper()}",
            params=params,
        )
        data = response.json()
        return SymbolChartResponse(**data)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        raise HTTPException(status_code=e.response.status_code, detail=str(e))
    except httpx.HTTPError as e:
        logger.error(f"Error getting chart for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get chart for {symbol}")
