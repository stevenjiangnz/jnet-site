# Admin Console Documentation

## Overview

The Admin Console provides a centralized interface for system configuration and maintenance tasks. It replaces the previous `/settings` page with an enhanced `/admin` interface featuring tab-based navigation.

## Features

### System Configuration

The System Configuration tab allows administrators to manage application settings using a JSON5 editor with syntax highlighting and comment support.

**Key features:**
- Edit configuration in JSON5 format with preserved comments
- Real-time validation of JSON syntax
- Save and refresh functionality
- Helpful inline documentation for configuration options

**Configuration options include:**
- **API Settings**: Rate limits configuration
- **Data Loading**: Batch size, chart data points, years of historical data
- **Features**: Enable/disable system modules
- **UI Settings**: Theme configuration

### Redis Maintenance

The Redis Maintenance tab provides tools for managing the Redis cache layer.

**Available operations:**
- **Clear All Cache**: Remove all Redis keys to force a complete data refresh
  - Confirmation dialog to prevent accidental clearing
  - Success/error messaging
  - Operation status feedback

**Important considerations:**
- Clearing cache increases backend load temporarily
- Users may experience slower response times during cache rebuild
- Recommended during low-traffic periods

## Architecture

### Frontend Components

```
/admin
├── page.tsx              # Main admin page with auth check
├── admin-content.tsx     # Tab navigation wrapper
├── redis-maintenance-content.tsx  # Redis operations UI
└── ../settings/settings-content-v2.tsx  # Configuration editor
```

### API Endpoints

1. **Frontend API Routes** (Next.js):
   - `/api/admin/redis/clear` - Proxy for Redis clear operation
   - Protected by Supabase authentication

2. **Backend API Routes** (FastAPI):
   - `/api/v1/admin/redis/clear` - Actual Redis clear implementation
   - Protected by API key middleware

### Security

- All admin operations require authentication
- Frontend routes check Supabase auth status
- Backend routes verify API key via middleware
- No sensitive operations exposed to client-side

## Usage

### Accessing the Admin Console

1. Navigate to `/admin` in your browser
2. Must be authenticated via Supabase
3. Select the appropriate tab for your task

### Clearing Redis Cache

1. Navigate to the "Redis Maintenance" tab
2. Click "Clear All Redis Keys"
3. Confirm the operation in the dialog
4. Wait for success confirmation

### Updating Configuration

1. Navigate to the "System Settings" tab
2. Edit the JSON5 configuration
3. Click "Save Configuration"
4. Changes take effect immediately

## Migration Notes

- The previous `/settings` route now redirects to `/admin`
- All existing functionality is preserved
- Navigation menu updated to show "Admin" instead of "Settings"

## Future Enhancements

Planned features for the Redis Maintenance tab:
- Cache statistics and memory usage
- Selective cache clearing by pattern
- Cache key browser
- TTL management