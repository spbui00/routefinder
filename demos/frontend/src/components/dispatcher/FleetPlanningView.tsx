import { useState } from 'react';
import { useStore } from '../../store/useStore';
import type { GanttBlock } from '../../types/dispatcher';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import { AlertTriangle, Clock, Sparkles, Truck, Plus, Trash2 } from 'lucide-react';

const HOURS = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];

function blockStyle(b: GanttBlock): string {
  switch (b.variant) {
    case 'route':
      return 'bg-sky-500/90 text-white';
    case 'empty':
      return 'bg-amber-200 text-amber-900 border border-amber-400';
    case 'reposition':
      return 'bg-zinc-300 text-zinc-800';
    case 'risk':
      return 'bg-amber-400 text-amber-950 border border-amber-600';
    case 'shift':
      return 'bg-sky-200 text-sky-900';
    case 'rest':
      return 'bg-zinc-200 text-zinc-600';
    case 'maintenance':
      return 'bg-red-100 text-red-800 border border-red-300';
    default:
      return 'bg-muted text-foreground';
  }
}

function GanttRow({ label, blocks }: { label: string; blocks: GanttBlock[] }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 items-center min-h-[40px] border-b border-border/60 py-1">
      <div className="text-[11px] font-medium text-muted-foreground truncate pr-2">{label}</div>
      <div className="relative h-8 bg-muted/40 rounded-md overflow-hidden">
        {blocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
            No plan
          </div>
        ) : (
          blocks.map((b) => (
            <div
              key={b.id}
              className={`absolute top-1 bottom-1 rounded px-1.5 flex flex-col justify-center text-[9px] font-medium leading-tight overflow-hidden ${blockStyle(b)}`}
              style={{ left: `${b.startPct}%`, width: `${b.widthPct}%` }}
              title={b.sublabel ? `${b.label} — ${b.sublabel}` : b.label}
            >
              <span className="truncate">{b.label}</span>
              {b.sublabel && <span className="truncate opacity-90 text-[8px]">{b.sublabel}</span>}
            </div>
          ))
        )}
        {blocks.length > 0 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
            style={{ left: '12%' }}
            title="Now"
          />
        )}
      </div>
    </div>
  );
}

export default function FleetPlanningView() {
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newTruckId, setNewTruckId] = useState('TRK-NEW');
  const [newCapacity, setNewCapacity] = useState('40');
  const [newDepotLat, setNewDepotLat] = useState('55.6761');
  const [newDepotLon, setNewDepotLon] = useState('12.5683');

  const {
    fleetScheduleRows,
    fleetSummary,
    fleetAiToast,
    vehicles,
    loadFleetDemoSnapshot,
    clearFleetPlanning,
    addFleetTruck,
    setVehicles,
  } = useStore();

  const hasPlan = fleetScheduleRows.length > 0;
  const isEmpty = !hasPlan;

  const trucks = fleetScheduleRows.filter((r) => r.kind === 'truck');
  const trailers = fleetScheduleRows.filter((r) => r.kind === 'trailer');
  const drivers = fleetScheduleRows.filter((r) => r.kind === 'driver');

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
        <span className="font-semibold text-sm mr-2">Fleet planning</span>
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
          disabled={isEmpty && vehicles.length === 0}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear fleet
        </Button>
        <div className="flex items-center gap-1 ml-auto text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{fleetSummary ? 'Today → Tomorrow' : 'Not scheduled'}</span>
        </div>
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

      {fleetSummary && (
        <div className="px-3 py-2 border-b border-border flex flex-wrap gap-3 items-center text-xs">
          <Badge variant="secondary" className="font-normal">
            Trucks: {fleetSummary.trucksFree} free
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Trailers: {fleetSummary.trailersFree} free
          </Badge>
          <Badge variant="secondary" className="font-normal">
            Drivers: {fleetSummary.driversFree} free
          </Badge>
          <Badge variant="warning" className="font-normal">
            <AlertTriangle className="h-3 w-3 mr-1 inline" />
            {fleetSummary.atRisk} At Risk
          </Badge>
          <Badge variant="destructive" className="font-normal">
            {fleetSummary.delayedTrips} Delayed Trips
          </Badge>
        </div>
      )}

      <div className="px-3 py-2 border-b border-border flex gap-2 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer opacity-50">
          <input type="checkbox" className="rounded" disabled />
          At Risk Only
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer ml-4 opacity-50">
          <input type="checkbox" className="rounded" disabled />
          Show on map
        </label>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          {isEmpty ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-16 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80 mb-1">Nothing planned yet</p>
              <p className="text-xs max-w-md mx-auto mb-4">
                Use <strong>Generate demo fleet</strong> for sample trucks and a timeline, or{' '}
                <strong>Add truck</strong> to register vehicles for optimization (empty schedule until you
                plan).
              </p>
              <p className="text-[11px]">
                Vehicles in solver: <span className="font-mono text-foreground">{vehicles.length}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[140px_1fr] gap-2 mb-2 text-[10px] text-muted-foreground font-mono">
                <div />
                <div className="flex justify-between pr-1">
                  {HOURS.map((h) => (
                    <span key={h}>{h}</span>
                  ))}
                </div>
              </div>

              {trucks.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Trucks
                  </div>
                  {trucks.map((row) => (
                    <GanttRow key={row.id} label={row.label} blocks={row.blocks} />
                  ))}
                </>
              )}

              {trailers.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-1">
                    Trailers
                  </div>
                  {trailers.map((row) => (
                    <GanttRow key={row.id} label={row.label} blocks={row.blocks} />
                  ))}
                </>
              )}

              {drivers.length > 0 && (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-1">
                    Drivers
                  </div>
                  {drivers.map((row) => (
                    <GanttRow key={row.id} label={row.label} blocks={row.blocks} />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {fleetAiToast && (
        <div className="border-t border-border p-3 flex flex-wrap items-center gap-3 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <Sparkles className="h-5 w-5 text-sky-600 shrink-0" />
          <div className="flex-1 min-w-[200px] text-sm">
            <span className="font-medium">{fleetAiToast.message}</span>
            <span className="text-emerald-600 font-semibold ml-2">
              Est. gain: +{formatDkk(fleetAiToast.gainDkk)} DKK
            </span>
          </div>
          <Button size="sm">Assign</Button>
          <Button variant="link" size="sm" className="text-muted-foreground">
            View details
          </Button>
        </div>
      )}

      {detailOpen && fleetSummary && (
        <Card className="m-3 mt-0 border-primary/20 p-3 text-xs space-y-2">
          <div className="font-semibold text-sm">Fleet note</div>
          <div className="text-muted-foreground">Demo timeline only — replace with live planning data.</div>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        </Card>
      )}
    </div>
  );
}
