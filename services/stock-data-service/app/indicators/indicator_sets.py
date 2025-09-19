"""Predefined indicator sets for different use cases."""

from typing import List
from .config import INDICATOR_SETS


class IndicatorSetManager:
    """Manages predefined indicator sets."""

    @staticmethod
    def get_indicators(set_name: str) -> List[str]:
        """Get indicators for a named set.

        Args:
            set_name: Name of the indicator set or comma-separated indicators

        Returns:
            List of indicator names
        """
        # Check if it's a predefined set
        if set_name in INDICATOR_SETS:
            return INDICATOR_SETS[set_name]

        # Check for special keywords
        if set_name == "all":
            # Return all unique indicators from all sets
            all_indicators = set()
            for indicators in INDICATOR_SETS.values():
                all_indicators.update(indicators)
            return sorted(list(all_indicators))

        # Otherwise, treat as comma-separated list
        if "," in set_name:
            return [ind.strip() for ind in set_name.split(",")]

        # Single indicator
        return [set_name]

    @staticmethod
    def validate_indicators(indicators: List[str]) -> List[str]:
        """Validate and filter indicator list.

        Args:
            indicators: List of indicator names to validate

        Returns:
            List of valid indicator names
        """
        from .config import INDICATOR_MIN_PERIODS

        valid_indicators = []
        for indicator in indicators:
            if indicator in INDICATOR_MIN_PERIODS:
                valid_indicators.append(indicator)

        return valid_indicators

    @staticmethod
    def get_required_periods(indicators: List[str]) -> int:
        """Get minimum required data points for a set of indicators.

        Args:
            indicators: List of indicator names

        Returns:
            Maximum period requirement among all indicators
        """
        from .config import INDICATOR_MIN_PERIODS

        if not indicators:
            return 0

        return max(INDICATOR_MIN_PERIODS.get(ind, 0) for ind in indicators)
