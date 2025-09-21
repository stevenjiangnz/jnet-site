import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status

from app.models.system_config import (
    SystemConfig,
    SystemConfigCreate,
    SystemConfigResponse,
    SystemConfigUpdate,
)
from app.services.system_config import SystemConfigService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[SystemConfig])
async def get_system_configs(
    category: Optional[str] = None,
) -> List[SystemConfig]:
    """
    Get all system configurations.

    Optionally filter by category.
    """
    service = SystemConfigService()
    try:
        configs = await service.get_all_configs(category=category)
        return configs
    except Exception as e:
        logger.error(f"Error fetching system configs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch system configurations: {str(e)}",
        )


@router.get("/{category}/{key}", response_model=SystemConfigResponse)
async def get_system_config(
    category: str,
    key: str,
) -> SystemConfigResponse:
    """
    Get a specific system configuration by category and key.
    """
    service = SystemConfigService()
    try:
        config = await service.get_config(category, key)
        if not config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found: {category}/{key}",
            )
        return SystemConfigResponse(config=config)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching config {category}/{key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch configuration: {str(e)}",
        )


@router.post("/", response_model=SystemConfigResponse)
async def create_system_config(
    config: SystemConfigCreate,
) -> SystemConfigResponse:
    """
    Create a new system configuration.
    """
    service = SystemConfigService()
    try:
        # Check if config already exists
        existing = await service.get_config(config.category, config.key)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Configuration already exists: {config.category}/{config.key}",
            )

        new_config = await service.create_config(config)
        return SystemConfigResponse(
            config=new_config,
            message="Configuration created successfully",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating system config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create configuration: {str(e)}",
        )


@router.put("/{category}/{key}", response_model=SystemConfigResponse)
async def update_system_config(
    category: str,
    key: str,
    update: SystemConfigUpdate,
) -> SystemConfigResponse:
    """
    Update an existing system configuration.
    """
    service = SystemConfigService()
    try:
        updated_config = await service.update_config(category, key, update)
        if not updated_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found: {category}/{key}",
            )
        return SystemConfigResponse(
            config=updated_config,
            message="Configuration updated successfully",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating config {category}/{key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update configuration: {str(e)}",
        )


@router.delete("/{category}/{key}")
async def delete_system_config(
    category: str,
    key: str,
) -> dict:
    """
    Delete a system configuration (soft delete).
    """
    service = SystemConfigService()
    try:
        success = await service.delete_config(category, key)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Configuration not found: {category}/{key}",
            )
        return {"message": f"Configuration {category}/{key} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting config {category}/{key}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete configuration: {str(e)}",
        )
