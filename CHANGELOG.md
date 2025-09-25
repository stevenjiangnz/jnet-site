# Changelog

All notable changes to the JNet Site project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Renamed "Price" menu item to "Market" in frontend navigation
  - Updated navbar and mobile menu components
  - Renamed `/price` route to `/market`
  - Updated all related page components and imports
- **Market Page Dark Theme Enhancement**
  - Applied consistent dark theme styling to match the previous design
  - Updated all UI components with dark color scheme (#0d0d0d, #1a1a1a, #2a2a2a, #3a3a3a)
  - Configured Highcharts with comprehensive dark theme settings
  - Improved contrast and readability with proper text colors (#808080, #e0e0e0)
  - Added dark theme styling for chart elements (axes, grid lines, tooltips, navigation)
  - Reduced sidebar width for better space utilization
  - Applied consistent button and input styling with purple accent color (#5c4cdb)

### Fixed
- **Supabase Row Level Security (RLS) limitation preventing system config updates**
  - API service now properly uses service role key instead of anon key
  - Service role key bypasses RLS policies for admin operations
  - Updated `.env` configuration with correct service role key retrieved via Supabase CLI
- **Frontend build failures in GitHub Actions**
  - Fixed ESLint errors and TypeScript type issues in settings page
  - Replaced `any` types with proper `ConfigValue` type union
  - Removed unused imports (`SystemConfigUpdate` and `ConfigValue`)
  - Fixed React Hook dependency arrays
  - Updated API routes for Next.js 15 compatibility (Promise-based params)
- **Price chart loading only 1 year of data instead of configured amount**
  - Stock-data-service chart endpoint now supports periods beyond 5 years (10y, 15y, 20y, max, and custom periods)
  - Frontend chart API routes now fetch and use the `symbol_years_to_load` configuration
  - PriceChart component no longer hardcodes 1-year period
  - PriceList component now uses configuration instead of hardcoded 5 years
  - Both price chart and price history now respect the user's configured data loading preferences

### Changed  
- **GitHub Actions workflows updated to include Supabase environment variables**
  - Added `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Cloud Run deployments
  - Both development and production workflows now deploy with proper Supabase configuration
  - Environment variables properly masked in deployment logs for security

### Added
- **Dynamic Symbol Filtering** in symbol list
  - Filter input field next to "All Symbols" label
  - Real-time filtering as you type
  - Case-insensitive partial matching
  - Shows filtered count in the label
  - Displays "No symbols match" message when no results
- **Price List View** alongside price chart for comprehensive data visualization
  - Displays price data in a sortable table format with columns: Trade Date, Open, Close, High, Low, Volume
  - Sorted by trade date in descending order (most recent first)
  - Color-coded closing prices (green for gains, red for losses)
  - Volume formatting for readability (e.g., 1.5M, 250K)
  - Collapsible/expandable panel with horizontal toggle
  - Responsive layout that stacks vertically on mobile and shows side-by-side on desktop
  - Synchronized data fetching with the price chart
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
- Updated both Symbol Management and Market pages with consistent dark mode styling
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
- Market page with 3-column layout for stock charts
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