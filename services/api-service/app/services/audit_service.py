"""
Audit service for logging system events in a non-blocking manner.
This module provides fire-and-forget logging to avoid performance impact.
"""

from typing import TYPE_CHECKING, Any, Optional

if TYPE_CHECKING:
    from app.services.audit_service_v2 import AuditServiceV2


def get_audit_service() -> "AuditServiceV2":
    """Get the audit service instance with lazy initialization."""
    from app.services.audit_service_v2 import get_audit_service as _get_service

    return _get_service()


# Create a proxy class that initializes on first use
class AuditServiceProxy:
    """Proxy class that provides lazy initialization of the audit service."""

    def __init__(self) -> None:
        self._service: Optional["AuditServiceV2"] = None

    def _get_service(self) -> "AuditServiceV2":
        if self._service is None:
            self._service = get_audit_service()
        return self._service

    def __getattr__(self, name: str) -> Any:
        return getattr(self._get_service(), name)


# Export the proxy instance that will be used throughout the app
audit_service = AuditServiceProxy()

__all__ = ["audit_service", "get_audit_service"]
