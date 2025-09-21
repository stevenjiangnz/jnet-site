from fastapi import APIRouter

from app.api.v1.endpoints import (
    alerts,
    analysis,
    app_config,
    audit,
    backtest,
    health,
    scan,
    stock,
    strategies,
    symbols,
    system_config,
)

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
api_router.include_router(scan.router, prefix="/scan", tags=["scan"])
api_router.include_router(analysis.router, prefix="/analyze", tags=["analysis"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(strategies.router, prefix="/strategies", tags=["strategies"])
api_router.include_router(symbols.router, prefix="/symbols", tags=["symbols"])
api_router.include_router(
    system_config.router, prefix="/system-config", tags=["system-config"]
)
api_router.include_router(app_config.router, tags=["app-config"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
