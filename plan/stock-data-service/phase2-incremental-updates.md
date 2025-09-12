# Phase 2: Incremental Data Updates
**Duration**: Week 3-4 (10 working days)

## Overview
Implement intelligent incremental update system to build comprehensive historical datasets without redundant API calls. This phase focuses on merging new data with existing data and handling various update scenarios.

## Prerequisites
- [ ] Phase 1 (GCS Integration) completed and tested
- [ ] Existing data migrated to GCS
- [ ] Yahoo Finance API rate limits understood
- [ ] Test dataset with known gaps prepared

## Implementation Tasks

### Day 1-2: Data Analysis & Gap Detection
**Objective**: Build system to analyze existing data and identify gaps

1. **Create Data Analyzer Module**
   - File: `app/services/data_analyzer.py`
   ```python
   class DataAnalyzer:
       def analyze_data_file(self, data: dict) -> DataAnalysis:
           # Return analysis with date ranges, gaps, quality metrics
       
       def find_gaps(self, data_points: List[dict]) -> List[DateRange]:
           # Identify missing trading days
       
       def get_latest_date(self, data: dict) -> datetime:
           # Extract most recent data point
       
       def validate_continuity(self, data: List[dict]) -> ValidationResult:
           # Check for data consistency
   ```

2. **Create Gap Detection Logic**
   - Account for weekends and market holidays
   - Identify suspicious gaps (missing trading days)
   - Generate gap reports

3. **Implement Market Calendar Integration**
   - File: `app/services/market_calendar.py`
   - Use `pandas_market_calendars` for trading days
   - Cache calendar data for performance

### Day 3-4: Merge Engine Implementation
**Objective**: Create robust data merging logic

1. **Create Merge Engine**
   - File: `app/services/merge_engine.py`
   ```python
   class MergeEngine:
       def merge_data(self, existing: dict, new: dict) -> dict:
           # Merge new data with existing, handle conflicts
       
       def deduplicate(self, data_points: List[dict]) -> List[dict]:
           # Remove duplicates, keep most recent
       
       def sort_and_validate(self, data: List[dict]) -> List[dict]:
           # Ensure chronological order and validate
       
       def handle_corrections(self, old: dict, new: dict) -> dict:
           # Handle data corrections from source
   ```

2. **Conflict Resolution Strategy**
   - Define rules for handling duplicate dates
   - Implement versioning for data corrections
   - Log all merge decisions for audit

3. **Data Validation**
   - Validate OHLC relationships (High >= Low, etc.)
   - Check for abnormal price movements
   - Ensure volume is non-negative

### Day 5-6: Update Orchestration
**Objective**: Build system to coordinate updates

1. **Create Update Orchestrator**
   - File: `app/services/update_orchestrator.py`
   ```python
   class UpdateOrchestrator:
       async def update_symbol(self, symbol: str, force: bool = False):
           # Orchestrate the update process
           
       async def bulk_update(self, symbols: List[str]):
           # Update multiple symbols efficiently
           
       async def fill_gaps(self, symbol: str, gaps: List[DateRange]):
           # Download and merge specific date ranges
   ```

2. **Update Strategies**
   - **Daily Update**: Append latest trading day
   - **Gap Filling**: Download specific date ranges
   - **Full Refresh**: Complete re-download (rare)
   - **Correction Mode**: Update specific dates

3. **Rate Limit Management**
   - Implement request queuing
   - Add exponential backoff
   - Track API usage metrics

### Day 7-8: Scheduler & Automation
**Objective**: Automate update processes

1. **Create Update Scheduler**
   - File: `app/services/scheduler.py`
   - Use APScheduler for task scheduling
   - Configure update windows

2. **Scheduled Tasks**
   ```python
   # Daily market close update (4:30 PM ET)
   scheduler.add_job(
       update_all_symbols,
       trigger="cron",
       hour=16, minute=30,
       timezone="America/New_York"
   )
   
   # Weekend gap analysis
   scheduler.add_job(
       analyze_and_fill_gaps,
       trigger="cron",
       day_of_week="sat",
       hour=10
   )
   ```

3. **Update Queue Management**
   - Priority queue for symbol updates
   - Retry failed updates
   - Dead letter queue for persistent failures

### Day 9-10: Testing & Monitoring
**Objective**: Ensure reliability and observability

1. **Unit Tests**
   - File: `tests/test_incremental_updates.py`
   - Test merge scenarios
   - Test gap detection
   - Test conflict resolution

2. **Integration Tests**
   - Simulate various update scenarios
   - Test with real historical data
   - Verify data integrity after updates

3. **Monitoring & Alerts**
   - File: `app/monitoring/update_metrics.py`
   ```python
   # Metrics to track:
   - Update success/failure rates
   - Data gaps detected/filled
   - API rate limit usage
   - Update duration by symbol
   ```

4. **Update Dashboard**
   - Create endpoint for update status
   - Show last update times per symbol
   - Display gap analysis results

## Update Scenarios & Implementation

### Scenario 1: Initial Historical Load
```python
async def initial_load(symbol: str, years: int = 20):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=years * 365)
    
    # Download full historical data
    data = await download_historical(symbol, start_date, end_date)
    
    # Validate and store
    validated_data = validate_historical_data(data)
    await storage.upload_json(get_daily_path(symbol), validated_data)
```

### Scenario 2: Daily Incremental Update
```python
async def daily_update(symbol: str):
    # Get existing data
    existing = await storage.download_json(get_daily_path(symbol))
    latest_date = get_latest_date(existing)
    
    # Download new data
    new_data = await download_since(symbol, latest_date + timedelta(days=1))
    
    # Merge and save
    merged = merge_engine.merge_data(existing, new_data)
    await storage.upload_json(get_daily_path(symbol), merged)
```

### Scenario 3: Gap Filling
```python
async def fill_gaps(symbol: str):
    # Analyze existing data
    existing = await storage.download_json(get_daily_path(symbol))
    gaps = analyzer.find_gaps(existing)
    
    # Fill each gap
    for gap in gaps:
        gap_data = await download_range(symbol, gap.start, gap.end)
        existing = merge_engine.merge_data(existing, gap_data)
    
    await storage.upload_json(get_daily_path(symbol), existing)
```

## Deliverables
1. Data analyzer with gap detection
2. Merge engine with conflict resolution
3. Update orchestrator with multiple strategies
4. Automated scheduler for updates
5. Comprehensive test suite
6. Monitoring dashboard

## Success Criteria
- [ ] Zero data loss during updates
- [ ] Gaps detected and filled automatically
- [ ] 99%+ update success rate
- [ ] Update time < 1 second per symbol
- [ ] No duplicate data points
- [ ] All data validated before storage

## Rollback Plan
1. Backup data before each update
2. Versioned updates with rollback capability
3. Manual override for scheduler
4. Ability to restore from backups

## Dependencies
- GCS storage layer operational
- Yahoo Finance API access
- Market calendar data available
- Sufficient API rate limits

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| API rate limits exceeded | Implement queuing and backoff |
| Data corruption during merge | Validate before and after merge |
| Missing market holidays | Use comprehensive calendar library |
| Concurrent update conflicts | Implement locking mechanism |
| Memory issues with large datasets | Stream processing for large files |

## Post-Implementation
- Monitor update performance for first week
- Analyze gap filling effectiveness
- Document update patterns
- Optimize based on metrics
- Prepare for Phase 3 (Redis caching)