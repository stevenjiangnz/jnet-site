"""
Pydantic models for symbol management.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime


class SymbolListResponse(BaseModel):
    """Response model for listing symbols."""
    symbols: List[str]
    count: int


class BulkDownloadRequest(BaseModel):
    """Request model for bulk download."""
    symbols: List[str] = Field(..., min_items=1)
    start_date: date
    end_date: date


class BulkDownloadResponse(BaseModel):
    """Response model for bulk download."""
    status: str
    total_symbols: int
    successful: List[str]
    failed: List[Dict[str, str]]
    download_time: datetime


class DeleteSymbolsRequest(BaseModel):
    """Request model for deleting multiple symbols."""
    symbols: List[str] = Field(..., min_items=1)


class SymbolPriceResponse(BaseModel):
    """Response model for symbol price."""
    symbol: str
    price: Optional[float]
    change: Optional[float]
    changePercent: Optional[float]
    volume: Optional[int]
    timestamp: Optional[str]


class ChartDataPoint(BaseModel):
    """Model for a single chart data point."""
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    change: Optional[float] = None
    changePercent: Optional[float] = None


class SymbolChartResponse(BaseModel):
    """Response model for symbol chart data."""
    symbol: str
    period: str
    data: List[ChartDataPoint]
    indicators: Optional[Dict[str, List[float]]] = None