import logging
from typing import Awaitable, Callable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Skip auth for health endpoints and OPTIONS requests
        if (
            request.url.path in ["/", "/health", "/docs", "/redoc", "/openapi.json"]
            or request.method == "OPTIONS"
        ):
            response = await call_next(request)
            return response

        # Check API key
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            api_key = request.query_params.get("api_key")

        if not api_key or api_key != settings.api_key:
            client_host = request.client.host if request.client else "unknown"
            logger.warning(f"Invalid API key attempt from {client_host}")
            return Response(
                content='{"detail": "Invalid API key"}',
                status_code=401,
                media_type="application/json",
            )

        response = await call_next(request)
        return response
