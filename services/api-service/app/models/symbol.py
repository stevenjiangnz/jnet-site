"""
Pydantic models for symbol management.
"""

from datetime import date, datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class SymbolListResponse(BaseModel):
    """Response model for listing symbols."""

    symbols: List[str]
    count: int


class BulkDownloadRequest(BaseModel):
    """Request model for bulk download."""

    symbols: List[str] = Field(..., min_length=1)
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

    symbols: List[str] = Field(..., min_length=1)


class SymbolPriceResponse(BaseModel):
    """Response model for symbol price."""

    symbol: str
    price: Optional[float]
    change: Optional[float]
    change_percent: Optional[float] = Field(None, alias="changePercent")
    volume: Optional[int]
    timestamp: Optional[str]

    model_config = {"populate_by_name": True}


class ChartDataPoint(BaseModel):
    """Model for a single chart data point."""

    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    change: Optional[float] = None
    change_percent: Optional[float] = Field(None, alias="changePercent")

    model_config = {"populate_by_name": True}


class SymbolChartResponse(BaseModel):
    """Response model for symbol chart data."""

    symbol: str
    period: str
    data: List[ChartDataPoint]
    indicators: Optional[Dict[str, List[float]]] = None
