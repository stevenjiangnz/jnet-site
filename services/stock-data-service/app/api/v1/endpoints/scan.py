"""API endpoints for scanning stocks based on technical indicators."""

import logging
from typing import List, Dict, Any, Optional
from datetime import date
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.download import StockDataDownloader
from app.indicators.indicator_sets import IndicatorSetManager

logger = logging.getLogger(__name__)
router = APIRouter()


class ScanCondition(BaseModel):
    """Condition for scanning stocks."""
    indicator: str = Field(description="Indicator name or 'PRICE' for price")
    operator: str = Field(description="Operator: <, >, <=, >=, =, !=, above, below, crosses_above, crosses_below")
    value: Optional[float] = Field(None, description="Numeric value for comparison")
    indicator_ref: Optional[str] = Field(None, description="Another indicator for comparison (e.g., PRICE above SMA_50)")


class ScanRequest(BaseModel):
    """Request for scanning stocks."""
    symbols: List[str] = Field(description="List of symbols to scan")
    conditions: List[ScanCondition] = Field(description="Conditions to evaluate")
    return_data: Optional[List[str]] = Field(
        default=["latest_price", "volume"], 
        description="Data to return for matching symbols"
    )
    as_of_date: Optional[date] = Field(None, description="Date to evaluate conditions (default: latest)")


class ScanResult(BaseModel):
    """Result for a single symbol scan."""
    symbol: str
    matches: bool
    data: Dict[str, Any]


@router.post("/scan", response_model=List[ScanResult])
async def scan_stocks(request: ScanRequest):
    """
    Scan stocks based on technical indicator conditions
    """
    downloader = StockDataDownloader()
    results = []
    
    for symbol in request.symbols:
        try:
            # Get stock data with indicators
            stock_data = await downloader.get_symbol_data(symbol)
            
            if not stock_data:
                logger.warning(f"No data found for {symbol}")
                continue
            
            # Evaluate conditions
            matches = await evaluate_conditions(
                stock_data, 
                request.conditions, 
                request.as_of_date
            )
            
            if matches:
                # Gather requested return data
                result_data = await gather_result_data(
                    stock_data,
                    request.return_data,
                    request.as_of_date
                )
                
                results.append(ScanResult(
                    symbol=symbol,
                    matches=True,
                    data=result_data
                ))
        
        except Exception as e:
            logger.error(f"Error scanning {symbol}: {str(e)}")
            continue
    
    return results


async def evaluate_conditions(
    stock_data: Any,
    conditions: List[ScanCondition],
    as_of_date: Optional[date] = None
) -> bool:
    """
    Evaluate all conditions for a stock
    
    Args:
        stock_data: Stock data with indicators
        conditions: List of conditions to evaluate
        as_of_date: Date to evaluate at (default: latest)
        
    Returns:
        True if all conditions are met
    """
    # Get the evaluation date
    if as_of_date:
        # Find the data point for the specified date
        target_point = None
        for point in stock_data.data_points:
            if point.date == as_of_date:
                target_point = point
                break
        
        if not target_point:
            return False
    else:
        # Use the latest data point
        if not stock_data.data_points:
            return False
        target_point = stock_data.data_points[-1]
        as_of_date = target_point.date
    
    # Evaluate each condition
    for condition in conditions:
        if not await evaluate_single_condition(
            stock_data, 
            target_point, 
            condition, 
            as_of_date
        ):
            return False
    
    return True


async def evaluate_single_condition(
    stock_data: Any,
    target_point: Any,
    condition: ScanCondition,
    as_of_date: date
) -> bool:
    """
    Evaluate a single condition
    
    Args:
        stock_data: Stock data with indicators
        target_point: The data point to evaluate
        condition: The condition to evaluate
        as_of_date: The date of evaluation
        
    Returns:
        True if condition is met
    """
    # Get the left-hand value
    if condition.indicator == "PRICE":
        left_value = target_point.close
    elif condition.indicator == "VOLUME":
        left_value = target_point.volume
    else:
        # Get indicator value
        left_value = get_indicator_value(
            stock_data.indicators,
            condition.indicator,
            as_of_date
        )
        
        if left_value is None:
            return False
    
    # Get the right-hand value
    if condition.indicator_ref:
        # Compare against another indicator
        right_value = get_indicator_value(
            stock_data.indicators,
            condition.indicator_ref,
            as_of_date
        )
        
        if right_value is None:
            return False
    else:
        # Compare against numeric value
        right_value = condition.value
        
        if right_value is None:
            return False
    
    # Evaluate the operator
    if condition.operator == "<":
        return left_value < right_value
    elif condition.operator == ">":
        return left_value > right_value
    elif condition.operator == "<=":
        return left_value <= right_value
    elif condition.operator == ">=":
        return left_value >= right_value
    elif condition.operator == "=":
        return left_value == right_value
    elif condition.operator == "!=":
        return left_value != right_value
    elif condition.operator in ["above", "below"]:
        # For "above" and "below", same as > and <
        return left_value > right_value if condition.operator == "above" else left_value < right_value
    elif condition.operator in ["crosses_above", "crosses_below"]:
        # Need previous value for crosses
        prev_left = get_previous_value(stock_data, condition.indicator, as_of_date)
        prev_right = get_previous_value(
            stock_data, 
            condition.indicator_ref if condition.indicator_ref else None, 
            as_of_date,
            condition.value
        )
        
        if prev_left is None or prev_right is None:
            return False
        
        if condition.operator == "crosses_above":
            return prev_left <= prev_right and left_value > right_value
        else:  # crosses_below
            return prev_left >= prev_right and left_value < right_value
    else:
        logger.warning(f"Unknown operator: {condition.operator}")
        return False


def get_indicator_value(
    indicators: Optional[Dict[str, Any]],
    indicator_name: str,
    as_of_date: date
) -> Optional[float]:
    """
    Get indicator value for a specific date
    
    Args:
        indicators: Dictionary of indicators
        indicator_name: Name of the indicator
        as_of_date: Date to get value for
        
    Returns:
        Indicator value or None if not found
    """
    if not indicators or indicator_name not in indicators:
        return None
    
    indicator_data = indicators[indicator_name]
    
    # Find the value for the date
    for value in indicator_data.get("values", []):
        if value["date"] == as_of_date.isoformat():
            # Get the first output value
            values = value.get("values", {})
            if values:
                # Return the first non-None value
                for v in values.values():
                    if v is not None:
                        return v
    
    return None


def get_previous_value(
    stock_data: Any,
    indicator: Optional[str],
    as_of_date: date,
    default_value: Optional[float] = None
) -> Optional[float]:
    """
    Get the previous value for an indicator or price
    
    Args:
        stock_data: Stock data
        indicator: Indicator name or None for price
        as_of_date: Current date
        default_value: Default value if indicator is None
        
    Returns:
        Previous value or None
    """
    if indicator is None and default_value is not None:
        return default_value
    
    # Find the previous date
    prev_date = None
    for i, point in enumerate(stock_data.data_points):
        if point.date == as_of_date and i > 0:
            prev_date = stock_data.data_points[i-1].date
            break
    
    if not prev_date:
        return None
    
    # Get the value
    if indicator == "PRICE" or indicator is None:
        for point in stock_data.data_points:
            if point.date == prev_date:
                return point.close
    else:
        return get_indicator_value(stock_data.indicators, indicator, prev_date)
    
    return None


async def gather_result_data(
    stock_data: Any,
    return_fields: List[str],
    as_of_date: Optional[date] = None
) -> Dict[str, Any]:
    """
    Gather the requested data fields for a matching symbol
    
    Args:
        stock_data: Stock data with indicators
        return_fields: List of fields to return
        as_of_date: Date to get data for
        
    Returns:
        Dictionary of requested data
    """
    result = {}
    
    # Get the target date
    if not as_of_date:
        if stock_data.data_points:
            as_of_date = stock_data.data_points[-1].date
        else:
            return result
    
    # Get the data point
    target_point = None
    for point in stock_data.data_points:
        if point.date == as_of_date:
            target_point = point
            break
    
    if not target_point:
        return result
    
    # Gather requested fields
    for field in return_fields:
        if field == "latest_price":
            result["price"] = target_point.close
        elif field == "volume":
            result["volume"] = target_point.volume
        elif field == "date":
            result["date"] = as_of_date.isoformat()
        elif field in ["open", "high", "low", "close"]:
            result[field] = getattr(target_point, field)
        else:
            # Try to get indicator value
            value = get_indicator_value(
                stock_data.indicators,
                field,
                as_of_date
            )
            if value is not None:
                result[field] = value
    
    return result