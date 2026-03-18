import math
import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..models import ScenarioCreate, ScenarioResponse, OrderCreate, VehicleCreate
from ..store import store

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])


class GenerateRequest(BaseModel):
    num_orders: int = Field(default=12, ge=3, le=100)
    num_vehicles: int = Field(default=3, ge=1, le=20)
    variant: str = "VRPTW"


CITY_POOL = [
    (55.49, 9.47, "Kolding"),
    (55.37, 10.43, "Odense"),
    (55.71, 9.53, "Vejle"),
    (55.47, 8.45, "Esbjerg"),
    (56.15, 10.21, "Aarhus"),
    (54.78, 9.43, "Flensburg"),
    (53.92, 9.51, "Itzehoe"),
    (53.75, 9.65, "Elmshorn"),
    (53.55, 10.00, "Hamburg"),
    (52.52, 13.40, "Berlin"),
    (51.50, -0.14, "London"),
    (48.79, 2.46, "Paris"),
    (43.21, 2.35, "Carcassonne"),
    (51.20, 3.22, "Brugge"),
    (50.85, 2.73, "Poperinge"),
    (51.90, 4.50, "Rotterdam"),
    (45.56, 5.91, "Grenoble"),
    (50.08, 14.44, "Prague"),
    (48.21, 16.37, "Vienna"),
    (52.37, 4.90, "Amsterdam"),
]


def _generate_orders(n: int) -> list[OrderCreate]:
    depot_idx = 0
    cities = random.sample(CITY_POOL[1:], min(n, len(CITY_POOL) - 1))
    if len(cities) < n:
        cities = cities * (n // len(cities) + 1)
    cities = cities[:n]

    orders = []
    for i, (lat, lon, city) in enumerate(cities):
        lat += random.uniform(-0.05, 0.05)
        lon += random.uniform(-0.05, 0.05)
        tw_start = round(random.uniform(0, 4), 2)
        tw_end = round(tw_start + random.uniform(1, 4), 2)
        orders.append(OrderCreate(
            order_id=f"ORD-{1000 + i}",
            lat=round(lat, 4),
            lon=round(lon, 4),
            demand=round(random.uniform(1, 12), 1),
            tw_start=tw_start,
            tw_end=tw_end,
            service_time=round(random.uniform(0.1, 0.5), 2),
            priority=random.choice([1, 1, 1, 2, 2, 3]),
            goods_type=random.choice(["A", "A", "A", "B", "B"]),
        ))
    return orders


def _generate_vehicles(n: int) -> list[VehicleCreate]:
    depot = CITY_POOL[0]
    names = ["Mega", "Standard", "Reefer", "Express", "Heavy"]
    goods_combos = [["A", "B"], ["A"], ["B"], ["A", "B"], ["A"]]
    vehicles = []
    for i in range(n):
        vehicles.append(VehicleCreate(
            vehicle_id=f"Truck-{i + 1:03d} ({names[i % len(names)]})",
            capacity=round(random.uniform(20, 40), 0),
            depot_lat=depot[0],
            depot_lon=depot[1],
            allowed_goods=goods_combos[i % len(goods_combos)],
            shift_start=0.0,
            shift_end=10.0,
            max_distance=float("inf"),
            cost_class="standard",
        ))
    return vehicles


@router.post("/generate")
async def generate_scenario(req: GenerateRequest):
    orders = _generate_orders(req.num_orders)
    vehicles = _generate_vehicles(req.num_vehicles)
    data = ScenarioCreate(orders=orders, vehicles=vehicles)
    sid = store.create_scenario(data)
    return {
        "scenario_id": sid,
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
