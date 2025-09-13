from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel


class AlertType(str, Enum):
    PRICE = "price"
    VOLUME = "volume"
    INDICATOR = "indicator"
    PATTERN = "pattern"


class AlertCondition(str, Enum):
    ABOVE = "above"
    BELOW = "below"
    CROSSES_ABOVE = "crosses_above"
    CROSSES_BELOW = "crosses_below"


class AlertRequest(BaseModel):
    symbol: str
    alert_type: AlertType
    condition: AlertCondition
    value: float
    indicator: Optional[str] = None
    enabled: bool = True


class AlertResponse(BaseModel):
    id: str
    message: str


class Alert(AlertRequest):
    id: str
    created_at: datetime = datetime.utcnow()
    triggered_count: int = 0
    last_triggered: Optional[datetime] = None
