import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.api.v1.router import api_router
from app.config import settings
from app.middleware.auth import AuthMiddleware

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info(f"Starting API Service in {settings.environment} mode")
    logger.info(f"Version: {getattr(settings, 'version', '0.0.8-fix')}")
    logger.info(f"Stock Data Service URL: {settings.stock_data_service_url}")
    yield
    logger.info("Shutting down API Service")


app = FastAPI(
    title="JNet API Service",
    description="Business Logic Layer for JNet Solution",
    version="0.1.1",
    lifespan=lifespan,
    swagger_ui_parameters={
        "persistAuthorization": True,
    },
)

# CORS middleware
origins = (
    ["*"]
    if settings.environment == "development"
    else [
        "https://frontend-506487697841.us-central1.run.app",
        "https://jnet-solution.com",
        "https://www.jnet-solution.com",
        "http://localhost:3000",  # For local development with production API
        "http://localhost:3100",  # For local development with production API
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Custom middleware
# Only add auth middleware if not disabled
if not settings.disable_auth:
    app.add_middleware(AuthMiddleware)
else:
    logger.warning("Authentication middleware is disabled!")

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root() -> Dict[str, str]:
    return {"message": "JNet API Service", "version": "0.1.0"}


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "healthy", "environment": settings.environment}


def custom_openapi() -> Dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "apiKeyQuery": {
            "type": "apiKey",
            "in": "query",
            "name": "api_key",
            "description": "API key passed as a query parameter",
        },
        "apiKeyHeader": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API key passed as a header",
        },
    }

    # Apply security to all endpoints except docs and health
    for path, methods in openapi_schema.get("paths", {}).items():
        if path not in ["/", "/health", "/docs", "/redoc", "/openapi.json"]:
            for method in methods.values():
                if isinstance(method, dict):
                    method["security"] = [{"apiKeyQuery": []}, {"apiKeyHeader": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Override the OpenAPI method
app.openapi = custom_openapi  # type: ignore[method-assign]
