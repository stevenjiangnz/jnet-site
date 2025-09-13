from pydantic import BaseModel
from typing import Dict, Any, Optional


class Strategy(BaseModel):
    id: str
    name: str
    description: str
    parameters: Dict[str, Any]


class StrategyRequest(BaseModel):
    name: str
    description: str
    code: str
    parameters: Dict[str, Any]