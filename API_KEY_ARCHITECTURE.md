# API Key Architecture

This document describes the API key authentication flow between services in the JNet Solutions platform.

## Overview

The platform uses a layered API key authentication approach where each service-to-service communication is protected by API keys:

```
Browser → Frontend (Next.js) → API Service → Stock Data Service
         ↓                    ↓             ↓
    (Supabase Auth)    (API_SERVICE_KEY)  (STOCK_DATA_SERVICE_API_KEY)
```

## Service Authentication Flow

### 1. Browser → Frontend
- **Authentication**: Supabase Auth (user login)
- **Protection**: Session cookies and Supabase JWT tokens
- **No API Key**: Browser never sees any API keys

### 2. Frontend → API Service
- **Authentication**: X-API-Key header
- **API Key**: `API_SERVICE_KEY` (from GitHub Secrets)
- **Server-side only**: API key is only used in Next.js API routes (server-side)
- **Environment Variable**: `API_KEY` in frontend service

### 3. API Service → Stock Data Service
- **Authentication**: X-API-Key header
- **API Key**: `STOCK_DATA_SERVICE_API_KEY` (from GitHub Secrets)
- **Environment Variable**: `STOCK_DATA_SERVICE_API_KEY` in api-service

## GitHub Secrets Configuration

The following secrets must be configured in GitHub repository settings:

1. **API_SERVICE_KEY**
   - Used by: frontend (as client), api-service (as server)
   - Purpose: Authenticate frontend requests to api-service
   - Example: `your-secure-api-service-key-here`

2. **STOCK_DATA_SERVICE_API_KEY**
   - Used by: api-service (as client), stock-data-service (as server)
   - Purpose: Authenticate api-service requests to stock-data-service
   - Example: `BQ1kpkId36uCXmq_HfXQLOfvY3jZJKiQ2bjSP2oU1XY`

3. **API_SERVICE_URL**
   - Used by: frontend
   - Purpose: Base URL for api-service
   - Example: `https://api-service-506487697841.us-central1.run.app`

4. **STOCK_DATA_SERVICE_URL**
   - Used by: api-service
   - Purpose: Base URL for stock-data-service
   - Example: `https://stock-data-service-506487697841.us-central1.run.app`

## Environment Variables per Service

### Frontend Service
```bash
API_BASE_URL=${API_SERVICE_URL}
API_KEY=${API_SERVICE_KEY}
NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
```

### API Service
```bash
API_KEY=${API_SERVICE_KEY}  # Accepted from clients
STOCK_DATA_SERVICE_URL=${STOCK_DATA_SERVICE_URL}
STOCK_DATA_SERVICE_API_KEY=${STOCK_DATA_SERVICE_API_KEY}  # Used as client
```

### Stock Data Service
```bash
API_KEY=${STOCK_DATA_SERVICE_API_KEY}  # Accepted from clients
```

## Code Implementation

### Frontend API Route Example
```typescript
// frontend/src/app/api/symbols/list/route.ts
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8002';
const API_KEY = process.env.API_KEY || 'dev-api-key';

const response = await fetch(`${API_BASE_URL}/api/v1/symbols/list`, {
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json',
  },
});
```

### API Service Stock Data Client
```python
# api-service/app/services/stock_data.py
class StockDataService:
    def __init__(self) -> None:
        self.base_url = settings.stock_data_service_url
        self.headers = {"X-API-Key": settings.stock_data_service_api_key}
        self.client = httpx.AsyncClient(timeout=30.0, headers=self.headers)
```

## Security Best Practices

1. **Never expose API keys to the browser** - All API keys are server-side only
2. **Use different keys for different services** - Each service pair has unique keys
3. **Rotate keys regularly** - Update GitHub secrets periodically
4. **Use HTTPS always** - All service-to-service communication over TLS
5. **Implement rate limiting** - Prevent API abuse

## Troubleshooting

### API Key Mismatch Errors
If you see authentication errors between services:

1. Check that GitHub secrets are properly set
2. Verify environment variables in Cloud Run:
   ```bash
   gcloud run services describe <service-name> --region us-central1 --format=yaml | grep -A5 "env:"
   ```
3. Ensure CI/CD workflows are using the correct secret names

### Manual Fix (Emergency)
```bash
# Update environment variables directly in Cloud Run
gcloud run services update api-service \
  --region us-central1 \
  --update-env-vars "STOCK_DATA_SERVICE_API_KEY=<key-value>"
```

## CI/CD Configuration

The API keys are automatically deployed through GitHub Actions workflows:
- `.github/workflows/frontend.yml` - Uses `API_SERVICE_KEY`
- `.github/workflows/api-service-main.yml` - Uses both keys
- `.github/workflows/stock-data-service.yml` - Uses `STOCK_DATA_SERVICE_API_KEY`