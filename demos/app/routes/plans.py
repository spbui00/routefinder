from fastapi import APIRouter, BackgroundTasks, HTTPException

from ..models import (
    JobStatus,
    ManualEditRequest,
    PlanValidationSummary,
    RerunRequest,
    JobStatusResponse,
    OptimizationRunResponse,
)
from ..solver import solve_scenario, validate_plan
from ..store import store

router = APIRouter(prefix="/api/plans", tags=["plans"])


@router.get("/{plan_id}")
async def get_plan(plan_id: str):
    plan = store.get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


def _run_reoptimize(job_id: str, scenario: dict, locked_segments):
    store.update_job(job_id, status=JobStatus.RUNNING, progress=0.1)
    try:
        plan = solve_scenario(scenario, locked_segments=locked_segments)
        store.store_plan(plan)
        store.update_job(
            job_id,
            status=JobStatus.COMPLETED,
            progress=1.0,
            plan=plan.model_dump(),
        )
    except Exception:
        store.update_job(job_id, status=JobStatus.FAILED, progress=0.0)


@router.post("/{plan_id}/rerun", response_model=OptimizationRunResponse)
async def rerun_plan(
    plan_id: str,
    request: RerunRequest,
    background_tasks: BackgroundTasks,
):
    plan = store.get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    scenario = store.get_scenario(plan.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    job_id = store.create_job(plan.scenario_id)
    background_tasks.add_task(
        _run_reoptimize, job_id, scenario, request.locked_segments
    )
    return OptimizationRunResponse(job_id=job_id)


@router.patch("/{plan_id}/route", response_model=PlanValidationSummary)
async def update_route(plan_id: str, request: ManualEditRequest):
    plan = store.get_plan(plan_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="Plan not found")

    scenario = store.get_scenario(plan.scenario_id)
    if scenario is None:
        raise HTTPException(status_code=404, detail="Scenario not found")

    route_map = {r.vehicle_id: r for r in plan.routes}
    for edit in request.edits:
        route_map[edit.vehicle_id] = edit
    plan.routes = list(route_map.values())
    plan.status = "edited"

    violations = validate_plan(plan, scenario)
    plan.violations = violations

    store.update_plan(plan_id, plan)

    return PlanValidationSummary(
        plan=plan,
        violations=violations,
        is_feasible=not any(v.blocking for v in violations),
    )
