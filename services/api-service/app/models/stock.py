from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum


class Interval(str, Enum):
    ONE_MIN = "1m"
    FIVE_MIN = "5m"
    FIFTEEN_MIN = "15m"
    THIRTY_MIN = "30m"
    ONE_HOUR = "1h"
    FOUR_HOUR = "4h"
    ONE_DAY = "1d"
    ONE_WEEK = "1w"
    ONE_MONTH = "1mo"


class IndicatorType(str, Enum):
    SMA = "sma"
    EMA = "ema"
    RSI = "rsi"
    MACD = "macd"
    BB = "bollinger_bands"
    VOLUME = "volume"
    ATR = "atr"
    STOCH = "stochastic"
    ADX = "adx"
    OBV = "obv"


class OHLCV(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int


class StockDataRequest(BaseModel):
    symbol: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    interval: Interval = Interval.ONE_DAY
    
    
class IndicatorRequest(BaseModel):
    indicator: IndicatorType
    period: Optional[int] = None
    params: Optional[Dict[str, Any]] = None


class ChartDataRequest(BaseModel):
    symbol: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    interval: Interval = Interval.ONE_DAY
    indicators: Optional[List[IndicatorRequest]] = None


class StockDataResponse(BaseModel):
    symbol: str
    interval: str
    data: List[OHLCV]
    metadata: Optional[Dict[str, Any]] = None


class IndicatorData(BaseModel):
    name: str
    type: IndicatorType
    data: List[Dict[str, Any]]  # Flexible structure for different indicators
    params: Dict[str, Any]


class ChartDataResponse(BaseModel):
    symbol: str
    interval: str
    ohlcv: List[List[Any]]  # Highcharts format: [[timestamp, open, high, low, close]]
    volume: List[List[Any]]  # [[timestamp, volume]]
    indicators: Optional[Dict[str, Any]] = None  # Indicator name -> data
    metadata: Optional[Dict[str, Any]] = None