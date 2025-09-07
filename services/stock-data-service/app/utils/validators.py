import re
from typing import Optional
from datetime import date, datetime


def validate_symbol(symbol: str) -> bool:
    """
    Validate stock symbol format
    
    Args:
        symbol: Stock symbol to validate
        
    Returns:
        True if valid, False otherwise
    """
    if not symbol:
        return False
        
    # Basic symbol validation - alphanumeric, dots, and hyphens allowed
    pattern = r'^[A-Za-z0-9\.\-]{1,10}$'
    return bool(re.match(pattern, symbol))


def validate_date_range(start_date: Optional[date], end_date: Optional[date]) -> bool:
    """
    Validate date range
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        True if valid, False otherwise
    """
    if start_date and end_date:
        return start_date <= end_date
    return True