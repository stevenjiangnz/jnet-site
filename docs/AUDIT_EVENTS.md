# Audit Events System

## Overview

The JNet Solution platform includes a comprehensive audit events system that tracks all major operations across the system. This provides visibility into system activities, helps with debugging, and maintains a complete audit trail for compliance and monitoring purposes.

## Architecture

### Database Schema

The audit events are stored in a Supabase table with the following structure:

```sql
CREATE TABLE audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source VARCHAR(50) NOT NULL,
  operator VARCHAR(255),
  operation_type VARCHAR(100) NOT NULL,
  result VARCHAR(20) NOT NULL,
  message TEXT,
  extra_info JSONB
);
```

### Event Flow

1. All operations flow through the API Service
2. API Service logs events to Supabase using a fire-and-forget pattern
3. Events are queued and batch-inserted for optimal performance
4. Frontend retrieves events via the API Service

## Performance Optimization

### Fire-and-Forget Pattern

To prevent audit logging from impacting system performance, we use an asynchronous fire-and-forget pattern:

- Events are added to an in-memory queue
- A background worker processes the queue in batches
- API responses are not blocked by audit logging
- Queue is flushed gracefully on shutdown

### Configuration

The audit logging system can be configured via environment variables:

```env
# Enable/disable audit logging (default: true)
AUDIT_LOGGING_ENABLED=true

# Use async queue mode (default: true)
AUDIT_LOGGING_ASYNC=true

# Maximum queue size (default: 1000)
AUDIT_LOGGING_QUEUE_SIZE=1000
```

## Event Types

### Operation Types
- `stock_price_download` - Stock price data downloads
- `stock_data_retrieval` - Stock data retrieval operations
- `scan_process` - Scanning and analysis processes
- `config_update` - Configuration updates
- `data_cleanup` - Data maintenance and cleanup
- `cache_refresh` - Cache refresh operations

### Event Sources
- `api-service` - API Service operations
- `stock-data-service` - Stock Data Service operations
- `frontend` - Frontend-initiated operations
- `background-job` - Background job operations
- `system` - System-level operations

### Result Types
- `success` - Operation completed successfully
- `failure` - Operation failed
- `warning` - Operation completed with warnings

## Frontend Events Page

The Events page provides:
- Real-time view of system events (default: last 7 days)
- Filtering by date range, operation type, source, and result
- Auto-refresh capability
- CSV export functionality
- Detailed view of event information including extra metadata

## API Endpoints

### Retrieve Events
```
GET /api/v1/audit/events
```

Query parameters:
- `start_date` - Start date (ISO format)
- `end_date` - End date (ISO format)
- `operation_type` - Filter by operation type
- `result` - Filter by result (success/failure/warning)
- `source` - Filter by event source
- `limit` - Number of events to return (max 1000)
- `offset` - Number of events to skip

### Example Usage

```python
# Using the audit service in API endpoints
from app.services.audit_service import audit_service

# Log an event directly
await audit_service.log_event(
    operation_type=OperationType.STOCK_PRICE_DOWNLOAD,
    result=OperationResult.SUCCESS,
    operator=current_user.get("email"),
    message=f"Successfully downloaded data for {symbol}",
    extra_info={
        "symbol": symbol,
        "records_count": 100
    }
)

# Use the context manager for automatic timing
async with audit_service.audit_operation(
    operation_type=OperationType.SCAN_PROCESS,
    operator=current_user.get("email"),
    extra_info={"scan_id": scan_id}
):
    # Perform the operation
    await run_scan()
    # Success is logged automatically
# Failures are also logged automatically with error details
```

## Implementation Details

### Audit Service V2

The audit service (`app/services/audit_service_v2.py`) provides:

1. **Queue-based processing**: Events are queued and processed in batches
2. **Background worker**: Runs asynchronously to process the queue
3. **Graceful shutdown**: Flushes remaining events on application shutdown
4. **Configurable behavior**: Can be disabled or switched to synchronous mode
5. **Error resilience**: Failed insertions are retried (if queue space permits)

### Integration Points

1. **Symbol Management**: Tracks symbol additions, deletions, and downloads
2. **Data Retrieval**: Logs all stock data fetch operations
3. **System Configuration**: Tracks configuration changes
4. **Background Jobs**: Logs scheduled task executions

## Best Practices

1. **Include Operator Information**: Always pass the current user's email when available
2. **Use Meaningful Messages**: Provide clear, descriptive messages for events
3. **Add Relevant Metadata**: Use `extra_info` for additional context (IDs, counts, etc.)
4. **Handle Failures Gracefully**: Audit logging failures should not break the main operation
5. **Monitor Queue Size**: Watch for queue full warnings in production

## Monitoring

Monitor the audit system health by checking:
- API service logs for queue warnings
- Supabase table growth and query performance
- Background worker status in application logs
- Event processing latency via the `duration_ms` field