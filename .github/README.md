# GitHub Actions CI/CD

This directory contains GitHub Actions workflows and supporting scripts for the JNet Site project.

## Workflows

### 1. CI Pipeline (`ci.yml`)
- **Triggers**: On push/PR to main and develop branches
- **Purpose**: Run tests and build verification
- **Jobs**: 
  - Frontend tests (TypeScript, linting)
  - User service tests (Python)
  - Content service tests (Node.js)
  - Stock data service tests (Python)
  - API service tests (Python)
  - Docker build verification

### 2. Develop Branch Build (`develop.yml`)
- **Triggers**: Push to develop branch
- **Purpose**: Build and push Docker images to Google Artifact Registry
- **Features**:
  - Change detection - only builds modified services
  - Pushes images with `develop` and `sha-<commit>` tags

### 3. Release and Deploy (`release.yml`)
- **Triggers**: Push to main branch
- **Purpose**: Version bumping, tagging, and production deployment
- **Features**:
  - Automatic semantic versioning based on commit messages
  - Creates Git tags for each service
  - Deploys to Google Cloud Run
  - Generates release notes

### 4. Manual Deploy (`deploy-manual.yml`)
- **Triggers**: Manual workflow dispatch
- **Purpose**: Deploy specific versions to staging/production
- **Options**:
  - Choose service(s) to deploy
  - Specify version or use latest
  - Select environment (staging/production)

## Versioning Strategy

Commit message conventions:
- `feat:` or `feature:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` or `patch:` → Patch version bump (1.0.0 → 1.0.1)
- `breaking change:` or `major:` → Major version bump (1.0.0 → 2.0.0)
- Other commits → Patch version bump

## Scripts

### `generate-changelog.js`
Generates release notes from commit history for each service.

## Setup Requirements

See [SETUP.md](./SETUP.md) for detailed setup instructions including:
- Google Cloud project setup
- GitHub secrets configuration
- First-time deployment steps

## Service Architecture

```
frontend (Next.js) → Google Cloud Run (public)
    ├── Supabase Auth → Authentication service
    ├── user-service (Python) → Google Cloud Run (authenticated)
    ├── content-service (Node.js) → Google Cloud Run (authenticated)
    ├── stock-data-service (Python) → Google Cloud Run (public)
    └── api-service (Python) → Google Cloud Run (authenticated)
```

## Quick Start

1. Set up Google Cloud project and enable APIs
2. Create service account and download key
3. Add GitHub secrets: `GCP_PROJECT_ID` and `GCP_SA_KEY`
4. Push to develop branch to test builds
5. Merge to main to trigger release and deployment