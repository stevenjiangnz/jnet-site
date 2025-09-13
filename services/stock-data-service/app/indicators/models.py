"""Pydantic models for technical indicators."""

from datetime import date
from typing import Dict, List, Any, Optional
from pydantic import BaseModel, Field


class IndicatorValue(BaseModel):
    """Single indicator value for a specific date."""

    date: date
    values: Dict[str, Optional[float]] = Field(
        description="Indicator values, e.g., {'MACD': 1.23, 'signal': 1.08, 'histogram': 0.15}"
    )

    class Config:
        json_encoders = {date: lambda v: v.isoformat()}


class IndicatorData(BaseModel):
    """Complete indicator data including metadata and values."""

    name: str = Field(description="Indicator identifier, e.g., 'RSI_14'")
    display_name: str = Field(description="Human-readable name")
    category: str = Field(
        description="Category: trend, momentum, volatility, or volume"
    )
    parameters: Dict[str, Any] = Field(
        default_factory=dict, description="Indicator parameters, e.g., {'period': 14}"
    )
    values: List[IndicatorValue] = Field(
        default_factory=list, description="Time series of indicator values"
    )

    def to_chart_format(self) -> Dict[str, List[List[Any]]]:
        """Convert to format optimized for charting libraries.

        Returns dict with output names as keys and [[timestamp, value], ...] as values.
        """
        result = {}

        for value in self.values:
            timestamp = int(date.fromisoformat(str(value.date)).strftime("%s")) * 1000
            for output_name, output_value in value.values.items():
                if output_name not in result:
                    result[output_name] = []
                if output_value is not None:
                    result[output_name].append([timestamp, output_value])

        return result

    def get_latest_value(self) -> Optional[Dict[str, Optional[float]]]:
        """Get the most recent indicator values."""
        if self.values:
            return self.values[-1].values
        return None

    def get_value_at_date(
        self, target_date: date
    ) -> Optional[Dict[str, Optional[float]]]:
        """Get indicator values for a specific date."""
        for value in self.values:
            if value.date == target_date:
                return value.values
        return None
