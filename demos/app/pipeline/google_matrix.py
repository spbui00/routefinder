from __future__ import annotations

import math
import os
from typing import Callable, Optional

from .distance_matrix_cache import DistanceMatrixCache, default_sqlite_path


def _haversine_m(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dphi = math.radians(b_lat - a_lat)
    dlmb = math.radians(b_lng - a_lng)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def fallback_leg_seconds_meters(
    a_lat: float,
    a_lng: float,
    b_lat: float,
    b_lng: float,
    speed_mps: float = 15.0,
) -> tuple[float, float]:
    m = _haversine_m(a_lat, a_lng, b_lat, b_lng)
    return m / speed_mps, m


def make_matrix_fetcher(
    cache: Optional[DistanceMatrixCache] = None,
    api_key: Optional[str] = None,
    speed_mps: float = 15.0,
) -> Callable[[float, float, float, float], tuple[float, float]]:
    cache = cache or DistanceMatrixCache(sqlite_path=default_sqlite_path())
    key = api_key or os.environ.get("GOOGLE_MAPS_API_KEY")

    def fetch(a_lat: float, a_lng: float, b_lat: float, b_lng: float) -> tuple[float, float]:
        hit = cache.get(a_lat, a_lng, b_lat, b_lng)
        if hit is not None:
            return hit
        if key:
            try:
                import urllib.request
                import urllib.parse
                import json as _json

                params = urllib.parse.urlencode(
                    {
                        "origins": f"{a_lat},{a_lng}",
                        "destinations": f"{b_lat},{b_lng}",
                        "key": key,
                        "mode": "driving",
                    }
                )
                url = f"https://maps.googleapis.com/maps/api/distancematrix/json?{params}"
                with urllib.request.urlopen(url, timeout=30) as resp:
                    data = _json.loads(resp.read().decode())
                el = data["rows"][0]["elements"][0]
                if el.get("status") != "OK":
                    raise RuntimeError(el.get("status", "UNKNOWN"))
                sec = float(el["duration"]["value"])
                m = float(el["distance"]["value"])
            except Exception:
                sec, m = fallback_leg_seconds_meters(a_lat, a_lng, b_lat, b_lng, speed_mps)
        else:
            sec, m = fallback_leg_seconds_meters(a_lat, a_lng, b_lat, b_lng, speed_mps)
        cache.set(a_lat, a_lng, b_lat, b_lng, sec, m)
        return sec, m

    return fetch
