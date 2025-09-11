# Quick Deployment Guide

## Frontend Deployment to Cloud Run

### Prerequisites
1. Google Cloud SDK installed and configured
2. Docker installed and running
3. Active Google Cloud project
4. `.env.local` file with Supabase credentials

### Deployment Options

#### Option 1: Local Docker Build (Recommended for consistency)
```bash
./scripts/deploy-frontend-local-image.sh
```

This script:
- Builds Docker image locally (same as production Dockerfile)
- Optionally lets you test the image locally first
- Pushes image to Google Container Registry
- Deploys the exact same image to Cloud Run
- Ensures consistency between local testing and production

Benefits:
- **Consistency**: Same image runs locally and in production
- **Debugging**: Can test exact production image locally
- **Control**: See exactly what's being deployed
- **Versioning**: Image stored in Container Registry

#### Option 2: Cloud Build (Faster uploads)
```bash
./scripts/deploy-frontend-quick.sh
```

This script:
- Uploads source code to Cloud Build
- Cloud Build creates Docker image
- Deploys directly to Cloud Run

Benefits:
- No need to build Docker image locally
- Faster if you have slow upload speeds
- No need for Container Registry setup

### Other Deployment Scripts

#### Full deployment (all services)
```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

#### Frontend only (older method)
```bash
./scripts/deploy-frontend-cloud-run.sh
```

### Testing Local Docker Image

After building with `deploy-frontend-local-image.sh`, you can test the exact production image:

```bash
docker run --rm -p 8080:8080 \
  -e NEXT_PUBLIC_SUPABASE_URL='your-url' \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY='your-key' \
  gcr.io/YOUR_PROJECT_ID/frontend:latest
```

Then visit http://localhost:8080

### Monitoring After Deployment

Check logs:
```bash
gcloud run logs read frontend --region us-central1 --limit 50
```

Check health:
```bash
curl https://frontend-506487697841.us-central1.run.app/api/health
```

View deployed image:
```bash
gcloud run services describe frontend --region us-central1 --format='value(spec.template.spec.containers[0].image)'
```

### Troubleshooting

If deployment fails:
1. Check `.env.local` has correct values
2. Verify Docker is running: `docker ps`
3. Verify gcloud is authenticated: `gcloud auth list`
4. Confirm project is set: `gcloud config get-value project`
5. Check Container Registry permissions: `gcloud auth configure-docker`

### Rollback

To rollback to previous version:
```bash
gcloud run services update-traffic frontend --region us-central1 --to-revisions=PREV=100
```

### Container Registry Management

List images:
```bash
gcloud container images list --repository=gcr.io/YOUR_PROJECT_ID
```

List tags for frontend:
```bash
gcloud container images list-tags gcr.io/YOUR_PROJECT_ID/frontend
```

Delete old images:
```bash
gcloud container images delete gcr.io/YOUR_PROJECT_ID/frontend:TAG_NAME
```