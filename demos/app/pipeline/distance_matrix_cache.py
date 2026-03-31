from __future__ import annotations

import json
import sqlite3
import threading
import time
from pathlib import Path
from typing import Optional

_cache_lock = threading.Lock()
_memory: dict[tuple[str, str], tuple[float, float, float]] = {}


def _key(a_lat: float, a_lng: float, b_lat: float, b_lng: float, mode: str) -> tuple[str, str]:
    def r6(x: float) -> str:
        return f"{round(x, 6):.6f}"

    o = f"{r6(a_lat)},{r6(a_lng)}"
    d = f"{r6(b_lat)},{r6(b_lng)}"
    if o <= d:
        return (f"{mode}:{o}", d)
    return (f"{mode}:{d}", o)


class DistanceMatrixCache:
    def __init__(self, sqlite_path: Optional[Path] = None):
        self._sqlite_path = sqlite_path
        self._conn: Optional[sqlite3.Connection] = None
        if sqlite_path:
            sqlite_path.parent.mkdir(parents=True, exist_ok=True)
            self._conn = sqlite3.connect(str(sqlite_path), check_same_thread=False)
            self._conn.execute(
                "CREATE TABLE IF NOT EXISTS leg (k1 TEXT, k2 TEXT, sec REAL, m REAL, stored REAL, PRIMARY KEY (k1, k2))"
            )
            self._conn.commit()

    def get(
        self,
        a_lat: float,
        a_lng: float,
        b_lat: float,
        b_lng: float,
        mode: str = "driving",
    ) -> Optional[tuple[float, float]]:
        k1, k2 = _key(a_lat, a_lng, b_lat, b_lng, mode)
        with _cache_lock:
            hit = _memory.get((k1, k2))
        if hit is not None:
            return hit[0], hit[1]
        if self._conn:
            cur = self._conn.execute(
                "SELECT sec, m FROM leg WHERE k1 = ? AND k2 = ?", (k1, k2)
            )
            row = cur.fetchone()
            if row:
                sec, m = float(row[0]), float(row[1])
                with _cache_lock:
                    _memory[(k1, k2)] = (sec, m, time.time())
                return sec, m
        return None

    def set(
        self,
        a_lat: float,
        a_lng: float,
        b_lat: float,
        b_lng: float,
        seconds: float,
        meters: float,
        mode: str = "driving",
    ) -> None:
        k1, k2 = _key(a_lat, a_lng, b_lat, b_lng, mode)
        now = time.time()
        with _cache_lock:
            _memory[(k1, k2)] = (seconds, meters, now)
        if self._conn:
            self._conn.execute(
                "INSERT OR REPLACE INTO leg (k1, k2, sec, m, stored) VALUES (?, ?, ?, ?, ?)",
                (k1, k2, seconds, meters, now),
            )
            self._conn.commit()

    def get_matrix(
        self,
        coords: list[tuple[float, float]],
        fetch_fn,
        mode: str = "driving",
    ) -> tuple[list[list[float]], list[list[float]]]:
        n = len(coords)
        sec = [[0.0] * n for _ in range(n)]
        meters = [[0.0] * n for _ in range(n)]
        missing: list[tuple[int, int]] = []
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                la, ln = coords[i]
                lb, lnb = coords[j]
                got = self.get(la, ln, lb, lnb, mode)
                if got is None:
                    missing.append((i, j))
                else:
                    sec[i][j], meters[i][j] = got
        if missing:
            for i, j in missing:
                la, ln = coords[i]
                lb, lnb = coords[j]
                s, m = fetch_fn(la, ln, lb, lnb)
                self.set(la, ln, lb, lnb, s, m, mode)
                sec[i][j] = s
                meters[i][j] = m
        return sec, meters


def default_sqlite_path() -> Path:
    return Path(__file__).resolve().parent.parent / "data" / "distance_cache.sqlite"


def export_memory_snapshot(path: Path) -> None:
    with _cache_lock:
        data = {f"{a}|{b}": {"sec": v[0], "m": v[1]} for (a, b), v in _memory.items()}
    path.write_text(json.dumps(data, indent=0))
