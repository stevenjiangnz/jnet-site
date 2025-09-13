from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class APIResponse(BaseModel):
    status: str
    message: Optional[str] = None
    data: Optional[Any] = None


class DownloadResponse(BaseModel):
    status: str
    symbol: str
    records: int
    start_date: str
    end_date: str
    file_path: Optional[str] = None
    weekly_processed: bool = False
    weekly_records: Optional[int] = None


class BulkDownloadResponse(BaseModel):
    status: str
    total_symbols: int
    successful: List[str]
    failed: List[Dict[str, str]]
    download_time: datetime


class SymbolListResponse(BaseModel):
    symbols: List[str]
    count: int


class ErrorResponse(BaseModel):
    error: str
    details: Optional[Any] = None
