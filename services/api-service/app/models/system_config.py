from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class SystemConfigBase(BaseModel):
    category: str
    key: str
    value: Any
    description: Optional[str] = None
    is_active: bool = True


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfigUpdate(BaseModel):
    value: Optional[Any] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class SystemConfig(SystemConfigBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemConfigResponse(BaseModel):
    config: SystemConfig
    message: str = "Configuration retrieved successfully"
