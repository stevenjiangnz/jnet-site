# Weekly Data Implementation Plan for Stock Data Service

## Overview
This plan outlines the implementation of weekly data aggregation functionality for the stock data service. The weekly data will be calculated locally from existing daily data to ensure consistency and avoid additional API calls.

## Goals
1. Aggregate daily stock data into weekly summaries
2. Process weekly data immediately after daily data download
3. Store weekly data alongside daily data
4. Provide API endpoints to query weekly data
5. Maintain data consistency between daily and weekly intervals

## Technical Approach

### 1. Weekly Data Aggregation Logic
- Calculate weekly data from Monday to Friday (trading week)
- Handle partial weeks at the beginning/end of data ranges
- Account for holidays and non-trading days
- Aggregate OHLCV data correctly:
  - Open: First day's open price
  - High: Maximum high across the week
  - Low: Minimum low across the week
  - Close: Last day's close price
  - Adjusted Close: Last day's adjusted close
  - Volume: Sum of all volumes

### 2. Data Models (Already Exists)
- `WeeklyDataPoint` model in `app/models/stock_data.py`
- `WeeklyDataFile` model for complete weekly data structure

### 3. Implementation Components

#### Phase 1: Core Aggregation Function
**File:** `app/services/weekly_aggregator.py` (new)
```python
class WeeklyAggregator:
    def aggregate_to_weekly(self, daily_data: List[StockDataPoint]) -> List[WeeklyDataPoint]:
        """Convert daily data points to weekly aggregates"""
        
    def get_week_boundaries(self, date: date) -> Tuple[date, date]:
        """Get Monday start and Friday end for a given date"""
        
    def aggregate_week(self, week_data: List[StockDataPoint]) -> WeeklyDataPoint:
        """Aggregate a single week's data"""
```

#### Phase 2: Storage Integration
**Files to modify:**
- `app/services/storage_paths.py`: Add weekly data path generation
- `app/services/file_storage.py`: Add weekly data save/load methods
- `app/services/gcs_storage.py`: Add weekly data upload/download methods

**New paths structure:**
```
data/
├── daily/
│   └── AAPL/
│       └── 2024/
│           └── 2024-01-15_2024-12-31.json
└── weekly/
    └── AAPL/
        └── 2024/
            └── 2024-01-15_2024-12-31.json
```

#### Phase 3: Download Service Integration
**File to modify:** `app/services/download.py`
```python
async def download_and_process(self, symbol: str, start_date: date, end_date: date):
    # 1. Download daily data (existing)
    # 2. Save daily data (existing)
    # 3. Calculate weekly data (new)
    # 4. Save weekly data (new)
    # 5. Update metadata for both (modified)
```

#### Phase 4: API Endpoints
**Files to modify/create:**
- `app/api/v1/endpoints/query.py`: Add weekly data query endpoint
- `app/api/v1/endpoints/download.py`: Update to return weekly processing status

**New endpoints:**
```
GET /api/v1/query/weekly/{symbol}
  Query params: start_date, end_date
  
GET /api/v1/data/weekly/{symbol}/{year}
  Download weekly data file
```

#### Phase 5: Cache Management
**File to modify:** `app/services/cache_keys.py`
- Add weekly data cache key patterns
- Update cache invalidation to handle both daily and weekly

### 4. Testing Strategy

#### Unit Tests
- `tests/test_weekly_aggregator.py`: Test aggregation logic
  - Normal weeks
  - Partial weeks
  - Holiday weeks
  - Edge cases (single day, no data)

#### Integration Tests
- `tests/test_weekly_integration.py`: Test full pipeline
  - Download daily → aggregate weekly → store → query
  - GCS upload/download for weekly data
  - Cache invalidation

#### Existing Test Updates
- Update `test_download.py` to verify weekly processing
- Update `test_storage_paths.py` for weekly paths
- Update `test_api.py` for weekly endpoints

### 5. Migration Strategy
For existing data:
1. Create a migration script to process all existing daily data
2. Generate weekly data for all symbols in storage
3. Run as a one-time job or include in deployment

### 6. Configuration Updates
**File:** `app/config/settings.py`
```python
# Weekly data settings
WEEKLY_DATA_ENABLED: bool = True
WEEKLY_AGGREGATION_DELAY: int = 0  # Process immediately
WEEKLY_DATA_RETENTION_DAYS: int = 3650  # 10 years
```

## Implementation Schedule

### Week 1: Core Development
- Day 1-2: Implement `WeeklyAggregator` class with unit tests
- Day 3-4: Update storage services for weekly data
- Day 5: Integrate with download service

### Week 2: API and Testing
- Day 1-2: Add API endpoints for weekly data
- Day 3-4: Comprehensive integration testing
- Day 5: Performance testing and optimization

### Week 3: Deployment
- Day 1-2: Migration script for existing data
- Day 3: Documentation updates
- Day 4-5: Deployment and monitoring

## Rollback Plan
1. Feature flag to disable weekly processing
2. Separate storage paths allow easy cleanup
3. API versioning to maintain backward compatibility

## Success Metrics
1. Weekly data generated for 100% of daily downloads
2. Query performance < 100ms for weekly data
3. Storage increase < 20% (weekly data is aggregated)
4. Zero data inconsistencies between daily and weekly

## Future Enhancements
1. Monthly data aggregation
2. Custom period aggregation (e.g., 4-week periods)
3. Technical indicators on weekly data
4. Weekly data export formats (CSV, Excel)

## Dependencies
- Existing daily data must be available
- Models already exist in codebase
- No new external libraries required

## Risks and Mitigations
1. **Risk:** Performance impact on download process
   - **Mitigation:** Async processing, optimize aggregation algorithm

2. **Risk:** Storage costs increase
   - **Mitigation:** Weekly data is smaller than daily, implement retention policies

3. **Risk:** Data consistency issues
   - **Mitigation:** Comprehensive testing, validation checks

## Review Checklist
- [ ] Aggregation logic handles all edge cases
- [ ] Storage paths follow existing conventions
- [ ] API responses maintain backward compatibility
- [ ] Tests cover > 90% of new code
- [ ] Documentation updated
- [ ] Performance benchmarks met
- [ ] Migration script tested on staging