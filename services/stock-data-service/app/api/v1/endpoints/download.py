import logging
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from app.models.stock import StockDownloadRequest, BulkDownloadRequest
from app.models.responses import DownloadResponse, BulkDownloadResponse, ErrorResponse
from app.core.data_fetcher import data_fetcher
from app.core.storage_manager import StorageManager
from app.core.exceptions import SymbolNotFoundError, DataFetchError
from app.utils.validators import validate_symbol
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/download/{symbol}", response_model=DownloadResponse)
async def download_symbol(
    symbol: str,
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)")
):
    """
    Download EOD data for a single stock symbol
    """
    # Validate symbol format
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    
    try:
        # Fetch data
        data_points = data_fetcher.fetch_stock_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date
        )
        
        # Save to storage
        file_path = StorageManager.save_stock_data(
            symbol=symbol,
            data_points=data_points,
            format=settings.default_data_format
        )
        
        return DownloadResponse(
            status="success",
            symbol=symbol.upper(),
            records=len(data_points),
            start_date=str(data_points[0].date) if data_points else "",
            end_date=str(data_points[-1].date) if data_points else "",
            file_path=file_path
        )
        
    except SymbolNotFoundError:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    except DataFetchError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error downloading {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


async def download_symbol_task(
    symbol: str,
    start_date: Optional[date],
    end_date: Optional[date],
    results: dict
):
    """Background task for downloading a single symbol"""
    try:
        data_points = data_fetcher.fetch_stock_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date
        )
        
        StorageManager.save_stock_data(
            symbol=symbol,
            data_points=data_points,
            format=settings.default_data_format
        )
        
        results['successful'].append(symbol)
        
    except Exception as e:
        logger.error(f"Failed to download {symbol}: {str(e)}")
        results['failed'].append({"symbol": symbol, "error": str(e)})


@router.post("/bulk-download", response_model=BulkDownloadResponse)
async def bulk_download(
    request: BulkDownloadRequest,
    background_tasks: BackgroundTasks
):
    """
    Download EOD data for multiple stock symbols
    """
    # Validate all symbols
    invalid_symbols = [s for s in request.symbols if not validate_symbol(s)]
    if invalid_symbols:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid symbols: {', '.join(invalid_symbols)}"
        )
    
    results = {
        'successful': [],
        'failed': []
    }
    
    # Fetch data for all symbols
    bulk_data = data_fetcher.fetch_bulk_data(
        symbols=request.symbols,
        start_date=request.start_date,
        end_date=request.end_date
    )
    
    # Save successful downloads
    for symbol, data_points in bulk_data.items():
        try:
            StorageManager.save_stock_data(
                symbol=symbol,
                data_points=data_points,
                format=settings.default_data_format
            )
            results['successful'].append(symbol)
        except Exception as e:
            results['failed'].append({"symbol": symbol, "error": str(e)})
    
    # Add failed symbols
    for symbol in request.symbols:
        if symbol not in bulk_data and symbol not in [f['symbol'] for f in results['failed']]:
            results['failed'].append({"symbol": symbol, "error": "Failed to fetch data"})
    
    return BulkDownloadResponse(
        status="completed",
        total_symbols=len(request.symbols),
        successful=results['successful'],
        failed=results['failed'],
        download_time=datetime.now()
    )