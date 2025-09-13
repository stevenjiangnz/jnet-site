from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime


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