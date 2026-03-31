import { useState } from 'react';
import { mockFleetSummary, mockGanttBlocks, mockAiToast } from '../../data/dispatcherMock';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import type { GanttBlock } from '../../types/dispatcher';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';

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
        {blocks.map((b) => (
          <div
            key={b.id}
            className={`absolute top-1 bottom-1 rounded px-1.5 flex flex-col justify-center text-[9px] font-medium leading-tight overflow-hidden ${blockStyle(b)}`}
            style={{ left: `${b.startPct}%`, width: `${b.widthPct}%` }}
            title={b.sublabel ? `${b.label} — ${b.sublabel}` : b.label}
          >
            <span className="truncate">{b.label}</span>
            {b.sublabel && <span className="truncate opacity-90 text-[8px]">{b.sublabel}</span>}
          </div>
        ))}
        <div
          className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none"
          style={{ left: '12%' }}
          title="Now"
        />
      </div>
    </div>
  );
}

export default function FleetPlanningView() {
  const [detailOpen, setDetailOpen] = useState(true);

  const byAsset = (name: string) => mockGanttBlocks.filter((b) => b.assetId === name);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <div className="p-3 border-b border-border flex flex-wrap gap-3 items-center text-xs">
        <Badge variant="secondary" className="font-normal">
          Trucks: {mockFleetSummary.trucksFree} free
        </Badge>
        <Badge variant="secondary" className="font-normal">
          Trailers: {mockFleetSummary.trailersFree} free
        </Badge>
        <Badge variant="secondary" className="font-normal">
          Drivers: {mockFleetSummary.driversFree} free
        </Badge>
        <Badge variant="warning" className="font-normal">
          <AlertTriangle className="h-3 w-3 mr-1 inline" />
          {mockFleetSummary.atRisk} At Risk
        </Badge>
        <Badge variant="destructive" className="font-normal">
          {mockFleetSummary.delayedTrips} Delayed Trips
        </Badge>
        <div className="flex items-center gap-1 ml-auto text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Today → Tomorrow</span>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-border flex gap-2 text-[11px] text-muted-foreground">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" className="rounded" />
          At Risk Only
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer ml-4">
          <input type="checkbox" className="rounded" />
          Show on map
        </label>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3">
          <div className="grid grid-cols-[140px_1fr] gap-2 mb-2 text-[10px] text-muted-foreground font-mono">
            <div />
            <div className="flex justify-between pr-1">
              {HOURS.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Trucks
          </div>
          {['Truck 17', 'Truck 35'].map((name) => (
            <GanttRow key={name} label={name} blocks={byAsset(name)} />
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-1">
            Trailers
          </div>
          {['Trailer 18'].map((name) => (
            <GanttRow key={name} label={name} blocks={byAsset(name)} />
          ))}

          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-4 mb-1">
            Drivers
          </div>
          {['Lars R.', 'Anna M.'].map((name) => (
            <GanttRow key={name} label={name} blocks={byAsset(name)} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border p-3 flex flex-wrap items-center gap-3 bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
        <Sparkles className="h-5 w-5 text-sky-600 shrink-0" />
        <div className="flex-1 min-w-[200px] text-sm">
          <span className="font-medium">{mockAiToast.message}</span>
          <span className="text-emerald-600 font-semibold ml-2">
            Est. gain: +{formatDkk(mockAiToast.gainDkk)} DKK
          </span>
        </div>
        <Button size="sm">Assign</Button>
        <Button variant="link" size="sm" className="text-muted-foreground">
          View details
        </Button>
      </div>

      {detailOpen && (
        <Card className="m-3 mt-0 border-primary/20 p-3 text-xs space-y-2">
          <div className="font-semibold text-sm">Truck 17</div>
          <div className="text-muted-foreground">Why At Risk: Empty reposition 18 km after delivery.</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              ETA: <span className="font-medium text-foreground">12:15</span>
            </div>
            <div>
              Empty km: <span className="font-medium text-foreground">18 km</span>
            </div>
            <div>
              Margin: <span className="font-medium text-emerald-600">+5,400 DKK</span>
            </div>
            <div>
              Reposition cost: <span className="font-medium text-foreground">-560 DKK</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => setDetailOpen(false)}>
            Close detail
          </Button>
        </Card>
      )}
    </div>
  );
}
