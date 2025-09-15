# GitHub Actions Setup Guide

## Overview

This project uses GitHub Actions for CI/CD with the following workflows:
- **ci.yml**: Runs on every push/PR to main and develop branches
- **develop.yml**: Builds and pushes Docker images for develop branch
- **release.yml**: Handles versioning, tagging, and deployment to production
- **deploy-manual.yml**: Manual deployment to staging or production

## Workflow Structure

### Branch Strategy
- `develop`: Development branch - triggers develop builds
- `main`: Production branch - triggers releases and deployments
- Feature branches: Create PRs to develop

### Versioning Strategy
- Semantic versioning based on commit messages:
  - `feat:` or `feature:` → Minor version bump (1.0.0 → 1.1.0)
  - `fix:` or `patch:` → Patch version bump (1.0.0 → 1.0.1)
  - `breaking change:` or `major:` → Major version bump (1.0.0 → 2.0.0)
  - Other commits → Patch version bump

## Google Cloud Setup

### 1. Create Google Cloud Project
```bash
gcloud projects create YOUR_PROJECT_ID
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable Required APIs
```bash
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### 3. Create Artifact Registry Repository
```bash
gcloud artifacts repositories create jnet-site \
    --repository-format=docker \
    --location=us-central1 \
    --description="JNet Site Docker images"
```

### 4. Create Service Account for GitHub Actions
```bash
# Create service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions"

# Grant necessary permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"

# Create and download key
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## GitHub Secrets Setup

Add the following secrets to your GitHub repository:

1. **GCP_PROJECT_ID**: Your Google Cloud project ID
2. **GCP_SA_KEY**: Contents of the `key.json` file (the entire JSON)
3. **DOCKER_HUB_TOKEN**: Your Docker Hub access token
4. **DOCKER_USERNAME** (optional): Your Docker Hub username (defaults to 'stevenjiangnz' if not set)

### Adding Secrets
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret:
   - Name: `GCP_PROJECT_ID`
   - Value: `your-project-id`
   
   - Name: `GCP_SA_KEY`
   - Value: (paste entire contents of key.json)

## First Time Setup

### 1. Initialize Services
Each service needs initial setup before the workflows will work:

```bash
# Make sure version files exist
# (Already created for user-service)
```

### 2. Push to Develop Branch
```bash
git checkout -b develop
git push -u origin develop
```

### 3. Create Initial Release
```bash
git checkout main
git merge develop
git push
```

## Deployment Configuration

### Environment Variables
Each service can have environment-specific variables set in Cloud Run:

**Frontend**:
- `NODE_ENV`: production/staging
- `API_BASE_URL`: Backend API URL

**Auth Service**:
- `ASPNETCORE_ENVIRONMENT`: Production/Staging
- `DATABASE_URL`: Connection string
- `JWT_SECRET`: Secret key for JWT

**User Service**:
- `ENVIRONMENT`: production/staging
- `DATABASE_URL`: PostgreSQL connection string

**Content Service**:
- `NODE_ENV`: production/staging
- `DATABASE_URL`: PostgreSQL connection string

### Setting Environment Variables
```bash
gcloud run services update SERVICE_NAME \
    --set-env-vars="KEY1=value1,KEY2=value2" \
    --region=us-central1
```

## Manual Deployment

Use the manual deployment workflow when needed:
1. Go to Actions → "Manual Deploy to Cloud Run"
2. Click "Run workflow"
3. Select:
   - Service to deploy (or "all")
   - Version tag (leave empty for latest)
   - Environment (staging/production)

## Monitoring

### View Deployment Status
```bash
gcloud run services list --region=us-central1
```

### View Service Logs
```bash
gcloud run services logs read SERVICE_NAME --region=us-central1
```

### View Container Images
```bash
# Images are stored on Docker Hub
# View at: https://hub.docker.com/u/YOUR_DOCKER_USERNAME
# Or use Docker CLI:
docker search YOUR_DOCKER_USERNAME/jnet
```

## Troubleshooting

### Common Issues

1. **Permission Denied on Push**
   - Check service account permissions
   - Verify GCP_SA_KEY secret is correctly set

2. **Build Failures**
   - Check service logs in GitHub Actions
   - Verify Dockerfile paths are correct

3. **Deployment Failures**
   - Check Cloud Run quotas
   - Verify region availability
   - Check service account permissions

### Rollback
To rollback to a previous version:
```bash
gcloud run services update-traffic SERVICE_NAME \
    --to-revisions=REVISION_NAME=100 \
    --region=us-central1
```

## Best Practices

1. **Commit Messages**: Use conventional commits for automatic versioning
2. **Testing**: Always test in develop branch first
3. **Secrets**: Never commit secrets, use GitHub Secrets
4. **Monitoring**: Set up alerts in Google Cloud Console
5. **Cost**: Monitor Cloud Run usage to control costs