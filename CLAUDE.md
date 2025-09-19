# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## API Security Architecture

The frontend uses a secure proxy architecture where all API calls go through Next.js API routes:

- **Browser** → **Next.js API Routes** (Supabase Auth) → **API Service** (X-API-Key)
- API keys are NEVER exposed to the browser
- All API routes require Supabase authentication
- See [Frontend API Architecture](frontend/API_ARCHITECTURE.md) for details

### Environment Variables
- Server-side: `API_BASE_URL`, `API_KEY` (never use NEXT_PUBLIC_ prefix)
- Client-side: Only `NEXT_PUBLIC_SUPABASE_*` variables

## Git and Code Quality

- Always perform Black formatting and Ruff linting checks before pushing code to GitHub, as these issues can cause time-consuming review bounces
- Use `./scripts/check-formatting.sh` to check both formatting and linting before committing
- Use `./scripts/fix-formatting.sh` to automatically fix all formatting and auto-fixable linting issues
- A pre-commit hook is installed to prevent commits with formatting or linting errors
- The check includes:
  - Black formatting (Python code style)
  - Ruff linting (import sorting, unused imports, code quality)

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

## CI/CD Workflow

### GitHub Actions Deployment Process

The project uses a two-environment deployment strategy:

1. **Development Environment** (develop branch):
   - Automatic build and test on push
   - Manual approval required for deployment
   - Deploys to `-develop` suffixed Cloud Run services
   - Configure approval in GitHub Settings → Environments → development

2. **Production Environment** (main branch):
   - Automatic build, test, versioning, and release on push
   - Manual approval required for deployment
   - Deploys to production Cloud Run services
   - Configure approval in GitHub Settings → Environments → production

### Environment Protection Rules

To set up environment protection:
1. Go to GitHub repository Settings → Environments
2. Create `development` and `production` environments
3. For each environment, configure:
   - Required reviewers (who can approve deployments)
   - Deployment branch restrictions
   - Environment secrets (if different from repository secrets)
   - Wait timers (optional delay before deployment)

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