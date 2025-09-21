from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel


class EventSource(str, Enum):
    API_SERVICE = "api-service"
    STOCK_DATA_SERVICE = "stock-data-service"
    FRONTEND = "frontend"
    BACKGROUND_JOB = "background-job"
    SYSTEM = "system"


class OperationType(str, Enum):
    # Data Operations
    STOCK_PRICE_DOWNLOAD = "stock_price_download"
    STOCK_DATA_RETRIEVAL = "stock_data_retrieval"
    SCAN_PROCESS = "scan_process"
    SCAN_CRITERIA_UPDATE = "scan_criteria_update"

    # Maintenance
    DATA_CLEANUP = "data_cleanup"
    CACHE_REFRESH = "cache_refresh"

    # User Actions
    USER_LOGIN = "user_login"
    CONFIG_UPDATE = "config_update"
    PORTFOLIO_UPDATE = "portfolio_update"

    # System
    SERVICE_START = "service_start"
    SERVICE_STOP = "service_stop"
    HEALTH_CHECK = "health_check"


class OperationResult(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"


class AuditEventBase(BaseModel):
    source: EventSource
    operator: Optional[str] = None
    operation_type: str
    result: OperationResult
    message: Optional[str] = None
    extra_info: Optional[Dict[str, Any]] = None


class AuditEventCreate(AuditEventBase):
    pass


class AuditEvent(AuditEventBase):
    id: UUID
    timestamp: datetime

    class Config:
        orm_mode = True


class AuditEventFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    operation_type: Optional[str] = None
    result: Optional[OperationResult] = None
    source: Optional[EventSource] = None
    limit: int = 100
    offset: int = 0


class AuditEventResponse(BaseModel):
    events: List[AuditEvent]
    total: int
