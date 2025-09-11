# Frontend Deployment Scripts Comparison

## Overview

We have three frontend deployment scripts with different purposes:

| Script | Method | Env Vars | Build Location | Use Case |
|--------|--------|----------|----------------|----------|
| `deploy-frontend-cloud-run.sh` | Cloud Build (`--source`) | Manual export required | Cloud | Original/basic deployment |
| `deploy-frontend-quick.sh` | Cloud Build (`--source`) | Auto-loads from `.env.local` | Cloud | Quick deployment without Docker |
| `deploy-frontend-local-image.sh` | Local Docker (`--image`) | Auto-loads from `.env.local` | Local | Consistent local/prod debugging |

## Detailed Comparison

### 1. `deploy-frontend-cloud-run.sh` (Original)
- **Method**: Uses `--source` (Cloud Build)
- **Env vars**: Requires manual export before running
- **Features**: Basic deployment
- **Drawbacks**: Manual env setup, no local build check

### 2. `deploy-frontend-quick.sh` (Enhanced Cloud Build)
- **Method**: Uses `--source` (Cloud Build)
- **Env vars**: Auto-loads from `.env.local`
- **Features**: 
  - Local Next.js build first (catches errors)
  - Colored output
  - Post-deployment checklist
  - Browser open option
- **Benefits**: Faster than CI/CD, better UX than original

### 3. `deploy-frontend-local-image.sh` (Local Docker Build)
- **Method**: Uses `--image` (pre-built Docker image)
- **Env vars**: Auto-loads from `.env.local`
- **Features**:
  - Builds Docker image locally
  - Optional local testing
  - Pushes to Container Registry
  - Deploys exact same image
- **Benefits**: Debugging consistency, version control

## Recommendation

### Keep These:
1. **`deploy-frontend-local-image.sh`** - Best for production deployments and debugging
2. **`deploy-frontend-quick.sh`** - Good for quick iterations when you trust Cloud Build

### Consider Removing:
- **`deploy-frontend-cloud-run.sh`** - Superseded by `deploy-frontend-quick.sh`

## Usage Guidelines

**For Production Deployments:**
```bash
./scripts/deploy-frontend-local-image.sh
```
Use when you want consistency between local and production.

**For Quick Development Deployments:**
```bash
./scripts/deploy-frontend-quick.sh
```
Use when you want fast deployments and don't need local Docker builds.