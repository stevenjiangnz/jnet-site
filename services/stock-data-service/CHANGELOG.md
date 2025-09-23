# Changelog

All notable changes to the Stock Data Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Fixed inconsistent zero-price handling between full and incremental downloads
  - Zero or negative prices are now consistently filtered out in both download methods
  - Ensures data quality by excluding invalid price data
  - Prevents potential issues with technical indicator calculations

## [1.1.0] - 2025-09-12

### Added
- Automatic gap filling for incremental downloads
  - Seamlessly merges overlapping date ranges
  - Preserves existing data while filling missing dates
  - Understands US market holidays (not treated as gaps)
- Cache invalidation after successful downloads
  - Ensures fresh data is always retrieved from GCS
  - Prevents stale cached data from being served
- Comprehensive gap detection and filling tests
  - Verifies no gaps in 20+ years of historical data
  - Tests incremental download scenarios
  - Validates data continuity across date ranges

### Fixed
- Fixed date serialization error in `/api/v1/data/{symbol}/recent` endpoint that was causing 500 errors
- Data points are now properly converted to JSON-serializable format
- Cache not being invalidated after new data downloads
- Data retrieval returning stale cached data instead of updated GCS data

### Changed
- Default days parameter in `/api/v1/data/{symbol}/recent` endpoint changed from 30 to 300 days
- Increased maximum days limit from 365 to 3650 days (10 years)

### Added
- Added date range support to `/api/v1/data/{symbol}/recent` endpoint
  - Can now use `start_date` and `end_date` query parameters
  - Date range takes precedence over `days` parameter when both are provided
  - Supports flexible date filtering for historical data analysis

## [1.0.0] - 2024-12-13

### Added
- Google Cloud Storage (GCS) integration for persistent data storage
  - Atomic write operations to prevent data corruption
  - Organized storage structure: `stock-data/daily/{symbol}.json`
  - Support for service account authentication
  - Comprehensive GCS setup documentation

- Upstash Redis caching layer
  - REST API-based caching (no TCP connections needed)
  - Intelligent cache key patterns with different TTLs
  - 5-minute TTL for latest prices
  - 1-hour TTL for recent data
  - 6-hour TTL for symbol lists
  - Graceful degradation when cache is unavailable

- Enhanced API endpoints
  - `/api/v1/data/{symbol}/latest` - Get latest price with caching
  - `/api/v1/data/{symbol}/recent` - Get recent trading days data
  - Improved error handling and validation

- Comprehensive test coverage
  - Fixed all CI/CD test failures
  - Proper mocking for GCS and Redis
  - Environment variable mocking for tests
  - Test fixtures for consistent testing

- Documentation improvements
  - Detailed GCS setup guide
  - Upstash Redis setup instructions
  - API endpoint documentation with examples
  - Troubleshooting guide

### Changed
- Migrated from local file storage to Google Cloud Storage
- Updated all storage operations to use async GCS client
- Refactored download service to use GCS storage manager
- Updated data models with proper validation
- Improved error handling across all services

### Fixed
- CI/CD pipeline test failures
- Proper async function mocking in tests
- Environment variable handling in tests
- Missing required fields in test data
- Black formatting issues

### Technical Details
- Python 3.11+ with FastAPI
- Google Cloud Storage Python client
- Upstash Redis Python client
- Pydantic v2 for data validation
- uv for package management
- pytest for testing
- GitHub Actions for CI/CD

## [0.1.0] - 2024-12-10 (Pre-GCS)

### Initial Features
- Basic stock data download from Yahoo Finance
- Local file storage
- RESTful API endpoints
- Rate limiting
- Basic test coverage