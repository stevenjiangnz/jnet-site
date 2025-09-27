import logging
from typing import Dict

from fastapi import APIRouter, HTTPException

from app.utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/redis/clear", response_model=Dict[str, str])
async def clear_redis_cache() -> Dict[str, str]:
    """Clear all Redis cache keys"""
    try:
        redis_client = get_redis_client()

        if redis_client is None:
            raise HTTPException(status_code=503, detail="Redis service unavailable")

        # Get all keys
        keys = redis_client.keys("*")

        if keys:
            # Delete all keys
            deleted_count = redis_client.delete(*keys)
            logger.info(f"Cleared {deleted_count} keys from Redis cache")
            return {
                "message": f"Successfully cleared {deleted_count} keys from Redis cache",
                "status": "success",
                "deleted_count": str(deleted_count),
            }
        else:
            logger.info("No keys found in Redis cache")
            return {
                "message": "Redis cache is already empty",
                "status": "success",
                "deleted_count": "0",
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing Redis cache: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to clear Redis cache: {str(e)}"
        )
