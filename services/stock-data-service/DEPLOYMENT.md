# Stock Data Service Deployment Guide

## Overview
The Stock Data Service is deployed to Google Cloud Run with API key authentication and GCS integration.

**Current Production Version**: v0.0.6  
**Service URL**: https://stock-data-service-506487697841.us-central1.run.app  
**Last Deployed**: Successfully deployed via GitHub Actions CI/CD

## Prerequisites
- Google Cloud SDK installed (`gcloud` CLI)
- Docker installed and logged in to Docker Hub
- Access to the GCP project (`jnet-site`)
- Service account with appropriate permissions

## Environment Variables
The service requires the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `GCS_PROJECT_ID` | Google Cloud project ID | Yes |
| `GCS_BUCKET_NAME` | GCS bucket name for stock data | Yes |
| `STOCK_DATA_SERVICE_API_KEY` | API key for authentication | Yes (in production) |
| `ENVIRONMENT` | Environment (production/development) | Yes |
| `LOG_LEVEL` | Logging level (INFO/DEBUG) | No |

## Local Development
```bash
# Start the service locally
cd services/stock-data-service
uv sync
uv run uvicorn app.main:app --reload --port 9000

# Run with Docker
docker-compose up stock-data-service
```

## Deployment

### Manual Deployment
1. Ensure your `.env` file in the project root contains:
   ```env
   # Stock Data Service API Key
   STOCK_DATA_SERVICE_API_KEY=your-api-key-here
   GCS_PROJECT_ID=jnet-site
   GCS_BUCKET_NAME=jnet-site-stock-data
   ```

2. Run the deployment script:
   ```bash
   ./scripts/deploy-stock-data-service.sh jnet-site
   ```

   The script will:
   - Build the Docker image
   - Push to Docker Hub
   - Deploy to Cloud Run with all required environment variables
   - Configure the service account and resources

### GitHub Actions Deployment
The service is automatically deployed when changes are pushed to the `main` branch.

Required GitHub Secrets:
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Service account JSON key
- `DOCKER_HUB_TOKEN`: Docker Hub access token
- `GCS_BUCKET_NAME`: GCS bucket name
- `STOCK_DATA_SERVICE_API_KEY`: API key for authentication

### Service Configuration
- **Region**: us-central1
- **Memory**: 512Mi
- **CPU**: 1
- **Port**: 9000
- **Service Account**: 506487697841-compute@developer.gserviceaccount.com
- **Access**: Allow unauthenticated (API key required for /api/v1/* endpoints)

## API Authentication
The service uses API key authentication for all `/api/v1/*` endpoints.

### Using the API
Include the API key in one of these headers:
```bash
# Using X-API-Key header
curl -H "X-API-Key: your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list

# Using Authorization Bearer header
curl -H "Authorization: Bearer your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list
```

### Public Endpoints (No Auth Required)
- `/health` - Health check
- `/docs` - Interactive API documentation
- `/openapi.json` - OpenAPI specification
- `/redoc` - Alternative API documentation

## Monitoring
- **Service URL**: https://stock-data-service-506487697841.us-central1.run.app
- **Health Check**: https://stock-data-service-506487697841.us-central1.run.app/health
- **API Docs**: https://stock-data-service-506487697841.us-central1.run.app/docs

Check service status:
```bash
gcloud run services describe stock-data-service --region us-central1
```

View logs:
```bash
gcloud run logs read --service stock-data-service --region us-central1
```

## Verification Steps

After deployment, verify the service is working correctly:

```bash
# 1. Check the deployed image version
gcloud run services describe stock-data-service --region us-central1 --format="value(spec.template.spec.containers[0].image)"

# 2. Test health endpoint (no auth required)
curl https://stock-data-service-506487697841.us-central1.run.app/health

# 3. Test API without authentication (should return 401)
curl https://stock-data-service-506487697841.us-central1.run.app/api/v1/list

# 4. Test API with authentication (should return data)
curl -H "X-API-Key: your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list
```

## Troubleshooting

### Common Issues
1. **GCS Access Denied**: Ensure the service account has Storage Object Admin role
2. **API Key Not Working**: Check the API_KEY environment variable is set correctly
3. **Port Issues**: The service runs on port 9000, ensure Cloud Run is configured correctly
4. **Black Formatting**: Run `uv run black .` before committing to avoid CI failures

### Debugging
```bash
# Check deployed environment variables
gcloud run services describe stock-data-service --region us-central1 --format='value(spec.template.spec.containers[0].env[*].value)'

# View recent logs
gcloud run logs read --service stock-data-service --region us-central1 --limit 50

# Test with curl
curl -H "X-API-Key: your-api-key" https://stock-data-service-506487697841.us-central1.run.app/api/v1/list
```