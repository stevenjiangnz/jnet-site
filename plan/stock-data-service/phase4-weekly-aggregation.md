# Phase 4: Weekly Data Aggregation
**Duration**: Week 6 (5 working days)

## Overview
Implement weekly data aggregation from daily data to support different timeframes for analysis. Weekly data will be computed and stored separately in GCS for efficient querying.

## Prerequisites
- [ ] Daily data available in GCS with good coverage
- [ ] Market calendar integration from Phase 2
- [ ] GCS storage patterns established
- [ ] At least 6 months of daily data for testing

## Implementation Tasks

### Day 1: Weekly Aggregation Logic
**Objective**: Create core aggregation algorithms

1. **Create Aggregation Engine**
   - File: `app/services/weekly_aggregator.py`
   ```python
   from datetime import datetime, timedelta
   import pandas as pd
   
   class WeeklyAggregator:
       def __init__(self):
           self.calendar = MarketCalendar()
       
       def aggregate_to_weekly(self, daily_data: List[dict]) -> List[dict]:
           """Convert daily data to weekly aggregates"""
           df = pd.DataFrame(daily_data)
           df['date'] = pd.to_datetime(df['date'])
           df = df.set_index('date').sort_index()
           
           # Resample to weekly, using Friday as end of week
           weekly = pd.DataFrame()
           weekly['open'] = df['open'].resample('W-FRI').first()
           weekly['high'] = df['high'].resample('W-FRI').max()
           weekly['low'] = df['low'].resample('W-FRI').min()
           weekly['close'] = df['close'].resample('W-FRI').last()
           weekly['adj_close'] = df['adj_close'].resample('W-FRI').last()
           weekly['volume'] = df['volume'].resample('W-FRI').sum()
           
           # Handle incomplete weeks
           weekly = self._adjust_incomplete_weeks(weekly, df)
           
           return weekly.reset_index().to_dict('records')
       
       def _adjust_incomplete_weeks(self, weekly: pd.DataFrame, daily: pd.DataFrame):
           """Handle weeks with missing trading days"""
           for idx in weekly.index:
               week_start = idx - timedelta(days=4)
               week_data = daily[week_start:idx]
               
               if len(week_data) == 0:
                   weekly.drop(idx, inplace=True)
               elif len(week_data) < 5:
                   # Adjust for short weeks (holidays)
                   weekly.loc[idx, 'open'] = week_data.iloc[0]['open']
                   weekly.loc[idx, 'close'] = week_data.iloc[-1]['close']
           
           return weekly
   ```

2. **Create Week Boundary Handler**
   ```python
   class WeekBoundaryHandler:
       def get_week_boundaries(self, date: datetime) -> tuple:
           """Get Monday-Friday boundaries for a given date"""
           days_since_monday = date.weekday()
           monday = date - timedelta(days=days_since_monday)
           friday = monday + timedelta(days=4)
           return monday, friday
       
       def get_trading_week(self, date: datetime) -> List[datetime]:
           """Get actual trading days in a week"""
           monday, friday = self.get_week_boundaries(date)
           return self.calendar.valid_days(monday, friday)
   ```

### Day 2: Weekly Data Storage Implementation
**Objective**: Store and manage weekly data in GCS

1. **Update Storage Paths**
   - File: `app/services/storage_paths.py`
   ```python
   @staticmethod
   def get_weekly_path(symbol: str) -> str:
       return f"{StoragePaths.WEEKLY_PREFIX}{symbol}.json"
   ```

2. **Create Weekly Data Model**
   - File: `app/models/weekly_data.py`
   ```python
   class WeeklyDataFile(BaseModel):
       symbol: str
       data_type: str = "weekly"
       last_updated: datetime
       data_range: DateRange
       data_points: List[WeeklyDataPoint]
       metadata: WeeklyMetadata
   
   class WeeklyDataPoint(BaseModel):
       week_ending: date  # Friday date
       week_start: date   # Monday date
       open: float
       high: float
       low: float
       close: float
       adj_close: float
       volume: int
       trading_days: int  # Number of trading days in week
   ```

3. **Weekly Data Service**
   - File: `app/services/weekly_data_service.py`
   ```python
   class WeeklyDataService:
       async def generate_weekly_data(self, symbol: str):
           """Generate weekly data from daily data"""
           # Load daily data
           daily_data = await self.storage.download_json(
               StoragePaths.get_daily_path(symbol)
           )
           
           # Aggregate to weekly
           weekly_points = self.aggregator.aggregate_to_weekly(
               daily_data['data_points']
           )
           
           # Create weekly file
           weekly_file = WeeklyDataFile(
               symbol=symbol,
               last_updated=datetime.utcnow(),
               data_range=self._calculate_range(weekly_points),
               data_points=weekly_points,
               metadata=self._generate_metadata(weekly_points)
           )
           
           # Store in GCS
           await self.storage.upload_json(
               StoragePaths.get_weekly_path(symbol),
               weekly_file.dict()
           )
   ```

### Day 3: Incremental Weekly Updates
**Objective**: Update weekly data efficiently after daily updates

1. **Create Weekly Update Strategy**
   ```python
   class WeeklyUpdateStrategy:
       async def update_current_week(self, symbol: str, daily_update: dict):
           """Update only the current week's data"""
           weekly_data = await self._load_weekly_data(symbol)
           current_week = self._get_current_week_index(weekly_data)
           
           if current_week >= 0:
               # Update existing week
               self._update_week_data(weekly_data, current_week, daily_update)
           else:
               # Start new week
               self._add_new_week(weekly_data, daily_update)
           
           await self._save_weekly_data(symbol, weekly_data)
       
       async def rebuild_recent_weeks(self, symbol: str, weeks: int = 4):
           """Rebuild recent weeks from daily data"""
           # Useful for corrections or data fixes
           pass
   ```

2. **Integration with Daily Updates**
   - Update `UpdateOrchestrator` from Phase 2
   - Trigger weekly update after successful daily update
   - Only update affected weeks (current and previous if needed)

### Day 4: API Endpoints and Caching
**Objective**: Expose weekly data through API

1. **Weekly Data Endpoints**
   - File: `app/api/v1/weekly_data.py`
   ```python
   @router.get("/data/{symbol}/weekly")
   async def get_weekly_data(
       symbol: str,
       start: Optional[date] = None,
       end: Optional[date] = None,
       limit: Optional[int] = 100
   ):
       """Get weekly aggregated data"""
       # Check cache first
       cache_key = f"data:weekly:{symbol}:{start}:{end}"
       cached = await cache.get(cache_key)
       
       if cached:
           return json.loads(cached)
       
       # Load from GCS
       data = await weekly_service.get_weekly_data(symbol, start, end, limit)
       
       # Cache for 2 hours
       await cache.set(cache_key, json.dumps(data), 7200)
       
       return data
   
   @router.post("/data/{symbol}/weekly/regenerate")
   async def regenerate_weekly_data(symbol: str):
       """Force regeneration of weekly data from daily"""
       await weekly_service.generate_weekly_data(symbol)
       await cache.clear_pattern(f"data:weekly:{symbol}:*")
       return {"status": "regenerated", "symbol": symbol}
   ```

2. **Comparison Endpoints**
   ```python
   @router.get("/data/{symbol}/compare")
   async def compare_timeframes(
       symbol: str,
       period: int = 30  # days
   ):
       """Compare daily vs weekly data for analysis"""
       daily = await get_daily_data(symbol, period)
       weekly = await get_weekly_data(symbol, period // 7)
       
       return {
           "symbol": symbol,
           "daily": daily,
           "weekly": weekly,
           "analysis": calculate_timeframe_metrics(daily, weekly)
       }
   ```

### Day 5: Testing and Validation
**Objective**: Ensure accuracy and performance

1. **Aggregation Accuracy Tests**
   - File: `tests/test_weekly_aggregation.py`
   ```python
   def test_weekly_aggregation_accuracy():
       """Test OHLCV calculations are correct"""
       daily_data = [
           {"date": "2024-12-09", "open": 100, "high": 105, "low": 99, "close": 104, "volume": 1000},
           {"date": "2024-12-10", "open": 104, "high": 106, "low": 103, "close": 105, "volume": 1200},
           {"date": "2024-12-11", "open": 105, "high": 107, "low": 104, "close": 106, "volume": 1100},
           {"date": "2024-12-12", "open": 106, "high": 108, "low": 105, "close": 107, "volume": 1300},
           {"date": "2024-12-13", "open": 107, "high": 109, "low": 106, "close": 108, "volume": 1400}
       ]
       
       weekly = aggregator.aggregate_to_weekly(daily_data)
       
       assert weekly[0]["open"] == 100  # Monday's open
       assert weekly[0]["high"] == 109  # Week's high
       assert weekly[0]["low"] == 99    # Week's low
       assert weekly[0]["close"] == 108 # Friday's close
       assert weekly[0]["volume"] == 6000  # Sum of volume
   
   def test_incomplete_week_handling():
       """Test handling of weeks with holidays"""
       # Test with Thursday holiday (no data)
       daily_data = [
           {"date": "2024-12-09", "open": 100, ...},  # Monday
           {"date": "2024-12-10", "open": 104, ...},  # Tuesday
           {"date": "2024-12-11", "open": 105, ...},  # Wednesday
           # Thursday missing (holiday)
           {"date": "2024-12-13", "open": 107, ...}   # Friday
       ]
       
       weekly = aggregator.aggregate_to_weekly(daily_data)
       assert weekly[0]["trading_days"] == 4
   ```

2. **Performance Testing**
   ```python
   async def test_aggregation_performance():
       """Test aggregation speed for large datasets"""
       # Generate 20 years of daily data
       daily_data = generate_test_data(years=20)
       
       start = time.time()
       weekly = aggregator.aggregate_to_weekly(daily_data)
       duration = time.time() - start
       
       assert len(weekly) == approximately(1040)  # ~52 weeks/year * 20
       assert duration < 1.0  # Should complete in under 1 second
   ```

3. **Data Validation**
   ```python
   class WeeklyDataValidator:
       def validate_weekly_data(self, weekly_data: List[dict]) -> ValidationResult:
           errors = []
           
           for week in weekly_data:
               # OHLC relationships
               if week['high'] < week['low']:
                   errors.append(f"Invalid high/low for week {week['week_ending']}")
               
               if week['high'] < max(week['open'], week['close']):
                   errors.append(f"High not highest for week {week['week_ending']}")
               
               # Volume validation
               if week['volume'] < 0:
                   errors.append(f"Negative volume for week {week['week_ending']}")
           
           return ValidationResult(valid=len(errors) == 0, errors=errors)
   ```

## Weekly Data Specifications

### Aggregation Rules
1. **Week Definition**: Monday to Friday (market weeks)
2. **Open**: First trading day's open price
3. **High**: Maximum high across all trading days
4. **Low**: Minimum low across all trading days
5. **Close**: Last trading day's close price
6. **Volume**: Sum of all trading days' volume
7. **Adjusted Close**: Last trading day's adjusted close

### Special Cases
- **Short weeks**: Weeks with < 5 trading days due to holidays
- **Missing data**: Skip weeks with no trading days
- **Month boundaries**: Weeks can span month boundaries
- **Year boundaries**: Special handling for year-end weeks

## Deliverables
1. Weekly aggregation engine with accurate OHLCV calculations
2. Automated weekly data generation and updates
3. API endpoints for weekly data access
4. Integration with existing update pipeline
5. Comprehensive test coverage

## Success Criteria
- [ ] 100% accuracy in OHLC calculations
- [ ] Weekly data generated for all symbols with daily data
- [ ] Updates complete within 5 seconds per symbol
- [ ] API response time < 200ms for weekly queries
- [ ] Proper handling of market holidays and short weeks

## Dependencies
- Daily data available and accurate
- Market calendar for holiday handling
- GCS storage patterns established
- Cache service from Phase 3

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Calculation errors | Extensive testing with known datasets |
| Performance issues with large datasets | Efficient pandas operations, chunking |
| Inconsistent week definitions | Clear documentation and validation |
| Storage costs | Monitor size, consider compression |

## Post-Implementation
- Monitor aggregation accuracy for first week
- Gather feedback on weekly data endpoints
- Optimize based on usage patterns
- Document week boundary edge cases
- Prepare for Phase 5 (Profile System)