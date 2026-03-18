from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from .models import (
    ConstraintViolation,
    JobStatus,
    PlanResult,
    RouteResult,
    ScenarioCreate,
)


class InMemoryStore:
    def __init__(self):
        self.scenarios: dict[str, dict] = {}
        self.jobs: dict[str, dict] = {}
        self.plans: dict[str, PlanResult] = {}
        self.published: dict[str, dict] = {}

    def create_scenario(self, data: ScenarioCreate) -> str:
        sid = str(uuid.uuid4())
        self.scenarios[sid] = {
            "scenario_id": sid,
            "created_at": datetime.utcnow().isoformat(),
            "orders": [o.model_dump() for o in data.orders],
            "vehicles": [v.model_dump() for v in data.vehicles],
            "settings": data.settings,
        }
        return sid

    def get_scenario(self, scenario_id: str) -> Optional[dict]:
        return self.scenarios.get(scenario_id)

    def create_job(self, scenario_id: str) -> str:
        jid = str(uuid.uuid4())
        self.jobs[jid] = {
            "job_id": jid,
            "scenario_id": scenario_id,
            "status": JobStatus.PENDING,
            "progress": 0.0,
            "plan": None,
        }
        return jid

    def update_job(self, job_id: str, **kwargs):
        if job_id in self.jobs:
            self.jobs[job_id].update(kwargs)

    def get_job(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)

    def store_plan(self, plan: PlanResult):
        self.plans[plan.plan_id] = plan

    def get_plan(self, plan_id: str) -> Optional[PlanResult]:
        return self.plans.get(plan_id)

    def update_plan(self, plan_id: str, plan: PlanResult):
        self.plans[plan_id] = plan

    def publish_plan(self, plan_id: str) -> Optional[str]:
        plan = self.get_plan(plan_id)
        if plan is None:
            return None
        snap_id = str(uuid.uuid4())
        self.published[snap_id] = {
            "dispatch_snapshot_id": snap_id,
            "plan": plan.model_dump(),
            "published_at": datetime.utcnow().isoformat(),
        }
        plan.published_version = snap_id
        plan.status = "published"
        self.update_plan(plan_id, plan)
        return snap_id


store = InMemoryStore()
