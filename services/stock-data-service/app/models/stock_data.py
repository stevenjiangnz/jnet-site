"""Data models for stock data storage."""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class StockDataPoint(BaseModel):
    """Model for a single day's stock data."""
    date: date
    open: float = Field(gt=0, description="Opening price")
    high: float = Field(gt=0, description="Highest price")
    low: float = Field(gt=0, description="Lowest price")
    close: float = Field(gt=0, description="Closing price")
    adj_close: float = Field(gt=0, description="Adjusted closing price")
    volume: int = Field(ge=0, description="Trading volume")
    
    @field_validator('high')
    @classmethod
    def high_must_be_highest(cls, v: float, info) -> float:
        """Validate that high is >= open and close."""
        values = info.data
        if 'open' in values and v < values['open']:
            raise ValueError('High must be >= open')
        if 'close' in values and v < values['close']:
            raise ValueError('High must be >= close')
        return v
    
    @field_validator('low')
    @classmethod
    def low_must_be_lowest(cls, v: float, info) -> float:
        """Validate that low is <= open and close."""
        values = info.data
        if 'open' in values and v > values['open']:
            raise ValueError('Low must be <= open')
        if 'close' in values and v > values['close']:
            raise ValueError('Low must be <= close')
        return v
    
    class Config:
        json_encoders = {
            date: lambda v: v.isoformat(),
            datetime: lambda v: v.isoformat()
        }


class DataRange(BaseModel):
    """Model for date range of stock data."""
    start: date
    end: date
    
    @field_validator('end')
    @classmethod
    def end_after_start(cls, v: date, info) -> date:
        """Validate that end date is after start date."""
        values = info.data
        if 'start' in values and v < values['start']:
            raise ValueError('End date must be after start date')
        return v


class StockMetadata(BaseModel):
    """Metadata for stock data file."""
    total_records: int = Field(ge=0)
    trading_days: int = Field(ge=0)
    source: str = "yahoo_finance"
    
    
class StockDataFile(BaseModel):
    """Complete stock data file structure."""
    symbol: str = Field(min_length=1, max_length=10)
    data_points: List[StockDataPoint]
    data_range: DataRange
    metadata: StockMetadata
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    data_type: str = "daily"
    
    @field_validator('symbol')
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        """Ensure symbol is uppercase."""
        return v.upper()
    
    @field_validator('data_type')
    @classmethod
    def valid_data_type(cls, v: str) -> str:
        """Validate data type."""
        valid_types = ["daily", "weekly"]
        if v not in valid_types:
            raise ValueError(f"data_type must be one of {valid_types}")
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return self.model_dump(mode='json')


class WeeklyDataPoint(BaseModel):
    """Model for weekly aggregated stock data."""
    week_ending: date = Field(description="Friday date")
    week_start: date = Field(description="Monday date")
    open: float = Field(gt=0)
    high: float = Field(gt=0)
    low: float = Field(gt=0)
    close: float = Field(gt=0)
    adj_close: float = Field(gt=0)
    volume: int = Field(ge=0)
    trading_days: int = Field(ge=1, le=5, description="Number of trading days in the week")
    
    @field_validator('week_ending')
    @classmethod
    def week_ending_is_friday(cls, v: date) -> date:
        """Validate that week ending is a Friday."""
        if v.weekday() != 4:  # Friday = 4
            raise ValueError('Week ending must be a Friday')
        return v
    
    @field_validator('week_start')
    @classmethod
    def week_start_is_monday(cls, v: date) -> date:
        """Validate that week start is a Monday."""
        if v.weekday() != 0:  # Monday = 0
            raise ValueError('Week start must be a Monday')
        return v


class WeeklyDataFile(BaseModel):
    """Complete weekly aggregated stock data file."""
    symbol: str = Field(min_length=1, max_length=10)
    data_points: List[WeeklyDataPoint]
    data_range: DataRange
    metadata: StockMetadata
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    data_type: str = "weekly"
    
    @field_validator('symbol')
    @classmethod
    def symbol_uppercase(cls, v: str) -> str:
        """Ensure symbol is uppercase."""
        return v.upper()