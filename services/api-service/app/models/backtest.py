from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class BacktestStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class BacktestRequest(BaseModel):
    symbols: List[str]
    strategy_id: str
    start_date: datetime
    end_date: datetime
    initial_cash: float = 10000.0
    commission: float = 0.001
    parameters: Optional[Dict[str, Any]] = None


class BacktestResponse(BaseModel):
    id: str
    status: BacktestStatus
    message: str


class BacktestResult(BaseModel):
    id: str
    status: BacktestStatus
    metrics: Dict[str, float]
    trades: List[Dict[str, Any]]
    equity_curve: List[Dict[str, float]]
    error: Optional[str] = None
