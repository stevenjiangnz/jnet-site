import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from app.config import settings, VERSION
from app.api.v1.router import api_router
from app.services.gcs_storage import GCSStorageManager
from app.services.simple_cache import SimpleCache
from app.middleware.auth import APIKeyMiddleware

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Stock Data Service...")
    logger.info(f"GCS Bucket: {settings.gcs_bucket_name}")
    logger.info(f"Cache Enabled: {settings.cache_enabled}")

    # Initialize GCS storage
    if settings.gcs_bucket_name:
        storage = GCSStorageManager()
        logger.info("GCS Storage initialized")

    # Initialize cache if enabled
    if settings.cache_enabled and settings.upstash_redis_url:
        cache = SimpleCache()
        logger.info("Redis cache initialized")

    yield
    logger.info("Shutting down Stock Data Service...")


app = FastAPI(
    title="Stock Data Service",
    version=VERSION,
    lifespan=lifespan,
    swagger_ui_parameters={
        "persistAuthorization": True,
    },
)

# Add API Key middleware
app.add_middleware(APIKeyMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": VERSION, "service": "stock-data-service"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description="Stock Data Service API",
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


app.openapi = custom_openapi
