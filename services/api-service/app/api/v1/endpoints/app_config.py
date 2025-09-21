"""
App configuration endpoint with Redis caching.
"""

import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from supabase import Client

from app.db.supabase import get_supabase_client
from app.utils.redis_client import get_redis_client

logger = logging.getLogger(__name__)

router = APIRouter()

CACHE_KEY = "app_config:latest"
CACHE_TTL = 3600  # 1 hour TTL


class AppConfigResponse(BaseModel):
    """Response model for app configuration."""

    config: Dict[str, Any]


class AppConfigUpdate(BaseModel):
    """Request model for updating app configuration."""

    config: Dict[str, Any]


async def get_config_from_db() -> Optional[Dict[str, Any]]:
    """Fetch app configuration from database."""
    try:
        supabase: Client = get_supabase_client()
        response = supabase.table("app_config").select("config").single().execute()

        if response.data:
            return response.data.get("config")
        return None
    except Exception as e:
        logger.error(f"Error fetching config from database: {str(e)}")
        return None


@router.get("/app-config", response_model=AppConfigResponse)
async def get_app_config(
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
) -> AppConfigResponse:
    """Get app configuration with caching."""
    try:
        # Try to get from cache first
        redis_client = get_redis_client()
        if redis_client:
            try:
                cached_config = redis_client.get(CACHE_KEY)
                if cached_config:
                    logger.info("Returning app config from cache")
                    config_data = json.loads(cached_config)
                    return AppConfigResponse(config=config_data)
            except Exception as cache_error:
                logger.warning(f"Cache read error: {str(cache_error)}")

        # If not in cache or cache error, get from database
        config = await get_config_from_db()
        if not config:
            # Return default config if nothing found
            config = {
                "api": {"rate_limits": 100},
                "data_loading": {
                    "batch_size": 100,
                    "chart_max_data_points": 2500,
                    "symbol_years_to_load": 5,
                },
                "features": {"enabled_modules": ["stocks", "charts", "alerts"]},
                "ui": {"theme_settings": "light"},
            }

        # Update cache
        if redis_client:
            try:
                redis_client.set(CACHE_KEY, json.dumps(config), ex=CACHE_TTL)
                logger.info("Updated app config cache")
            except Exception as cache_error:
                logger.warning(f"Cache write error: {str(cache_error)}")

        return AppConfigResponse(config=config)

    except Exception as e:
        logger.error(f"Error getting app config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch configuration")


@router.put("/app-config", response_model=AppConfigResponse)
async def update_app_config(
    update: AppConfigUpdate,
    x_user_token: Optional[str] = Header(None, alias="X-User-Token"),
) -> AppConfigResponse:
    """Update app configuration and invalidate cache."""
    try:
        # Update in database
        supabase: Client = get_supabase_client()

        # Get current record
        current_response = (
            supabase.table("app_config").select("id, version").single().execute()
        )

        if not current_response.data:
            raise HTTPException(status_code=404, detail="Configuration not found")

        # Update configuration
        update_response = (
            supabase.table("app_config")
            .update(
                {
                    "config": update.config,
                    "version": (current_response.data.get("version", 0) + 1),
                }
            )
            .eq("id", current_response.data["id"])
            .execute()
        )

        if not update_response.data:
            raise HTTPException(
                status_code=500, detail="Failed to update configuration"
            )

        # Invalidate cache
        redis_client = get_redis_client()
        if redis_client:
            try:
                redis_client.delete(CACHE_KEY)
                logger.info("Invalidated app config cache")
            except Exception as cache_error:
                logger.warning(f"Cache invalidation error: {str(cache_error)}")

        return AppConfigResponse(config=update.config)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating app config: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update configuration")
