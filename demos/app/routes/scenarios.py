from fastapi import APIRouter, HTTPException

from ..models import ScenarioCreate, ScenarioResponse
from ..store import store

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


@router.post("", response_model=ScenarioResponse)
async def create_scenario(data: ScenarioCreate):
    sid = store.create_scenario(data)
    return ScenarioResponse(scenario_id=sid)


@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    s = store.get_scenario(scenario_id)
    if s is None:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return s
