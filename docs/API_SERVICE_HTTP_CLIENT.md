# API Service HTTP Client Pattern

## Overview

The API service uses a centralized HTTP client pattern for all internal service-to-service communication. This ensures consistent authentication, error handling, and timeout management across all endpoints.

## Architecture

```
Frontend (Browser) → Next.js API Routes → API Service → Stock Data Service
                        ↓                      ↓               ↓
                  Supabase Auth          HTTP Client      X-API-Key Auth
```

## Implementation

### Centralized HTTP Client

Location: `/services/api-service/app/core/http_client.py`

```python
class StockDataServiceClient:
    """HTTP client for communicating with stock-data-service."""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.stock_data_service_url
        self.api_key = settings.stock_data_service_api_key
        
    @property
    def headers(self) -> Dict[str, str]:
        """Get headers with authentication."""
        return {"X-API-Key": self.api_key}
```

### Key Features

1. **Automatic Authentication**: All requests automatically include the `X-API-Key` header
2. **Consistent Timeouts**: Default 30s timeout, configurable per request
3. **Error Handling**: Automatic `raise_for_status()` on all responses
4. **Logging**: Debug logging for all requests
5. **Type Safety**: Full type annotations for mypy compliance

### Usage Example

```python
from app.core.http_client import stock_data_client

# Simple GET request
response = await stock_data_client.get("/api/v1/catalog")
data = response.json()

# POST with custom timeout
response = await stock_data_client.post(
    "/api/v1/catalog/rebuild",
    timeout=300.0  # 5 minutes for long operations
)

# DELETE request
await stock_data_client.delete(f"/api/v1/symbol/{symbol}")
```

## Benefits

1. **DRY (Don't Repeat Yourself)**: No need to manually add headers in each endpoint
2. **Consistency**: All endpoints use the same authentication pattern
3. **Maintainability**: Changes to authentication only need to be made in one place
4. **Error Prevention**: Eliminates the risk of forgetting to add authentication headers
5. **Testability**: Easy to mock the client for unit tests

## Migration Guide

### Before (Manual Headers)
```python
async with httpx.AsyncClient() as client:
    headers = {"X-API-Key": settings.stock_data_service_api_key}
    response = await client.get(url, headers=headers)
    response.raise_for_status()
```

### After (Centralized Client)
```python
response = await stock_data_client.get(path)
```

## Environment Variables

Required settings in `.env`:
- `STOCK_DATA_SERVICE_URL`: Base URL for the stock data service
- `STOCK_DATA_SERVICE_API_KEY`: API key for authentication

## Error Handling

The client automatically raises `httpx.HTTPStatusError` for non-2xx responses. Endpoints should handle specific status codes as needed:

```python
try:
    response = await stock_data_client.get(f"/api/v1/symbol/{symbol}")
    return response.json()
except httpx.HTTPStatusError as e:
    if e.response.status_code == 404:
        raise HTTPException(status_code=404, detail="Symbol not found")
    raise
```

## Future Improvements

1. **Retry Logic**: Add automatic retries for transient failures
2. **Circuit Breaker**: Implement circuit breaker pattern for resilience
3. **Response Caching**: Add optional caching for GET requests
4. **Metrics**: Add request/response metrics and monitoring