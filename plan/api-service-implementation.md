# API Service Implementation Plan

## Overview
This document outlines the implementation plan for a new API service that will serve as the central business logic layer for the JNet Solution platform. The service will handle backtesting, scanning, analysis, and notifications while integrating with the existing microservices architecture.

## Architecture Overview

### Service Positioning
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Next.js UI    │────▶│   API Service    │────▶│  Stock Data     │
│  (Frontend)     │     │ (Business Logic) │     │   Service       │
│   Port: 3110    │     │   Port: 8002     │     │  Port: 9001     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ├──────────────────┐
                               ▼                  ▼
                        ┌─────────────────┐ ┌─────────────────┐
                        │   Supabase      │ │  Notification   │
                        │  (Auth/Users)   │ │  Service        │
                        └─────────────────┘ └─────────────────┘
```

### Technology Stack
- **Language**: Python 3.11+
- **Framework**: FastAPI
- **Package Manager**: uv (for consistency with stock-data-service)
- **Backtesting**: Backtrader
- **Data Processing**: Pandas, NumPy
- **Notifications**: Pushover API, SendGrid/AWS SES
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions with semantic versioning

## Project Structure

```
services/api-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration management
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # Main API router
│   │   │   └── endpoints/
│   │   │       ├── __init__.py
│   │   │       ├── backtest.py    # Backtesting endpoints
│   │   │       ├── scan.py        # Stock scanning endpoints
│   │   │       ├── analysis.py    # Technical analysis endpoints
│   │   │       ├── alerts.py      # Alert management endpoints
│   │   │       ├── strategies.py  # Strategy management
│   │   │       └── health.py      # Health check endpoint
│   │   └── v2/                    # Future API version
│   ├── core/
│   │   ├── __init__.py
│   │   ├── backtrader/
│   │   │   ├── __init__.py
│   │   │   ├── engine.py          # Backtrader integration
│   │   │   ├── strategies/        # Trading strategies
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py        # Base strategy class
│   │   │   │   ├── momentum.py    # Momentum strategies
│   │   │   │   ├── mean_reversion.py
│   │   │   │   └── trend_following.py
│   │   │   ├── analyzers.py      # Performance analyzers
│   │   │   └── feeds.py          # Data feed adapters
│   │   ├── notifications/
│   │   │   ├── __init__.py
│   │   │   ├── manager.py         # Notification manager
│   │   │   ├── pushover.py       # Pushover integration
│   │   │   ├── email.py          # Email service
│   │   │   └── templates/        # Email templates
│   │   └── analysis/
│   │       ├── __init__.py
│   │       ├── scanner.py         # Stock scanner engine
│   │       ├── screeners.py       # Pre-built screeners
│   │       └── signals.py         # Trading signal generation
│   ├── models/
│   │   ├── __init__.py
│   │   ├── backtest.py           # Backtest data models
│   │   ├── scan.py               # Scan request/response models
│   │   ├── alert.py              # Alert models
│   │   └── strategy.py           # Strategy configuration models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── stock_data.py         # Integration with stock-data-service
│   │   ├── cache.py              # Redis cache service
│   │   ├── storage.py            # GCS storage service
│   │   └── auth.py               # Authentication service
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── auth.py               # API key authentication
│   │   ├── cors.py               # CORS configuration
│   │   └── rate_limit.py         # Rate limiting
│   └── utils/
│       ├── __init__.py
│       ├── validators.py          # Input validators
│       └── helpers.py             # Utility functions
├── cli/                           # CLI tools for local analysis
│   ├── __init__.py
│   ├── backtest_cli.py           # Interactive backtesting CLI
│   ├── scan_cli.py               # Stock scanner CLI
│   └── jupyter/                  # Jupyter notebooks for analysis
│       ├── backtest_explorer.ipynb
│       ├── strategy_development.ipynb
│       └── performance_analysis.ipynb
├── tests/
│   ├── __init__.py
│   ├── conftest.py               # Test configuration
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── fixtures/                 # Test data
├── scripts/
│   ├── setup.sh                  # Setup script
│   ├── lint.sh                   # Linting script
│   ├── test.sh                   # Test runner
│   ├── deploy.sh                 # Deployment script
│   └── run_local_backtest.py    # Local backtesting script
├── docs/
│   ├── API.md                    # API documentation
│   ├── STRATEGIES.md             # Strategy development guide
│   ├── DEPLOYMENT.md             # Deployment guide
│   └── LOCAL_DEVELOPMENT.md      # Local development guide
├── Dockerfile                    # Production Dockerfile
├── Dockerfile.dev               # Development Dockerfile
├── pyproject.toml              # Project dependencies (uv)
├── .env.example                # Environment variables example
├── .gitignore
└── README.md

```

## Implementation Phases

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED
- [x] Create project structure
- [x] Set up FastAPI application skeleton
- [x] Configure uv for dependency management
- [x] Create basic health endpoints
- [x] Set up development environment
- [x] Configure Docker for local development
- [x] Integrate with stock-data-service
- [x] Set up authentication middleware

### Phase 2: CI/CD Pipeline (Week 2) ✅ COMPLETED
- [x] Create GitHub Actions workflow for develop branch
- [x] Create GitHub Actions workflow for main branch
- [x] Implement semantic versioning
- [x] Set up automated testing
- [x] Configure Docker Hub integration
- [x] Create Cloud Run deployment scripts
- [x] Set up environment-specific configurations

### Phase 2.5: Stock Data Integration ✅ COMPLETED
- [x] Create stock data endpoints for frontend
- [x] Implement OHLCV data formatting
- [x] Add quote endpoints
- [x] Create Highcharts-ready data formatting
- [x] Implement technical indicator calculations
- [x] Add batch quote support
- [x] Create frontend integration documentation

### Phase 3: Backtesting Engine (Week 3-4)
- [ ] Integrate Backtrader library
- [ ] Create data feed adapters for stock-data-service
- [ ] Implement base strategy class
- [ ] Create initial trading strategies
- [ ] Build performance analyzers
- [ ] Create backtesting API endpoints
- [ ] Add result storage in GCS
- [ ] Implement backtesting job queue

### Phase 4: Scanning & Analysis (Week 5-6)
- [ ] Create stock scanner engine
- [ ] Implement technical indicator screening
- [ ] Build pre-configured screeners
- [ ] Create signal generation system
- [ ] Add scan result caching
- [ ] Implement batch scanning
- [ ] Create analysis API endpoints
- [ ] Add real-time scan capabilities

### Phase 5: Notifications System (Week 7)
- [ ] Set up Pushover integration
- [ ] Configure email service (SendGrid/AWS SES)
- [ ] Create notification templates
- [ ] Build alert management system
- [ ] Implement alert triggering logic
- [ ] Add notification preferences
- [ ] Create notification API endpoints
- [ ] Add notification history

### Phase 6: Local Development Tools (Week 8)
- [ ] Create interactive CLI for backtesting
- [ ] Build Jupyter notebook templates
- [ ] Add strategy development tools
- [ ] Create performance visualization
- [ ] Build data exploration utilities
- [ ] Add strategy optimization tools
- [ ] Create documentation
- [ ] Add example strategies

### Phase 7: Integration & Testing (Week 9)
- [ ] Full integration testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation completion
- [ ] Frontend integration
- [ ] End-to-end testing
- [ ] User acceptance testing

### Phase 8: Deployment (Week 10)
- [ ] Deploy to Cloud Run staging
- [ ] Configure production environment
- [ ] Set up monitoring
- [ ] Configure alerts
- [ ] Performance tuning
- [ ] Deploy to production
- [ ] Post-deployment verification
- [ ] Documentation updates

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Develop Branch Workflow
```yaml
name: API Service - Develop
on:
  push:
    branches: [develop]
    paths:
      - 'services/api-service/**'
      - '.github/workflows/api-service-develop.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install uv
        run: pip install uv
      - name: Install dependencies
        run: cd services/api-service && uv sync
      - name: Run tests
        run: cd services/api-service && uv run pytest
      - name: Run linting
        run: cd services/api-service && ./scripts/lint.sh

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: |
          cd services/api-service
          docker build -t ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:develop .
      - name: Push to Docker Hub
        run: |
          echo ${{ secrets.DOCKER_HUB_TOKEN }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:develop
```

#### 2. Main Branch Workflow (with Semantic Versioning)
```yaml
name: API Service - Production
on:
  push:
    branches: [main]
    paths:
      - 'services/api-service/**'
      - '.github/workflows/api-service-main.yml'

jobs:
  version:
    runs-on: ubuntu-latest
    outputs:
      version: ${{ steps.version.outputs.version }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Calculate version
        id: version
        run: |
          # Get latest tag for api-service
          LATEST_TAG=$(git tag -l "api-service-v*" | sort -V | tail -n1)
          if [ -z "$LATEST_TAG" ]; then
            VERSION="1.0.0"
          else
            # Extract version and increment
            CURRENT_VERSION=${LATEST_TAG#api-service-v}
            VERSION=$(echo $CURRENT_VERSION | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT

  build-and-deploy:
    needs: version
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build and push Docker image
        run: |
          cd services/api-service
          docker build -t ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:latest \
                       -t ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:${{ needs.version.outputs.version }} .
          echo ${{ secrets.DOCKER_HUB_TOKEN }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:latest
          docker push ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:${{ needs.version.outputs.version }}
      
      - name: Deploy to Cloud Run
        run: |
          echo ${{ secrets.GCP_SA_KEY }} | base64 -d > /tmp/gcp-key.json
          gcloud auth activate-service-account --key-file=/tmp/gcp-key.json
          gcloud run deploy api-service \
            --image ${{ secrets.DOCKER_USERNAME }}/jnet-api-service:${{ needs.version.outputs.version }} \
            --region us-central1 \
            --platform managed \
            --allow-unauthenticated \
            --set-env-vars "ENVIRONMENT=production,API_KEY=${{ secrets.API_SERVICE_KEY }}"
      
      - name: Create Release
        uses: actions/create-release@v1
        with:
          tag_name: api-service-v${{ needs.version.outputs.version }}
          release_name: API Service v${{ needs.version.outputs.version }}
          draft: false
          prerelease: false
```

## Local Development Setup

### Interactive Backtesting Environment

#### 1. CLI Tool
```python
# cli/backtest_cli.py
import click
from rich.console import Console
from rich.table import Table
import backtrader as bt

@click.command()
@click.option('--symbol', '-s', multiple=True, required=True)
@click.option('--strategy', '-st', default='momentum')
@click.option('--period', '-p', default='1y')
@click.option('--cash', '-c', default=10000)
@click.option('--interactive', '-i', is_flag=True)
def backtest(symbol, strategy, period, cash, interactive):
    """Run backtests with interactive analysis"""
    if interactive:
        # Launch interactive IPython session
        from IPython import embed
        embed()
    else:
        # Run standard backtest
        run_backtest(symbol, strategy, period, cash)
```

#### 2. Jupyter Integration
```bash
# Install Jupyter in development
uv add jupyter jupyterlab pandas matplotlib

# Launch Jupyter Lab
uv run jupyter lab --notebook-dir=cli/jupyter
```

#### 3. Docker Compose for Local Development
```yaml
# docker-compose.override.yml
services:
  api-service:
    build:
      context: ./services/api-service
      dockerfile: Dockerfile.dev
    ports:
      - "8002:8002"
      - "8888:8888"  # Jupyter port
    volumes:
      - ./services/api-service:/app
      - api-service-jupyter:/app/notebooks
    environment:
      - ENVIRONMENT=development
      - JUPYTER_ENABLE=true
    command: >
      sh -c "uvicorn app.main:app --reload --host 0.0.0.0 --port 8002 &
             jupyter lab --ip=0.0.0.0 --port=8888 --no-browser --allow-root"

volumes:
  api-service-jupyter:
```

## API Endpoints

### Backtesting
- `POST /api/v1/backtest` - Run a backtest
- `GET /api/v1/backtest/{id}` - Get backtest results
- `GET /api/v1/backtest/{id}/report` - Get detailed report
- `POST /api/v1/backtest/optimize` - Run parameter optimization
- `GET /api/v1/strategies` - List available strategies
- `POST /api/v1/strategies` - Create custom strategy

### Scanning
- `POST /api/v1/scan` - Run a stock scan
- `GET /api/v1/scan/presets` - Get preset scanners
- `POST /api/v1/scan/schedule` - Schedule recurring scan
- `GET /api/v1/scan/results/{id}` - Get scan results

### Analysis
- `POST /api/v1/analyze/signals` - Generate trading signals
- `GET /api/v1/analyze/correlation` - Correlation analysis
- `POST /api/v1/analyze/pattern` - Pattern recognition

### Alerts
- `POST /api/v1/alerts` - Create alert
- `GET /api/v1/alerts` - List alerts
- `PUT /api/v1/alerts/{id}` - Update alert
- `DELETE /api/v1/alerts/{id}` - Delete alert
- `GET /api/v1/alerts/history` - Alert history

### Notifications
- `GET /api/v1/notifications/settings` - Get settings
- `PUT /api/v1/notifications/settings` - Update settings
- `POST /api/v1/notifications/test` - Send test notification

## Environment Variables

```bash
# .env.example
# Application
ENVIRONMENT=development
LOG_LEVEL=INFO
API_KEY=your-api-key

# Services
STOCK_DATA_SERVICE_URL=http://stock-data-service:9000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# Google Cloud Storage
GCS_BUCKET_NAME=jnet-api-service
GCS_PROJECT_ID=your-project-id
GCS_CREDENTIALS_PATH=./credentials/gcs-service-account.json

# Redis Cache
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token

# Notifications
PUSHOVER_APP_TOKEN=your-app-token
PUSHOVER_USER_KEY=your-user-key
SENDGRID_API_KEY=your-sendgrid-key
EMAIL_FROM=noreply@your-domain.com

# Backtesting
BACKTEST_MAX_WORKERS=4
BACKTEST_TIMEOUT=300

# Rate Limiting
RATE_LIMIT_CALLS=100
RATE_LIMIT_PERIOD=60
```

## Deployment Configuration

### Cloud Run Settings
```bash
# Deployment script
gcloud run deploy api-service \
  --image docker.io/stevenjiangnz/jnet-api-service:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account api-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO" \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 100 \
  --min-instances 0 \
  --max-instances 10
```

### Monitoring & Logging
- Google Cloud Logging for application logs
- Google Cloud Monitoring for metrics
- Custom alerts for:
  - High error rates
  - Slow response times
  - Failed backtests
  - Notification failures

## Security Considerations

1. **API Authentication**
   - API key required for all endpoints
   - JWT tokens for user-specific operations
   - Rate limiting per API key

2. **Data Security**
   - Encrypted storage in GCS
   - Secure credential management
   - Input validation and sanitization

3. **Network Security**
   - HTTPS only in production
   - CORS configuration for frontend
   - IP allowlisting for sensitive operations

## Performance Optimization

1. **Caching Strategy**
   - Redis for frequently accessed data
   - Local memory cache for strategies
   - GCS for backtest results

2. **Async Processing**
   - Background tasks for long-running backtests
   - Queue system for batch operations
   - WebSocket for real-time updates

3. **Resource Management**
   - Connection pooling
   - Memory limits for backtests
   - Automatic cleanup of old results

## Monitoring & Maintenance

1. **Health Checks**
   - `/health` - Basic health
   - `/health/ready` - Readiness check
   - `/health/dependencies` - Service dependencies

2. **Metrics**
   - Request latency
   - Backtest execution time
   - Queue lengths
   - Error rates

3. **Alerts**
   - Service downtime
   - High error rates
   - Resource exhaustion
   - Failed deployments

## Documentation

1. **API Documentation**
   - OpenAPI/Swagger at `/docs`
   - ReDoc at `/redoc`
   - Postman collection

2. **Developer Guides**
   - Strategy development guide
   - Local development setup
   - Deployment procedures
   - Troubleshooting guide

## Timeline

- **Month 1**: Foundation, CI/CD, and Backtesting Engine
- **Month 2**: Scanning, Analysis, and Notifications
- **Month 3**: Local Tools, Integration, Testing, and Deployment

## Success Criteria

1. **Functional Requirements**
   - All API endpoints operational
   - Backtesting engine processing strategies
   - Notifications delivering successfully
   - Frontend fully integrated

2. **Performance Requirements**
   - API response time < 200ms (p95)
   - Backtest completion < 5 minutes
   - 99.9% uptime SLA

3. **Quality Requirements**
   - 80%+ test coverage
   - Zero critical security vulnerabilities
   - Comprehensive documentation
   - Automated deployment pipeline