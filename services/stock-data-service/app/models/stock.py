from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class StockDataPoint(BaseModel):
    date: date
    open: float
    high: float
    low: float
    close: float
    adj_close: float = Field(alias="adj_close")
    volume: int
    
    class Config:
        populate_by_name = True


class StockDownloadRequest(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @field_validator('end_date')
    def validate_end_date(cls, v, values):
        if v and 'start_date' in values.data and values.data['start_date']:
            if v < values.data['start_date']:
                raise ValueError('end_date must be after start_date')
        return v


class BulkDownloadRequest(BaseModel):
    symbols: List[str] = Field(..., min_items=1, max_items=50)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    
    @field_validator('symbols')
    def validate_symbols(cls, v):
        return [symbol.upper().strip() for symbol in v]


class SymbolData(BaseModel):
    symbol: str
    data_points: List[StockDataPoint]
    download_date: datetime
    start_date: date
    end_date: date
    total_records: int