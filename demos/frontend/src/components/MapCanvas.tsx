import { useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../store/useStore';

const ROUTE_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
];

const depotIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customerIcon = new L.Icon({
  iconUrl:
    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  if (bounds) {
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  return null;
}

export default function MapCanvas() {
  const { orders, vehicles, currentPlan, selectedVehicle } = useStore();

  const depotCoords = useMemo(() => {
    const seen = new Map<string, [number, number]>();
    for (const v of vehicles) {
      const key = `${v.depot_lat},${v.depot_lon}`;
      if (!seen.has(key)) {
        seen.set(key, [v.depot_lat, v.depot_lon]);
      }
    }
    return [...seen.values()];
  }, [vehicles]);

  const orderMap = useMemo(() => {
    const m = new Map<string, (typeof orders)[0]>();
    orders.forEach((o, i) => m.set(o.order_id, o));
    return m;
  }, [orders]);

  const routeLines = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.routes.map((route, idx) => {
      const veh = vehicles.find((v) => v.vehicle_id === route.vehicle_id);
      const depotPos: [number, number] = veh
        ? [veh.depot_lat, veh.depot_lon]
        : [55.49, 9.47];

      const positions: [number, number][] = [depotPos];
      for (const stopIdx of route.sequence) {
        if (stopIdx > 0 && stopIdx <= orders.length) {
          const order = orders[stopIdx - 1];
          if (order) {
            positions.push([order.lat, order.lon]);
          }
        }
      }

      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const isSelected =
        !selectedVehicle || selectedVehicle === route.vehicle_id;

      return {
        positions,
        color,
        opacity: isSelected ? 0.9 : 0.2,
        weight: isSelected ? 3 : 1,
        vehicle_id: route.vehicle_id,
        lockFlags: route.lock_flags,
        sequence: route.sequence,
      };
    });
  }, [currentPlan, vehicles, orders, selectedVehicle]);

  const bounds = useMemo<L.LatLngBoundsExpression | null>(() => {
    const pts: [number, number][] = [
      ...depotCoords,
      ...orders.map((o) => [o.lat, o.lon] as [number, number]),
    ];
    if (pts.length < 2) return null;
    return L.latLngBounds(pts);
  }, [depotCoords, orders]);

  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[55.0, 9.0]}
        zoom={6}
        className="h-full w-full"
        style={{ background: '#1e293b' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {bounds && <FitBounds bounds={bounds} />}

        {depotCoords.map(([lat, lon], i) => (
          <Marker key={`depot-${i}`} position={[lat, lon]} icon={depotIcon}>
            <Popup>Depot ({lat.toFixed(2)}, {lon.toFixed(2)})</Popup>
          </Marker>
        ))}

        {orders.map((o) => (
          <Marker
            key={`order-${o.order_id}`}
            position={[o.lat, o.lon]}
            icon={customerIcon}
          >
            <Popup>
              <div className="text-xs">
                <strong>Order {o.order_id}</strong>
                <br />
                Demand: {o.demand} | Type: {o.goods_type}
                <br />
                TW: [{o.tw_start}, {o.tw_end === Infinity ? '∞' : o.tw_end}]
              </div>
            </Popup>
          </Marker>
        ))}

        {routeLines.map((line, idx) => (
          <Polyline
            key={`route-${idx}`}
            positions={line.positions}
            pathOptions={{
              color: line.color,
              opacity: line.opacity,
              weight: line.weight,
              dashArray:
                line.lockFlags?.some(Boolean) && line.opacity > 0.5
                  ? '8 4'
                  : undefined,
            }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{line.vehicle_id}</strong>
                <br />
                Stops: {line.sequence.length}
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>

      {!orders.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-800/90 text-slate-300 px-6 py-4 rounded-lg text-center">
            <p className="text-lg font-semibold mb-1">No data loaded</p>
            <p className="text-sm text-slate-400">
              Click "Load Sample" or "Upload JSON" to start
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
