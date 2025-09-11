# Google Cloud Run Deployment

## Overview

The application is deployed on Google Cloud Run with automatic CI/CD via GitHub Actions.

## URLs

- **Production Frontend**: https://frontend-506487697841.us-central1.run.app/
- **Alternative URL Format**: https://frontend-3qpatnkdma-uc.a.run.app/

Note: Both URLs point to the same service. The first format is recommended.

## Environment Variables

Required environment variables for Cloud Run:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Set these in the Cloud Run console or via gcloud CLI.

## OAuth Configuration

Ensure all Cloud Run URLs are added to Supabase OAuth redirect URLs:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add both URL formats to the redirect URLs list
3. Include `/auth/callback` path for each URL

## Port Configuration

Cloud Run expects applications to run on port 8080. The Dockerfile is configured with:
```dockerfile
EXPOSE 8080
ENV PORT=8080
```

## URL Detection

The application uses a URL helper (`frontend/src/utils/url-helper.ts`) to properly detect public URLs using Cloud Run's X-Forwarded headers. This prevents internal container addresses (like `0.0.0.0:8080`) from appearing in OAuth redirects.

## Deployment Process

### Automatic Deployment
Push to `main` branch triggers automatic deployment via GitHub Actions.

### Manual Deployment
```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

## Monitoring

Check application health:
```bash
curl https://frontend-506487697841.us-central1.run.app/api/health
```

## Troubleshooting

### 500 Errors
1. Check environment variables are set correctly
2. Verify Supabase connection
3. Check Cloud Run logs: `gcloud run logs read --service frontend`

### OAuth Redirect Issues
1. Verify all Cloud Run URLs are in Supabase redirect URLs
2. Check X-Forwarded headers are being properly detected
3. Review auth callback logs in Cloud Run