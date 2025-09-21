# Audit Events System Implementation Plan

## Overview
This document outlines the implementation plan for an audit event system to track all major operations in the system, including stock price downloads, scanning processes, maintenance tasks, and data retrieval operations.

## Architecture
- All major operations flow through the api-service
- Api-service logs events to Supabase
- Frontend retrieves and displays events via api-service

## 1. Database Schema

### Simplified Audit Events Table
```sql
CREATE TABLE audit_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  source VARCHAR(50) NOT NULL, -- 'api-service', 'stock-data-service', etc.
  operator VARCHAR(255), -- user email or 'system'
  operation_type VARCHAR(100) NOT NULL, -- 'stock_price_download', 'scan_completed', etc.
  result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'warning'
  message TEXT, -- description or error message
  extra_info JSONB -- any additional data
);

-- Indexes for common queries
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp DESC);
CREATE INDEX idx_audit_events_operation_type ON audit_events(operation_type);
CREATE INDEX idx_audit_events_result ON audit_events(result);
```

## 2. API Service Implementation

### Event Types and Models
```python
# app/models/audit.py
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class EventSource(str, Enum):
    API_SERVICE = "api-service"
    STOCK_DATA_SERVICE = "stock-data-service"
    FRONTEND = "frontend"
    BACKGROUND_JOB = "background-job"
    SYSTEM = "system"

class OperationType(str, Enum):
    # Data Operations
    STOCK_PRICE_DOWNLOAD = "stock_price_download"
    STOCK_DATA_RETRIEVAL = "stock_data_retrieval"
    SCAN_PROCESS = "scan_process"
    
    # Maintenance
    DATA_CLEANUP = "data_cleanup"
    CACHE_REFRESH = "cache_refresh"
    
    # User Actions
    USER_LOGIN = "user_login"
    CONFIG_UPDATE = "config_update"
    
    # System
    SERVICE_START = "service_start"
    SERVICE_STOP = "service_stop"

class OperationResult(str, Enum):
    SUCCESS = "success"
    FAILURE = "failure"
    WARNING = "warning"

class AuditEvent(BaseModel):
    timestamp: datetime
    source: EventSource
    operator: Optional[str]
    operation_type: str
    result: OperationResult
    message: Optional[str]
    extra_info: Optional[Dict[str, Any]]

class AuditEventFilter(BaseModel):
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    operation_type: Optional[str]
    result: Optional[OperationResult]
    source: Optional[EventSource]
```

### Audit Service
```python
# app/services/audit_service.py
class AuditService:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        
    async def log_event(
        self,
        operation_type: str,
        result: OperationResult,
        message: Optional[str] = None,
        source: EventSource = EventSource.API_SERVICE,
        operator: Optional[str] = None,
        extra_info: Optional[Dict[str, Any]] = None
    ):
        """Log an audit event to the database"""
        
    async def get_events(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        operation_type: Optional[str] = None,
        result: Optional[OperationResult] = None,
        limit: int = 100
    ):
        """Retrieve audit events with filters"""
```

## 3. API Endpoints

### New Endpoints
```python
# app/api/v1/endpoints/audit.py

# GET /api/v1/audit/events
# Query params: start_date, end_date, operation_type, result, limit
# Returns: List of audit events

# POST /api/v1/audit/events (internal use only)
# Body: AuditEvent
# Returns: Created audit event
```

## 4. Frontend Implementation

### Events Page Features
- Date range picker (default: last 7 days)
- Filters:
  - Operation type dropdown
  - Result status (success/failure/warning)
  - Source service
- Table display with columns:
  - Timestamp
  - Operation Type
  - Operator
  - Result (with color coding)
  - Message
  - View Details (for extra_info)
- Pagination
- Auto-refresh option
- Export to CSV

### Frontend API Route
```typescript
// frontend/src/app/api/audit/events/route.ts
// GET endpoint to retrieve audit events from api-service
```

### Events Page Component
```typescript
// frontend/src/app/events/page.tsx
// Main events page with filtering and display
```

## 5. Integration Points

### Existing Endpoints to Add Audit Logging:
1. Stock Data Operations
   - `/api/v1/stock-data/download`
   - `/api/v1/stock-data/sync`
   
2. Scanning Operations
   - `/api/v1/scan/run`
   - `/api/v1/scan/results`
   
3. Configuration Updates
   - `/api/v1/config/update`
   
4. Data Retrieval
   - `/api/v1/symbols/prices`
   - `/api/v1/portfolios/data`

## 6. Implementation Steps

1. Create Supabase migration for audit_events table
2. Implement audit models and service in api-service
3. Add audit logging to existing endpoints
4. Create audit events retrieval endpoint
5. Create frontend API route
6. Build Events page UI
7. Add navigation menu item
8. Test end-to-end audit logging

## 7. Security Considerations

- Ensure audit events are read-only from frontend
- No sensitive data in message or extra_info fields
- Access control for events page (authenticated users only)
- Consider data retention policies

## 8. Future Enhancements

1. Real-time event streaming
2. Alert system for critical failures
3. Analytics dashboard
4. Event aggregation and reporting
5. Automated cleanup of old events