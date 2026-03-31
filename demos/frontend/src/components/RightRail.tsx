import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { Order, RouteResult } from '../types';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { formatTw } from './OrderPropChip';
import {
  Lock,
  Unlock,
  Route,
  MapPin,
} from 'lucide-react';

function RouteCard({
  route,
  isSelected,
  onSelect,
  onToggleLock,
  orders,
}: {
  route: RouteResult;
  isSelected: boolean;
  onSelect: () => void;
  onToggleLock: (idx: number) => void;
  orders: Order[];
}) {
  const hasLocked = route.lock_flags.some(Boolean);

  return (
    <Card
      onClick={onSelect}
      className={`cursor-pointer transition-all ${
        isSelected ? 'border-primary/50 ring-1 ring-primary/20' : 'hover:border-muted-foreground/30'
      }`}
    >
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Route className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold text-xs truncate">{route.vehicle_id}</span>
          {hasLocked && (
            <Badge variant="warning" className="ml-auto">
              <Lock className="h-2.5 w-2.5 mr-0.5" />LOCKED
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
          <div className="text-muted-foreground">Distance: <span className="text-foreground font-medium">{route.metrics.total_distance.toFixed(3)}</span></div>
          <div className="text-muted-foreground">Load: <span className="text-foreground font-medium">{route.metrics.total_load.toFixed(1)}</span></div>
          <div className="text-muted-foreground">Stops: <span className="text-foreground font-medium">{route.metrics.num_stops}</span></div>
          <div className="text-muted-foreground">ETA: <span className="text-foreground font-medium">{route.metrics.estimated_time.toFixed(0)}m</span></div>
        </div>
      </div>

      {isSelected && (
        <>
          <Separator />
          <div className="p-3 space-y-1.5">
            <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Route Sequence</div>
            <div className="space-y-1">
              {route.sequence.map((stopIdx, i) => {
                const order = stopIdx > 0 && stopIdx <= orders.length ? orders[stopIdx - 1] : null;
                const locked = route.lock_flags[i];
                return (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md p-1.5 text-[11px] border transition-colors ${
                      locked ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                      <span className="text-[9px] text-muted-foreground font-mono w-4 text-center">{i + 1}</span>
                      <MapPin className={`h-3 w-3 ${locked ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold">
                          {order ? order.order_id : `Stop ${stopIdx}`}
                        </span>
                        {order && (
                          <>
                            <Badge variant={order.goods_type === 'A' ? 'info' : 'warning'} className="text-[8px] py-0">{order.goods_type}</Badge>
                            <Badge variant="secondary" className="text-[8px] py-0">P{order.priority}</Badge>
                          </>
                        )}
                      </div>
                      {order && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 grid grid-cols-2 gap-x-2">
                          <span>Demand: {order.demand.toFixed(1)}</span>
                          <span>TW: {formatTw(order.tw_start, order.tw_end)}</span>
                          <span>Svc: {order.service_time.toFixed(2)}</span>
                          <span>{order.lat.toFixed(2)}, {order.lon.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); onToggleLock(i); }}
                      title={locked ? 'Unlock stop' : 'Lock stop'}
                    >
                      {locked ? <Lock className="h-3 w-3 text-amber-600" /> : <Unlock className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default function RightRail() {
  const { orders, currentPlan, selectedVehicle, setSelectedVehicle, setCurrentPlan } = useStore();

  const handleToggleLock = useCallback(
    (vehicleId: string, stopIdx: number) => {
      if (!currentPlan) return;
      const updated = {
        ...currentPlan,
        routes: currentPlan.routes.map((r) => {
          if (r.vehicle_id !== vehicleId) return r;
          const newFlags = [...r.lock_flags];
          newFlags[stopIdx] = !newFlags[stopIdx];
          return { ...r, lock_flags: newFlags };
        }),
      };
      setCurrentPlan(updated);
    },
    [currentPlan, setCurrentPlan],
  );

  const handleUnlockAll = useCallback(() => {
    if (!currentPlan) return;
    setCurrentPlan({
      ...currentPlan,
      routes: currentPlan.routes.map((r) => ({
        ...r,
        lock_flags: r.lock_flags.map(() => false),
      })),
    });
  }, [currentPlan, setCurrentPlan]);

  return (
    <aside className="w-[340px] bg-sidebar text-sidebar-foreground flex flex-col border-l border-sidebar-border">
      <div className="p-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Route className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Vehicle Routes</h2>
          {currentPlan?.solver_engine && (
            <Badge variant={currentPlan.solver_engine === 'routefinder' ? 'default' : 'secondary'} className="text-[9px]">
              {currentPlan.solver_engine === 'routefinder' ? 'AI' : 'OR-Tools'}
            </Badge>
          )}
        </div>
        {currentPlan && (
          <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleUnlockAll}>
            <Unlock className="h-3 w-3" />
            Unlock All
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="flex-1 p-2 space-y-2">
        <div className="space-y-2">
          {currentPlan?.routes.map((route) => (
            <RouteCard
              key={route.vehicle_id}
              route={route}
              orders={orders}
              isSelected={selectedVehicle === route.vehicle_id}
              onSelect={() =>
                setSelectedVehicle(selectedVehicle === route.vehicle_id ? null : route.vehicle_id)
              }
              onToggleLock={(idx) => handleToggleLock(route.vehicle_id, idx)}
            />
          ))}

          {!currentPlan && (
            <div className="text-center text-muted-foreground text-sm py-12">
              No plan generated yet.
              <br />
              <span className="text-xs">Click "Optimize" to create routes.</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {currentPlan && (
        <>
          <Separator />
          <div className="p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total cost</span>
              <span className="font-semibold font-mono">{currentPlan.objective_value.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicles used</span>
              <span className="font-medium">{currentPlan.routes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={currentPlan.status === 'published' ? 'success' : 'info'} className="text-[9px]">
                {currentPlan.status}
              </Badge>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
