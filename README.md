# JNetSolution

Personal public site with microservices architecture, built with modern web technologies and deployed on Google Cloud Run.

## 🏗️ Architecture

- **Frontend**: Next.js 14+ with React, TypeScript, and Tailwind CSS
- **Auth Service**: ASP.NET Core 8 with JWT authentication
- **User Service**: Python FastAPI for user management
- **Content Service**: Node.js Express for blog and portfolio content
- **Stock Data Service**: Python FastAPI with uv for stock/ETF EOD data downloading
- **Database**: PostgreSQL 15

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- .NET SDK 8.0+ (for Auth Service development)
- Python 3.11+ (for Python services development)
- uv (for Stock Data Service development)

### Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd jnet-site
   ```

2. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```

3. Update environment variables:
   ```bash
   cp frontend/.env.local.example frontend/.env.local
   # Edit .env.local with your configuration
   ```

4. Access the services:
   - Frontend: http://localhost:3110
   - Auth Service: http://localhost:5001
   - User Service: http://localhost:8001
   - Content Service: http://localhost:3001
   - Stock Data Service: http://localhost:9001

## 📁 Project Structure

```
jnet-site/
├── frontend/                  # Next.js 15 frontend application
├── services/                  # Backend microservices
│   ├── auth-service/         # .NET 8 authentication service
│   ├── user-service/         # Python FastAPI user management
│   ├── content-service/      # Node.js Express content management
│   └── stock-data-service/   # Python FastAPI stock/ETF data downloader
├── prd/                      # Product requirements and documentation
├── plan/                     # Implementation plans
├── scripts/                  # Development and deployment scripts
├── .github/                  # GitHub Actions workflows
└── docker-compose.yml        # Local development orchestration
```

## 🛠️ Development

### Docker Development

```bash
# Quick start - builds and starts all services
./scripts/setup.sh

# Start all services
./scripts/docker-up.sh

# Stop all services
./scripts/docker-down.sh

# View logs
./scripts/docker-logs.sh              # All services
./scripts/docker-logs.sh frontend     # Specific service

# Build services
./scripts/docker-build.sh             # All services
./scripts/docker-build.sh frontend    # Specific service

# Restart services
./scripts/docker-restart.sh           # All services
./scripts/docker-restart.sh frontend  # Specific service

# Clean up Docker resources
./scripts/docker-clean.sh

# Setup stock-data service with persistent volume
./scripts/docker-setup-stock-data.sh
```

### Stock Data Service

The stock-data service downloads EOD (End of Day) stock and ETF data from Yahoo Finance:

- **Persistent Storage**: Downloaded files are stored in `services/stock-data-service/data/downloads/`
- **Data Formats**: Supports JSON and CSV output formats
- **API Documentation**: Available at http://localhost:9001/docs
- **Volume Mount**: Uses Docker external volume to persist data across container restarts

### Local Development (without Docker)

```bash
# Start services locally
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

### Running Tests

```bash
# Docker environment
./scripts/test-all.sh

# Local environment
./scripts/local-test-all.sh
```

## 🚢 Deployment

### CI/CD with GitHub Actions

The project uses GitHub Actions for continuous integration and deployment:

#### Develop Branch
- Triggers on push to `develop` branch when service files are changed
- Runs tests for the affected service
- Builds and pushes Docker images with tags:
  - `develop`
  - `develop-{git-sha}`

#### Main Branch (Production)
- Triggers on push to `main` branch when service files are changed
- Runs tests for the affected service
- Calculates semantic version based on git tags
- Builds and pushes Docker images with tags:
  - `latest`
  - Semantic version (e.g., `1.2.3`)
- Creates a GitHub release
- Deploys to Google Cloud Run (if configured)

#### Manual Deployment

Deploy to Google Cloud Run:

```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

## 📝 Features

- [ ] Landing page with portfolio showcase
- [ ] Blog section with markdown support
- [ ] Contact form with email integration
- [ ] User authentication (optional)
- [ ] Admin panel for content management
- [x] Stock/ETF EOD data downloading service
- [ ] Mobile-responsive design
- [ ] SEO optimized
- [ ] Fast loading (< 3s)
- [ ] Accessible (WCAG 2.1 AA)

## 🔧 Technology Stack

- **Frontend**: Next.js 15.4, React 19, TypeScript, Tailwind CSS v4
- **Backend**: .NET 8, Python FastAPI, Node.js Express
- **Database**: PostgreSQL 15
- **Package Management**: npm, dotnet, pip, uv
- **Containerization**: Docker
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions with automatic semantic versioning

## 📄 License

This project is licensed under the MIT License.