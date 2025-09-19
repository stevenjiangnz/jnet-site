# CI/CD Guide

This guide describes the continuous integration and deployment process for the JNetSolution project.

## Overview

The project uses GitHub Actions for automated testing, building, versioning, and deployment to Google Cloud Run. The workflow uses a unified deployment strategy with manual approval gates:

- **Development**: For testing and staging (develop branch)
- **Production**: For live deployment (main branch)

Both environments deploy to the same Cloud Run services, differentiated by Docker image tags and environment variables.

## Workflow Architecture

### Branch Strategy

```
develop branch → Development Environment → Cloud Run (with dev config)
    ↓ (merge)
main branch → Production Environment → Cloud Run (with prod config)
```

## GitHub Actions Workflows

### Service Workflows

Each service has its own workflow file:
- **Frontend**: `.github/workflows/frontend.yml`
- **API Service**: 
  - `.github/workflows/api-service-develop.yml` (develop branch)
  - `.github/workflows/api-service-main.yml` (main branch)
- **Stock Data Service**: `.github/workflows/stock-data-service.yml`

### Workflow Jobs

#### 1. Test Job
- Runs on every push to develop or main branches
- Executes service-specific tests
- Runs linting and type checking
- Must pass before proceeding to build

#### 2. Build Job (Develop Branch)
- Builds Docker image
- Tags with `develop` and `develop-{git-sha}`
- Pushes to Docker Hub

#### 3. Version Job (Main Branch Only)
- Calculates semantic version using git tags
- Creates GitHub release
- Tags format: `{service-name}-v{version}`

#### 4. Build and Push Job (Main Branch)
- Builds Docker image
- Tags with `latest` and semantic version
- Pushes to Docker Hub

#### 5. Deploy Job
- **Development**: Requires manual approval via `development` environment
- **Production**: Requires manual approval via `production` environment
- Deploys to Google Cloud Run
- Updates environment variables

## Environment Configuration

### Setting Up GitHub Environments

1. Navigate to your repository settings
2. Click on "Environments" in the left sidebar
3. Create two environments:

#### Development Environment
- Name: `development`
- Protection rules:
  - Required reviewers: Add team members who can approve dev deployments
  - Deployment branches: Restrict to `develop` branch
  
#### Production Environment  
- Name: `production`
- Protection rules:
  - Required reviewers: Add team members who can approve production deployments
  - Deployment branches: Restrict to `main` branch
  - Wait timer: Optional (e.g., 5 minutes) for emergency rollback window

### Required GitHub Secrets

Configure these secrets in Settings → Secrets and variables → Actions:

```yaml
# Core Infrastructure
GCP_PROJECT_ID: your-gcp-project-id
GCP_SA_KEY: {"type": "service_account", ...}  # Service account JSON
DOCKER_USERNAME: your-docker-username
DOCKER_HUB_TOKEN: your-docker-access-token

# Supabase (Frontend)
NEXT_PUBLIC_SUPABASE_URL: https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY: your-anon-key

# API Keys
API_KEY: frontend-to-api-service-key
API_SERVICE_KEY: api-service-internal-key
STOCK_DATA_SERVICE_API_KEY: stock-data-service-key

# Service URLs
API_BASE_URL: https://api-service-xxxxxx.us-central1.run.app
STOCK_DATA_SERVICE_URL: https://stock-data-service-xxxxxx.us-central1.run.app

# Storage
GCS_BUCKET_NAME: your-bucket-name
```

## Deployment Process

### Development Deployment

1. Push code to `develop` branch
2. GitHub Actions automatically:
   - Runs tests
   - Builds Docker image
   - Pushes to Docker Hub
3. Deployment job waits for manual approval
4. Approve deployment in GitHub Actions UI
5. Service deploys to Cloud Run with development configuration

### Production Deployment

1. Merge PR from `develop` to `main`
2. GitHub Actions automatically:
   - Runs tests
   - Calculates new version
   - Creates GitHub release
   - Builds and pushes Docker image
3. Deployment job waits for manual approval
4. Approve deployment in GitHub Actions UI
5. Service deploys to production Cloud Run

## Cloud Run Services

The project uses a unified deployment approach with the following services:
- `frontend` - Next.js frontend application
- `api-service` - API backend service
- `stock-data-service` - Stock/ETF data service

Both development and production deployments use these same services, with different:
- Docker image tags (develop-{sha} vs semantic versions)
- Environment variables (development vs production settings)
- Configuration values (debug logging vs info logging)

## Manual Deployment

For emergency deployments or troubleshooting:

```bash
# Deploy specific service
cd services/{service-name}
./scripts/deploy.sh <version>

# Deploy all services
./scripts/deploy-all.sh
```

## Monitoring Deployments

### GitHub Actions
- View workflow runs: Actions tab in GitHub
- Check deployment status
- Review logs for failures
- Re-run failed jobs

### Google Cloud Console
- Cloud Run: View service status and logs
- Cloud Build: Check build history
- Logging: Detailed application logs

## Rollback Procedure

### Quick Rollback
1. Go to Cloud Run console
2. Select the service
3. Click "Manage Traffic"
4. Route 100% traffic to previous revision

### Full Rollback
1. Revert the merge commit on main branch
2. Push to trigger new deployment
3. Approve deployment when prompted

## Best Practices

1. **Always test on develop first**: Never push directly to main
2. **Use meaningful commit messages**: They appear in releases
3. **Monitor deployments**: Check logs after approval
4. **Tag releases properly**: Use semantic versioning
5. **Update secrets securely**: Never commit secrets to code

## Troubleshooting

### Common Issues

#### Deployment Fails with "Container failed to start"
- Check environment variables in Cloud Run
- Verify all required secrets are set
- Check service logs for startup errors

#### "Waiting for approval" not appearing
- Ensure GitHub environment is created
- Check branch protection rules
- Verify workflow has `environment:` configured

#### Version calculation fails
- Ensure git tags follow pattern: `{service}-v{version}`
- Check for conflicting tags
- Run with fetch-depth: 0 for full history

## Security Considerations

1. **API Keys**: Generate strong, unique keys for each service
2. **Service Accounts**: Use least-privilege principle
3. **Secrets**: Rotate regularly, never commit to code
4. **Environments**: Restrict who can approve deployments
5. **Audit**: Review deployment history regularly