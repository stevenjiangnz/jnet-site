# Configuration Management

The API service provides a centralized configuration management system with Redis caching for optimal performance.

## Overview

The configuration system allows dynamic application configuration without service restarts. Configuration is stored in Supabase and cached in Redis for fast access.

## Architecture

```
Frontend -> API Service -> Redis Cache -> Supabase Database
```

1. **Frontend** requests configuration from API service
2. **API Service** checks Redis cache first
3. If cache miss, fetches from **Supabase** and updates cache
4. Configuration changes invalidate cache automatically

## API Endpoints

### GET /api/v1/app-config
Retrieves the current application configuration.

**Headers:**
- `X-API-Key`: API key for authentication
- `X-User-Token`: User identification token

**Response:**
```json
{
  "config": {
    "api": {
      "rate_limits": 100
    },
    "data_loading": {
      "batch_size": 100,
      "chart_max_data_points": 2500,
      "symbol_years_to_load": 5
    },
    "features": {
      "enabled_modules": ["stocks", "charts", "alerts"]
    },
    "ui": {
      "theme_settings": "light"
    }
  }
}
```

### PUT /api/v1/app-config
Updates the application configuration.

**Headers:**
- `X-API-Key`: API key for authentication
- `X-User-Token`: User identification token

**Request Body:**
```json
{
  "config": {
    "api": { ... },
    "data_loading": { ... },
    "features": { ... },
    "ui": { ... }
  }
}
```

## Caching

- **Provider**: Upstash Redis
- **TTL**: 1 hour (3600 seconds)
- **Cache Key**: `app_config:latest`
- **Invalidation**: Automatic on configuration updates

## Environment Variables

Add these to your `.env` file:

```bash
# Upstash Redis Configuration
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token
```

## Frontend Integration

The frontend accesses configuration through its own API route that proxies to the API service:

```typescript
// Frontend API route: /api/app-config-v2
const response = await fetch('/api/app-config-v2');
const { config } = await response.json();
```

## Configuration Schema

| Section | Field | Type | Description |
|---------|-------|------|-------------|
| api | rate_limits | number | API rate limit per minute |
| data_loading | batch_size | number | Records per batch (10-500) |
| data_loading | chart_max_data_points | number | Maximum chart points (100-5000) |
| data_loading | symbol_years_to_load | number | Years of historical data (1-20) |
| features | enabled_modules | string[] | Enabled feature modules |
| ui | theme_settings | string | UI theme ('light' or 'dark') |

## Usage Example

```python
# In API service code
from app.utils.app_config import get_app_config

config = await get_app_config()
years_to_load = config.get('data_loading', {}).get('symbol_years_to_load', 5)
```

## Performance

With Redis caching enabled:
- First request: ~100-200ms (database fetch + cache write)
- Cached requests: ~10-20ms (cache read only)
- Cache hit rate: >95% in production