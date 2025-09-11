# Quick Deployment Guide

## Frontend Deployment to Cloud Run

### Prerequisites
1. Google Cloud SDK installed and configured
2. Docker installed and running
3. Active Google Cloud project
4. `.env.local` file with Supabase credentials

### Deploy Frontend

```bash
./scripts/deploy-frontend.sh
```

This script:
- Builds Docker image locally (same as production Dockerfile)
- Optionally lets you test the image locally first
- Pushes image to Google Container Registry
- Deploys the exact same image to Cloud Run
- Ensures consistency between local testing and production

### Full Stack Deployment

Deploy all services:
```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

### Why Local Docker Build Only?

We **only** use locally built Docker images for deployment to ensure:
- **Consistency**: Same image runs locally and in production
- **Debugging**: Can test exact production image locally
- **Control**: See exactly what's being deployed
- **No surprises**: Cloud Build might behave differently

See `DEPLOYMENT_POLICY.md` for our deployment policy.

### Testing Local Docker Image

After building with `deploy-frontend.sh`, you can test the exact production image:

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