"""Redis client utility using Upstash Redis."""

import logging
from typing import Optional

from upstash_redis import Redis

from app.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[Redis] = None


def get_redis_client() -> Optional[Redis]:
    """Get Redis client instance."""
    global _redis_client

    if not settings.upstash_redis_url or not settings.upstash_redis_token:
        logger.warning("Redis configuration not found, caching disabled")
        return None

    if _redis_client is None:
        try:
            # Create Upstash Redis client
            _redis_client = Redis(
                url=settings.upstash_redis_url,
                token=settings.upstash_redis_token,
            )
            # Test connection
            _redis_client.ping()
            logger.info("Redis client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Redis client: {str(e)}")
            _redis_client = None

    return _redis_client
