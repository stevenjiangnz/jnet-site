# API Service Deployment Guide

## Prerequisites

1. Docker installed and logged in to Docker Hub
2. Google Cloud CLI installed and authenticated
3. Service account with Cloud Run deployment permissions

## Environment Variables

Set the following environment variables before deployment:

```bash
# REQUIRED: Set a secure API key for production
export API_KEY=your-secure-api-key-here

# Optional: Override other settings if needed
export GCS_BUCKET_NAME=jnet-api-service
export GCS_PROJECT_ID=jnet-site
```

## Deployment Steps

1. **Test locally with authentication:**
   ```bash
   curl http://localhost:8002/api/v1/symbols/list -H "X-API-Key: dev-api-key"
   ```

2. **Deploy to Cloud Run:**
   ```bash
   ./scripts/deploy.sh 1.0.0
   ```

3. **Verify deployment:**
   ```bash
   # Get the service URL
   gcloud run services describe api-service --region us-central1 --format 'value(status.url)'
   
   # Test the deployed service
   curl https://api-service-506487697841.us-central1.run.app/api/v1/symbols/list \
     -H "X-API-Key: your-api-key"
   ```

## Production Configuration

The deployment script sets the following environment variables:

- `ENVIRONMENT=production`
- `LOG_LEVEL=INFO`
- `API_KEY` - From environment variable (required)
- `STOCK_DATA_SERVICE_URL` - Points to deployed stock-data-service
- `GCS_BUCKET_NAME=jnet-api-service`
- `GCS_PROJECT_ID=jnet-site`

## Security Notes

1. **Never use the default 'dev-api-key' in production**
2. Store the API key securely (e.g., in Google Secret Manager)
3. Update the frontend to use the production API key
4. Consider implementing API key rotation

## Frontend Configuration

Update the frontend environment variables for production:

```env
NEXT_PUBLIC_API_BASE_URL=https://api-service-506487697841.us-central1.run.app
NEXT_PUBLIC_API_KEY=your-production-api-key
```