from fastapi import APIRouter
from app.config import VERSION
from app.core.storage_manager import StorageManager

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": VERSION,
        "service": "stock-data-service",
        "storage": StorageManager.get_storage_stats()
    }