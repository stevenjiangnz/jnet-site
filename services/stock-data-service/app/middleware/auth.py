import os
import logging
from typing import Optional
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader
from fastapi.security.utils import get_authorization_scheme_param
from starlette.requests import Request
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# API Key header configuration
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


class APIKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware for API key authentication.
    Can be configured to allow certain paths without authentication.
    """

    def __init__(
        self, app, api_key: Optional[str] = None, exclude_paths: Optional[list] = None
    ):
        super().__init__(app)
        self.api_key = api_key or os.getenv("API_KEY")
        self.exclude_paths = exclude_paths or [
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc",
        ]
        self.enabled = bool(self.api_key)

        if self.enabled:
            logger.info("API Key authentication enabled")
        else:
            logger.warning(
                "API Key authentication disabled - no API_KEY environment variable set"
            )

    async def dispatch(self, request: Request, call_next):
        # Skip auth for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # If API key auth is not enabled, allow all requests
        if not self.enabled:
            return await call_next(request)

        # Check for API key in header
        api_key = request.headers.get("X-API-Key")

        # Also check Authorization header for Bearer token
        authorization = request.headers.get("Authorization")
        if authorization:
            scheme, credentials = get_authorization_scheme_param(authorization)
            if scheme.lower() == "bearer":
                api_key = credentials

        # Validate API key
        if not api_key or api_key != self.api_key:
            logger.warning(
                f"Invalid API key attempt from {request.client.host if request.client else 'unknown'}"
            )
            return Response(
                content='{"detail":"Invalid or missing API key"}',
                status_code=401,
                headers={"WWW-Authenticate": "Bearer"},
                media_type="application/json",
            )

        return await call_next(request)


def verify_api_key(
    api_key: Optional[str] = Security(api_key_header),
    authorization: Optional[str] = Security(
        APIKeyHeader(name="Authorization", auto_error=False)
    ),
) -> str:
    """
    Dependency for verifying API key in specific endpoints.
    Can be used as an alternative to middleware for granular control.
    """
    configured_api_key = os.getenv("API_KEY")

    # If no API key is configured, allow access
    if not configured_api_key:
        return "no-auth"

    # Check X-API-Key header
    if api_key and api_key == configured_api_key:
        return api_key

    # Check Authorization header for Bearer token
    if authorization:
        scheme, credentials = get_authorization_scheme_param(authorization)
        if scheme.lower() == "bearer" and credentials == configured_api_key:
            return credentials

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
        headers={"WWW-Authenticate": "Bearer"},
    )
