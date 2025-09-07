# Stock/ETF Data Downloader Service Implementation Plan

## Overview
This document outlines the implementation plan for adding a Stock/ETF Data Downloader Service to the JNet Solution microservices architecture.

## Service Specifications
- **Service Name**: stock-data-service
- **Port**: 9000 (internal), 9001 (Docker exposed)
- **Technology**: Python 3.11+ with FastAPI
- **Data Source**: Yahoo Finance (via yfinance)
- **Storage**: Local filesystem (CSV/JSON)

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-3)

#### 1.1 Project Structure Setup
```
services/stock-data-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application
│   ├── config.py               # Configuration settings
│   ├── models/
│   │   ├── __init__.py
│   │   ├── stock.py           # Pydantic models
│   │   └── responses.py       # Response models
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── download.py
│   │   │   │   ├── data.py
│   │   │   │   └── health.py
│   │   │   └── router.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── data_fetcher.py    # yfinance integration
│   │   ├── storage_manager.py # File system management
│   │   └── exceptions.py
│   └── utils/
│       ├── __init__.py
│       └── validators.py
├── tests/
│   ├── __init__.py
│   ├── test_api.py
│   ├── test_data_fetcher.py
│   └── test_storage_manager.py
├── requirements.txt
├── requirements-dev.txt
├── Dockerfile
├── Dockerfile.dev
├── .env.example
├── .gitignore
└── README.md
```

#### 1.2 Dependencies
```
# requirements.txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
yfinance==0.2.33
pandas==2.1.4
pydantic==2.5.3
python-dotenv==1.0.0
httpx==0.26.0
python-multipart==0.0.6

# requirements-dev.txt
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
black==23.12.1
flake8==7.0.0
mypy==1.8.0
```

### Phase 2: Core Functionality (Days 4-7)

#### 2.1 Data Models
- StockSymbol model
- EODData model
- BulkDownloadRequest model
- APIResponse models

#### 2.2 Core Modules
- **Data Fetcher**: yfinance wrapper with error handling, retry logic, rate limiting
- **Storage Manager**: File organization, format conversion (CSV/JSON), data retention
- **Validators**: Symbol validation, date range validation

#### 2.3 API Endpoints
1. `GET /health` - Health check
2. `GET /api/v1/download/{symbol}` - Download single symbol
3. `GET /api/v1/data/{symbol}` - Retrieve stored data
4. `GET /api/v1/list` - List available symbols
5. `POST /api/v1/bulk-download` - Bulk download multiple symbols
6. `DELETE /api/v1/data/{symbol}` - Delete symbol data

### Phase 3: Docker & Integration (Days 8-10)

#### 3.1 Docker Configuration

**Dockerfile.dev**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt requirements-dev.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt -r requirements-dev.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 9000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000", "--reload"]
```

**Dockerfile** (production):
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt ./

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 9000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
```

#### 3.2 Docker Compose Integration
Update `docker-compose.yml`:
```yaml
stock-data-service:
  build:
    context: ./services/stock-data-service
    dockerfile: Dockerfile.dev
  ports:
    - "9001:9000"
  volumes:
    - ./services/stock-data-service:/app
    - stock-data:/app/data
    - /app/__pycache__
  environment:
    - ENVIRONMENT=development
    - LOG_LEVEL=DEBUG
    - DATA_DIRECTORY=/app/data
  networks:
    - app-network
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s

volumes:
  stock-data:
```

### Phase 4: CI/CD Setup (Days 11-13)

#### 4.1 GitHub Actions Workflows

Create `.github/workflows/stock-data-service-ci.yml`:
```yaml
name: Stock Data Service CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'services/stock-data-service/**'
      - '.github/workflows/stock-data-service-*.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'services/stock-data-service/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: ./services/stock-data-service
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt -r requirements-dev.txt
      
      - name: Run linting
        working-directory: ./services/stock-data-service
        run: |
          black --check .
          flake8 .
          mypy app/
      
      - name: Run tests
        working-directory: ./services/stock-data-service
        run: |
          pytest tests/ -v --cov=app --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./services/stock-data-service/coverage.xml
          flags: stock-data-service
```

Create `.github/workflows/stock-data-service-build.yml`:
```yaml
name: Stock Data Service Build & Push

on:
  push:
    branches: [develop]
    paths:
      - 'services/stock-data-service/**'
      - '.github/workflows/stock-data-service-*.yml'

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Get service version
        id: version
        working-directory: ./services/stock-data-service
        run: |
          VERSION=$(grep "VERSION" app/config.py | cut -d'"' -f2)
          echo "version=$VERSION" >> $GITHUB_OUTPUT
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME || 'stevenjiangnz' }}
          password: ${{ secrets.DOCKER_HUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./services/stock-data-service
          file: ./services/stock-data-service/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME || 'stevenjiangnz' }}/jnet-stock-data-service:${{ steps.version.outputs.version }}
            ${{ secrets.DOCKER_USERNAME || 'stevenjiangnz' }}/jnet-stock-data-service:latest
```

#### 4.2 Deployment Configuration

Update `scripts/deploy.sh` to include stock-data-service:
```bash
# Deploy Stock Data Service
echo "Deploying Stock Data Service..."
gcloud run deploy stock-data-service \
  --image docker.io/${DOCKER_USERNAME}/jnet-stock-data-service:${VERSION} \
  --platform managed \
  --region ${REGION} \
  --no-allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production,LOG_LEVEL=INFO" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --port 9000
```

### Phase 5: Testing & Documentation (Days 14-15)

#### 5.1 Test Coverage
- Unit tests for data fetcher
- Unit tests for storage manager
- Integration tests for API endpoints
- Mock tests for yfinance calls

#### 5.2 Scripts Updates
- Add to `scripts/docker-build.sh`
- Add to `scripts/docker-logs.sh`
- Add to `scripts/docker-restart.sh`
- Create `scripts/local-start-stock-data.sh`
- Update `scripts/local-build-all.sh`
- Update `scripts/local-test-all.sh`
- Update `scripts/test-all.sh`

#### 5.3 Documentation
- Update CLAUDE.md with stock-data-service commands
- Create API documentation (auto-generated via FastAPI)
- Add service-specific README

## Timeline Summary

**Week 1 (Days 1-7)**:
- Project setup and structure
- Core functionality implementation
- Basic API endpoints

**Week 2 (Days 8-14)**:
- Docker integration
- CI/CD pipeline setup
- Testing implementation

**Week 3 (Day 15+)**:
- Documentation
- Performance optimization
- Production deployment

## Versioning Strategy
- Independent semantic versioning for stock-data-service
- Version stored in `app/config.py` as `VERSION = "1.0.0"`
- Automatic version bumping based on commit messages
- Docker images tagged with version and latest

## Key Considerations

1. **Data Storage**: 
   - Default to JSON for flexibility
   - CSV export option for Excel compatibility
   - Implement data retention policy (e.g., 1 year)

2. **Rate Limiting**:
   - Implement client-side rate limiting for yfinance
   - Add request queuing for bulk downloads

3. **Error Handling**:
   - Comprehensive error handling for network issues
   - Graceful degradation when Yahoo Finance is unavailable

4. **Performance**:
   - Async endpoints for non-blocking operations
   - Background tasks for bulk downloads
   - Caching for frequently requested data

5. **Security**:
   - Input validation for all endpoints
   - Sanitize file paths to prevent directory traversal
   - API key authentication (future enhancement)