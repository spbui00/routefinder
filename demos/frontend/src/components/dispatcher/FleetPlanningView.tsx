import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Truck, Plus, Trash2 } from 'lucide-react';

export default function FleetPlanningView() {
  const [addOpen, setAddOpen] = useState(false);
  const [newTruckId, setNewTruckId] = useState('TRK-NEW');
  const [newCapacity, setNewCapacity] = useState('40');
  const [newDepotLat, setNewDepotLat] = useState('55.6761');
  const [newDepotLon, setNewDepotLon] = useState('12.5683');

  const { vehicles, loadFleetDemoSnapshot, clearFleetPlanning, addFleetTruck, setVehicles } =
    useStore();

  const handleAddTruck = () => {
    const cap = parseFloat(newCapacity) || 40;
    const lat = parseFloat(newDepotLat) || 55.67;
    const lon = parseFloat(newDepotLon) || 12.56;
    const id = newTruckId.trim() || `TRK-${Date.now().toString(36)}`;
    addFleetTruck({
      vehicle_id: id,
      capacity_tons: cap,
      depot_lat: lat,
      depot_lon: lon,
    });
    setAddOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="p-3 border-b border-border flex flex-wrap gap-2 items-center text-xs">
        <Truck className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm mr-2">Fleet</span>
        <Button size="sm" variant="secondary" className="h-8 text-[11px]" onClick={loadFleetDemoSnapshot}>
          Generate demo fleet
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-[11px]" onClick={() => setAddOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add truck
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-[11px] text-muted-foreground"
          onClick={() => {
            clearFleetPlanning();
            setVehicles([]);
          }}
          disabled={vehicles.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear fleet
        </Button>
        <Badge variant="outline" className="text-[10px] font-normal ml-auto">
          {vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {addOpen && (
        <Card className="mx-3 mt-2 p-3 text-xs space-y-2 border-dashed">
          <div className="font-medium">New truck</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Vehicle ID</span>
              <input
                value={newTruckId}
                onChange={(e) => setNewTruckId(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Capacity (t)</span>
              <input
                type="number"
                value={newCapacity}
                onChange={(e) => setNewCapacity(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Depot lat</span>
              <input
                value={newDepotLat}
                onChange={(e) => setNewDepotLat(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Depot lon</span>
              <input
                value={newDepotLon}
                onChange={(e) => setNewDepotLon(e.target.value)}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-[11px]" onClick={handleAddTruck}>
              Add to fleet
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3">
          {vehicles.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80 mb-1">No vehicles yet</p>
              <p className="text-xs max-w-md mx-auto">
                Use <strong>Generate demo fleet</strong> for three sample trucks, or <strong>Add truck</strong>{' '}
                to register vehicles for optimization.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 px-3 font-medium">Vehicle ID</th>
                    <th className="py-2 px-3 font-medium text-right">Capacity (t)</th>
                    <th className="py-2 px-3 font-medium">Depot</th>
                    <th className="py-2 px-3 font-medium">Goods</th>
                    <th className="py-2 px-3 font-medium text-right">Max distance</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.vehicle_id} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 px-3 font-mono font-medium">{v.vehicle_id}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums">{v.capacity}</td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {v.depot_lat.toFixed(4)}, {v.depot_lon.toFixed(4)}
                      </td>
                      <td className="py-2.5 px-3">
                        {v.allowed_goods.join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                        {v.max_distance >= 1e8 ? '∞' : v.max_distance}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
