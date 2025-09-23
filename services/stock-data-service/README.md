# Stock Data Service

A Python-based microservice for downloading and managing stock/ETF end-of-day (EOD) data from Yahoo Finance with Google Cloud Storage persistence, Redis caching, and API key authentication. Deployed on Google Cloud Run at https://stock-data-service-506487697841.us-central1.run.app/

## Features

- Download EOD data for individual stocks/ETFs from Yahoo Finance
- Bulk download support for multiple symbols
- **Automatic Weekly Data Aggregation** from daily data
- **Technical Indicators** - Automatic calculation of 11+ indicators including ADX with DI+/DI-
- **Google Cloud Storage (GCS)** for persistent data storage with atomic writes
- **Upstash Redis** caching via REST API for high-performance data access
- **API Key Authentication** for production security
- RESTful API endpoints with comprehensive documentation
- Symbol data deletion with cache invalidation
- Rate limiting to respect Yahoo Finance limits
- Automatic data validation
- Structured data models with Pydantic
- Comprehensive test coverage
- **Automatic Gap Filling** for incremental data updates

## Tech Stack

- **Python 3.11+**
- **FastAPI** - Modern web framework
- **yfinance** - Yahoo Finance data source
- **pandas** - Data processing
- **ta** - Technical Analysis indicators library
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

# 6. Run linting (Black & Ruff)
./scripts/lint.sh

# 7. Setup pre-commit hooks (optional but recommended)
./scripts/setup-pre-commit.sh
```

## Key Features

### Data Quality and Validation
The service ensures high-quality data through automatic validation:
- **Zero-Price Filtering**: Days with zero or negative prices are automatically excluded as they indicate data quality issues
- **NaN Value Handling**: Rows with missing values are skipped to maintain data integrity
- **Data Consistency**: Both full downloads and incremental updates apply the same validation rules

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

### Technical Indicators
The service automatically calculates technical indicators for all downloaded data:
- **Default Indicators**: Calculated automatically for every symbol
  - SMA_20, SMA_50 - Simple Moving Averages
  - RSI_14 - Relative Strength Index
  - MACD - Moving Average Convergence Divergence (with signal line and histogram)
  - ADX_14 - Average Directional Index (with DI+ and DI- components)
  - VOLUME_SMA_20 - 20-day Volume Moving Average
- **Additional Indicators**: Available on request
  - EMA_12, EMA_26 - Exponential Moving Averages
  - BB_20 - Bollinger Bands (upper, middle, lower)
  - ATR_14 - Average True Range
  - STOCH - Stochastic Oscillator (%K, %D)
  - OBV - On Balance Volume
  - CMF_20 - Chaikin Money Flow
  - SMA_200 - 200-day Simple Moving Average

**Indicator Sets**: Pre-configured sets for different use cases
- `default` - Standard indicators for general analysis
- `chart_basic` - Essential chart indicators (SMA_20, SMA_50, VOLUME_SMA_20)
- `chart_advanced` - Extended chart indicators including MACD, RSI, Bollinger Bands
- `chart_full` - All chart indicators including ADX, ATR, OBV
- `scan_momentum` - Momentum indicators (RSI, MACD, Stochastic)
- `scan_trend` - Trend indicators (ADX, SMAs)
- `scan_volatility` - Volatility indicators (ATR, Bollinger Bands)
- `scan_volume` - Volume indicators (OBV, Volume SMA, CMF)

## Production Usage

The service is deployed at https://stock-data-service-506487697841.us-central1.run.app/

### Authentication

All `/api/v1/*` endpoints require API key authentication in production. Include your API key in one of these ways:

```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list

# Using Authorization Bearer header
curl -H "Authorization: Bearer your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list

# Using query parameter
curl "https://stock-data-service-506487697841.us-central1.run.app/api/v1/list?api_key=your-api-key"
```

**Swagger UI Authentication**: When using the interactive API documentation at `/docs`, click the "Authorize" button and enter your API key. The authentication will persist throughout your session.

Public endpoints (no authentication required):
- `/health` - Health check
- `/docs` - Interactive API documentation
- `/openapi.json` - OpenAPI specification
- `/redoc` - Alternative API documentation

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

Retrieves stored daily data for a symbol from GCS with Redis caching, including technical indicators.

**Parameters:**
- `symbol` (path parameter): Stock symbol
- `start_date` (query parameter, optional): Filter data from this date
- `end_date` (query parameter, optional): Filter data until this date
- `indicators` (query parameter, optional): Indicators to include
  - Omit for default indicators
  - Use empty string `""` for no indicators
  - Use predefined sets: `default`, `chart_basic`, `chart_advanced`, `chart_full`, `all`
  - Use comma-separated list: `ADX_14,RSI_14,MACD`

**Example Requests:**
```bash
# Get all data with default indicators
curl http://localhost:9000/api/v1/data/AAPL

# Get data without indicators
curl "http://localhost:9000/api/v1/data/AAPL?indicators="

# Get data with all indicators
curl "http://localhost:9000/api/v1/data/AAPL?indicators=all"

# Get data with specific indicators
curl "http://localhost:9000/api/v1/data/AAPL?indicators=ADX_14,RSI_14,MACD"

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

#### 5. Get Chart Data
```
GET /api/v1/chart/{symbol}
```

Get data optimized for charting with timestamps and configurable indicators.

**Parameters:**
- `symbol` (path parameter): Stock symbol
- `period` (query parameter, optional): Time period - "3mo", "6mo", "1y", "2y", "5y" (default: "1y")
- `indicators` (query parameter, optional): Indicators to include (default: "chart_basic")
  - Use predefined sets: `chart_basic`, `chart_advanced`, `chart_full`, `default`
  - Use `all` for all available indicators
  - Use comma-separated list: `ADX_14,RSI_14,SMA_20`

**Example Requests:**
```bash
# Get 1 year of chart data with basic indicators
curl http://localhost:9000/api/v1/chart/AAPL

# Get 3 months with full indicators including ADX
curl "http://localhost:9000/api/v1/chart/AAPL?period=3mo&indicators=chart_full"

# Get 2 years with specific indicators
curl "http://localhost:9000/api/v1/chart/AAPL?period=2y&indicators=ADX_14,RSI_14,MACD"
```

**Response Format:**
```json
{
  "symbol": "AAPL",
  "period": "1y",
  "ohlc": [[timestamp, open, high, low, close], ...],
  "volume": [[timestamp, volume], ...],
  "indicators": {
    "ADX_14": {
      "ADX": [[timestamp, value], ...],
      "DI+": [[timestamp, value], ...],
      "DI-": [[timestamp, value], ...]
    },
    "RSI_14": {
      "RSI": [[timestamp, value], ...]
    }
  }
}
```

#### 6. List Available Indicators
```
GET /api/v1/indicators
```

Get all available technical indicators with their metadata and predefined sets.

**Example Request:**
```bash
curl http://localhost:9000/api/v1/indicators
```

**Response:**
```json
{
  "indicators": [
    {
      "name": "ADX_14",
      "category": "trend",
      "display_name": "Average Directional Index (14)",
      "description": "14-day ADX measuring trend strength",
      "outputs": ["ADX", "DI+", "DI-"]
    },
    // ... more indicators
  ],
  "indicator_sets": {
    "default": ["SMA_20", "SMA_50", "RSI_14", "MACD", "VOLUME_SMA_20", "ADX_14"],
    "chart_basic": ["SMA_20", "SMA_50", "VOLUME_SMA_20"],
    // ... more sets
  }
}
```

### Scanning Endpoints

#### 1. Scan Stocks
```
POST /api/v1/scan
```

Scan multiple stocks based on technical indicator conditions.

**Request Body:**
```json
{
  "symbols": ["AAPL", "GOOGL", "MSFT", "AMZN"],
  "conditions": [
    {
      "indicator": "RSI_14",
      "operator": "<",
      "value": 30
    },
    {
      "indicator": "PRICE",
      "operator": "above",
      "indicator_ref": "SMA_50"
    }
  ],
  "return_data": ["latest_price", "volume", "RSI_14"],
  "as_of_date": "2024-12-12"  // optional
}
```

**Supported Operators:**
- Numeric comparisons: `<`, `>`, `<=`, `>=`, `=`, `!=`
- Indicator comparisons: `above`, `below`
- Crossovers: `crosses_above`, `crosses_below`

**Example Request:**
```bash
# Find oversold stocks (RSI < 30) trading above their 50-day SMA
curl -X POST http://localhost:9000/api/v1/scan \
  -H "Content-Type: application/json" \
  -d '{
    "symbols": ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA"],
    "conditions": [
      {"indicator": "RSI_14", "operator": "<", "value": 30},
      {"indicator": "PRICE", "operator": "above", "indicator_ref": "SMA_50"}
    ]
  }'
```

**Response:**
```json
[
  {
    "symbol": "MSFT",
    "matches": true,
    "data": {
      "latest_price": 380.52,
      "volume": 25432100,
      "RSI_14": 28.45,
      "SMA_50": 375.20
    }
  },
  {
    "symbol": "AAPL",
    "matches": false,
    "data": {
      "latest_price": 195.71,
      "volume": 48087703,
      "RSI_14": 45.67
    }
  }
]
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
  "indicators": {
    "ADX_14": {
      "name": "ADX_14",
      "display_name": "Average Directional Index (14)",
      "category": "trend",
      "parameters": {"period": 14},
      "values": [
        {
          "date": "2024-12-12",
          "values": {
            "ADX": 35.89,
            "DI+": 29.35,
            "DI-": 14.96
          }
        }
      ]
    },
    "RSI_14": {
      "name": "RSI_14",
      "display_name": "Relative Strength Index (14)",
      "category": "momentum",
      "parameters": {"period": 14},
      "values": [
        {
          "date": "2024-12-12",
          "values": {
            "RSI": 57.36
          }
        }
      ]
    }
  },
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

### Phase 3: Technical Indicators (Completed ✅)
- ✅ Integrated ta library for technical analysis
- ✅ Automatic calculation of 11+ indicators
- ✅ ADX with DI+ and DI- components
- ✅ Chart-optimized API endpoint
- ✅ Configurable indicator sets
- ✅ Indicator calculation for both daily and weekly data

### Phase 4: Cloud Run Deployment (Next)
- Deploy to Google Cloud Run
- Configure production environment
- Set up monitoring and alerting
- Implement health checks

### Phase 5: Advanced Features (Future)
- Monthly data aggregation
- Advanced scanning endpoints
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

### Code Quality

The project uses Black for code formatting and Ruff for linting:

```bash
# Run linting checks
./scripts/lint.sh

# Auto-format code with Black
uv run black .

# Fix linting issues with Ruff
uv run ruff check --fix .

# Setup pre-commit hooks (runs automatically before commits)
./scripts/setup-pre-commit.sh
```

**Pre-commit Hooks**: Once installed, Black and Ruff will run automatically before each commit to ensure code quality.

## Deployment

### Local Deployment
```bash
# Build and run with Docker
docker build -t stock-data-service .
docker run -p 9000:9000 --env-file .env stock-data-service

# Or use Docker Compose with other services
docker-compose up stock-data-service
```

### Cloud Run Deployment
```bash
# Deploy using the deployment script (reads from .env file)
./scripts/deploy-stock-data-service.sh jnet-site

# Manual deployment
gcloud run deploy stock-data-service \
  --image stevenjiangnz/jnet-stock-data-service:latest \
  --region us-central1 \
  --allow-unauthenticated \
  --port 9000 \
  --set-env-vars "API_KEY=your-key,GCS_BUCKET_NAME=your-bucket,..."
```

### CI/CD Pipeline

The service uses GitHub Actions for automated deployment:
- **Develop branch**: Builds and pushes Docker image with `develop` tag
- **Main branch**: Creates semantic version, tags, and deploys to Cloud Run

Required GitHub Secrets:
- `STOCK_DATA_SERVICE_API_KEY`
- `GCS_BUCKET_NAME`
- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `DOCKER_HUB_TOKEN`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is part of the JNet Solution microservices architecture
