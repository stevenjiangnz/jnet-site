# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Initial Setup
```bash
# First time setup (creates .env.local, builds images, starts services)
./scripts/setup.sh

# If .env.local doesn't exist, copy from example
cp frontend/.env.local.example frontend/.env.local
```

### Docker Development Workflow
```bash
# Start all services
./scripts/docker-up.sh

# Stop all services
./scripts/docker-down.sh

# View logs (all services or specific)
./scripts/docker-logs.sh              # All services
./scripts/docker-logs.sh frontend     # Specific service

# Build images
./scripts/docker-build.sh             # All services
./scripts/docker-build.sh frontend    # Specific service

# Restart services
./scripts/docker-restart.sh           # All services
./scripts/docker-restart.sh frontend  # Specific service

# Clean up Docker resources
./scripts/docker-clean.sh             # Removes containers, volumes, and dangling images

# Setup stock-data service with persistent volume
./scripts/docker-setup-stock-data.sh  # Creates data directories and starts service
```

### Local Development Workflow
```bash
# Start services locally (without Docker)
./scripts/local-start-frontend.sh     # Frontend on port 3100
./scripts/local-start-auth.sh         # Auth service on port 5000
./scripts/local-start-user.sh         # User service on port 8000
./scripts/local-start-content.sh      # Content service on port 3000
./scripts/local-start-stock-data.sh   # Stock Data service on port 9000

# Build all services locally
./scripts/local-build-all.sh

# Run tests locally
./scripts/local-test-all.sh
```

### Service-Specific Commands

**Frontend (Next.js with TypeScript)**
```bash
# Run locally without Docker (port 3100)
cd frontend
npm install
npm run dev     # Uses Turbopack for fast refresh at http://localhost:3100

# Build for production
npm run build

# Run linting
npm run lint

# Access container shell
docker-compose exec frontend sh

# Install new package
docker-compose exec frontend npm install <package-name>
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

# Add new package
docker-compose exec auth-service dotnet add package <package-name>

# Run specific test
docker-compose exec auth-service dotnet test --filter "FullyQualifiedName~TestMethodName"
```

**User Service (Python FastAPI)**
```bash
# Run tests
docker-compose exec user-service pytest

# Run specific test
docker-compose exec user-service pytest tests/test_users.py::test_create_user

# Access container
docker-compose exec user-service bash

# Run locally without Docker
cd services/user-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Install new package
docker-compose exec user-service pip install <package-name>
# Then add to requirements.txt
```

**Content Service (Node.js Express)**
```bash
# Run tests
docker-compose exec content-service npm test

# Run specific test
docker-compose exec content-service npm test -- --testNamePattern="should create post"

# Access container
docker-compose exec content-service sh

# Run locally without Docker
cd services/content-service
npm install
npm run dev

# Install new package
docker-compose exec content-service npm install <package-name>
```

**Stock Data Service (Python FastAPI)**
```bash
# Run tests
docker-compose exec stock-data-service uv run pytest

# Run specific test
docker-compose exec stock-data-service uv run pytest tests/test_api.py::test_download_symbol

# Access container
docker-compose exec stock-data-service bash

# Run locally without Docker
cd services/stock-data-service
uv sync
uv run uvicorn app.main:app --reload --port 9000

# Install new package
docker-compose exec stock-data-service uv add <package-name>

# Access API documentation
# http://localhost:9001/docs (Docker) or http://localhost:9000/docs (Local)
```

### Database Operations
```bash
# Access PostgreSQL CLI
docker-compose exec db psql -U dev -d jnetsolution

# Run migrations (when implemented)
# docker-compose exec <service> <migration-command>

# Backup database
docker-compose exec db pg_dump -U dev jnetsolution > backup.sql

# Restore database
docker-compose exec -T db psql -U dev jnetsolution < backup.sql
```

### Supabase Integration
```bash
# Supabase CLI is integrated via MCP (Model Context Protocol)
# The Supabase MCP server is configured in the project

# Common Supabase operations via MCP:
# - List tables: mcp__supabase__list_tables
# - Execute SQL: mcp__supabase__execute_sql
# - Apply migrations: mcp__supabase__apply_migration
# - List/deploy Edge Functions: mcp__supabase__list_edge_functions, mcp__supabase__deploy_edge_function
# - Generate TypeScript types: mcp__supabase__generate_typescript_types
# - Get project details: mcp__supabase__get_project_url, mcp__supabase__get_anon_key

# Note: Supabase temporary files and local configurations are excluded in .gitignore
```

### Testing
```bash
# Run all tests across services
./scripts/test-all.sh

# Run tests with coverage (per service)
docker-compose exec frontend npm test -- --coverage
docker-compose exec auth-service dotnet test /p:CollectCoverage=true
docker-compose exec user-service pytest --cov=app
docker-compose exec content-service npm test -- --coverage
docker-compose exec stock-data-service uv run pytest --cov=app
```

### Deployment
```bash
# Deploy all services to Google Cloud Run
./scripts/deploy.sh YOUR_GCP_PROJECT_ID

# Deploy to specific region
./scripts/deploy.sh YOUR_GCP_PROJECT_ID us-west1

# Deploy single service
cd services/auth-service
gcloud run deploy auth-service --source .
```

## Architecture Overview

### Microservices Structure
```
Frontend (Next.js) :3110 (Docker) / :3100 (Local dev)
    ├── calls → Auth Service (.NET) :5001 (internal :5000)
    ├── calls → User Service (Python) :8001 (internal :8000)
    ├── calls → Content Service (Node.js) :3001 (internal :3000)
    └── calls → Stock Data Service (Python) :9001 (internal :9000)
                        ↓
                  PostgreSQL :5432
```

### Service Responsibilities
- **Frontend**: Next.js 15.4 with React 19, TypeScript, Tailwind CSS v4
  - Server-side rendering for SEO
  - API routes proxy to backend services
  - JWT token management in cookies/localStorage
  
- **Auth Service**: ASP.NET Core 8
  - JWT token generation and validation
  - User authentication endpoints
  - Password hashing with BCrypt
  
- **User Service**: Python FastAPI
  - User profile CRUD operations
  - User preferences management
  - Profile image handling
  
- **Content Service**: Node.js Express
  - Blog post CRUD operations
  - Portfolio items management
  - Markdown processing

- **Stock Data Service**: Python FastAPI with uv
  - Stock/ETF EOD data download from Yahoo Finance
  - Local file storage (JSON/CSV)
  - Bulk download support
  - Rate limiting for API compliance

### Key Patterns

**Authentication Flow**
1. Frontend sends credentials to Auth Service `/api/auth/login`
2. Auth Service validates and returns JWT token
3. Frontend includes JWT in Authorization header for subsequent requests
4. Backend services validate JWT using shared secret

**API Conventions**
- All backend APIs under `/api/*`
- Health checks at `/health` 
- RESTful endpoints: `GET /api/users`, `POST /api/posts`, etc.
- Consistent error responses: `{ error: string, details?: any }`

**Environment Variables**
```bash
# Frontend
API_BASE_URL=http://localhost:8000  # Points to backend services

# Auth Service
JWT_SECRET=your-development-secret-key-min-32-characters-long
DATABASE_URL=Server=db;Database=jnetsolution;User=dev;Password=devpass;

# User/Content Services
DATABASE_URL=postgresql://dev:devpass@db:5432/jnetsolution
```

### Docker Development Setup
- **Hot Reloading**: All services use volume mounts for code changes
- **Separate Dockerfiles**: `Dockerfile.dev` for development, `Dockerfile` for production
- **Excluded Mounts**: `node_modules`, `.next`, `bin`, `obj` directories
- **Network**: All services on same Docker network, use service names for internal communication

### Production Deployment (Google Cloud Run)
- Each service deploys as separate Cloud Run service
- Frontend: Public access (`--allow-unauthenticated`)
- Backend services: Require authentication
- Environment variables set via Cloud Run UI or gcloud CLI
- Cloud SQL for production database
- Images pushed to Docker Hub as `<username>/jnet-<service>:<version>`

### Common Development Tasks

**Adding a New API Endpoint**
1. Define route in appropriate service
2. Add validation middleware
3. Implement business logic
4. Add tests
5. Update frontend API client

**Debugging a Service**
```bash
# Attach to running container
docker-compose exec <service-name> bash

# View real-time logs
docker-compose logs -f <service-name>

# Check service health
curl http://localhost:<port>/health
```

**Database Schema Changes**
1. Update models in service code
2. Create migration (method varies by service)
3. Run migration in development
4. Test thoroughly
5. Include migration in deployment

### Performance Considerations
- Frontend uses Next.js Turbopack for fast development builds
- Static assets served from `/public` directory
- API responses should be paginated for large datasets
- Consider caching strategies for frequently accessed data
- Database indexes on commonly queried fields

## GitHub Actions CI/CD

### Workflows
- **ci.yml**: Runs tests on push/PR to main and develop branches
- **develop.yml**: Builds and pushes Docker images for develop branch
- **release.yml**: Handles versioning, tagging, and production deployment
- **deploy-manual.yml**: Manual deployment to staging/production

### Versioning Strategy
Commit message conventions for automatic versioning:
- `feat:` or `feature:` → Minor version bump (1.0.0 → 1.1.0)
- `fix:` or `patch:` → Patch version bump (1.0.0 → 1.0.1)
- `breaking change:` or `major:` → Major version bump (1.0.0 → 2.0.0)

### Required GitHub Secrets
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_SA_KEY`: Service account JSON key for Cloud Run deployment
- `DOCKER_HUB_TOKEN`: Docker Hub access token for image push
- `DOCKER_USERNAME` (optional): Docker Hub username (defaults to 'stevenjiangnz')
```

## Deployment Environments

### Cloud Environments
- **Frontend Public Access**: https://frontend-506487697841.us-central1.run.app/