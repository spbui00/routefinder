from __future__ import annotations

import sys
import os
import uuid
import math
from typing import Optional

import torch
import numpy as np
from tensordict import TensorDict

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

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

from routefinder.envs import MTVRPEnv, MTVRPGenerator
from routefinder.utils import greedy_policy, rollout, rollout_actions

from .models import (
    ConstraintViolation,
    LockedSegment,
    PlanResult,
    RouteMetrics,
    RouteResult,
)

_env: Optional[MTVRPEnv] = None
_policy = None
_model = None


def _get_env() -> MTVRPEnv:
    global _env
    if _env is None:
        _env = MTVRPEnv(
            MTVRPGenerator(num_loc=20, variant_preset="all"),
            check_solution=False,
        )
    return _env


def _try_load_model():
    global _model, _policy
    if _model is not None:
        return
    import warnings
    warnings.filterwarnings("ignore", message=".*weights_only.*", category=FutureWarning)
    try:
        from routefinder.models import RouteFinderBase

        ckpt_paths = [
            "checkpoints/100/rf-transformer.ckpt",
            "../checkpoints/100/rf-transformer.ckpt",
            "demos/../checkpoints/100/rf-transformer.ckpt",
            os.path.join(os.path.dirname(__file__), "..", "..", "checkpoints", "100", "rf-transformer.ckpt"),
        ]
        ckpt = None
        for p in ckpt_paths:
            if os.path.exists(p):
                ckpt = p
                break

        if ckpt:
            _model = RouteFinderBase.load_from_checkpoint(
                ckpt, map_location="cpu", strict=False, weights_only=False
            )
            _policy = _model.policy.eval()
    except Exception:
        pass


def _build_td_for_vehicle(
    orders: list[dict],
    vehicle: dict,
) -> tuple[Optional[TensorDict], list[dict], list[tuple[float, float]]]:
    allowed = set(vehicle.get("allowed_goods", ["A", "B"]))
    filtered = [o for o in orders if o.get("goods_type", "A") in allowed]
    if not filtered:
        return None, [], []

    depot = (vehicle.get("depot_lat", 0.0), vehicle.get("depot_lon", 0.0))
    if depot == (0.0, 0.0):
        senders = list({(o["lat"], o["lon"]) for o in filtered})
        if len(senders) == 1:
            depot = senders[0]
        else:
            depot = (
                sum(s[0] for s in senders) / len(senders),
                sum(s[1] for s in senders) / len(senders),
            )

    all_coords = [depot] + [(o["lat"], o["lon"]) for o in filtered]
    lats = [c[0] for c in all_coords]
    lons = [c[1] for c in all_coords]
    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)
    eps = 1e-6
    lat_range = lat_max - lat_min + eps
    lon_range = lon_max - lon_min + eps
    locs_norm = np.array(
        [[(lat - lat_min) / lat_range, (lon - lon_min) / lon_range] for lat, lon in all_coords],
        dtype=np.float32,
    )

    capacity = vehicle.get("capacity", 30.0)
    demands = np.array([o["demand"] for o in filtered], dtype=np.float32) / capacity
    n = len(all_coords)

    locs = torch.tensor(locs_norm.reshape(1, -1, 2))
    demand_linehaul = torch.tensor(demands.reshape(1, -1))

    tw = torch.zeros(1, n, 2)
    tw[..., 1] = float("inf")
    service = torch.zeros(1, n)

    for i, o in enumerate(filtered):
        tw_start = o.get("tw_start", 0.0)
        tw_end = o.get("tw_end", float("inf"))
        if math.isfinite(tw_start) and math.isfinite(tw_end) and tw_end < 1e6:
            tw[0, i + 1, 0] = tw_start
            tw[0, i + 1, 1] = tw_end
        svc = o.get("service_time", 0.0)
        if math.isfinite(svc):
            service[0, i + 1] = svc

    td = TensorDict(
        {
            "locs": locs,
            "demand_linehaul": demand_linehaul,
            "demand_backhaul": torch.zeros_like(demand_linehaul),
            "backhaul_class": torch.full((1, 1), 1, dtype=torch.int32),
            "time_windows": tw,
            "service_time": service,
            "vehicle_capacity": torch.ones(1, 1),
            "capacity_original": torch.ones(1, 1),
            "open_route": torch.ones(1, 1, dtype=torch.bool),
            "distance_limit": torch.full(
                (1, 1), min(vehicle.get("max_distance", float("inf")), 1e10)
            ),
            "speed": torch.ones(1, 1),
        },
        batch_size=[1],
    )

    return td, filtered, all_coords


def _compute_route_length(locs: torch.Tensor, seq: list[int]) -> float:
    total = 0.0
    for i in range(len(seq) - 1):
        a, b = seq[i], seq[i + 1]
        dx = locs[0, a, 0] - locs[0, b, 0]
        dy = locs[0, a, 1] - locs[0, b, 1]
        total += math.sqrt(dx.item() ** 2 + dy.item() ** 2)
    return total


def solve_scenario(
    scenario: dict,
    vehicle_ids: Optional[list[str]] = None,
    locked_segments: Optional[list[LockedSegment]] = None,
) -> PlanResult:
    _try_load_model()
    env = _get_env()
    orders_raw = scenario["orders"]
    vehicles_raw = scenario["vehicles"]

    if vehicle_ids:
        vehicles_raw = [v for v in vehicles_raw if v["vehicle_id"] in vehicle_ids]

    lock_map: dict[str, list[int]] = {}
    if locked_segments:
        for ls in locked_segments:
            lock_map[ls.vehicle_id] = ls.fixed_prefix

    plan_id = str(uuid.uuid4())
    routes: list[RouteResult] = []
    violations: list[ConstraintViolation] = []
    total_obj = 0.0

    for veh in vehicles_raw:
        vid = veh["vehicle_id"]
        result = _build_td_for_vehicle(orders_raw, veh)
        if result is None:
            continue
        td, filtered, all_coords = result
        if td is None or len(filtered) == 0:
            continue

        td = env.reset(td)

        prefix = lock_map.get(vid, [])
        if prefix:
            prefix_tensor = torch.tensor([prefix], dtype=torch.long)
            td = rollout_actions(env, td, prefix_tensor)

        if not td["done"].all():
            remaining_actions = rollout(env, td.clone(), policy=greedy_policy)
            full_seq = prefix + remaining_actions[0].tolist()
        else:
            full_seq = prefix

        full_seq = [a for a in full_seq if a != 0]

        lock_flags = [True] * len(prefix) + [False] * (len(full_seq) - len(prefix))

        route_dist = _compute_route_length(
            td["locs"] if "locs" in td.keys() else result[0]["locs"], [0] + full_seq
        )
        total_load = sum(filtered[i - 1]["demand"] for i in full_seq if 0 < i <= len(filtered))
        capacity = veh.get("capacity", 30.0)

        if total_load > capacity:
            violations.append(
                ConstraintViolation(
                    type="capacity",
                    severity="hard",
                    entity=vid,
                    details=f"Load {total_load:.1f} exceeds capacity {capacity:.1f}",
                    blocking=True,
                )
            )

        routes.append(
            RouteResult(
                vehicle_id=vid,
                sequence=full_seq,
                lock_flags=lock_flags,
                metrics=RouteMetrics(
                    total_distance=round(route_dist, 4),
                    total_load=round(total_load, 2),
                    num_stops=len(full_seq),
                    estimated_time=round(route_dist * 60, 1),
                ),
            )
        )
        total_obj += route_dist

    return PlanResult(
        plan_id=plan_id,
        scenario_id=scenario["scenario_id"],
        status="completed",
        routes=routes,
        objective_value=round(total_obj, 4),
        violations=violations,
    )


def validate_plan(plan: PlanResult, scenario: dict) -> list[ConstraintViolation]:
    violations: list[ConstraintViolation] = []
    vehicles_map = {v["vehicle_id"]: v for v in scenario["vehicles"]}

    for route in plan.routes:
        veh = vehicles_map.get(route.vehicle_id)
        if not veh:
            continue
        cap = veh.get("capacity", 30.0)
        if route.metrics.total_load > cap:
            violations.append(
                ConstraintViolation(
                    type="capacity",
                    severity="hard",
                    entity=route.vehicle_id,
                    details=f"Load {route.metrics.total_load:.1f} > capacity {cap:.1f}",
                    blocking=True,
                )
            )

    return violations
