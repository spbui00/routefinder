from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


def _gen_id() -> str:
    return str(uuid.uuid4())


class OrderCreate(BaseModel):
    order_id: str
    lat: float
    lon: float
    demand: float
    tw_start: float = 0.0
    tw_end: float = 1e9
    service_time: float = 0.0
    priority: int = 1
    goods_type: str = "A"
    must_follow: Optional[str] = None
    must_precede: Optional[str] = None


class VehicleCreate(BaseModel):
    vehicle_id: str
    capacity: float = 30.0
    depot_lat: float = 0.0
    depot_lon: float = 0.0
    allowed_goods: list[str] = Field(default_factory=lambda: ["A", "B"])
    shift_start: float = 0.0
    shift_end: float = 1e9
    max_distance: float = 1e9
    cost_class: str = "standard"


class ScenarioCreate(BaseModel):
    orders: list[OrderCreate]
    vehicles: list[VehicleCreate]
    settings: dict = Field(default_factory=dict)


class ScenarioResponse(BaseModel):
    scenario_id: str


class LockedSegment(BaseModel):
    vehicle_id: str
    fixed_prefix: list[int] = Field(default_factory=list)


class OptimizationRunCreate(BaseModel):
    scenario_id: str
    vehicle_ids: list[str] = Field(default_factory=list)
    locked_segments: list[LockedSegment] = Field(default_factory=list)
    objective: str = "min_distance"
    variant: Optional[str] = None


class OptimizationRunResponse(BaseModel):
    job_id: str


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class RouteMetrics(BaseModel):
    total_distance: float = 0.0
    total_load: float = 0.0
    num_stops: int = 0
    estimated_time: float = 0.0


class RouteResult(BaseModel):
    vehicle_id: str
    sequence: list[int] = Field(default_factory=list)
    lock_flags: list[bool] = Field(default_factory=list)
    metrics: RouteMetrics = Field(default_factory=RouteMetrics)


class ConstraintViolation(BaseModel):
    type: str
    severity: str = "hard"
    entity: str = ""
    details: str = ""
    blocking: bool = True


class PlanResult(BaseModel):
    plan_id: str
    scenario_id: str
    status: str = "draft"
    routes: list[RouteResult] = Field(default_factory=list)
    objective_value: float = 0.0
    violations: list[ConstraintViolation] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    published_version: Optional[str] = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress: float = 0.0
    plan: Optional[PlanResult] = None


class RerunRequest(BaseModel):
    locked_segments: list[LockedSegment] = Field(default_factory=list)


class ManualEditRequest(BaseModel):
    edits: list[RouteResult] = Field(default_factory=list)


class PlanValidationSummary(BaseModel):
    plan: PlanResult
    violations: list[ConstraintViolation] = Field(default_factory=list)
    is_feasible: bool = True


class PublishResponse(BaseModel):
    dispatch_snapshot_id: str
    published_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
