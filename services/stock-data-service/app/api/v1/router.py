from fastapi import APIRouter
from app.api.v1.endpoints import download, data, health, sync, delete, scan

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(download.router, tags=["download"])
api_router.include_router(data.router, tags=["data"])
api_router.include_router(sync.router, tags=["sync"])
api_router.include_router(delete.router, tags=["delete"])
api_router.include_router(scan.router, tags=["scan"])
