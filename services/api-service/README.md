# JNet API Service

Business logic layer for JNet Solution platform, providing backtesting, scanning, analysis, and notification capabilities.

## Features

- **Backtesting Engine**: Run trading strategies with Backtrader
- **Stock Scanner**: Find stocks matching specific criteria
- **Technical Analysis**: Generate trading signals and patterns
- **Alert System**: Create and manage price/indicator alerts
- **Notifications**: Push notifications via Pushover and email
- **Stock Data API**: Formatted data for frontend charts with technical indicators
- **Real-time Quotes**: Current market prices and changes
- **Indicator Calculations**: SMA, EMA, RSI, MACD, Bollinger Bands, and more

## Quick Start

### Local Development

1. Set up the environment:
```bash
./scripts/setup.sh
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
uv run uvicorn app.main:app --reload
```

### Docker Development

```bash
docker-compose up api-service
```

## API Documentation

- Swagger UI: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

## Testing

Run tests:
```bash
./scripts/test.sh
```

Run linting:
```bash
./scripts/lint.sh
```

## Deployment

Deploy to production:
```bash
./scripts/deploy.sh <version>
```

## Architecture

- **Framework**: FastAPI
- **Backtesting**: Backtrader
- **Data Processing**: Pandas, NumPy
- **Notifications**: Pushover, SendGrid
- **Deployment**: Google Cloud Run

## API Endpoints

### Health
- `GET /health` - Basic health check
- `GET /api/v1/health/ready` - Readiness check
- `GET /api/v1/health/dependencies` - Dependencies status

### Backtesting
- `POST /api/v1/backtest` - Run a backtest
- `GET /api/v1/backtest/{id}` - Get backtest results
- `GET /api/v1/strategies` - List available strategies

### Scanning
- `POST /api/v1/scan` - Run a stock scan
- `GET /api/v1/scan/presets` - Get preset scanners

### Analysis
- `POST /api/v1/analyze/signals` - Generate trading signals
- `POST /api/v1/analyze/correlation` - Correlation analysis

### Stock Data
- `GET /api/v1/stock/{symbol}/data` - Get OHLCV data
- `GET /api/v1/stock/{symbol}/quote` - Get current quote
- `POST /api/v1/stock/{symbol}/chart` - Get chart data with indicators
- `POST /api/v1/stock/batch/quotes` - Get multiple quotes

### Alerts
- `POST /api/v1/alerts` - Create alert
- `GET /api/v1/alerts` - List alerts
- `PUT /api/v1/alerts/{id}` - Update alert
- `DELETE /api/v1/alerts/{id}` - Delete alert