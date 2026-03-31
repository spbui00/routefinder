from demos.app.pipeline.preprocess import max_utilization_demand, preprocess_bookings_for_route


def test_max_utilization_demand():
    d = max_utilization_demand(2000, 2, 8, 4000, 13.6, 10)
    assert abs(d - 0.8) < 1e-6


def test_preprocess_pair_indices():
    bookings = [
        {
            "id": "b1",
            "pickup_lat": 55.0,
            "pickup_lng": 12.0,
            "delivery_lat": 56.0,
            "delivery_lng": 13.0,
            "weight_kg": 1000,
            "ldm": 1,
            "pll": 2,
            "revenue_dkk": 500,
        }
    ]
    pre = preprocess_bookings_for_route(54.0, 11.0, bookings)
    assert len(pre.stops) == 2
    assert pre.pickup_index_by_delivery_index[1] == 0
