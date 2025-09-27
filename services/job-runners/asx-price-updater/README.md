# ASX Price Updater Job

This job runner is responsible for downloading and updating ASX (Australian Securities Exchange) stock prices.

## Overview

The ASX Price Updater job:
- Downloads EOD (End of Day) price data for ASX-listed securities
- Updates the stock data storage with the latest prices
- Runs on a schedule (4:30 PM Sydney time, Monday-Friday)
- Deployed as a Google Cloud Run Job

## Implementation

The actual job implementation is located in the API service:
- `services/api-service/app/jobs/asx_price_updater.py`

This job runner serves as a lightweight wrapper that:
1. Sets up the execution environment
2. Imports and runs the job from the API service
3. Handles logging and error reporting

## Deployment

The job is automatically deployed via GitHub Actions when changes are pushed to:
- The job runner directory
- The job implementation in api-service
- Related services (stock catalog, download orchestrator)

### Production
- Job name: `job-asx-price-updater`
- Schedule: 4:30 PM Sydney time (Mon-Fri)
- Region: us-central1

### Development
- Job name: `job-asx-price-updater-dev`
- Manual execution only

## Manual Execution

To run the job manually:

```bash
# Production
gcloud run jobs execute job-asx-price-updater --region us-central1

# Development
gcloud run jobs execute job-asx-price-updater-dev --region us-central1
```

## Environment Variables

- `ENVIRONMENT`: production/development
- `LOG_LEVEL`: INFO/DEBUG
- `API_BASE_URL`: API service URL
- `STOCK_DATA_SERVICE_URL`: Stock data service URL
- `VERSION`: Job version

## Monitoring

Logs are available in Google Cloud Logging. Filter by:
- Resource type: Cloud Run Job
- Job name: job-asx-price-updater