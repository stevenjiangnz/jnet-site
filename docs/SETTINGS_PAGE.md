# Settings Page Documentation

## Overview

The Settings Page provides a centralized interface for managing system configurations stored in Supabase. It allows authorized users to view and update various configuration parameters that control application behavior.

## Features

- **Tabbed Interface**: Organized by configuration categories (Api, Data_loading, Features, Ui)
- **Real-time Updates**: Changes are immediately saved to the database
- **JSON Value Editor**: Support for complex configuration values (objects, arrays, primitives)
- **Active/Inactive Toggle**: Enable or disable configurations without deletion
- **Secure API Integration**: All updates go through authenticated API routes

## Architecture

### Frontend Components

- **Location**: `/frontend/src/app/settings/page.tsx`
- **Technology**: Next.js 14+ with App Router, React, Tailwind CSS
- **State Management**: React hooks (useState, useEffect)
- **API Communication**: Fetch API with proper error handling

### API Routes

- **Base Route**: `/api/system-config`
- **Dynamic Routes**: `/api/system-config/[category]/[key]`
- **Authentication**: Supabase Auth required for all operations
- **Security**: API keys never exposed to client

### Backend Integration

- **API Service**: FastAPI endpoints at `/api/v1/system-config`
- **Database**: Supabase PostgreSQL with Row Level Security
- **Models**: Pydantic models for type validation

## Key Configurations

### Data Loading Settings

1. **symbol_years_to_load**
   - Controls how many years of historical data to load for symbols
   - Default: 5, Min: 1, Max: 20

2. **chart_max_data_points**
   - Maximum number of data points to retrieve for price charts
   - Default: 2500, Min: 100, Max: 5000

3. **batch_size**
   - Batch size for data processing operations
   - Default: 100, Min: 10, Max: 500

### API Settings

- **rate_limits**: API rate limits per minute for different user tiers

### Features Settings

- **enabled_modules**: List of enabled application modules (stocks, charts, alerts)

### UI Settings

- **theme_settings**: UI theme configuration (light/dark modes)

## Usage

1. Navigate to `/settings` in the application
2. Click on the desired category tab
3. Edit configuration values in JSON format
4. Click "Save" to persist changes
5. Use "Refresh" to reload latest configurations

## Implementation Details

### Database Schema

```sql
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR NOT NULL,
    key VARCHAR NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category, key)
);
```

### Security

- Row Level Security (RLS) enabled
- Public read access for configurations
- Write access requires authentication
- API routes validate user authentication via Supabase

### Known Issues

1. **Supabase Update Response**: The Python client's update() method doesn't return updated data by default
   - Workaround: Fetch data after update
   - Fix planned: Add `.select()` to update queries

## Development

### Local Testing

```bash
# Start the frontend
cd frontend && npm run dev

# Start the API service
cd services/api-service && ./scripts/run_local.sh

# Access settings page
open http://localhost:3100/settings
```

### Adding New Configurations

1. Insert new config into Supabase:
```sql
INSERT INTO system_config (category, key, value, description)
VALUES ('category_name', 'config_key', '{"default": "value"}', 'Description');
```

2. The UI will automatically display new configurations

### Testing with Playwright

```bash
# Verify settings page functionality
npm run test:e2e -- settings.spec.ts
```

## Related Documentation

- [Frontend API Architecture](../frontend/API_ARCHITECTURE.md)
- [Supabase Setup](../SUPABASE_SETUP.md)
- [System Configuration API](./API_ENDPOINTS.md#system-configuration)