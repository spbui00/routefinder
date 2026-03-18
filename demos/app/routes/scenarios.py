import math
import sys
import os

import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

import torchrl.data.tensor_specs as _tensor_specs
from torchrl.data import Bounded, Composite, UnboundedContinuous, UnboundedDiscrete

for _name, _cls in [
    ("CompositeSpec", Composite),
    ("BoundedTensorSpec", Bounded),
    ("UnboundedContinuousTensorSpec", UnboundedContinuous),
    ("UnboundedDiscreteTensorSpec", UnboundedDiscrete),
]:
    if not hasattr(_tensor_specs, _name):
        setattr(_tensor_specs, _name, _cls)

from routefinder.envs import MTVRPGenerator
from routefinder.envs.mtvrp.generator import VARIANT_GENERATION_PRESETS

from ..models import ScenarioCreate, ScenarioResponse, OrderCreate, VehicleCreate
from ..store import store

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

VARIANT_PRESETS = sorted(VARIANT_GENERATION_PRESETS.keys())


class GenerateRequest(BaseModel):
    num_orders: int = Field(default=12, ge=3, le=100)
    num_vehicles: int = Field(default=3, ge=1, le=20)
    variant: str = "all"


def _sanitize(v: float) -> float:
    if math.isinf(v) or math.isnan(v):
        return 1e9
    return round(v, 4)


def _td_to_orders_and_vehicles(td, num_vehicles: int):
    locs = td["locs"][0].tolist()
    depot = locs[0]
    customers = locs[1:]
    n_customers = len(customers)

    demand_lh = td["demand_linehaul"][0].tolist()
    demand_bh = td["demand_backhaul"][0].tolist()
    tw = td["time_windows"][0].tolist()
    svc = td["service_time"][0].tolist()
    capacity_orig = td["capacity_original"][0, 0].item()
    open_route = bool(td["open_route"][0, 0].item())
    dist_limit = td["distance_limit"][0, 0].item()

    orders = []
    for i in range(n_customers):
        demand_val = demand_lh[i] * capacity_orig
        bh_val = demand_bh[i] * capacity_orig
        tw_s = tw[i + 1][0]
        tw_e = tw[i + 1][1]
        goods = "B" if bh_val > 0.01 and demand_val < 0.01 else "A"

        orders.append(OrderCreate(
            order_id=f"ORD-{1000 + i}",
            lat=round(customers[i][0], 4),
            lon=round(customers[i][1], 4),
            demand=round(demand_val + bh_val, 2),
            tw_start=_sanitize(tw_s),
            tw_end=_sanitize(tw_e),
            service_time=_sanitize(svc[i + 1]),
            priority=1,
            goods_type=goods,
        ))

    vehicles = []
    for i in range(num_vehicles):
        vehicles.append(VehicleCreate(
            vehicle_id=f"Truck-{i + 1:03d}",
            capacity=round(capacity_orig, 2),
            depot_lat=round(depot[0], 4),
            depot_lon=round(depot[1], 4),
            allowed_goods=["A", "B"],
            shift_start=0.0,
            shift_end=_sanitize(tw[0][1]),
            max_distance=_sanitize(dist_limit),
            cost_class="open" if open_route else "standard",
        ))

    return orders, vehicles


@router.get("/variants")
async def list_variants():
    return {"variants": VARIANT_PRESETS}


@router.post("/generate")
async def generate_scenario(req: GenerateRequest):
    variant = req.variant.lower()
    if variant not in VARIANT_GENERATION_PRESETS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown variant '{req.variant}'. Available: {VARIANT_PRESETS}",
        )

    generator = MTVRPGenerator(
        num_loc=req.num_orders,
        variant_preset=variant,
    )
    td = generator(batch_size=[1])

    orders, vehicles = _td_to_orders_and_vehicles(td, req.num_vehicles)

    data = ScenarioCreate(
        orders=orders,
        vehicles=vehicles,
        settings={"variant": variant},
    )
    sid = store.create_scenario(data)
    return {
        "scenario_id": sid,
        "variant": variant,
        "orders": [o.model_dump() for o in orders],
        "vehicles": [v.model_dump() for v in vehicles],
    }


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
