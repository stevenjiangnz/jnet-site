import logging
from datetime import date, datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from app.models.stock import BulkDownloadRequest
from app.models.responses import DownloadResponse, BulkDownloadResponse
from app.services.download import StockDataDownloader
from app.utils.validators import validate_symbol

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/download/{symbol}", response_model=DownloadResponse)
async def download_symbol(
    symbol: str,
    period: str = Query("1y", description="Download period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)"),
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """
    Download EOD data for a single stock symbol and store in GCS
    """
    # Validate symbol format
    if not validate_symbol(symbol):
        raise HTTPException(status_code=400, detail="Invalid symbol format")

    downloader = StockDataDownloader()
    
    try:
        # Download and store data
        stock_data = await downloader.download_symbol(
            symbol=symbol,
            period=period,
            start_date=start_date,
            end_date=end_date
        )
        
        if not stock_data:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

        return DownloadResponse(
            status="success",
            symbol=stock_data.symbol,
            records=stock_data.metadata.total_records,
            start_date=str(stock_data.data_range.start),
            end_date=str(stock_data.data_range.end),
            file_path=f"gs://{stock_data.symbol}.json",  # Simplified GCS path
        )

    except Exception as e:
        logger.error(f"Error downloading {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to download data: {str(e)}")


async def download_symbol_task(
    symbol: str, period: str, start_date: Optional[date], end_date: Optional[date], results: dict
):
    """Background task for downloading a single symbol"""
    downloader = StockDataDownloader()
    
    try:
        stock_data = await downloader.download_symbol(
            symbol=symbol,
            period=period,
            start_date=start_date,
            end_date=end_date
        )
        
        if stock_data:
            results["successful"].append(symbol)
        else:
            results["failed"].append({"symbol": symbol, "error": "No data returned"})

    except Exception as e:
        logger.error(f"Failed to download {symbol}: {str(e)}")
        results["failed"].append({"symbol": symbol, "error": str(e)})


@router.post("/bulk-download", response_model=BulkDownloadResponse)
async def bulk_download(
    request: BulkDownloadRequest
):
    """
    Download EOD data for multiple stock symbols
    """
    # Validate all symbols
    invalid_symbols = [s for s in request.symbols if not validate_symbol(s)]
    if invalid_symbols:
        raise HTTPException(
            status_code=400, detail=f"Invalid symbols: {', '.join(invalid_symbols)}"
        )

    downloader = StockDataDownloader()
    
    # Use default period if no dates specified
    period = "1y" if not (request.start_date and request.end_date) else None
    
    # Download data for all symbols
    download_results = await downloader.download_multiple(
        symbols=request.symbols,
        period=period
    )
    
    # Separate successful and failed downloads
    successful = [symbol for symbol, success in download_results.items() if success]
    failed = [{"symbol": symbol, "error": "Download failed"} 
             for symbol, success in download_results.items() if not success]

    return BulkDownloadResponse(
        status="completed",
        total_symbols=len(request.symbols),
        successful=successful,
        failed=failed,
        download_time=datetime.now(),
    )
