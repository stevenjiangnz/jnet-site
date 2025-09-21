import logging
from typing import List, Optional

from supabase import Client  # type: ignore

from app.db.supabase import get_supabase_client  # type: ignore
from app.models.system_config import (
    SystemConfig,
    SystemConfigCreate,
    SystemConfigUpdate,
)

logger = logging.getLogger(__name__)


class SystemConfigService:
    def __init__(self) -> None:
        self.supabase: Client = get_supabase_client()

    async def get_all_configs(
        self, category: Optional[str] = None
    ) -> List[SystemConfig]:
        """Get all system configurations, optionally filtered by category."""
        try:
            query = self.supabase.table("system_config").select("*")

            if category:
                query = query.eq("category", category)

            query = query.eq("is_active", True)
            response = (
                query.order("category", desc=False).order("key", desc=False).execute()
            )

            logger.info(f"Supabase response data: {response.data}")
            configs = []
            for config in response.data:
                try:
                    configs.append(SystemConfig(**config))
                except Exception as config_error:
                    logger.error(f"Error parsing config {config}: {str(config_error)}")

            logger.info(f"Parsed {len(configs)} configs")
            return configs
        except Exception as e:
            logger.error(f"Error fetching system configs: {str(e)}")
            raise

    async def get_config(self, category: str, key: str) -> Optional[SystemConfig]:
        """Get a specific configuration by category and key."""
        try:
            response = (
                self.supabase.table("system_config")
                .select("*")
                .eq("category", category)
                .eq("key", key)
                .single()
                .execute()
            )

            if response.data:
                return SystemConfig(**response.data)
            return None
        except Exception as e:
            logger.error(f"Error fetching config {category}/{key}: {str(e)}")
            return None

    async def get_config_value(self, category: str, key: str) -> Optional[dict]:
        """Get just the value of a specific configuration."""
        config = await self.get_config(category, key)
        return config.value if config else None

    async def create_config(self, config: SystemConfigCreate) -> SystemConfig:
        """Create a new system configuration."""
        try:
            response = (
                self.supabase.table("system_config").insert(config.dict()).execute()
            )

            return SystemConfig(**response.data[0])
        except Exception as e:
            logger.error(f"Error creating system config: {str(e)}")
            raise

    async def update_config(
        self, category: str, key: str, update: SystemConfigUpdate
    ) -> Optional[SystemConfig]:
        """Update an existing system configuration."""
        try:
            update_data = {k: v for k, v in update.dict().items() if v is not None}

            # Update the configuration
            (
                self.supabase.table("system_config")
                .update(update_data)
                .eq("category", category)
                .eq("key", key)
                .execute()
            )

            # The Supabase Python client doesn't return updated data by default due to RLS policies
            # when using anon keys. This is a known limitation. We fetch the updated record separately.
            # To properly fix this, the API service should use the service role key instead of anon key.
            return await self.get_config(category, key)
        except Exception as e:
            logger.error(f"Error updating config {category}/{key}: {str(e)}")
            raise

    async def delete_config(self, category: str, key: str) -> bool:
        """Delete a system configuration (soft delete by setting is_active to false)."""
        try:
            (
                self.supabase.table("system_config")
                .update({"is_active": False})
                .eq("category", category)
                .eq("key", key)
                .execute()
            )

            # Check if any row was updated by fetching the record
            deleted_config = await self.get_config(category, key)
            return deleted_config is not None and not deleted_config.is_active
        except Exception as e:
            logger.error(f"Error deleting config {category}/{key}: {str(e)}")
            raise

    async def get_symbol_data_years(self) -> int:
        """Get the configured number of years to load for symbol data."""
        config = await self.get_config_value("data_loading", "symbol_years_to_load")
        return config.get("default", 5) if config else 5
