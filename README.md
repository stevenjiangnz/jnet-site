# JNetSolution

Personal public site with microservices architecture, built with modern web technologies and deployed on Google Cloud Run.

## 🏗️ Architecture

- **Frontend**: Next.js 15+ with React, TypeScript, and Tailwind CSS
  - Secure API proxy architecture (see [API Architecture](frontend/API_ARCHITECTURE.md))
- **Authentication**: Supabase Auth (Email/Password and Google OAuth)
- **Database**: Supabase (PostgreSQL)
- **Stock Data Service**: Python FastAPI with uv for stock/ETF EOD data downloading
- **API Service**: Python FastAPI for business logic (backtesting, scanning, analysis, notifications)
- **Local Database**: PostgreSQL 15 (for non-auth services)
- **API Security**: Layered API key authentication (see [API Key Architecture](API_KEY_ARCHITECTURE.md))

## 🌟 Key Features

- **Symbol Management**: Track stock/ETF symbols with comprehensive catalog display
  - Real-time data availability insights (total days, date ranges, completeness)
  - Automatic catalog synchronization with Google Cloud Storage
  - See [Symbol Catalog Display](docs/SYMBOL_CATALOG_DISPLAY.md) for details
- **Price Data**: Historical EOD data with automatic downloads from Yahoo Finance
- **Technical Indicators**: Advanced charting with multiple technical indicators
  - Multi-panel chart layout with dynamic height adjustment
  - Three indicator sets: Basic, Advanced, and Full
  - Includes SMA, Bollinger Bands, MACD, RSI, and ADX
  - See [Technical Indicators Documentation](docs/TECHNICAL_INDICATORS.md) for details
- **Google Cloud Integration**: Secure storage and data management with GCS
- **System Configuration**: Centralized settings management through UI
  - Control data loading parameters (years to load, chart data points)
  - Manage API rate limits and feature flags
  - Redis caching with Upstash for optimal performance
  - Configuration served through API service for centralized management
  - JSON5 format support with preserved comments
  - See [Configuration Management](services/api-service/docs/CONFIGURATION.md) for architecture
- **Modern UI**: Responsive design with dark mode support
- **Audit Events**: Comprehensive audit trail system with performance-optimized logging
  - Fire-and-forget pattern for non-blocking operations
  - See [Audit Events Documentation](docs/AUDIT_EVENTS.md) for details

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 22+ (for local development)
- Python 3.11+ (for Python services development)
- uv (for Stock Data Service development)
- Supabase account (for authentication)

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

4. Configure Supabase authentication:
   - Follow the instructions in `docs/SUPABASE_SETUP.md`
   - Set up Google OAuth provider in Supabase dashboard
   - **Important**: Update Site URL in Supabase Dashboard from `http://localhost:3000` to your production URL
   - Add redirect URLs for all environments (local, Docker, and production)

5. Access the services:
   - Frontend: http://localhost:3110
   - Stock Data Service: http://localhost:9001
   - API Service: http://localhost:8002

## 📁 Project Structure

```
jnet-site/
├── frontend/                  # Next.js 15 frontend application
│   └── src/
│       ├── app/              # App router pages and API routes
│       ├── providers/        # React contexts (Auth)
│       └── utils/            # Utilities (Supabase clients)
├── services/                  # Backend microservices
│   └── stock-data-service/   # Python FastAPI stock/ETF data downloader
├── prd/                      # Product requirements and documentation
├── plan/                     # Implementation plans
├── scripts/                  # Development and deployment scripts
├── .github/                  # GitHub Actions workflows
├── docs/                     # Documentation
│   ├── SUPABASE_SETUP.md    # Supabase configuration guide
│   ├── SUPABASE_MULTI_ENV_SETUP.md  # Multi-environment setup guide
│   └── SETTINGS_PAGE.md     # Settings page implementation guide
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

### API Service

The API service provides business logic layer for trading and analysis features:

- **Backtesting**: Run trading strategies using Backtrader
- **Stock Scanner**: Find stocks matching specific criteria
- **Technical Analysis**: Calculate indicators and generate trading signals
- **Alerts**: Price and indicator-based alert system
- **Notifications**: Push notifications via Pushover and email
- **API Documentation**: Available at http://localhost:8002/docs
- **Stock Data Endpoints**: Formatted data for Highcharts frontend integration

### Local Development (without Docker)

```bash
# Start services locally
./scripts/local-start-frontend.sh     # Frontend on port 3100
./scripts/local-start-stock-data.sh   # Stock Data service on port 9000
cd services/api-service && ./scripts/run_local.sh  # API service on port 8002

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

### Required GitHub Secrets

Add these secrets to your GitHub repository for CI/CD:

**Core Secrets:**
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `GCP_PROJECT_ID`: Your Google Cloud project ID
- `GCP_SA_KEY`: Service account JSON key for Cloud Run deployment
- `DOCKER_HUB_TOKEN`: Docker Hub access token
- `DOCKER_USERNAME`: Docker Hub username (optional, defaults to 'stevenjiangnz')

**API Service Secrets:**
- `API_SERVICE_KEY`: API key for api-service authentication
- `STOCK_DATA_SERVICE_URL`: URL of the stock-data-service (e.g., https://stock-data-service-506487697841.us-central1.run.app)
- `STOCK_DATA_SERVICE_API_KEY`: API key for stock-data-service authentication
- `API_KEY`: Frontend API key for accessing api-service
- `API_BASE_URL`: API service base URL (e.g., https://api-service-506487697841.us-central1.run.app)

**Stock Data Service Secrets:**
- `GCS_BUCKET_NAME`: Google Cloud Storage bucket name for stock data

### CI/CD with GitHub Actions

The project uses GitHub Actions for continuous integration and deployment with environment protections and a unified deployment strategy:

#### Develop Branch
- Triggers on push to `develop` branch when service files are changed
- Runs tests for the affected service
- Builds and pushes Docker images with tags:
  - `develop`
  - `develop-{git-sha}`
- **Deployment**: Requires manual approval via `development` environment
  - Deploys to the same Cloud Run services as production
  - Uses development-specific environment variables and configurations

#### Main Branch (Production)
- Triggers on push to `main` branch when service files are changed
- Runs tests for the affected service
- Calculates semantic version based on git tags
- Builds and pushes Docker images with tags:
  - `latest`
  - Semantic version (e.g., `1.2.3`)
- Creates a GitHub release
- **Deployment**: Requires manual approval via `production` environment
  - Deploys to Cloud Run services
  - Uses production environment variables and configurations

#### Unified Deployment Strategy
Both development and production environments deploy to the same Cloud Run services:
- **api-service**: API backend service
- **frontend**: Next.js frontend application  
- **stock-data-service**: Stock/ETF data service

The environments are differentiated by:
- Docker image tags (semantic versions for production, commit hashes for development)
- Environment variables (development vs production settings)
- Manual approval requirements ensure controlled deployments

#### Environment Configuration
Configure deployment environments in GitHub Settings → Environments:
- **development**: Controls develop branch deployments
- **production**: Controls main branch deployments

For each environment, you can configure:
- Required reviewers for manual approval
- Deployment branch restrictions
- Environment-specific secrets
- Deployment protection rules

#### Manual Deployment

Deploy to Google Cloud Run:

```bash
./scripts/deploy.sh YOUR_GCP_PROJECT_ID
```

## 📝 Features

- [x] Landing page with 3-column layout (17.5%-65%-17.5% responsive grid)
- [x] Full-width navigation bar with centered menu items
- [x] Trading-themed logo and branding
- [x] Price page with 3-column layout for stock charts and data
  - Symbol selector with dropdown
  - Chart configuration (timeframe, chart type, indicators)
  - Placeholder for Highcharts stock charts
  - Real-time data point details display
- [x] Symbol management page with comprehensive features
  - List all tracked symbols with master-detail view
  - Add new symbols with validation
  - Delete symbols with confirmation
  - Quick stats panel showing total symbols
  - Left sidebar navigation for organized workflow
  - Placeholder for bulk download functionality
  - Placeholder for analytics view
- [ ] Blog section with markdown support
- [ ] Contact form with email integration
- [x] User authentication (Supabase - Email/Password and Google OAuth)
- [ ] Admin panel for content management
- [x] Stock/ETF EOD data downloading service
- [x] API service integration for symbol management
- [x] Dark/Light mode theme toggle with system preference support
  - Enhanced dark mode with deeper blacks and better contrast
- [x] Mobile-responsive design with hamburger menu
- [x] Protected routes (authentication required for Price and Symbols pages)
- [ ] SEO optimized
- [ ] Fast loading (< 3s)
- [ ] Accessible (WCAG 2.1 AA)

## 🔧 Technology Stack

- **Frontend**: Next.js 15.4, React 19, TypeScript, Tailwind CSS v4
- **Authentication**: Supabase Auth (Email/Password, Google OAuth)
- **Backend**: Python FastAPI, Node.js Express
- **Database**: Supabase (PostgreSQL) for auth/users, PostgreSQL 15 for local services
- **Package Management**: npm, pip, uv
- **Containerization**: Docker
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions with automatic semantic versioning

## 🔧 Troubleshooting

### Port Already in Use

If you encounter "address already in use" errors when starting services:

```bash
# For frontend (port 3100)
sudo lsof -ti:3100 | xargs -r sudo kill -9
# Or
sudo fuser -k 3100/tcp

# For API service (port 8002)
sudo lsof -ti:8002 | xargs -r sudo kill -9

# For stock data service (port 9000)
sudo lsof -ti:9000 | xargs -r sudo kill -9

# Kill all Next.js processes
pkill -f "next dev"
pkill -f next-server
```

## 📄 License

This project is licensed under the MIT License.