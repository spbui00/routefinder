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
import { formatTw } from './OrderPropChip';

const ROUTE_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

const depotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
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

  const routeLines = useMemo(() => {
    if (!currentPlan) return [];
    return currentPlan.routes.map((route, idx) => {
      const veh = vehicles.find((v) => v.vehicle_id === route.vehicle_id);
      const depotPos: [number, number] = veh ? [veh.depot_lat, veh.depot_lon] : [55.49, 9.47];

      const positions: [number, number][] = [depotPos];
      for (const stopIdx of route.sequence) {
        if (stopIdx > 0 && stopIdx <= orders.length) {
          const order = orders[stopIdx - 1];
          if (order) positions.push([order.lat, order.lon]);
        }
      }

      const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
      const isSelected = !selectedVehicle || selectedVehicle === route.vehicle_id;
      const hasLocked = route.lock_flags.some(Boolean);

      return {
        positions,
        color,
        opacity: isSelected ? 0.9 : 0.15,
        weight: isSelected ? 3.5 : 1.5,
        vehicle_id: route.vehicle_id,
        hasLocked,
        sequence: route.sequence,
        lockFlags: route.lock_flags,
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
        style={{ background: '#f8fafc' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {bounds && <FitBounds bounds={bounds} />}

        {depotCoords.map(([lat, lon], i) => (
          <Marker key={`depot-${i}`} position={[lat, lon]} icon={depotIcon}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-xs">Depot</div>
                <div className="text-[11px] text-muted-foreground">{lat.toFixed(4)}, {lon.toFixed(4)}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {orders.map((o) => (
          <Marker key={`order-${o.order_id}`} position={[o.lat, o.lon]} icon={customerIcon}>
            <Popup>
              <div className="space-y-1.5 min-w-[180px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs">{o.order_id}</span>
                  <span className={`inline-block px-1 py-0.5 rounded text-[9px] font-bold ${
                    o.goods_type === 'A' ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'
                  }`}>{o.goods_type}</span>
                  <span className="inline-block px-1 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-700">P{o.priority}</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
                  <div><span style={{ opacity: 0.6 }}>Demand:</span> {o.demand.toFixed(1)}</div>
                  <div><span style={{ opacity: 0.6 }}>Svc time:</span> {o.service_time.toFixed(2)}</div>
                  <div><span style={{ opacity: 0.6 }}>TW:</span> {formatTw(o.tw_start, o.tw_end)}</div>
                  <div><span style={{ opacity: 0.6 }}>Location:</span> {o.lat.toFixed(2)}, {o.lon.toFixed(2)}</div>
                  {o.must_follow && <div className="col-span-2"><span style={{ opacity: 0.6 }}>After:</span> {o.must_follow}</div>}
                  {o.must_precede && <div className="col-span-2"><span style={{ opacity: 0.6 }}>Before:</span> {o.must_precede}</div>}
                </div>
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
              dashArray: line.hasLocked && line.opacity > 0.5 ? '10 5' : undefined,
            }}
          >
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold text-xs">{line.vehicle_id}</div>
                <div className="text-[11px]" style={{ opacity: 0.7 }}>
                  {line.sequence.length} stops
                  {line.hasLocked && ' · has locked segments'}
                </div>
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>

      {!orders.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-card/95 border border-border text-foreground px-8 py-6 rounded-xl text-center shadow-lg">
            <p className="text-base font-semibold mb-1">No data loaded</p>
            <p className="text-sm text-muted-foreground">
              Click "Generate Sample" or "Upload JSON" to start
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
