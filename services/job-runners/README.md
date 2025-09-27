# Cloud Run Jobs

This directory contains all Cloud Run Jobs for scheduled and batch processing tasks.

## Naming Convention

All job-related resources follow a consistent naming pattern:

### Directory Structure
```
job-runners/
├── asx-price-updater/     # ASX daily price download job
├── us-price-updater/      # US market price download job (future)
├── database-cleanup/      # Database maintenance job (future)
├── stock-scanner/         # Stock screening/scanning job (future)
└── alert-processor/       # Alert processing job (future)
```

### Naming Patterns

| Resource | Pattern | Example |
|----------|---------|---------|
| Directory | `{market/task}-{action}` | `asx-price-updater` |
| Job Name | `job-{directory-name}` | `job-asx-price-updater` |
| Docker Image | `jnet-job-{directory-name}` | `jnet-job-asx-price-updater` |
| Workflow File | `job-{directory-name}.yml` | `job-asx-price-updater.yml` |
| Version Tag | `job-{name}-v{version}` | `job-asx-price-updater-v1.0.0` |
| Scheduler | `{job-name}-schedule` | `job-asx-price-updater-schedule` |

### Environment Naming
- Production: `job-{name}`
- Development: `job-{name}-dev`

## Job Implementation Pattern

Each job should follow this structure:

```
{job-name}/
├── main.py              # Job entry point
├── Dockerfile          # Multi-stage build
├── requirements.txt    # Additional dependencies
└── README.md          # Job-specific documentation
```

### Job Entry Point (main.py)

```python
#!/usr/bin/env python3
"""
Cloud Run Job runner for {job description}
"""
import os
import sys
import asyncio
from datetime import datetime

# Add api-service to path
sys.path.insert(0, '/app/api-service')

from app.jobs.{job_module} import {JobClass}
from app.core.logging import setup_job_logger

# Setup logging
logger = setup_job_logger("{job-name}")

async def main():
    """Main job entry point"""
    # Job implementation
    pass

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
```

### Dockerfile Pattern

```dockerfile
# Multi-stage build for smaller image
FROM python:3.11-slim as builder
# ... builder stage ...

FROM python:3.11-slim
# ... runtime stage ...
```

## GitHub Actions Workflow

Each job has its own workflow file with:
- Separate semantic versioning (prefix: `job-{name}-v`)
- Independent CI/CD pipeline
- Manual trigger capability
- Environment-specific deployments

## Cloud Infrastructure

Jobs are deployed as Cloud Run Jobs with:
- Cloud Scheduler for periodic execution
- Service account with necessary permissions
- Environment-specific configurations
- Monitoring and alerting

## Adding a New Job

1. Create directory: `services/job-runners/{job-name}/`
2. Implement job logic in `services/api-service/app/jobs/{job_name}.py`
3. Create job runner in `main.py`
4. Create `Dockerfile` with multi-stage build
5. Create workflow: `.github/workflows/job-{job-name}.yml`
6. Configure Cloud Scheduler in workflow
7. Add monitoring and alerts

## Current Jobs

### ASX Price Updater
- **Schedule**: 4:30 PM Sydney time (Mon-Fri)
- **Purpose**: Downloads EOD prices for all ASX stocks
- **Catalog**: All symbols with .AX suffix

## Planned Jobs

### US Price Updater
- **Schedule**: 4:30 PM New York time (Mon-Fri)
- **Purpose**: Downloads EOD prices for US stocks
- **Catalog**: All symbols without suffix

### Database Cleanup
- **Schedule**: Daily at 2:00 AM
- **Purpose**: Archive old data, clean temporary tables

### Stock Scanner
- **Schedule**: After market close
- **Purpose**: Run technical analysis scans

### Alert Processor
- **Schedule**: Every 15 minutes during market hours
- **Purpose**: Process price alerts and notifications