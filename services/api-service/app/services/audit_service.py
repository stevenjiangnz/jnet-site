"""
Audit service for logging system events in a non-blocking manner.
This module provides fire-and-forget logging to avoid performance impact.
"""

from app.services.audit_service_v2 import audit_service_v2 as audit_service

__all__ = ["audit_service"]
