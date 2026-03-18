from fastapi import APIRouter, HTTPException

from ..models import PublishResponse
from ..store import store

router = APIRouter(prefix="/api/routes", tags=["publishing"])


@router.post("/{plan_id}/publish", response_model=PublishResponse)
async def publish_route(plan_id: str):
    snap_id = store.publish_plan(plan_id)
    if snap_id is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PublishResponse(dispatch_snapshot_id=snap_id)
