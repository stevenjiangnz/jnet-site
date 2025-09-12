# Deployment Policy

## Docker Build Policy

**We ONLY use locally built Docker images for deployment.**

### Why Local Builds Only?

1. **Consistency**: What you test locally is exactly what runs in production
2. **Debugging**: When issues occur, you can run the exact same image locally
3. **Control**: You see exactly what's being built and deployed
4. **No Surprises**: Cloud Build might have different caching, dependencies, or behaviors

### Deployment Workflow

```bash
# Always use this script for frontend deployment
./scripts/deploy-frontend.sh
```

This script:
1. Builds Docker image locally using production Dockerfile
2. Optionally tests the image locally (recommended)
3. Pushes to Google Container Registry
4. Deploys the exact same image to Cloud Run

### What NOT to Do

❌ **Never use Cloud Build**:
```bash
# DON'T DO THIS
gcloud run deploy --source .
```

❌ **Never use the deprecated scripts**:
- `deploy-frontend-cloud-run.sh` (removed)
- `deploy-frontend-quick.sh` (removed)

### Testing Before Deployment

Always test your Docker image locally before deploying:

```bash
# The deploy script will prompt you to test locally
# Or manually test:
docker run --rm -p 8080:8080 \
  -e NEXT_PUBLIC_SUPABASE_URL='your-url' \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY='your-key' \
  gcr.io/YOUR_PROJECT_ID/frontend:latest
```

### Container Registry

All images are stored in Google Container Registry:
- Location: `gcr.io/YOUR_PROJECT_ID/frontend:latest`
- This provides version history and rollback capability
- You can always pull and run any previous version locally

### Summary

**One Rule**: Always build Docker images locally, never use Cloud Build.

This ensures that production issues can always be reproduced locally with the exact same Docker image.