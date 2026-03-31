from __future__ import annotations

import math
from typing import Optional

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from .pipeline.preprocess import BookingStop


def _haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> int:
    r = 6371000.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = math.radians(b_lat - a_lat)
    dlmb = math.radians(b_lng - a_lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return int(2 * r * math.asin(min(1.0, math.sqrt(h))))


def _build_matrix(stops: list[tuple[float, float]]) -> list[list[int]]:
    n = len(stops)
    m = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                m[i][j] = _haversine_m(stops[i][0], stops[i][1], stops[j][0], stops[j][1])
    return m


def solve_pdptw_bookings(
    depot_lat: float,
    depot_lng: float,
    booking_stops: list[BookingStop],
    vehicle_cap_kg: float,
    max_seconds: float = 5.0,
) -> Optional[tuple[list[int], int]]:
    if not booking_stops or len(booking_stops) % 2 != 0:
        return None

    coords = [(depot_lat, depot_lng)]
    for s in booking_stops:
        coords.append((s.lat, s.lng))

    dist_m = _build_matrix(coords)
    n = len(coords)

    manager = pywrapcp.RoutingIndexManager(n, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def dist_cb(from_index, to_index):
        fi = manager.IndexToNode(from_index)
        ti = manager.IndexToNode(to_index)
        return dist_m[fi][ti]

    transit = routing.RegisterTransitCallback(dist_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit)

    def demand_cb(from_index):
        node = manager.IndexToNode(from_index)
        if node == 0:
            return 0
        s = booking_stops[node - 1]
        q = max(1, int(abs(s.kg)))
        return q if s.is_pickup else -q

    dem_idx = routing.RegisterUnaryTransitCallback(demand_cb)
    routing.AddDimensionWithVehicleCapacity(
        dem_idx,
        0,
        [max(1, int(vehicle_cap_kg))],
        True,
        "Capacity",
    )

    for i in range(0, len(booking_stops), 2):
        p_idx = i + 1
        d_idx = i + 2
        routing.AddPickupAndDelivery(
            manager.NodeToIndex(p_idx),
            manager.NodeToIndex(d_idx),
        )
        routing.solver().Add(
            routing.VehicleVar(manager.NodeToIndex(p_idx))
            == routing.VehicleVar(manager.NodeToIndex(d_idx))
        )

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    )
    params.time_limit.FromSeconds(int(max(1, max_seconds)))

    sol = routing.SolveWithParameters(params)
    if sol is None:
        return None

    index = routing.Start(0)
    order: list[int] = []
    while not routing.IsEnd(index):
        order.append(manager.IndexToNode(index))
        index = sol.Value(routing.NextVar(index))

    total_dist = sol.ObjectiveValue()
    return order, int(total_dist)


def stops_from_scenario_orders(
    orders: list[dict],
    depot_lat: float,
    depot_lng: float,
    cap_kg: float,
    cap_ldm: float,
    cap_pll: float,
):
    from .pipeline.preprocess import preprocess_bookings_for_route

    bookings = []
    for o in orders:
        plat, plng = float(o.get("lat", 0)), float(o.get("lon", 0))
        dlat = float(o.get("delivery_lat", plat))
        dlng = float(o.get("delivery_lon", plng))
        if abs(dlat - plat) < 1e-6 and abs(dlng - plng) < 1e-6:
            dlat += 0.015
        bookings.append(
            {
                "id": o.get("order_id", "x"),
                "pickup_lat": plat,
                "pickup_lng": plng,
                "delivery_lat": dlat,
                "delivery_lng": dlng,
                "weight_kg": o.get("weight_kg", max(1, o.get("demand", 0) * 100)),
                "ldm": o.get("ldm", o.get("demand", 0)),
                "pll": o.get("pll", 1),
                "pickup_tw_start": 0.0,
                "pickup_tw_end": 1.0,
                "delivery_tw_start": 0.0,
                "delivery_tw_end": 1.0,
                "revenue_dkk": o.get("revenue_dkk", 0),
            }
        )
    pre = preprocess_bookings_for_route(depot_lat, depot_lng, bookings, cap_kg, cap_ldm, cap_pll)
    return pre.stops
