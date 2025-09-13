# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git and Code Quality

- Always perform Black formatting check before pushing code to GitHub, as formatting issues can cause time-consuming review bounces

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