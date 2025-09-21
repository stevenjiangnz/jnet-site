import asyncio
import logging
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, AsyncGenerator, Deque, Dict, Optional

from app.config import settings
from app.db.supabase import get_supabase_client
from app.models.audit import (
    AuditEvent,
    AuditEventFilter,
    EventSource,
    OperationResult,
)

logger = logging.getLogger(__name__)


class AuditServiceV2:
    def __init__(self) -> None:
        self.supabase = get_supabase_client()
        self.enabled = settings.audit_logging_enabled
        self.async_mode = settings.audit_logging_async
        self.queue_size = settings.audit_logging_queue_size
        self._queue: Deque[Dict[str, Any]] = deque(maxlen=self.queue_size)
        self._worker_task: Optional[asyncio.Task] = None
        self._shutdown = False

    async def start_worker(self) -> None:
        """Start the background worker for processing audit events"""
        if self.enabled and self.async_mode and not self._worker_task:
            self._worker_task = asyncio.create_task(self._process_queue())
            logger.info("Audit service worker started")

    async def stop_worker(self) -> None:
        """Stop the background worker gracefully"""
        if self._worker_task:
            self._shutdown = True
            # Process remaining items in queue
            await self._flush_queue()
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            logger.info("Audit service worker stopped")

    async def _process_queue(self) -> None:
        """Background worker to process audit events from the queue"""
        while not self._shutdown:
            try:
                # Process items in batches for better performance
                batch = []
                for _ in range(min(10, len(self._queue))):
                    if self._queue:
                        batch.append(self._queue.popleft())

                if batch:
                    # Insert batch of events
                    try:
                        response = (
                            self.supabase.table("audit_events").insert(batch).execute()
                        )
                        if response.data:
                            logger.debug(f"Batch inserted {len(batch)} audit events")
                        else:
                            logger.warning(
                                f"Failed to insert batch of {len(batch)} audit events"
                            )
                    except Exception as e:
                        logger.warning(f"Error inserting audit event batch: {str(e)}")
                        # Put failed items back in queue (if room)
                        for item in reversed(batch):
                            if len(self._queue) < self.queue_size:
                                self._queue.appendleft(item)

                # Sleep briefly to avoid tight loop
                await asyncio.sleep(0.1)

            except Exception as e:
                logger.error(f"Error in audit worker: {str(e)}")
                await asyncio.sleep(1)  # Back off on error

    async def _flush_queue(self) -> None:
        """Flush all remaining items in the queue"""
        while self._queue:
            batch = []
            for _ in range(min(50, len(self._queue))):
                if self._queue:
                    batch.append(self._queue.popleft())

            if batch:
                try:
                    self.supabase.table("audit_events").insert(batch).execute()
                    logger.debug(f"Flushed {len(batch)} audit events")
                except Exception as e:
                    logger.error(f"Error flushing audit events: {str(e)}")

    async def log_event(
        self,
        operation_type: str,
        result: OperationResult,
        message: Optional[str] = None,
        source: EventSource = EventSource.API_SERVICE,
        operator: Optional[str] = None,
        extra_info: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Log an audit event (fire-and-forget)"""
        if not self.enabled:
            return

        event_data = {
            "source": source,
            "operator": operator,
            "operation_type": operation_type,
            "result": result,
            "message": message,
            "extra_info": extra_info,
        }

        if self.async_mode:
            # Add to queue for async processing
            if len(self._queue) < self.queue_size:
                self._queue.append(event_data)
            else:
                logger.warning(f"Audit queue full, dropping event: {operation_type}")
        else:
            # Synchronous mode - insert immediately in background
            asyncio.create_task(self._insert_event(event_data))

    async def _insert_event(self, event_data: Dict[str, Any]) -> None:
        """Insert a single event asynchronously"""
        try:
            response = self.supabase.table("audit_events").insert(event_data).execute()
            if response.data:
                logger.debug(
                    f"Audit event logged: {event_data['operation_type']} - {event_data['result']}"
                )
            else:
                logger.warning(
                    f"Failed to log audit event: {event_data['operation_type']}"
                )
        except Exception as e:
            logger.warning(f"Error logging audit event: {str(e)}")

    async def get_events(self, filter_params: AuditEventFilter) -> Dict[str, Any]:
        """Retrieve audit events with filters"""
        try:
            query = self.supabase.table("audit_events").select("*")

            # Apply filters
            if filter_params.start_date:
                query = query.gte("timestamp", filter_params.start_date.isoformat())
            else:
                # Default to last 7 days if no start date provided
                seven_days_ago = datetime.utcnow() - timedelta(days=7)
                query = query.gte("timestamp", seven_days_ago.isoformat())

            if filter_params.end_date:
                query = query.lte("timestamp", filter_params.end_date.isoformat())

            if filter_params.operation_type:
                query = query.eq("operation_type", filter_params.operation_type)

            if filter_params.result:
                query = query.eq("result", filter_params.result)

            if filter_params.source:
                query = query.eq("source", filter_params.source)

            # Order by timestamp descending
            query = query.order("timestamp", desc=True)

            # Get total count
            count_response = query.execute()
            total = len(count_response.data) if count_response.data else 0

            # Apply pagination
            query = query.limit(filter_params.limit).offset(filter_params.offset)

            response = query.execute()

            if response.data:
                events = [AuditEvent(**event) for event in response.data]
                return {"events": events, "total": total}
            else:
                return {"events": [], "total": 0}

        except Exception as e:
            logger.error(f"Error retrieving audit events: {str(e)}")
            return {"events": [], "total": 0}

    @asynccontextmanager
    async def audit_operation(
        self,
        operation_type: str,
        operator: Optional[str] = None,
        source: EventSource = EventSource.API_SERVICE,
        **kwargs: Any,
    ) -> AsyncGenerator[None, None]:
        """Context manager for automatic audit logging with timing"""
        if not self.enabled:
            # If audit logging is disabled, just yield
            yield
            return

        start_time = time.time()
        extra_info = kwargs.get("extra_info", {})

        try:
            yield

            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            extra_info["duration_ms"] = duration_ms

            # Log success (fire-and-forget)
            await self.log_event(
                operation_type=operation_type,
                result=OperationResult.SUCCESS,
                operator=operator,
                source=source,
                extra_info=extra_info,
                message=kwargs.get("success_message"),
            )

        except Exception as e:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            extra_info["duration_ms"] = duration_ms
            extra_info["error"] = str(e)

            # Log failure (fire-and-forget)
            await self.log_event(
                operation_type=operation_type,
                result=OperationResult.FAILURE,
                message=f"Operation failed: {str(e)}",
                operator=operator,
                source=source,
                extra_info=extra_info,
            )
            raise


# Singleton instance
audit_service_v2 = AuditServiceV2()
