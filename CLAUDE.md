# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git and Code Quality

- Always perform Black formatting check before pushing code to GitHub, as formatting issues can cause time-consuming review bounces

## GitHub Actions Runners

### Host-based Runners Setup (Ubuntu/Linux)
For running GitHub Actions workflows with full Docker support on Ubuntu/Linux hosts:

```bash
cd setup/host-runner

# Initial setup
chmod +x setup.sh && ./setup.sh

# Setup a runner for a repository
export GITHUB_PERSONAL_ACCESS_TOKEN="your-pat-token"
./scripts/setup-runner.sh <github-owner> <github-repo>

# Start/stop runners
./scripts/start-runner.sh <repo-name>
./scripts/stop-runner.sh <repo-name>

# Check status
./scripts/status-runner.sh
```

Multiple runners can be created, one for each repository. See `setup/host-runner/README.md` for detailed instructions.

### Mac Runner Setup (macOS)
For running GitHub Actions workflows on Mac mini or other macOS machines:

```bash
cd setup/mac-runner

# Initial setup
chmod +x setup.sh && ./setup.sh

# Setup a runner for a repository
export GITHUB_PERSONAL_ACCESS_TOKEN="your-pat-token"
./scripts/setup-runner.sh <github-owner> <github-repo>

# Start/stop runners
./scripts/start-runner.sh <repo-name>
./scripts/stop-runner.sh <repo-name>

# Check status
./scripts/status-runner.sh
```

Mac runners automatically detect architecture (Intel x64 or Apple Silicon arm64). See `setup/mac-runner/README.md` for detailed instructions.

## Commands

### Initial Setup
```bash
# First time setup (creates .env.local, builds images, starts services)
./scripts/setup.sh

# If .env.local doesn't exist, copy from example
cp frontend/.env.local.example frontend/.env.local

# Configure Supabase authentication
# 1. Follow SUPABASE_SETUP.md for detailed instructions
# 2. Enable Google OAuth in Supabase dashboard
# 3. Add redirect URLs for localhost and production
```

### API Service (Python/FastAPI)
```bash
# Navigate to API service
cd services/api-service

# Set up environment
./scripts/setup.sh

# Run locally
./scripts/run_local.sh

# Run tests
./scripts/test.sh

# Run linting and formatting checks
./scripts/lint.sh

# Deploy to production (requires version)
./scripts/deploy.sh <version>

# Access API documentation
# Swagger UI: http://localhost:8002/docs
# ReDoc: http://localhost:8002/redoc
```

### Docker Commands
```bash
# Start all services
docker-compose up

# Start specific services
docker-compose up frontend stock-data-service api-service

# Rebuild and start
docker-compose up --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api-service
```

### Local Development Scripts
```bash
# Start services locally (without Docker)
./scripts/local-start-frontend.sh      # Frontend on port 3100
./scripts/local-start-stock-data.sh    # Stock Data service on port 9000
./scripts/local-start-api-service.sh   # API service on port 8002
```

### Testing
```bash
# Frontend tests
cd frontend && npm test

# API Service tests
cd services/api-service && ./scripts/test.sh

# Stock Data Service tests
cd services/stock-data-service && ./scripts/test.sh
```

### Deployment
```bash
# Deploy stock-data-service to Cloud Run
cd services/stock-data-service && ./scripts/deploy.sh

# Deploy api-service to Cloud Run (with version)
cd services/api-service && ./scripts/deploy.sh 1.0.0
```