# Product Requirements Document: Stock Data Service Enhancements

**Document Version**: 1.0  
**Date**: December 12, 2024  
**Author**: Development Team  
**Status**: Draft

## 1. Executive Summary

This PRD outlines the enhancements for the Stock Data Service to improve data storage, performance, and scalability. The key improvements include migrating from local file storage to Google Cloud Storage, implementing incremental data updates, adding Redis caching for performance, and creating comprehensive data management capabilities.

## 2. Background & Current State

### 2.1 Current Implementation
- Downloads EOD stock/ETF data from Yahoo Finance
- Stores data locally with timestamp-based filenames
- No data persistence across deployments
- No incremental updates (each download creates a new file)
- No caching mechanism
- Limited to daily data only

### 2.2 Key Limitations
- Data loss on container restarts
- Redundant API calls for historical data
- No efficient way to build comprehensive historical datasets
- Poor query performance for large datasets
- No data quality monitoring

## 3. Objectives

1. **Persistent Storage**: Implement Google Cloud Storage for data persistence
2. **Incremental Updates**: Build comprehensive datasets without redundant downloads
3. **Performance**: Add Redis caching for frequently accessed data
4. **Data Organization**: Separate daily and weekly data files
5. **Monitoring**: Create profile/summary system for data inventory

## 4. Functional Requirements

### 4.1 Google Cloud Storage Integration

#### 4.1.1 Storage Structure
```
gs://[bucket-name]/
├── stock-data/
│   ├── daily/
│   │   ├── AAPL.json
│   │   ├── MSFT.json
│   │   └── [symbol].json
│   ├── weekly/
│   │   ├── AAPL.json
│   │   ├── MSFT.json
│   │   └── [symbol].json
│   └── metadata/
│       ├── profile.json
│       └── symbol-index.json
```

#### 4.1.2 File Format
Each stock/ETF will have one consolidated file containing all historical data:

```json
{
    "symbol": "AAPL",
    "data_type": "daily",
    "last_updated": "2024-12-12T14:30:00Z",
    "data_range": {
        "start": "2004-01-01",
        "end": "2024-12-12"
    },
    "data_points": [
        {
            "date": "2024-12-12",
            "open": 194.52,
            "high": 195.98,
            "low": 194.18,
            "close": 195.71,
            "adj_close": 195.71,
            "volume": 48087703
        }
    ],
    "metadata": {
        "total_records": 5248,
        "missing_dates": [],
        "data_source": "yahoo_finance",
        "version": "1.0"
    }
}
```

### 4.2 Incremental Data Updates

#### 4.2.1 Merge Logic
- Check existing file for latest date
- Download only new data from (latest_date + 1) to current date
- Merge new data with existing data
- Handle duplicates by keeping the most recent data
- Validate data continuity

#### 4.2.2 Update Scenarios
1. **Initial Load**: Download last 20 years of historical data
2. **Daily Updates**: Append new trading day data
3. **Gap Filling**: Detect and fill missing data periods
4. **Data Corrections**: Update existing data if corrections needed

### 4.3 Redis Caching (Simple Implementation)

#### 4.3.1 Cache Strategy
Simple TTL-based caching for frequently accessed data:

1. **Latest Price Cache** (TTL: 5 minutes)
   - Key: `price:latest:{symbol}`
   - Value: Latest daily data point

2. **Recent Data Cache** (TTL: 1 hour)
   - Key: `data:recent:{symbol}`
   - Value: Last 30 days of data

3. **Symbol List Cache** (TTL: 6 hours)
   - Key: `symbols:list`
   - Value: Array of available symbols

#### 4.3.2 Cache Service
```python
class SimpleCache:
    async def get(key: str) -> Optional[str]
    async def set(key: str, value: str, ttl: int)
    async def delete(key: str)
```

### 4.4 Weekly Data Aggregation

#### 4.4.1 Aggregation Rules
- Generate weekly data from daily data
- Week starts on Monday, ends on Friday
- OHLC calculation:
  - Open: Monday's open price
  - High: Week's highest price
  - Low: Week's lowest price
  - Close: Friday's close price
  - Volume: Sum of week's volume

#### 4.4.2 Storage
- Separate files for weekly data
- Same format as daily data
- Updated after each daily update

### 4.5 Profile/Summary System

#### 4.5.1 System Profile (`metadata/profile.json`)
```json
{
    "last_updated": "2024-12-12T14:30:00Z",
    "statistics": {
        "total_symbols": 500,
        "total_daily_records": 2624000,
        "total_weekly_records": 524800,
        "storage_size_mb": 1250.5,
        "oldest_data": "2000-01-01",
        "newest_data": "2024-12-12"
    },
    "symbols_by_category": {
        "stocks": 400,
        "etfs": 100
    },
    "data_quality": {
        "symbols_with_gaps": 5,
        "symbols_updated_today": 495
    }
}
```

#### 4.5.2 Symbol Index (`metadata/symbol-index.json`)
```json
{
    "symbols": [
        {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "type": "stock",
            "daily_data": {
                "start": "2004-01-01",
                "end": "2024-12-12",
                "records": 5248
            },
            "weekly_data": {
                "start": "2004-01-05",
                "end": "2024-12-09",
                "records": 1049
            },
            "last_updated": "2024-12-12T14:30:00Z"
        }
    ]
}
```

## 5. API Enhancements

### 5.1 New Endpoints

```python
# Query with date range
GET /api/v1/data/{symbol}?interval=daily&start=2024-01-01&end=2024-12-12

# Get latest price
GET /api/v1/data/{symbol}/latest

# System profile
GET /api/v1/profile

# Symbol metadata
GET /api/v1/symbols/{symbol}/info

# Force incremental update
POST /api/v1/sync/{symbol}

# Bulk sync
POST /api/v1/sync/bulk
{
    "symbols": ["AAPL", "GOOGL", "MSFT"]
}
```

### 5.2 Response Formats

Support both JSON and CSV formats for all data endpoints.

## 6. Non-Functional Requirements

### 6.1 Performance
- Cache hit rate > 80% for recent data queries
- Response time < 100ms for cached data
- Response time < 500ms for GCS data retrieval
- Support 1000+ concurrent requests

### 6.2 Reliability
- Graceful fallback when Redis is unavailable
- Retry logic for GCS operations
- Data validation before storage
- Automatic gap detection and filling

### 6.3 Scalability
- Support 10,000+ symbols
- Handle 20+ years of historical data per symbol
- Efficient storage with compression
- Parallel processing for bulk operations

### 6.4 Security
- GCS authentication via service account
- Redis connection via TLS
- API rate limiting
- Input validation for all endpoints

## 7. Technical Architecture

### 7.1 Technology Stack
- **Language**: Python with FastAPI
- **Storage**: Google Cloud Storage
- **Cache**: Upstash Redis
- **Data Processing**: Pandas
- **Data Source**: yfinance (Yahoo Finance)

### 7.2 Environment Variables
```bash
# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name
GCS_PROJECT_ID=your-project-id
GCS_CREDENTIALS_PATH=/path/to/credentials.json

# Upstash Redis
UPSTASH_REDIS_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_TOKEN=xxxxx
CACHE_ENABLED=true

# Service Configuration
ENVIRONMENT=production
LOG_LEVEL=INFO
RATE_LIMIT_CALLS=5
RATE_LIMIT_PERIOD=1
```

## 8. Implementation Phases

### Phase 1: GCS Integration (Week 1-2)
- Implement GCS storage manager
- Create read/write operations
- Migrate existing local storage logic
- Add authentication and error handling

### Phase 2: Incremental Updates (Week 3-4)
- Implement merge logic
- Add duplicate handling
- Create gap detection
- Build update scheduler

### Phase 3: Redis Caching (Week 5)
- Setup Upstash Redis
- Implement simple cache service
- Add cache to API endpoints
- Monitor cache performance

### Phase 4: Weekly Aggregation (Week 6)
- Create aggregation logic
- Generate weekly data files
- Add weekly data endpoints
- Test data accuracy

### Phase 5: Profile System (Week 7)
- Build profile generator
- Create symbol index
- Add monitoring endpoints
- Implement data quality checks

### Phase 6: Testing & Optimization (Week 8)
- Performance testing
- Load testing
- Data validation
- Documentation

## 9. Success Metrics

1. **Data Completeness**: 99.9% of trading days covered
2. **Query Performance**: 95% of requests < 200ms
3. **Storage Efficiency**: 50% reduction in storage costs
4. **API Reliability**: 99.9% uptime
5. **Cache Hit Rate**: > 80% for popular queries

## 10. Future Enhancements

1. Real-time data updates via WebSocket
2. Technical indicators calculation
3. Corporate actions tracking (splits, dividends)
4. Multi-region replication
5. GraphQL API support
6. Intraday data support
7. Machine learning predictions

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GCS outage | High | Implement local cache fallback |
| Redis failure | Medium | Graceful degradation to GCS-only |
| API rate limits | High | Implement queuing and backoff |
| Data corruption | High | Checksums and validation |
| Cost overrun | Medium | Monitor usage and set alerts |

## 12. Dependencies

1. Google Cloud Storage bucket provisioning
2. Upstash Redis instance setup
3. GCP service account with appropriate permissions
4. Yahoo Finance API availability
5. Docker deployment updates

## 13. Approval & Sign-off

- [ ] Product Owner
- [ ] Technical Lead
- [ ] DevOps Team
- [ ] Security Team

---

**Note**: This document is a living document and will be updated as requirements evolve.