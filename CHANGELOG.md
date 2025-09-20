# Changelog

All notable changes to the JNet Site project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Symbol Management page with comprehensive features
  - List all tracked symbols with master-detail view
  - **Add New Symbol button** above symbol list for improved discoverability
  - Integrated symbol addition with automatic historical data download
  - Delete symbols with loading indicator and confirmation
  - Quick stats panel showing total symbols
  - Left sidebar navigation for organized workflow
  - Toast notifications for user feedback (using react-hot-toast)
  - Placeholder for bulk download functionality
  - Placeholder for analytics view
- API service endpoints for symbol management
  - `/api/v1/symbols/list` - Get all symbols
  - `/api/v1/symbols/add` - Add new symbol with integrated download
  - `/api/v1/symbols/{symbol}` - Delete symbol
  - `/api/v1/symbols/bulk` - Delete multiple symbols
  - `/api/v1/symbols/{symbol}/price` - Get latest price
  - `/api/v1/symbols/{symbol}/chart` - Get chart data
  - `/api/v1/symbols/bulk-download` - Bulk download historical data
  - `/api/v1/stock/download/{symbol}` - Download historical data proxy endpoint
- Integration between Frontend → API Service → Stock Data Service

### Changed
- Extended PriceChart data retrieval from 2 years to 5 years (1825 trading days)
- Disabled automatic data grouping in Highcharts to always show daily data points
  - Previously would automatically switch to weekly/monthly grouping for longer time ranges
  - Now maintains daily granularity for all time ranges
  - Added configurable options for data grouping behavior
- Enhanced dark mode colors with deeper blacks and better contrast
  - Main content areas now use `bg-black` in dark mode
  - UI elements use deeper grays (`gray-950`, `gray-900`)
  - Improved readability and reduced brightness in dark mode
- Updated both Symbol Management and Price pages with consistent dark mode styling
- **Replaced "Add Symbol" sidebar menu item with prominent button above symbol list**
- Symbol addition now automatically downloads all historical data (period=max)

### Fixed
- Authentication import error in symbol page (changed from `@/contexts/auth-context` to `@/providers/auth-provider`)
- Port configuration for stock-data-service (correct Docker port mapping 9001:9000)
- Brisbane timezone display issue - UTC timestamps from backend now correctly converted to Brisbane time (UTC+10)
  - Updated `toBrisbaneTime()` and `toBrisbaneDateOnly()` functions to properly detect timezone indicators
  - Timestamps without timezone info (e.g., `2025-09-20T02:54:19.188223`) are now correctly interpreted as UTC
- API path for downloading stock data (corrected to `/api/v1/stock/download/`)
- Data consistency issue where newly added symbols only showed 1 year of data
- Added loading states for delete operations

## [1.1.0] - 2025-09-15

### Added
- Price page with 3-column layout for stock charts
  - Left panel: Symbol selector and chart configuration
  - Middle panel: Chart area (placeholder for Highcharts)
  - Right panel: Real-time data point details
  - Support for timeframe selection, chart type, and technical indicators
- Dark/Light mode theme toggle with system preference support
- Mobile-responsive navigation with hamburger menu

### Changed
- Migrated authentication from custom auth-service to Supabase Auth
- Updated all protected routes to use Supabase authentication

### Removed
- Removed auth-service, user-service, and content-service (migrated to Supabase)

## [1.0.0] - 2025-09-14

### Added
- Initial project setup with microservices architecture
- Landing page with 3-column responsive layout (17.5%-65%-17.5%)
- Full-width navigation bar with centered menu items
- Trading-themed logo and branding
- Supabase integration for authentication (Email/Password and Google OAuth)
- Stock Data Service for EOD data downloading
- API Service for business logic (backtesting, scanning, analysis)
- Docker Compose setup for local development
- GitHub Actions CI/CD pipeline with semantic versioning
- Protected routes requiring authentication

### Technical Stack
- Frontend: Next.js 15.4, React 19, TypeScript, Tailwind CSS v4
- Authentication: Supabase Auth
- Backend: Python FastAPI
- Database: Supabase (PostgreSQL) for auth/users, PostgreSQL 15 for services
- Deployment: Google Cloud Run