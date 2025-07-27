# Deploy Command

Deploy services to Google Cloud Run.

## Prerequisites
- Google Cloud CLI installed and authenticated
- Project ID configured
- Cloud Run API enabled

## Usage
```bash
# Deploy frontend
gcloud run deploy jnetsolution-frontend \
  --image gcr.io/YOUR_PROJECT_ID/jnetsolution-frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

# Deploy auth service
gcloud run deploy jnetsolution-auth \
  --image gcr.io/YOUR_PROJECT_ID/jnetsolution-auth \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated
```

## Environment Variables
Set these in Cloud Run console or via CLI:
- `DATABASE_URL`
- `JWT_SECRET`
- `API_BASE_URL`