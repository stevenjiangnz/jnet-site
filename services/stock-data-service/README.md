# Stock Data Service

A Python-based microservice for downloading and managing stock/ETF end-of-day (EOD) data from Yahoo Finance with Google Cloud Storage persistence and Redis caching.

## Features

- Download EOD data for individual stocks/ETFs from Yahoo Finance
- Bulk download support for multiple symbols
- **Automatic Weekly Data Aggregation** from daily data
- **Google Cloud Storage (GCS)** for persistent data storage with atomic writes
- **Upstash Redis** caching via REST API for high-performance data access
- RESTful API endpoints with comprehensive documentation
- Symbol data deletion with cache invalidation
- Rate limiting to respect Yahoo Finance limits
- Automatic data validation
- Structured data models with Pydantic
- Comprehensive test coverage

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern web framework
- **yfinance** - Yahoo Finance data source
- **pandas** - Data processing
- **Google Cloud Storage** - Persistent storage
- **Upstash Redis** - Caching layer
- **uv** - Fast Python package management

## Prerequisites

1. **Google Cloud Storage Setup**
   - Create a GCP project and bucket
   - Create a service account with Storage Admin permissions
   - Download the service account JSON key
   - See [docs/GCS_SETUP.md](docs/GCS_SETUP.md) for detailed instructions

2. **Upstash Redis Setup** (Optional but recommended)
   - Create a free Upstash account
   - Create a Redis database
   - Copy the connection URL and token

## Development Setup

```bash
# 1. Install dependencies with uv
uv sync

# 2. Set up credentials
cp .env.example .env
# Edit .env with your GCS and Redis credentials

# 3. Place GCS service account key
cp /path/to/your-service-account.json ./credentials/gcs-service-account.json

# 4. Run the service locally
uv run uvicorn app.main:app --reload --port 9000

# 5. Run tests
uv run pytest
```

## Key Features

### Automatic Gap Filling
The service automatically handles gap filling when downloading data:
- **Incremental Downloads**: When downloading overlapping date ranges, the service merges data seamlessly
- **No Duplicate Data**: Existing data points are preserved, only missing dates are filled
- **Holiday Awareness**: The service understands US market holidays and doesn't treat them as gaps
- **Cache Invalidation**: After each download, the cache is automatically invalidated to ensure fresh data

**Example Gap Filling Scenario:**
```bash
# Download January 2022
curl "http://localhost:9000/api/v1/download/AAPL?start_date=2022-01-10&end_date=2022-01-30"

# Download May-August 2022 (gap between Jan and May)
curl "http://localhost:9000/api/v1/download/AAPL?start_date=2022-05-01&end_date=2022-08-01"

# Download full 20 years (automatically fills all gaps)
curl "http://localhost:9000/api/v1/download/AAPL?start_date=2005-01-01&end_date=2025-12-31"

# Result: Complete data with no gaps for all trading days
```

### Weekly Data Aggregation
The service automatically generates weekly aggregated data from daily data:
- **Automatic Processing**: Weekly data is generated immediately after daily data downloads
- **Monday-Friday Trading Weeks**: Weekly boundaries follow standard Monday-Friday trading weeks
- **Partial Week Handling**: Correctly handles holidays and partial trading weeks
- **OHLCV Aggregation**: 
  - Open: Monday's opening price
  - High: Highest price of the week
  - Low: Lowest price of the week
  - Close: Friday's closing price (or last trading day)
  - Volume: Sum of daily volumes
- **Data Consistency**: Weekly volume always equals the sum of daily volumes for validation

**Example Weekly Data Usage:**
```bash
# Get weekly data for a symbol
curl http://localhost:9000/api/v1/weekly/AAPL

# Sync weekly data for existing daily data
curl -X POST http://localhost:9000/api/v1/sync/weekly/AAPL

# Check sync status
curl http://localhost:9000/api/v1/sync/weekly/status
```

## API Endpoints

### Health Check
```
GET /health
GET /api/v1/health
```

### Download Data

#### 1. Single Symbol Download
```
GET /api/v1/download/{symbol}
```

Downloads EOD data for a single stock/ETF symbol and stores in Google Cloud Storage.

**Parameters:**
- `symbol` (path parameter): Stock symbol (e.g., AAPL, GOOGL, SPY)
- `period` (query parameter, optional): Download period - "1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max" (default: "1y")
- `start_date` (query parameter, optional): Start date in YYYY-MM-DD format
- `end_date` (query parameter, optional): End date in YYYY-MM-DD format

**Example Requests:**
```bash
# Download last year of data (default)
curl http://localhost:9000/api/v1/download/AAPL

# Download specific period
curl "http://localhost:9000/api/v1/download/AAPL?period=5y"

# Download specific date range
curl "http://localhost:9000/api/v1/download/AAPL?start_date=2024-01-01&end_date=2024-12-12"

# Download maximum available data
curl "http://localhost:9000/api/v1/download/AAPL?period=max"
```

**Response:**
```json
{
  "status": "success",
  "symbol": "AAPL",
  "records": 252,
  "start_date": "2023-12-12",
  "end_date": "2024-12-12",
  "file_path": "gs://AAPL.json"
}
```

#### 2. Bulk Download
```
POST /api/v1/bulk-download
```

Downloads EOD data for multiple symbols in one request.

**Request Body:**
```json
{
  "symbols": ["AAPL", "GOOGL", "MSFT"],
  "start_date": "2024-01-01",  // optional
  "end_date": "2024-12-12"     // optional
}
```

**Constraints:**
- Maximum 50 symbols per request
- Symbols are automatically converted to uppercase

**Example Request:**
```bash
curl -X POST http://localhost:9000/api/v1/bulk-download \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "GOOGL", "MSFT", "AMZN", "SPY"],
    "start_date": "2024-01-01",
    "end_date": "2024-12-12"
  }'
```

**Response:**
```json
{
  "status": "completed",
  "total_symbols": 5,
  "successful": ["AAPL", "GOOGL", "MSFT", "AMZN", "SPY"],
  "failed": [],
  "download_time": "2024-12-12T14:30:00"
}
```

### Retrieve Data

#### 1. Get Symbol Data
```
GET /api/v1/data/{symbol}
```

Retrieves stored daily data for a symbol from GCS with Redis caching.

**Parameters:**
- `symbol` (path parameter): Stock symbol
- `start_date` (query parameter, optional): Filter data from this date
- `end_date` (query parameter, optional): Filter data until this date

**Example Requests:**
```bash
# Get all data
curl http://localhost:9000/api/v1/data/AAPL

# Get data for specific date range
curl "http://localhost:9000/api/v1/data/AAPL?start_date=2024-01-01&end_date=2024-12-31"
```

#### 2. Get Latest Price
```
GET /api/v1/data/{symbol}/latest
```

Get the latest price for a symbol with aggressive caching (5-minute TTL).

**Example Request:**
```bash
curl http://localhost:9000/api/v1/data/AAPL/latest
```

**Response:**
```json
{
  "symbol": "AAPL",
  "date": "2024-12-12",
  "price": 195.71,
  "open": 194.52,
  "high": 195.98,
  "low": 194.18,
  "volume": 48087703,
  "change": 1.19,
  "change_percent": 0.61
}
```

#### 3. Get Recent Data
```
GET /api/v1/data/{symbol}/recent
```

Get recent trading days data with caching (1-hour TTL). Can be used in two ways:
1. With 'days' parameter - returns last N days of data
2. With 'start_date' and/or 'end_date' - returns data within date range

**Parameters:**
- `days` (query parameter, optional): Number of recent days (1-3650, default: 300)
- `start_date` (query parameter, optional): Start date for data range (YYYY-MM-DD)
- `end_date` (query parameter, optional): End date for data range (YYYY-MM-DD)

**Note:** If both days and date range are provided, date range takes precedence.

**Example Requests:**
```bash
# Get last 300 days (default)
curl http://localhost:9000/api/v1/data/AAPL/recent

# Get last 30 days
curl "http://localhost:9000/api/v1/data/AAPL/recent?days=30"

# Get data for Q1 2025
curl "http://localhost:9000/api/v1/data/AAPL/recent?start_date=2025-01-01&end_date=2025-03-31"

# Get data from specific date to today
curl "http://localhost:9000/api/v1/data/AAPL/recent?start_date=2024-01-01"
```

**Response:**
```json
{
  "symbol": "AAPL",
  "days": 300,
  "data_points": [
    {
      "date": "2024-11-18",
      "open": 189.45,
      "high": 191.23,
      "low": 189.12,
      "close": 190.87,
      "adj_close": 190.87,
      "volume": 52341000
    }
    // ... more data points
  ],
  "start_date": "2024-11-18",
  "end_date": "2025-09-12",
  "record_count": 207
}
```

#### 4. List Available Symbols
```
GET /api/v1/list
```

Returns all symbols that have stored data in GCS with caching (6-hour TTL).

**Example Request:**
```bash
curl http://localhost:9000/api/v1/list
```

**Response:**
```json
{
  "symbols": ["AAPL", "GOOGL", "MSFT", "SPY", "QQQ"],
  "count": 5
}
```

### Weekly Data Endpoints

#### 1. Get Weekly Data
```
GET /api/v1/weekly/{symbol}
```

Retrieves weekly aggregated data for a symbol.

**Parameters:**
- `symbol` (path parameter): Stock symbol
- `start_date` (query parameter, optional): Filter data from this date
- `end_date` (query parameter, optional): Filter data until this date

**Example Requests:**
```bash
# Get all weekly data
curl http://localhost:9000/api/v1/weekly/AAPL

# Get weekly data for specific date range
curl "http://localhost:9000/api/v1/weekly/AAPL?start_date=2024-01-01&end_date=2024-12-31"
```

**Response:**
```json
{
  "symbol": "AAPL",
  "data_type": "weekly",
  "data_points": [
    {
      "week_start": "2024-12-09",
      "week_end": "2024-12-13",
      "open": 194.52,
      "high": 195.98,
      "low": 194.18,
      "close": 195.71,
      "adj_close": 195.71,
      "volume": 245638515,
      "trading_days": 5
    }
    // ... more weekly data points
  ],
  "start_date": "2024-01-01",
  "end_date": "2024-12-13",
  "record_count": 50
}
```

#### 2. Get Latest Weekly Data
```
GET /api/v1/weekly/{symbol}/latest
```

Get the latest weekly data point for a symbol.

**Example Request:**
```bash
curl http://localhost:9000/api/v1/weekly/AAPL/latest
```

**Response:**
```json
{
  "symbol": "AAPL",
  "week_start": "2024-12-09",
  "week_end": "2024-12-13",
  "open": 194.52,
  "high": 195.98,
  "low": 194.18,
  "close": 195.71,
  "adj_close": 195.71,
  "volume": 245638515,
  "trading_days": 5,
  "change": 1.19,
  "change_percent": 0.61
}
```

### Sync Endpoints

#### 1. Sync Weekly Data for Symbol
```
POST /api/v1/sync/weekly/{symbol}
```

Generate weekly data from existing daily data for a specific symbol.

**Parameters:**
- `symbol` (path parameter): Stock symbol
- `force` (query parameter, optional): Force regeneration even if weekly data exists (default: false)

**Example Request:**
```bash
# Sync weekly data for AAPL
curl -X POST http://localhost:9000/api/v1/sync/weekly/AAPL

# Force regeneration
curl -X POST "http://localhost:9000/api/v1/sync/weekly/AAPL?force=true"
```

#### 2. Sync All Weekly Data
```
POST /api/v1/sync/weekly
```

Generate weekly data for all symbols that have daily data.

**Parameters:**
- `force` (query parameter, optional): Force regeneration even if weekly data exists (default: false)

**Example Request:**
```bash
# Sync all symbols
curl -X POST http://localhost:9000/api/v1/sync/weekly

# Force regeneration for all
curl -X POST "http://localhost:9000/api/v1/sync/weekly?force=true"
```

#### 3. Get Sync Status
```
GET /api/v1/sync/weekly/status
```

Check the status of weekly data synchronization.

**Example Request:**
```bash
curl http://localhost:9000/api/v1/sync/weekly/status
```

**Response:**
```json
{
  "status": "success",
  "message": "Weekly data sync status",
  "data": {
    "total_symbols_with_daily": 10,
    "total_symbols_with_weekly": 8,
    "symbols_missing_weekly": 2,
    "missing_symbols": ["TSLA", "NVDA"],
    "sync_percentage": 80.0
  }
}
```

### Delete Endpoints

#### 1. Delete Symbol Data
```
DELETE /api/v1/symbol/{symbol}
```

Delete all data (daily and weekly) for a specific symbol.

**Example Request:**
```bash
curl -X DELETE http://localhost:9000/api/v1/symbol/AAPL
```

**Response:**
```json
{
  "status": "success",
  "message": "Successfully deleted data for AAPL",
  "data": {
    "symbol": "AAPL",
    "daily_deleted": true,
    "weekly_deleted": true,
    "cache_cleared": true,
    "errors": []
  }
}
```

#### 2. Delete Multiple Symbols
```
DELETE /api/v1/symbols
```

Delete data for multiple symbols in one request.

**Request Body:**
```json
["AAPL", "GOOGL", "MSFT"]
```

**Example Request:**
```bash
curl -X DELETE http://localhost:9000/api/v1/symbols \
  -H "Content-Type: application/json" \
  -d '["AAPL", "GOOGL", "MSFT"]'
```

**Response:**
```json
{
  "status": "completed",
  "message": "Deleted 3 symbols, failed: 0",
  "data": {
    "total": 3,
    "successful": 3,
    "failed": 0,
    "details": [
      {
        "symbol": "AAPL",
        "daily_deleted": true,
        "weekly_deleted": true,
        "cache_cleared": true,
        "errors": []
      }
      // ... more symbol results
    ]
  }
}
```

## Environment Variables

### Core Settings
- `ENVIRONMENT`: Development/Production mode
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR)
- `DATA_DIRECTORY`: Directory to store downloaded data (legacy)
- `DEFAULT_DATA_FORMAT`: Default storage format (json/csv)
- `RATE_LIMIT_CALLS`: Max API calls per period
- `RATE_LIMIT_PERIOD`: Rate limit period in seconds

### Google Cloud Storage
- `GCS_BUCKET_NAME`: GCS bucket name for data storage
- `GCS_PROJECT_ID`: Google Cloud project ID
- `GCS_CREDENTIALS_PATH`: Path to service account JSON file

### Upstash Redis Cache
- `UPSTASH_REDIS_URL`: Upstash Redis REST API URL (e.g., https://your-instance.upstash.io)
- `UPSTASH_REDIS_TOKEN`: Upstash Redis REST API token
- `CACHE_ENABLED`: Enable/disable caching (true/false)

## Docker

```bash
# Build the image
docker build -t stock-data-service .

# Run the container
docker run -p 9000:9000 stock-data-service
```

### Docker Compose (Recommended)

When using Docker Compose, the service runs on port 9001 (mapped from internal port 9000):

```bash
# Access the service
curl http://localhost:9001/health

# Download data
curl http://localhost:9001/api/v1/download/AAPL

# View API documentation
# Open http://localhost:9001/docs in your browser
```

## Data Storage

Data is stored in the following structure:
```
data/
   stocks/
       AAPL/
          AAPL_20240101_120000.json
          AAPL_20240102_120000.json
       GOOGL/
           GOOGL_20240101_120000.json
```

Each file contains:
- Symbol information
- Date range of data
- Array of daily price data (open, high, low, close, adjusted close, volume)
- Download metadata

## Data Storage Architecture

### Google Cloud Storage Structure
Data is stored in Google Cloud Storage with the following organization:
```
gs://your-bucket-name/
├── stock-data/
│   ├── daily/
│   │   ├── AAPL.json      # Complete historical daily data for Apple
│   │   ├── GOOGL.json     # Complete historical daily data for Google
│   │   └── [symbol].json
│   ├── weekly/            # Weekly aggregated data (auto-generated from daily)
│   │   ├── AAPL.json      # Weekly data for Apple
│   │   ├── GOOGL.json     # Weekly data for Google
│   │   └── [symbol].json
│   └── metadata/          # System metadata
│       ├── profile.json
│       └── symbol-index.json
```

### Data File Format
Each JSON file contains:
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

### Caching Strategy

The service uses Upstash Redis with REST API for efficient caching:

- **Latest Price**: 5-minute TTL for real-time data
- **Recent Data**: 1-hour TTL for charts and analysis
- **Symbol List**: 6-hour TTL for available symbols
- **Full Data**: Cached on first request, cleared on updates

Cache keys follow the pattern: `{data_type}:{operation}:{symbol}`
Example: `price:latest:AAPL`, `data:recent:GOOGL`

## Rate Limiting

The service implements rate limiting to respect Yahoo Finance API limits:
- Default: 5 calls per second
- Automatic retry with backoff when rate limit is reached
- Configurable via environment variables

## API Documentation

When running the service, you can access the interactive API documentation:
- Swagger UI: http://localhost:9000/docs (local) or http://localhost:9001/docs (Docker)
- ReDoc: http://localhost:9000/redoc (local) or http://localhost:9001/redoc (Docker)

## Deployment

### Google Cloud Run

1. **Build and push Docker image:**
```bash
# Build locally
docker build -t stevenjiangnz/jnet-stock-data:latest .

# Push to Docker Hub
docker push stevenjiangnz/jnet-stock-data:latest
```

2. **Deploy to Cloud Run:**
```bash
# Deploy using the deployment script
./scripts/deploy-stock-data.sh YOUR_PROJECT_ID

# Or manually
gcloud run deploy stock-data-service \
  --image stevenjiangnz/jnet-stock-data:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GCS_BUCKET_NAME=your-bucket,GCS_PROJECT_ID=your-project"
```

3. **Environment Variables in Cloud Run:**
   - Set via Cloud Run UI or gcloud CLI
   - Store sensitive values in Secret Manager
   - Map secrets as environment variables

## Project Status

### Phase 1: Google Cloud Storage Integration (Completed ✅)
- ✅ GCS storage manager with atomic writes
- ✅ Data model validation with Pydantic
- ✅ Migration of all storage operations
- ✅ Upstash Redis caching layer
- ✅ Comprehensive test coverage
- ✅ CI/CD pipeline with GitHub Actions

### Phase 2: Weekly Data Aggregation (Completed ✅)
- ✅ Weekly data aggregation from daily data
- ✅ Automatic weekly processing after downloads
- ✅ API endpoints for weekly data retrieval
- ✅ Sync endpoints for existing data
- ✅ Cache management for weekly data

### Phase 3: Cloud Run Deployment (Next)
- Deploy to Google Cloud Run
- Configure production environment
- Set up monitoring and alerting
- Implement health checks

### Phase 4: Advanced Features (Future)
- Monthly data aggregation
- Technical indicators calculation
- Batch processing improvements
- Data export features

## Troubleshooting

### Common Issues

1. **GCS Authentication Error**
   ```
   google.auth.exceptions.DefaultCredentialsError
   ```
   **Solution**: Ensure GCS credentials file exists and path is correct in .env

2. **Redis Connection Failed**
   ```
   Failed to connect to Redis
   ```
   **Solution**: Verify Upstash Redis URL and token are correct

3. **Rate Limit Exceeded**
   ```
   Too many requests to Yahoo Finance
   ```
   **Solution**: Reduce request frequency or wait before retrying

### Testing

Run the test suite with coverage:
```bash
# Run all tests
uv run pytest

# Run with coverage report
uv run pytest --cov=app

# Run specific test file
uv run pytest tests/test_api.py

# Run in verbose mode
uv run pytest -v
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the JNet Solution microservices architecture
