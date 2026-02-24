import json
import random
from datetime import datetime

LOCATION_MAP = {
    "DK-6000": {"lat": 55.49, "lon": 9.47, "city": "Kolding"},
    "DK-5250": {"lat": 55.37, "lon": 10.43, "city": "Odense SV"},
    "DK-7100": {"lat": 55.71, "lon": 9.53, "city": "Vejle"},
    "DK-6700": {"lat": 55.47, "lon": 8.45, "city": "Esbjerg"},
    "DK-5000": {"lat": 55.40, "lon": 10.40, "city": "Odense"},
    "SE-311-39": {"lat": 56.90, "lon": 12.49, "city": "Falkenberg (SE)"},
    "DE-24941": {"lat": 54.78, "lon": 9.43, "city": "Flensburg"},
    "DE-25524": {"lat": 53.92, "lon": 9.51, "city": "Itzehoe"},
    "DE-25336": {"lat": 53.75, "lon": 9.65, "city": "Elmshorn"},
    "FR-94000": {"lat": 48.79, "lon": 2.46, "city": "Creteil"},
    "FR-73000": {"lat": 45.56, "lon": 5.91, "city": "Sonnaz"},
    "FR-11000": {"lat": 43.21, "lon": 2.35, "city": "Carcassonne"},
    "GB-SW1HS": {"lat": 51.50, "lon": -0.14, "city": "London (SW)"},
    "BE-8200": {"lat": 51.20, "lon": 3.22, "city": "Brugge"},
    "BE-8970": {"lat": 50.85, "lon": 2.73, "city": "Poperinge"},
    "NL-3077AA": {"lat": 51.90, "lon": 4.50, "city": "Rotterdam"},
}

BOOKINGS = [
    {"id": "2324", "from_zip": "DK-6000", "to_zip": "DE-24941", "ldm": 4},
    {"id": "2326", "from_zip": "DK-5250", "to_zip": "DE-25524", "ldm": 14},
    {"id": "2336", "from_zip": "SE-311-39", "to_zip": "DK-5000", "ldm": 6},
    {"id": "2340", "from_zip": "DK-6000", "to_zip": "GB-SW1HS", "ldm": 9},
    {"id": "2348", "from_zip": "DK-6000", "to_zip": "FR-94000", "ldm": 4.8},
    {"id": "2335", "from_zip": "DK-6700", "to_zip": "FR-11000", "ldm": 8},
    {"id": "2353", "from_zip": "DK-7100", "to_zip": "BE-8200", "ldm": 4.8},
    {"id": "2356", "from_zip": "DK-7100", "to_zip": "BE-8970", "ldm": 0.8},
    {"id": "2332", "from_zip": "DK-6000", "to_zip": "FR-73000", "ldm": 1.2},
    {"id": "2331", "from_zip": "DK-5250", "to_zip": "FR-94000", "ldm": 1.9},
    {"id": "2341", "from_zip": "DK-5000", "to_zip": "NL-3077AA", "ldm": 5.2},
    {"id": "2342", "from_zip": "DK-6000", "to_zip": "DE-25336", "ldm": 3.1},
]


def get_location(zip_code):
    return LOCATION_MAP.get(zip_code, {"lat": 53.55, "lon": 9.99, "city": "Unknown"})


def generate_orders():
    orders = []
    for b in BOOKINGS:
        sender = get_location(b["from_zip"])
        receiver = get_location(b["to_zip"])
        orders.append({
            "id": b["id"],
            "sender": {"zip": b["from_zip"], "lat": sender["lat"], "lon": sender["lon"]},
            "receiver": {"zip": b["to_zip"], "lat": receiver["lat"], "lon": receiver["lon"]},
            "demand": {"ldm": b["ldm"], "goods_type": random.choice(["A", "B"])},
            "time_window": (0, 2),
        })
    return orders


def generate_fleet():
    return [
        {"vehicle_id": "Truck-001 (Mega)", "allowed_goods": ["A", "B"], "capacity_ldm": 30},
        {"vehicle_id": "Truck-002 (Standard)", "allowed_goods": ["B"], "capacity_ldm": 30},
        {"vehicle_id": "Truck-003 (Reefer)", "allowed_goods": ["A"], "capacity_ldm": 30},
    ]


if __name__ == "__main__":
    import os
    random.seed(42)
    data = {
        "meta": {"description": "Synthetic VRP Data for Logistics PoC", "date_generated": str(datetime.now())},
        "orders": generate_orders(),
        "fleet": generate_fleet(),
    }
    out_path = os.path.join(os.path.dirname(__file__), "logistics_data.json")
    with open(out_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Generated {len(data['orders'])} orders, {len(data['fleet'])} trucks -> {out_path}")
