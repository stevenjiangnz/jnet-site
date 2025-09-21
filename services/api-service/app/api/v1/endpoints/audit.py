from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import get_current_user_optional
from app.models.audit import (
    AuditEventFilter,
    AuditEventResponse,
    EventSource,
    OperationResult,
)
from app.services.audit_service import audit_service

router = APIRouter()


@router.get("/events", response_model=AuditEventResponse)
async def get_audit_events(
    start_date: Optional[datetime] = Query(
        None, description="Start date for filtering events"
    ),
    end_date: Optional[datetime] = Query(
        None, description="End date for filtering events"
    ),
    operation_type: Optional[str] = Query(None, description="Filter by operation type"),
    result: Optional[OperationResult] = Query(
        None, description="Filter by result status"
    ),
    source: Optional[EventSource] = Query(None, description="Filter by event source"),
    limit: int = Query(100, ge=1, le=1000, description="Number of events to return"),
    offset: int = Query(0, ge=0, description="Number of events to skip"),
    current_user: Optional[dict] = Depends(get_current_user_optional),
) -> AuditEventResponse:
    """
    Retrieve audit events with optional filters.
    Default returns events from the last 7 days.
    """
    try:
        filter_params = AuditEventFilter(
            start_date=start_date,
            end_date=end_date,
            operation_type=operation_type,
            result=result,
            source=source,
            limit=limit,
            offset=offset,
        )

        events_data = await audit_service.get_events(filter_params)
        return AuditEventResponse(**events_data)

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error retrieving audit events: {str(e)}"
        )
