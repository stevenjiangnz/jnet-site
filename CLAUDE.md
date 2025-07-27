# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Environment
```bash
# Initial setup (first time only)
./scripts/setup.sh

# Start all services
docker-compose up -d

# View logs for specific service
docker-compose logs -f frontend
docker-compose logs -f auth-service
docker-compose logs -f user-service
docker-compose logs -f content-service

# Restart a specific service after changes
docker-compose restart frontend

# Stop all services
docker-compose down

# Rebuild a specific service
docker-compose build frontend
docker-compose up -d frontend
```

### Service-Specific Commands

**Frontend (Next.js)**
```bash
# Run locally without Docker
cd frontend
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Access container for debugging
docker-compose exec frontend sh
```

**Auth Service (.NET 8)**
```bash
# Run tests
docker-compose exec auth-service dotnet test

# Access container
docker-compose exec auth-service bash

# Run locally without Docker
cd services/auth-service
dotnet run
```

**User Service (Python FastAPI)**
```bash
# Run tests
docker-compose exec user-service pytest

# Access container
docker-compose exec user-service bash

# Run locally without Docker
cd services/user-service
uvicorn app.main:app --reload
```

**Content Service (Node.js Express)**
```bash
# Run tests
docker-compose exec content-service npm test

# Access container
docker-compose exec content-service sh

# Run locally without Docker
cd services/content-service
npm run dev
```

### Testing
```bash
# Run all tests
./scripts/test-all.sh

# Database access
docker-compose exec db psql -U dev -d jnetsolution
```

### Deployment
```bash
# Deploy to Google Cloud Run
./scripts/deploy.sh YOUR_GCP_PROJECT_ID

# Deploy to specific region
./scripts/deploy.sh YOUR_GCP_PROJECT_ID us-west1
```

## Architecture Overview

### Microservices Communication
- Frontend communicates with backend services via REST APIs
- Services run on different ports in development:
  - Frontend: 3000
  - Auth Service: 5001 (internal: 5000)
  - User Service: 8001 (internal: 8000)
  - Content Service: 3001 (internal: 3000)
- All services share a PostgreSQL database in development
- JWT tokens from Auth Service are used for authentication across services

### Service Responsibilities
- **Frontend**: Server-side rendered React application, handles UI/UX
- **Auth Service**: Issues JWT tokens, validates credentials, manages sessions
- **User Service**: Manages user profiles, preferences, and user-related data
- **Content Service**: Handles blog posts, portfolio items, and content management

### Docker Development Setup
- Each service has two Dockerfiles:
  - `Dockerfile`: Production build (optimized, multi-stage)
  - `Dockerfile.dev`: Development with hot-reloading
- Volume mounts enable code changes without rebuilding
- Node modules and build artifacts are excluded from volume mounts

### Database Schema
- PostgreSQL 15 is used for all services
- Connection strings use service names (e.g., `db`) in Docker network
- Development credentials are in docker-compose.yml
- Production uses environment variables

### API Patterns
- All services expose health check endpoints at `/health` or `/`
- API routes follow RESTful conventions under `/api/*`
- CORS is configured to allow all origins in development

### Environment Variables
- Copy `.env.example` to `.env.local` for local development
- Service-specific variables:
  - `JWT_SECRET`: Used by Auth Service (minimum 32 characters)
  - `DATABASE_URL`: PostgreSQL connection string
  - `API_BASE_URL`: Frontend uses this to reach backend services

### Google Cloud Run Deployment
- Each service deploys as a separate Cloud Run service
- Frontend is publicly accessible (`--allow-unauthenticated`)
- Backend services require authentication
- Images are pushed to Google Container Registry
- Services need manual configuration for:
  - Cloud SQL connection
  - Environment variables
  - Custom domains