# ASX Daily Price Download Job Implementation Plan

## Overview
This document outlines the implementation plan for a Cloud Run Job that downloads daily stock prices for all ASX symbols in our catalog (identified by .AX suffix). The job will run after market close each trading day to ensure all End-of-Day (EOD) data is captured. This is part of a multi-exchange architecture that will support both ASX and US stocks.

## Architecture

### High-Level Design
```
Cloud Scheduler → Cloud Run Job → API Service → Stock Data Service → GCS
                                 ↓
                            Cloud Logging
                                 ↓
                         Monitoring/Alerts
```

### Components
1. **Cloud Scheduler**: Triggers the job at scheduled times
2. **Cloud Run Job**: Lightweight container that orchestrates the download
3. **API Service**: Contains business logic for managing downloads
4. **Stock Data Service**: Handles actual data fetching and storage
5. **GCS**: Stores the downloaded price data

## Implementation Details

### 1. Job Logic in API Service

#### File: `services/api-service/app/jobs/asx_price_updater.py`
```python
"""
ASX Daily Price Download Job
Downloads EOD prices for all active ASX stocks
"""
import logging
from datetime import datetime, date
from typing import List, Dict, Any
from app.core.logging import get_logger
from app.services.stock_catalog import StockCatalogService
from app.services.download_orchestrator import DownloadOrchestrator
from app.models.job import JobStatus, JobResult

logger = get_logger(__name__)

class ASXPriceUpdater:
    def __init__(self):
        self.catalog_service = StockCatalogService()
        self.download_orchestrator = DownloadOrchestrator()
        
    async def update_all_prices(self, 
                               force_update: bool = False,
                               market_date: Optional[date] = None) -> JobResult:
        """
        Download latest prices for all ASX stocks in catalog
        
        Args:
            force_update: Force re-download even if data exists
            market_date: Specific date to download (default: today)
            
        Returns:
            JobResult with status and statistics
        """
        start_time = datetime.utcnow()
        stats = {
            "total_symbols": 0,
            "successful": 0,
            "failed": 0,
            "skipped": 0,
            "errors": []
        }
        
        try:
            # Get all symbols with .AX suffix from catalog
            all_symbols = await self.catalog_service.get_symbols_by_suffix(
                suffix=".AX"
            )
            stats["total_symbols"] = len(all_symbols)
            
            logger.info(f"Starting price update for {len(all_symbols)} ASX symbols")
            
            # Process in batches to avoid overwhelming the API
            batch_size = 5
            for i in range(0, len(all_symbols), batch_size):
                batch = all_symbols[i:i + batch_size]
                results = await self.download_orchestrator.download_batch(
                    symbols=batch,
                    period="1d",  # Daily data
                    force_update=force_update,
                    market_date=market_date
                )
                
                # Update statistics
                for symbol, result in results.items():
                    if result["status"] == "success":
                        stats["successful"] += 1
                    elif result["status"] == "skipped":
                        stats["skipped"] += 1
                    else:
                        stats["failed"] += 1
                        stats["errors"].append({
                            "symbol": symbol,
                            "error": result.get("error", "Unknown error")
                        })
                        
            # Calculate execution time
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            return JobResult(
                status=JobStatus.SUCCESS if stats["failed"] == 0 else JobStatus.PARTIAL,
                message=f"Processed {stats['successful']} symbols successfully",
                stats=stats,
                execution_time=execution_time
            )
            
        except Exception as e:
            logger.error(f"ASX price update job failed: {str(e)}")
            return JobResult(
                status=JobStatus.FAILED,
                message=f"Job failed: {str(e)}",
                stats=stats,
                execution_time=(datetime.utcnow() - start_time).total_seconds()
            )
```

### 2. Job Runner Container

#### File: `services/job-runners/asx-price-updater/main.py`
```python
#!/usr/bin/env python3
"""
Cloud Run Job runner for ASX daily price updates
"""
import os
import sys
import asyncio
from datetime import datetime

# Add api-service to path
sys.path.insert(0, '/app/api-service')

from app.jobs.asx_price_updater import ASXPriceUpdater
from app.core.logging import setup_job_logger

# Setup logging
logger = setup_job_logger("asx-price-updater")

async def main():
    """Main job entry point"""
    job_start = datetime.utcnow()
    logger.info(f"Starting ASX price update job at {job_start}")
    
    try:
        # Initialize updater
        updater = ASXPriceUpdater()
        
        # Run the update
        result = await updater.update_all_prices(
            force_update=os.environ.get("FORCE_UPDATE", "false").lower() == "true"
        )
        
        # Log results
        logger.info(f"Job completed: {result.status.value}")
        logger.info(f"Stats: {result.stats}")
        
        # Return appropriate exit code
        if result.status == JobStatus.SUCCESS:
            return 0
        elif result.status == JobStatus.PARTIAL:
            # Partial success - some symbols failed
            logger.warning("Job completed with errors")
            return 2  # Special exit code for partial success
        else:
            return 1
            
    except Exception as e:
        logger.error(f"Job failed with exception: {str(e)}")
        return 1
    finally:
        job_end = datetime.utcnow()
        duration = (job_end - job_start).total_seconds()
        logger.info(f"Job finished after {duration:.2f} seconds")

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

#### File: `services/job-runners/asx-price-updater/Dockerfile`
```dockerfile
# Multi-stage build for smaller image
FROM python:3.11-slim as builder

WORKDIR /app

# Copy requirements
COPY services/api-service/requirements.txt api-service-requirements.txt
COPY services/job-runners/asx-price-updater/requirements.txt job-requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r api-service-requirements.txt
RUN pip install --no-cache-dir -r job-requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Copy api-service code
COPY services/api-service /app/api-service

# Copy job runner
COPY services/job-runners/asx-price-updater/main.py /app/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/api-service

# Run the job
CMD ["python", "/app/main.py"]
```

### 3. Cloud Infrastructure

#### File: `infrastructure/jobs/asx-price-updater.tf`
```hcl
# Cloud Run Job for ASX price updates
resource "google_cloud_run_v2_job" "asx_price_updater" {
  name     = "asx-price-updater"
  location = var.region

  template {
    template {
      containers {
        image = "${var.docker_registry}/asx-price-updater:${var.image_tag}"
        
        # Environment variables
        env {
          name  = "API_BASE_URL"
          value = var.api_service_url
        }
        env {
          name  = "STOCK_DATA_SERVICE_URL"
          value = var.stock_data_service_url
        }
        env {
          name  = "LOG_LEVEL"
          value = "INFO"
        }
        
        # Resource limits
        resources {
          limits = {
            cpu    = "1"
            memory = "512Mi"
          }
        }
      }
      
      # Job timeout (5 minutes)
      timeout = "300s"
      
      # Service account
      service_account = google_service_account.job_runner.email
      
      # Max retries
      max_retries = 1
    }
  }
}

# Cloud Scheduler for daily runs
resource "google_cloud_scheduler_job" "asx_price_updater_schedule" {
  name        = "asx-price-updater-schedule"
  description = "Daily ASX price download after market close"
  schedule    = "30 16 * * MON-FRI"  # 4:30 PM Sydney time (ASX closes at 4:00 PM)
  time_zone   = "Australia/Sydney"
  
  http_target {
    uri         = "https://${var.region}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.asx_price_updater.name}:run"
    http_method = "POST"
    
    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }
}
```

### 4. Supporting Components

#### File: `services/api-service/app/services/stock_catalog.py`
```python
"""
Stock catalog service for managing symbol lists
"""
from typing import List
from app.models.catalog import StockSymbol

class StockCatalogService:
    def __init__(self):
        self.catalog_manager = CatalogManager()
    
    async def get_symbols_by_suffix(self, suffix: str) -> List[str]:
        """
        Get all symbols with a specific suffix (e.g., .AX for ASX)
        
        Args:
            suffix: Symbol suffix to filter by
            
        Returns:
            List of symbols matching the suffix
        """
        all_symbols = await self.catalog_manager.list_symbols()
        return [s.symbol for s in all_symbols if s.symbol.endswith(suffix)]
    
    async def get_symbols_by_exchange(self, exchange: str) -> List[str]:
        """
        Get all symbols for a specific exchange
        
        Args:
            exchange: Exchange code (ASX, NYSE, NASDAQ)
            
        Returns:
            List of symbols for the exchange
        """
        all_symbols = await self.catalog_manager.list_symbols()
        return [s.symbol for s in all_symbols if s.exchange == exchange]
```

#### File: `services/api-service/app/models/job.py`
```python
from enum import Enum
from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel

class JobStatus(Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    RUNNING = "running"

class JobResult(BaseModel):
    status: JobStatus
    message: str
    stats: Dict[str, Any]
    execution_time: float
    timestamp: datetime = datetime.utcnow()
```

#### File: `services/api-service/app/services/download_orchestrator.py`
```python
"""
Orchestrates batch downloads across multiple symbols
"""
import asyncio
from typing import List, Dict, Any
from datetime import date

class DownloadOrchestrator:
    def __init__(self, stock_data_service_client):
        self.client = stock_data_service_client
        
    async def download_batch(self, 
                           symbols: List[str], 
                           period: str,
                           force_update: bool = False,
                           market_date: Optional[date] = None) -> Dict[str, Any]:
        """
        Download data for a batch of symbols concurrently
        """
        tasks = []
        for symbol in symbols:
            task = self.download_single(symbol, period, force_update, market_date)
            tasks.append(task)
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            symbol: result for symbol, result in zip(symbols, results)
        }
```

### 5. Monitoring and Alerting

#### File: `infrastructure/monitoring/asx-price-job-alerts.yaml`
```yaml
# Cloud Monitoring alert policies
displayName: "ASX Price Download Job Failed"
conditions:
  - displayName: "Job execution failed"
    conditionThreshold:
      filter: |
        resource.type="cloud_run_job"
        resource.labels.job_name="asx-price-updater"
        metric.type="run.googleapis.com/job/completed_execution_count"
        metric.labels.result="failed"
      comparison: COMPARISON_GT
      thresholdValue: 0
      duration: 60s

---
displayName: "ASX Price Download Job Duration"
conditions:
  - displayName: "Job taking too long"
    conditionThreshold:
      filter: |
        resource.type="cloud_run_job"
        resource.labels.job_name="asx-price-updater"
        metric.type="run.googleapis.com/job/execution_duration"
      comparison: COMPARISON_GT
      thresholdValue: 1200  # 20 minutes
      duration: 60s
```

### 6. Manual Trigger Endpoint

#### File: `services/api-service/app/api/v1/endpoints/jobs.py`
```python
from fastapi import APIRouter, HTTPException, Depends
from app.auth.dependencies import get_current_admin_user
from app.jobs.asx_price_updater import ASXPriceUpdater

router = APIRouter()

@router.post("/jobs/asx-price-update")
async def trigger_asx_price_update(
    force_update: bool = False,
    _: User = Depends(get_current_admin_user)
):
    """
    Manually trigger ASX price update job (admin only)
    """
    try:
        updater = ASXPriceUpdater()
        result = await updater.update_all_prices(force_update=force_update)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Implementation Steps

1. **Phase 1: Core Logic**
   - Implement `ASXPriceUpdater` class in api-service
   - Create download orchestrator for batch processing
   - Add job models and status tracking

2. **Phase 2: Job Runner**
   - Create job runner container
   - Set up Dockerfile with multi-stage build
   - Test locally with Docker

3. **Phase 3: Infrastructure**
   - Deploy Cloud Run Job
   - Configure Cloud Scheduler
   - Set up service accounts and permissions

4. **Phase 4: Monitoring**
   - Create monitoring dashboards
   - Set up alerting policies
   - Configure logging aggregation

5. **Phase 5: Testing & Optimization**
   - Load test with full symbol list
   - Optimize batch sizes and concurrency
   - Add retry logic for failed symbols

## Configuration

### Environment Variables
- `API_BASE_URL`: URL of the API service
- `STOCK_DATA_SERVICE_URL`: URL of stock data service
- `FORCE_UPDATE`: Force re-download of existing data
- `BATCH_SIZE`: Number of symbols to process concurrently
- `LOG_LEVEL`: Logging level (INFO/DEBUG/ERROR)

### Schedule Configuration
- **ASX Job**: 4:30 PM Sydney time (Mon-Fri) - 30 minutes after ASX closes
- **US Job** (future): 4:30 PM New York time (Mon-Fri) - 30 minutes after NYSE/NASDAQ close
- **Development**: Can be triggered manually via API endpoint
- **Holidays**: Should integrate with market calendars for each exchange

## Error Handling

1. **Network Errors**: Retry with exponential backoff
2. **API Rate Limits**: Implement throttling
3. **Partial Failures**: Continue processing, report at end
4. **Data Validation**: Verify downloaded data before storage

## Performance Considerations

1. **Batch Processing**: Process 5-10 symbols concurrently
2. **Connection Pooling**: Reuse HTTP connections
3. **Async Processing**: Use asyncio for concurrent downloads
4. **Resource Limits**: 1 CPU, 512MB RAM is sufficient for ~10 symbols

## Success Metrics

1. **Completion Rate**: >95% symbols downloaded successfully
2. **Execution Time**: <2 minutes for ~10 ASX symbols
3. **Data Freshness**: Data available by 5:00 PM Sydney time
4. **Error Rate**: <5% failure rate

## Multi-Exchange Architecture

### Exchange Identification
- **ASX Stocks**: Identified by `.AX` suffix (e.g., BHP.AX, CBA.AX)
- **US Stocks**: No suffix for primary listing (e.g., AAPL, MSFT)
- **Other Exchanges**: Future support with appropriate suffixes

### Separate Jobs per Exchange
```
asx-price-updater     → Runs at 4:30 PM Sydney time
us-price-updater      → Runs at 4:30 PM New York time
```

### Catalog Structure
```sql
-- Symbol catalog table
CREATE TABLE symbol_catalog (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    exchange VARCHAR(10),
    suffix VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient suffix queries
CREATE INDEX idx_symbol_suffix ON symbol_catalog(suffix);
```

## Future Enhancements

1. **US Market Job**: Similar job for US stocks running after NYSE/NASDAQ close
2. **Incremental Updates**: Only download changed symbols
3. **Real-time Updates**: Support intraday price updates
4. **Data Validation**: Add price sanity checks
5. **Market Calendar Integration**: Skip non-trading days automatically
6. **Symbol Auto-discovery**: Automatically add new listings to catalog
7. **Delisting Handling**: Mark delisted symbols as inactive