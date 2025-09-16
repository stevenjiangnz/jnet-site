# Scripts Documentation

This directory contains utility scripts for development, testing, and deployment.

## 🚀 Docker Scripts

### `docker-up.sh`
Starts all Docker services in detached mode.
```bash
./scripts/docker-up.sh
```

### `docker-down.sh`
Stops all Docker services.
```bash
./scripts/docker-down.sh
```

### `docker-build.sh [service]`
Builds Docker images. Can build all services or a specific one.
```bash
./scripts/docker-build.sh             # Build all
./scripts/docker-build.sh frontend    # Build specific service
```

### `docker-restart.sh [service]`
Restarts Docker services. Can restart all or a specific service.
```bash
./scripts/docker-restart.sh           # Restart all
./scripts/docker-restart.sh frontend  # Restart specific service
```

### `docker-logs.sh [service]`
Shows Docker container logs. Follows log output by default.
```bash
./scripts/docker-logs.sh              # All services
./scripts/docker-logs.sh frontend     # Specific service
```

### `docker-clean.sh`
Cleans up Docker resources including:
- Stops and removes all containers
- Removes volumes
- Removes dangling images
```bash
./scripts/docker-clean.sh
```

## 🏃 Local Development Scripts

### `local-start-frontend.sh`
Starts the frontend service locally on port 3100.
- Installs dependencies if needed
- Creates .env.local if missing
- Runs with Turbopack for fast refresh

### `local-start-auth.sh`
Starts the .NET auth service locally on port 5000.
- Sets required environment variables
- Runs with development configuration



### `local-build-all.sh`
Builds all services locally (except Python which doesn't need building).

### `local-test-all.sh`
Runs tests for all services in the local environment.

## 🔧 Setup and Utility Scripts

### `setup.sh`
Initial setup script that:
- Checks for required tools
- Creates .env.local from example
- Builds Docker images
- Starts all services
- Checks service health

### `test-all.sh`
Runs tests for all services in Docker containers.

### Deployment Scripts

#### `deploy-frontend.sh`
Deploys frontend using locally built Docker image (ONLY supported method).
- Builds Docker image locally
- Optionally tests image before deployment
- Pushes to Container Registry
- Ensures debugging consistency between local and production

#### `deploy.sh <GCP_PROJECT_ID> [REGION]`
Deploys all services to Google Cloud Run.
```bash
./scripts/deploy.sh YOUR_PROJECT_ID              # Default: us-central1
./scripts/deploy.sh YOUR_PROJECT_ID us-west1    # Custom region
```

### `setup-gcp-service-account.sh`
Sets up Google Cloud service account for deployment (if needed).

## 📝 Notes

- All scripts include error checking
- Scripts are idempotent (safe to run multiple times)
- Docker scripts assume docker-compose is installed
- Local scripts check for required runtimes before executing
- **IMPORTANT**: We only use locally built Docker images for deployment (never Cloud Build)
- See `../docs/DEPLOYMENT_POLICY.md` for deployment policy