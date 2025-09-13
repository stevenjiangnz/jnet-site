from typing import Any, Dict

from pydantic import BaseModel


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
