from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class PostprocessResult:
    draft_trip_id: str
    route_stops: list[str]
    utilization_kg: float
    projected_margin_dkk: float
    routing_cost_dkk: float
    solver_engine: str


def aggregate_margin(
    booking_revenues: list[float],
    routing_cost_dkk: float,
    draft_id: str,
    stop_labels: list[str],
    utilization_kg: float,
    solver_engine: str,
) -> PostprocessResult:
    rev = sum(booking_revenues)
    margin = rev - routing_cost_dkk
    return PostprocessResult(
        draft_trip_id=draft_id,
        route_stops=stop_labels,
        utilization_kg=utilization_kg,
        projected_margin_dkk=margin,
        routing_cost_dkk=routing_cost_dkk,
        solver_engine=solver_engine,
    )


def postprocess_to_dict(p: PostprocessResult) -> dict[str, Any]:
    return {
        "pipeline": "Post-Processor",
        "draft_trip_id": p.draft_trip_id,
        "route_stops": p.route_stops,
        "utilization_kg": p.utilization_kg,
        "projected_margin_dkk": p.projected_margin_dkk,
        "routing_cost_dkk": p.routing_cost_dkk,
        "solver_engine": p.solver_engine,
    }
