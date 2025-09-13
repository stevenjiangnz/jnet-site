"""Service for aggregating daily stock data into weekly summaries."""

from datetime import date, timedelta
from typing import List, Tuple, Dict
from collections import defaultdict

from app.models.stock_data import StockDataPoint, WeeklyDataPoint


class WeeklyAggregator:
    """Aggregates daily stock data into weekly summaries."""

    def aggregate_to_weekly(
        self, daily_data: List[StockDataPoint]
    ) -> List[WeeklyDataPoint]:
        """
        Convert daily data points to weekly aggregates.
        
        Args:
            daily_data: List of daily stock data points
            
        Returns:
            List of weekly aggregated data points
        """
        if not daily_data:
            return []
            
        # Sort data by date
        sorted_data = sorted(daily_data, key=lambda x: x.date)
        
        # Group data by week
        weeks_data: Dict[Tuple[date, date], List[StockDataPoint]] = defaultdict(list)
        
        for data_point in sorted_data:
            week_start, week_end = self.get_week_boundaries(data_point.date)
            weeks_data[(week_start, week_end)].append(data_point)
        
        # Aggregate each week
        weekly_data = []
        for (week_start, week_end), week_points in sorted(weeks_data.items()):
            if week_points:  # Only process weeks with data
                weekly_point = self.aggregate_week(
                    week_points, week_start, week_end
                )
                weekly_data.append(weekly_point)
        
        return weekly_data
    
    def get_week_boundaries(self, input_date: date) -> Tuple[date, date]:
        """
        Get Monday start and Friday end for a given date.
        
        Args:
            input_date: Any date
            
        Returns:
            Tuple of (Monday, Friday) for the week containing the input date
        """
        # Get Monday of the week
        days_since_monday = input_date.weekday()
        monday = input_date - timedelta(days=days_since_monday)
        
        # Get Friday of the week
        friday = monday + timedelta(days=4)
        
        return monday, friday
    
    def aggregate_week(
        self, 
        week_data: List[StockDataPoint], 
        week_start: date,
        week_end: date
    ) -> WeeklyDataPoint:
        """
        Aggregate a single week's data into a weekly data point.
        
        Args:
            week_data: List of daily data points for the week
            week_start: Monday of the week
            week_end: Friday of the week
            
        Returns:
            Aggregated weekly data point
        """
        # Sort by date to ensure correct open/close
        sorted_week = sorted(week_data, key=lambda x: x.date)
        
        # Calculate aggregates
        open_price = sorted_week[0].open
        close_price = sorted_week[-1].close
        adj_close = sorted_week[-1].adj_close
        
        high_price = max(d.high for d in sorted_week)
        low_price = min(d.low for d in sorted_week)
        total_volume = sum(d.volume for d in sorted_week)
        
        return WeeklyDataPoint(
            week_ending=week_end,
            week_start=week_start,
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            adj_close=adj_close,
            volume=total_volume,
            trading_days=len(sorted_week)
        )
    
    def get_partial_week_boundaries(
        self, start_date: date, end_date: date
    ) -> List[Tuple[date, date]]:
        """
        Get week boundaries for a date range, handling partial weeks.
        
        Args:
            start_date: Start of the date range
            end_date: End of the date range
            
        Returns:
            List of (week_start, week_end) tuples covering the date range
        """
        weeks = []
        current_date = start_date
        
        while current_date <= end_date:
            week_start, week_end = self.get_week_boundaries(current_date)
            
            # Adjust for partial weeks at the boundaries
            adjusted_start = max(week_start, start_date)
            adjusted_end = min(week_end, end_date)
            
            weeks.append((adjusted_start, adjusted_end))
            
            # Move to next week
            current_date = week_end + timedelta(days=3)  # Next Monday
            
        return weeks