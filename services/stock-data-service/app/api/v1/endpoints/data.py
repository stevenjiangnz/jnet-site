import logging
import os
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from app.models.responses import SymbolListResponse, ErrorResponse
from app.core.storage_manager import StorageManager
from app.utils.validators import validate_symbol

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/data/{symbol}")
async def get_symbol_data(
    symbol: str,
    format: Optional[str] = Query("json", regex="^(json|csv)$", description="Output format")
):
    """
    Retrieve stored data for a stock symbol
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    # Get latest file
    file_path = StorageManager.get_latest_file(symbol, format)
    
    if not file_path:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for symbol {symbol}"
        )
    
    # Return file
    if format == "csv":
        return FileResponse(
            path=file_path,
            media_type="text/csv",
            filename=os.path.basename(file_path)
        )
    else:
        # Load and return JSON data
        symbol_data = StorageManager.load_stock_data(file_path)
        if not symbol_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to load data"
            )
        return JSONResponse(content=symbol_data.model_dump(mode='json'))


@router.get("/list", response_model=SymbolListResponse)
async def list_symbols():
    """
    List all symbols with available data
    """
    symbols = StorageManager.list_available_symbols()
    
    return SymbolListResponse(
        symbols=symbols,
        count=len(symbols)
    )


@router.delete("/data/{symbol}")
async def delete_symbol_data(symbol: str):
    """
    Delete all stored data for a symbol
    """
    # Validate symbol
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    success = StorageManager.delete_symbol_data(symbol)
    
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for symbol {symbol}"
        )
    
    return {"status": "success", "message": f"Deleted all data for {symbol}"}