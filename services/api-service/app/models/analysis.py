from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class SignalRequest(BaseModel):
    symbol: str
    timeframe: str = "1d"
    indicators: List[str]


class Signal(BaseModel):
    indicator: str
    value: float
    signal: str  # "buy", "sell", "neutral"
    strength: float  # 0-1


class SignalResponse(BaseModel):
    symbol: str
    signals: List[Signal]
    timestamp: Optional[datetime] = None
