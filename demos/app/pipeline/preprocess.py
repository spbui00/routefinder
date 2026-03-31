from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


def max_utilization_demand(
    kg: float,
    ldm: float,
    pll: float,
    cap_kg: float,
    cap_ldm: float,
    cap_pll: float,
) -> float:
    fr_kg = kg / cap_kg if cap_kg > 0 else 0.0
    fr_ldm = ldm / cap_ldm if cap_ldm > 0 else 0.0
    fr_pll = pll / cap_pll if cap_pll > 0 else 0.0
    return max(fr_kg, fr_ldm, fr_pll)


@dataclass
class BookingStop:
    booking_id: str
    lat: float
    lng: float
    is_pickup: bool
    demand_scalar: float
    kg: float
    ldm: float
    pll: float
    tw_start: float
    tw_end: float
    service_time: float
    revenue_dkk: float


@dataclass
class PreprocessResult:
    stops: list[BookingStop]
    pickup_index_by_delivery_index: dict[int, int]
    bbox_lat_min: float
    bbox_lat_max: float
    bbox_lng_min: float
    bbox_lng_max: float


def compute_bbox(lats: Sequence[float], lngs: Sequence[float]) -> tuple[float, float, float, float]:
    return min(lats), max(lats), min(lngs), max(lngs)


def normalize_coord(v: float, lo: float, hi: float, eps: float = 1e-6) -> float:
    return (v - lo) / (hi - lo + eps)


def preprocess_bookings_for_route(
    depot_lat: float,
    depot_lng: float,
    bookings: list[dict],
    cap_kg: float = 40_000.0,
    cap_ldm: float = 13.6,
    cap_pll: float = 33.0,
) -> PreprocessResult:
    lats = [depot_lat]
    lngs = [depot_lng]
    stops: list[BookingStop] = []
    pickup_index_by_delivery: dict[int, int] = {}

    for b in bookings:
        pid = str(b.get("id", b.get("order_id", "")))
        p_lat = float(b.get("pickup_lat", b.get("lat", 0)))
        p_lng = float(b.get("pickup_lng", b.get("lng", 0)))
        d_lat = float(b.get("delivery_lat", p_lat))
        d_lng = float(b.get("delivery_lng", p_lng))
        kg = float(b.get("weight_kg", b.get("kg", 0)))
        ldm = float(b.get("ldm", 0))
        pll = float(b.get("pll", b.get("pallets", 0)))
        dem = max_utilization_demand(kg, ldm, pll, cap_kg, cap_ldm, cap_pll)
        rev = float(b.get("revenue_dkk", 0))
        tw_p0 = float(b.get("pickup_tw_start", 0))
        tw_p1 = float(b.get("pickup_tw_end", 1e9))
        tw_d0 = float(b.get("delivery_tw_start", 0))
        tw_d1 = float(b.get("delivery_tw_end", 1e9))
        svc = float(b.get("service_time", 0.02))

        lats.extend([p_lat, d_lat])
        lngs.extend([p_lng, d_lng])

        pickup_idx = len(stops)
        stops.append(
            BookingStop(
                booking_id=pid,
                lat=p_lat,
                lng=p_lng,
                is_pickup=True,
                demand_scalar=dem,
                kg=kg,
                ldm=ldm,
                pll=pll,
                tw_start=tw_p0,
                tw_end=tw_p1,
                service_time=svc,
                revenue_dkk=0.0,
            )
        )
        delivery_idx = len(stops)
        stops.append(
            BookingStop(
                booking_id=pid,
                lat=d_lat,
                lng=d_lng,
                is_pickup=False,
                demand_scalar=dem,
                kg=kg,
                ldm=ldm,
                pll=pll,
                tw_start=tw_d0,
                tw_end=tw_d1,
                service_time=svc,
                revenue_dkk=rev,
            )
        )
        pickup_index_by_delivery[delivery_idx] = pickup_idx

    la0, la1, ln0, ln1 = compute_bbox(lats, lngs)
    return PreprocessResult(
        stops=stops,
        pickup_index_by_delivery_index=pickup_index_by_delivery,
        bbox_lat_min=la0,
        bbox_lat_max=la1,
        bbox_lng_min=ln0,
        bbox_lng_max=ln1,
    )
