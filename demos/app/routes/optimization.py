import asyncio

from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..models import (
    JobStatus,
    JobStatusResponse,
    OptimizationRunCreate,
    OptimizationRunResponse,
)
from ..solver import solve_scenario
from ..store import store

router = APIRouter(prefix="/api/optimization-runs", tags=["optimization"])


def _run_optimization(job_id: str, scenario: dict, request: OptimizationRunCreate):
    store.update_job(job_id, status=JobStatus.RUNNING, progress=0.1)
    try:
        plan = solve_scenario(
            scenario,
            vehicle_ids=request.vehicle_ids or None,
            locked_segments=request.locked_segments or None,
        )
        store.store_plan(plan)
        store.update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress=1.0,
            plan=plan.model_dump(),
        )
    except Exception as e:
        store.update_job(job_id, status=JobStatus.FAILED, progress=0.0)
        raise


@router.post("", response_model=OptimizationRunResponse)
async def create_optimization_run(
    request: OptimizationRunCreate,
    background_tasks: BackgroundTasks,
):
    scenario = store.get_scenario(request.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    job_id = store.create_job(request.scenario_id)
    background_tasks.add_task(_run_optimization, job_id, scenario, request)
    return OptimizationRunResponse(job_id=job_id)


@router.get("/{job_id}", response_model=JobStatusResponse)
async def get_optimization_run(job_id: str):
    job = store.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(**job)
