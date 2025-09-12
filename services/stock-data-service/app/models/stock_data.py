"""Data models for stock data storage."""

from datetime import date, datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class StockDataPoint(BaseModel):
    """Model for a single day's stock data."""
    date: date
    open: float = Field(gt=0, description="Opening price")
    high: float = Field(gt=0, description="Highest price")
    low: float = Field(gt=0, description="Lowest price")
    close: float = Field(gt=0, description="Closing price")
    adj_close: float = Field(gt=0, description="Adjusted closing price")
    volume: int = Field(ge=0, description="Trading volume")
    
    @validator('high')
    def high_must_be_highest(cls, v, values):
        """Validate that high is >= open and close."""
        if 'open' in values and v < values['open']:
            raise ValueError('High must be >= open')
        if 'close' in values and v < values['close']:
            raise ValueError('High must be >= close')
        return v
    
    @validator('low')
    def low_must_be_lowest(cls, v, values):
        """Validate that low is <= open and close."""
        if 'open' in values and v > values['open']:
            raise ValueError('Low must be <= open')
        if 'close' in values and v > values['close']:
            raise ValueError('Low must be <= close')
        if 'high' in values and v > values['high']:
            raise ValueError('Low must be <= high')
        return v


class DataRange(BaseModel):
    """Model for date range information."""
    start: date
    end: date
    
    @validator('end')
    def end_after_start(cls, v, values):
        """Validate that end date is after or equal to start date."""
        if 'start' in values and v < values['start']:
            raise ValueError('End date must be >= start date')
        return v


class DataMetadata(BaseModel):
    """Model for stock data metadata."""
    total_records: int = Field(ge=0)
    missing_dates: List[date] = Field(default_factory=list)
    data_source: str = "yahoo_finance"
    version: str = "1.0"


class StockDataFile(BaseModel):
    """Model for complete stock data file stored in GCS."""
    symbol: str
    data_type: str = "daily"
    last_updated: datetime
    data_range: DataRange
    data_points: List[StockDataPoint]
    metadata: DataMetadata
    
    @validator('symbol')
    def symbol_uppercase(cls, v):
        """Ensure symbol is uppercase."""
        return v.upper()
    
    @validator('data_type')
    def valid_data_type(cls, v):
        """Validate data type."""
        valid_types = ["daily", "weekly"]
        if v not in valid_types:
            raise ValueError(f"data_type must be one of {valid_types}")
        return v
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return self.dict(mode='json')


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
    
    @validator('week_ending')
    def validate_week_ending(cls, v, values):
        """Validate that week_ending is after week_start."""
        if 'week_start' in values:
            expected_diff = (v - values['week_start']).days
            if expected_diff < 0 or expected_diff > 6:
                raise ValueError('Week ending must be 0-6 days after week start')
        return v


class WeeklyMetadata(BaseModel):
    """Model for weekly data metadata."""
    total_records: int = Field(ge=0)
    aggregation_method: str = "ohlcv"
    source_data: str = "daily"
    version: str = "1.0"


class WeeklyDataFile(BaseModel):
    """Model for weekly stock data file."""
    symbol: str
    data_type: str = "weekly"
    last_updated: datetime
    data_range: DataRange
    data_points: List[WeeklyDataPoint]
    metadata: WeeklyMetadata