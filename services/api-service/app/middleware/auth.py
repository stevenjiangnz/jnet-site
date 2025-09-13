import logging
from typing import Awaitable, Callable

from fastapi import HTTPException, Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        # Skip auth for health endpoints
        if request.url.path in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
            response = await call_next(request)
            return response

        # Check API key
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            api_key = request.query_params.get("api_key")

        if not api_key or api_key != settings.api_key:
            client_host = request.client.host if request.client else "unknown"
            logger.warning(f"Invalid API key attempt from {client_host}")
            raise HTTPException(status_code=401, detail="Invalid API key")

        response = await call_next(request)
        return response
