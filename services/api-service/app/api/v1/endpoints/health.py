from fastapi import APIRouter, Depends
from typing import Dict, Any
import httpx
import logging

from app.config import settings
from app.services.stock_data import check_stock_data_service


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/ready")
async def readiness_check() -> Dict[str, str]:
    return {"status": "ready"}


@router.get("/dependencies")
async def check_dependencies() -> Dict[str, Any]:
    dependencies = {
        "stock_data_service": False,
        "redis": False,
        "gcs": False,
    }
    
    # Check stock data service
    try:
        dependencies["stock_data_service"] = await check_stock_data_service()
    except Exception as e:
        logger.error(f"Stock data service check failed: {e}")
    
    # Add other dependency checks here
    
    all_healthy = all(dependencies.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "dependencies": dependencies
    }