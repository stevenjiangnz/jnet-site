from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ScanRequest(BaseModel):
    criteria: Dict[str, Any]
    limit: int = 100
    sort_by: Optional[str] = None
    sort_order: str = "desc"


class ScanResponse(BaseModel):
    symbols: List[Dict[str, Any]]
    total_count: int
    message: Optional[str] = None


class ScanPreset(BaseModel):
    id: str
    name: str
    description: str
    criteria: Dict[str, Any]
