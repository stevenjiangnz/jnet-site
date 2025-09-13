import logging
import uuid
from typing import Dict, List

from fastapi import APIRouter, HTTPException

from app.models.alert import Alert, AlertRequest, AlertResponse

router = APIRouter()
logger = logging.getLogger(__name__)

# In-memory storage for now
alerts_db = {}


@router.post("/", response_model=AlertResponse)
async def create_alert(request: AlertRequest) -> AlertResponse:
    alert_id = str(uuid.uuid4())

    alert = Alert(id=alert_id, **request.dict())

    alerts_db[alert_id] = alert

    return AlertResponse(id=alert_id, message="Alert created successfully")


@router.get("/", response_model=List[Alert])
async def list_alerts() -> List[Alert]:
    return list(alerts_db.values())


@router.get("/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str) -> Alert:
    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alerts_db[alert_id]


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(alert_id: str, request: AlertRequest) -> AlertResponse:
    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert = Alert(id=alert_id, **request.dict())

    alerts_db[alert_id] = alert

    return AlertResponse(id=alert_id, message="Alert updated successfully")


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str) -> Dict[str, str]:
    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert not found")

    del alerts_db[alert_id]

    return {"message": "Alert deleted successfully"}
