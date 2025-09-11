# Quick Deployment Guide

## Frontend Deployment to Cloud Run

### Prerequisites
1. Google Cloud SDK installed and configured
2. Active Google Cloud project
3. `.env.local` file with Supabase credentials

### Quick Deploy Command
```bash
./scripts/deploy-frontend-quick.sh
```

This script:
- Loads environment variables from `.env.local`
- Builds the Next.js app locally first (to catch errors early)
- Uses Cloud Build to create Docker image
- Deploys directly to Cloud Run
- Shows the live URL
- Optionally opens in browser

### Benefits
- No need to push to Docker Hub
- No need to wait for CI/CD pipeline
- Direct source upload to Cloud Build
- Faster deployment cycle
- Preserves environment variables

### Other Deployment Scripts

#### Full deployment (all services)
```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

#### Frontend only (older method)
```bash
./scripts/deploy-frontend-cloud-run.sh
```

### Monitoring After Deployment

Check logs:
```bash
gcloud run logs read frontend --region us-central1 --limit 50
```

Check health:
```bash
curl https://frontend-506487697841.us-central1.run.app/api/health
```

### Troubleshooting

If deployment fails:
1. Check `.env.local` has correct values
2. Verify gcloud is authenticated: `gcloud auth list`
3. Confirm project is set: `gcloud config get-value project`
4. Check build logs in Cloud Console

### Rollback

To rollback to previous version:
```bash
gcloud run services update-traffic frontend --region us-central1 --to-revisions=PREV=100
```