import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.core.backtrader.engine import BacktestEngine
from app.models.backtest import BacktestRequest, BacktestResponse, BacktestStatus

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for now (will be replaced with proper storage)
backtest_results = {}


@router.post("/", response_model=BacktestResponse)
async def create_backtest(
    request: BacktestRequest, background_tasks: BackgroundTasks
) -> BacktestResponse:
    backtest_id = str(uuid.uuid4())

    # Initialize result
    backtest_results[backtest_id] = {
        "id": backtest_id,
        "status": BacktestStatus.PENDING,
        "request": request.dict(),
        "result": None,
        "error": None,
    }

    # Run backtest in background
    background_tasks.add_task(run_backtest, backtest_id, request)

    return BacktestResponse(
        id=backtest_id,
        status=BacktestStatus.PENDING,
        message="Backtest queued for processing",
    )


@router.get("/{backtest_id}")
async def get_backtest(backtest_id: str) -> Dict[str, Any]:
    if backtest_id not in backtest_results:
        raise HTTPException(status_code=404, detail="Backtest not found")

    return backtest_results[backtest_id]


@router.get("/{backtest_id}/report")
async def get_backtest_report(backtest_id: str) -> Dict[str, Any]:
    if backtest_id not in backtest_results:
        raise HTTPException(status_code=404, detail="Backtest not found")

    result = backtest_results[backtest_id]
    if result["status"] != BacktestStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Backtest not completed")

    # Generate detailed report
    return {"id": backtest_id, "report": result.get("result", {})}


async def run_backtest(backtest_id: str, request: BacktestRequest) -> None:
    try:
        backtest_results[backtest_id]["status"] = BacktestStatus.RUNNING

        # TODO: Implement actual backtest logic
        engine = BacktestEngine()
        result = await engine.run(request)

        backtest_results[backtest_id]["status"] = BacktestStatus.COMPLETED
        backtest_results[backtest_id]["result"] = result

    except Exception as e:
        logger.error(f"Backtest {backtest_id} failed: {e}")
        backtest_results[backtest_id]["status"] = BacktestStatus.FAILED
        backtest_results[backtest_id]["error"] = str(e)
