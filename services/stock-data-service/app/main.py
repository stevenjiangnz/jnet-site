import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


app = FastAPI(title="Stock Data Service", version=VERSION, lifespan=lifespan)

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
