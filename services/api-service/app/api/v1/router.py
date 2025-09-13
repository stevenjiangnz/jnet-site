from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    analysis,
    backtest,
    health,
    scan,
    stock,
    strategies,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
api_router.include_router(scan.router, prefix="/scan", tags=["scan"])
api_router.include_router(analysis.router, prefix="/analyze", tags=["analysis"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
