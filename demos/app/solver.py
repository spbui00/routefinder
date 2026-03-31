from __future__ import annotations

import sys
import os
import uuid
import math
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))


def _patch_torchrl_specs():
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

from .models import (
    ConstraintViolation,
    LockedSegment,
    PlanResult,
    RouteMetrics,
    RouteResult,
)
from .pipeline.postprocess import aggregate_margin, postprocess_to_dict
from .pipeline.preprocess import preprocess_bookings_for_route

_env_cache: dict[str, object] = {}
_policy = None
_model = None

_CAP_KG_DEFAULT = 40_000.0
_CAP_LDM = 13.6
_CAP_PLL = 33.0


def _get_freight_env(variant: str = "all", num_loc: int = 20):
    from routefinder.envs import MTVRPGenerator

    from .freight_mtvrp_env import FreightMTVRPEnv

    _patch_torchrl_specs()
    key = f"freight_{variant}_{num_loc}"
    if key not in _env_cache:
        _env_cache[key] = FreightMTVRPEnv(
            MTVRPGenerator(num_loc=num_loc, variant_preset=variant),
            check_solution=False,
        )
    return _env_cache[key]


def _order_to_booking_dict(o: dict) -> dict:
    plat, plng = float(o["lat"]), float(o["lon"])
    dlat = float(o.get("delivery_lat", plat))
    dlng = float(o.get("delivery_lon", o.get("delivery_lng", plng)))
    if abs(dlat - plat) < 1e-6 and abs(dlng - plng) < 1e-6:
        dlat += 0.015
    kg = float(o.get("weight_kg", o.get("kg", 0)))
    if kg <= 0:
        kg = max(1.0, float(o.get("demand", 0)) * 100.0)
    ldm = float(o.get("ldm", o.get("demand", 0)))
    pll = float(o.get("pll", o.get("pallets", 1.0)))
    oid = str(o.get("order_id", o.get("id", "")))
    tw0 = float(o.get("tw_start", 0.0))
    tw1 = float(o.get("tw_end", 1e9))
    svc = float(o.get("service_time", 0.02))
    return {
        "order_id": oid,
        "pickup_lat": plat,
        "pickup_lng": plng,
        "delivery_lat": dlat,
        "delivery_lng": dlng,
        "weight_kg": kg,
        "ldm": ldm,
        "pll": pll,
        "pickup_tw_start": float(o.get("pickup_tw_start", tw0)),
        "pickup_tw_end": float(o.get("pickup_tw_end", tw1)),
        "delivery_tw_start": float(o.get("delivery_tw_start", tw0)),
        "delivery_tw_end": float(o.get("delivery_tw_end", tw1)),
        "service_time": svc,
        "revenue_dkk": float(o.get("revenue_dkk", 0)),
    }


def _build_freight_td_for_vehicle(
    orders: list[dict],
    vehicle: dict,
):
    import numpy as np
    import torch
    from tensordict import TensorDict

    allowed = set(vehicle.get("allowed_goods", ["A", "B"]))
    filtered = [o for o in orders if o.get("goods_type", "A") in allowed]
    if not filtered:
        return None

    bookings = [_order_to_booking_dict(o) for o in filtered]
    depot_lat = float(vehicle.get("depot_lat", 0.0))
    depot_lng = float(vehicle.get("depot_lon", 0.0))
    if depot_lat == 0.0 and depot_lng == 0.0:
        depot_lat = sum(b["pickup_lat"] for b in bookings) / len(bookings)
        depot_lng = sum(b["pickup_lng"] for b in bookings) / len(bookings)

    cap_kg = float(
        vehicle.get("capacity_kg", vehicle.get("capacity", 30.0) * 1000.0)
    )
    cap_kg = min(max(cap_kg, 1000.0), _CAP_KG_DEFAULT * 2)

    pre = preprocess_bookings_for_route(
        depot_lat,
        depot_lng,
        bookings,
        cap_kg=cap_kg,
        cap_ldm=_CAP_LDM,
        cap_pll=_CAP_PLL,
    )
    stops = pre.stops
    if not stops:
        return None

    all_coords = [(depot_lat, depot_lng)] + [(s.lat, s.lng) for s in stops]
    la0, la1, ln0, ln1 = pre.bbox_lat_min, pre.bbox_lat_max, pre.bbox_lng_min, pre.bbox_lng_max
    eps = 1e-6
    locs_norm = np.array(
        [
            [
                (lat - la0) / (la1 - la0 + eps),
                (lng - ln0) / (ln1 - ln0 + eps),
            ]
            for lat, lng in all_coords
        ],
        dtype=np.float32,
    )
    n = len(all_coords)
    locs = torch.tensor(locs_norm.reshape(1, -1, 2))

    n_cust = len(stops)
    d_line = np.zeros(n_cust, dtype=np.float32)
    d_back = np.zeros(n_cust, dtype=np.float32)
    for i, s in enumerate(stops):
        dem = float(s.demand_scalar)
        if s.is_pickup:
            d_back[i] = dem
        else:
            d_line[i] = dem

    pp = np.full(n_cust, -1, dtype=np.int64)
    for del_idx, p_idx in pre.pickup_index_by_delivery_index.items():
        pp[del_idx] = p_idx

    tw = torch.zeros(1, n, 2)
    tw[..., 1] = float("inf")
    service = torch.zeros(1, n)
    for i, s in enumerate(stops):
        j = i + 1
        if math.isfinite(s.tw_start) and math.isfinite(s.tw_end) and s.tw_end < 1e6:
            tw[0, j, 0] = s.tw_start
            tw[0, j, 1] = s.tw_end
        if math.isfinite(s.service_time):
            service[0, j] = s.service_time

    demand_linehaul = torch.tensor(d_line.reshape(1, -1))
    demand_backhaul = torch.tensor(d_back.reshape(1, -1))
    pickup_predecessor = torch.tensor(pp.reshape(1, -1), dtype=torch.long)

    labels = [""]
    for s in stops:
        tag = "P" if s.is_pickup else "D"
        labels.append(f"{tag}:{s.booking_id[:8] if s.booking_id else '?'}")

    td = TensorDict(
        {
            "locs": locs,
            "demand_linehaul": demand_linehaul,
            "demand_backhaul": demand_backhaul,
            "pickup_predecessor": pickup_predecessor,
            "backhaul_class": torch.full((1, 1), 2, dtype=torch.int32),
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

    return td, filtered, all_coords, stops, labels


def _try_load_model():
    global _model, _policy
    if _model is not None:
        return
    _patch_torchrl_specs()
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


def _peak_load_fraction_from_seq(full_seq: list[int], stops) -> float:
    load_frac = 0.0
    peak_frac = 0.0
    for a in full_seq:
        if a <= 0 or a > len(stops):
            continue
        s = stops[a - 1]
        if s.is_pickup:
            load_frac += float(s.demand_scalar)
        else:
            load_frac -= float(s.demand_scalar)
        peak_frac = max(peak_frac, load_frac)
    return peak_frac


def _compute_route_length(locs, seq: list[int]) -> float:
    total = 0.0
    for i in range(len(seq) - 1):
        a, b = seq[i], seq[i + 1]
        dx = locs[0, a, 0] - locs[0, b, 0]
        dy = locs[0, a, 1] - locs[0, b, 1]
        total += math.sqrt(dx.item() ** 2 + dy.item() ** 2)
    return total


def _filter_orders_for_vehicle(orders: list[dict], vehicle: dict) -> list[dict]:
    allowed = set(vehicle.get("allowed_goods", ["A", "B"]))
    return [o for o in orders if o.get("goods_type", "A") in allowed]


def solve_scenario_ortools(
    scenario: dict,
    vehicle_ids: Optional[list[str]] = None,
    max_runtime_seconds: float = 30.0,
) -> PlanResult:
    from .solver_ortools_pdptw import solve_pdptw_bookings, stops_from_scenario_orders

    orders_raw = scenario["orders"]
    vehicles_raw = scenario["vehicles"]
    if vehicle_ids:
        vehicles_raw = [v for v in vehicles_raw if v["vehicle_id"] in vehicle_ids]

    plan_id = str(uuid.uuid4())
    routes: list[RouteResult] = []
    violations: list[ConstraintViolation] = []
    total_obj_m = 0
    cap_kg_default = 40_000.0
    cap_ldm = 13.6
    cap_pll = 33.0

    for veh in vehicles_raw:
        vid = veh["vehicle_id"]
        filtered = _filter_orders_for_vehicle(orders_raw, veh)
        if not filtered:
            continue

        depot_lat = float(veh.get("depot_lat") or filtered[0].get("lat", 55.67))
        depot_lng = float(veh.get("depot_lon") or filtered[0].get("lon", 12.56))
        if depot_lat == 0.0 and depot_lng == 0.0:
            depot_lat, depot_lng = float(filtered[0]["lat"]), float(filtered[0]["lon"])

        cap_kg = float(veh.get("capacity_kg", veh.get("capacity", 30.0) * 1000.0))
        cap_kg = min(max(cap_kg, 1000.0), cap_kg_default * 2)

        stops = stops_from_scenario_orders(
            filtered, depot_lat, depot_lng, cap_kg, cap_ldm, cap_pll
        )
        sol = solve_pdptw_bookings(
            depot_lat,
            depot_lng,
            stops,
            vehicle_cap_kg=cap_kg,
            max_seconds=min(max_runtime_seconds, 60.0),
        )
        if sol is None:
            violations.append(
                ConstraintViolation(
                    type="ortools",
                    severity="hard",
                    entity=vid,
                    details="OR-Tools PDPTW found no feasible solution",
                    blocking=False,
                )
            )
            continue

        visit_order, dist_m = sol
        total_obj_m += dist_m
        seq = [i for i in visit_order if i != 0]
        total_load = sum(float(o.get("demand", 0)) for o in filtered)
        routes.append(
            RouteResult(
                vehicle_id=vid,
                sequence=seq,
                lock_flags=[False] * len(seq),
                metrics=RouteMetrics(
                    total_distance=round(dist_m / 1000.0, 4),
                    total_load=round(total_load, 2),
                    num_stops=len(seq),
                    estimated_time=round(dist_m / 1000.0 / 50.0 * 60.0, 1),
                ),
            )
        )

    post_dict = None
    if routes:
        post_dict = postprocess_to_dict(
            aggregate_margin(
                [float(o.get("revenue_dkk", 0)) for o in orders_raw],
                (total_obj_m / 1000.0) * 8.0,
                f"AI-REF-{plan_id[:8].upper()}",
                [f"ortools:{r.vehicle_id}" for r in routes],
                sum(
                    float(o.get("weight_kg", o.get("demand", 0) * 100))
                    for o in orders_raw
                ),
                "ortools",
            )
        )

    return PlanResult(
        plan_id=plan_id,
        scenario_id=scenario["scenario_id"],
        status="completed",
        routes=routes,
        objective_value=round(total_obj_m / 1000.0, 4),
        violations=violations,
        solver_engine="ortools",
        postprocess=post_dict,
    )


def solve_scenario(
    scenario: dict,
    vehicle_ids: Optional[list[str]] = None,
    locked_segments: Optional[list[LockedSegment]] = None,
    variant: Optional[str] = None,
    solver_engine: str = "routefinder",
    max_runtime_seconds: float = 30.0,
) -> PlanResult:
    if solver_engine == "ortools":
        return solve_scenario_ortools(
            scenario,
            vehicle_ids=vehicle_ids,
            max_runtime_seconds=max_runtime_seconds,
        )

    import torch
    from routefinder.utils import greedy_policy, rollout, rollout_actions

    _try_load_model()
    settings = scenario.get("settings", {})
    effective_variant = variant or settings.get("variant", "all")
    orders_raw = scenario["orders"]
    num_cust = max(3, 2 * len(orders_raw) + 1)
    env = _get_freight_env(variant=effective_variant, num_loc=max(20, num_cust))
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
        result = _build_freight_td_for_vehicle(orders_raw, veh)
        if result is None:
            continue
        td, _filtered, _all_coords, stops, labels = result

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

        route_dist = _compute_route_length(td["locs"], [0] + full_seq)
        peak_frac = _peak_load_fraction_from_seq(full_seq, stops)
        cap_kg = float(veh.get("capacity_kg", veh.get("capacity", 30.0) * 1000.0))
        cap_kg = min(max(cap_kg, 1000.0), _CAP_KG_DEFAULT * 2)
        total_load_kg = round(peak_frac * cap_kg, 2)
        seq_labels = [labels[i] for i in full_seq if 0 < i < len(labels)]

        if peak_frac > 1.0 + 1e-4:
            violations.append(
                ConstraintViolation(
                    type="capacity",
                    severity="hard",
                    entity=vid,
                    details=(
                        f"Peak utilization {peak_frac:.3f} exceeds 1.0 "
                        f"(~{total_load_kg:.0f} kg vs {cap_kg:.0f} kg cap)"
                    ),
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
                    total_load=total_load_kg,
                    num_stops=len(full_seq),
                    estimated_time=round(route_dist * 60, 1),
                ),
                sequence_labels=seq_labels,
            )
        )
        total_obj += route_dist

    post = None
    if routes:
        dkk_per_km = 8.0
        routing_cost = sum(r.metrics.total_distance for r in routes) * dkk_per_km
        post = postprocess_to_dict(
            aggregate_margin(
                [float(o.get("revenue_dkk", 0)) for o in orders_raw],
                routing_cost,
                f"AI-REF-{plan_id[:8].upper()}",
                [f"route:{r.vehicle_id}" for r in routes],
                sum(
                    float(o.get("weight_kg", o.get("demand", 0) * 100))
                    for o in orders_raw
                ),
                "routefinder",
            )
        )

    return PlanResult(
        plan_id=plan_id,
        scenario_id=scenario["scenario_id"],
        status="completed",
        routes=routes,
        objective_value=round(total_obj, 4),
        violations=violations,
        solver_engine="routefinder",
        postprocess=post,
    )


def validate_plan(plan: PlanResult, scenario: dict) -> list[ConstraintViolation]:
    violations: list[ConstraintViolation] = []
    vehicles_map = {v["vehicle_id"]: v for v in scenario["vehicles"]}

    for route in plan.routes:
        veh = vehicles_map.get(route.vehicle_id)
        if not veh:
            continue
        cap_kg = float(veh.get("capacity_kg", veh.get("capacity", 30.0) * 1000.0))
        cap_kg = min(max(cap_kg, 1000.0), _CAP_KG_DEFAULT * 2)
        if route.metrics.total_load > cap_kg + 1.0:
            violations.append(
                ConstraintViolation(
                    type="capacity",
                    severity="hard",
                    entity=route.vehicle_id,
                    details=(
                        f"Load {route.metrics.total_load:.1f} kg > capacity {cap_kg:.0f} kg"
                    ),
                    blocking=True,
                )
            )

    return violations
