import math
import random
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

from ..models import ScenarioCreate, ScenarioResponse, OrderCreate, VehicleCreate, GoodsType
from ..store import store

CPH_LAT = 55.6761
CPH_LON = 12.5683
CPH_RADIUS_KM = 10.0
DEG_PER_KM_LAT = 1 / 111.32
DEG_PER_KM_LON = 1 / (111.32 * math.cos(math.radians(CPH_LAT)))

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


def _remap_copenhagen(x: float, y: float) -> tuple[float, float]:
    x = min(1.0, max(0.0, x))
    y = min(1.0, max(0.0, y))
    angle = 2 * math.pi * y
    radius_km = CPH_RADIUS_KM * math.sqrt(x)
    lat = CPH_LAT + (radius_km * math.cos(angle)) * DEG_PER_KM_LAT
    lon = CPH_LON + (radius_km * math.sin(angle)) * DEG_PER_KM_LON
    return round(lat, 4), round(lon, 4)


def _random_goods() -> GoodsType:
    return random.choice(["A", "B"])


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
        lh_abs = demand_lh[i] * capacity_orig
        bh_abs = demand_bh[i] * capacity_orig
        tw_s = tw[i + 1][0]
        tw_e = tw[i + 1][1]
        goods = _random_goods()
        lat, lon = _remap_copenhagen(customers[i][0], customers[i][1])

        orders.append(OrderCreate(
            order_id=f"ORD-{1000 + i}",
            lat=lat,
            lon=lon,
            demand=round(lh_abs + bh_abs, 2),
            tw_start=_sanitize(tw_s),
            tw_end=_sanitize(tw_e),
            service_time=_sanitize(svc[i + 1]),
            priority=random.choice([1, 1, 1, 2, 3]),
            goods_type=goods,
            demand_linehaul=round(lh_abs, 2),
            demand_backhaul=round(bh_abs, 2),
            demand_unit="ldm",
        ))

    depot_lat, depot_lon = _remap_copenhagen(depot[0], depot[1])

    vehicles = []
    for i in range(num_vehicles):
        veh_goods: list[GoodsType] = random.choice([["A"], ["B"], ["A", "B"], ["A", "B"]])
        vehicles.append(VehicleCreate(
            vehicle_id=f"Truck-{i + 1:03d}",
            capacity=round(capacity_orig, 2),
            depot_lat=depot_lat,
            depot_lon=depot_lon,
            allowed_goods=veh_goods,
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
