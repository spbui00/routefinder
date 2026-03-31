import { useStore } from '../../store/useStore';
import type { DispatcherTrip, SolverEngine } from '../../types/dispatcher';
import { tripTabCounts } from '../../data/dispatcherMock';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import { ChevronDown, ChevronRight, Sparkles, Truck } from 'lucide-react';

function EngineBadge({ engine }: { engine?: SolverEngine }) {
  if (!engine) return null;
  return (
    <Badge variant={engine === 'routefinder' ? 'default' : 'secondary'} className="text-[9px]">
      {engine === 'routefinder' ? 'AI' : 'OR-Tools'}
    </Badge>
  );
}

function TripCard({
  trip,
  expanded,
  onToggle,
}: {
  trip: DispatcherTrip;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card
      className={`overflow-hidden border-border ${trip.aiUpdating ? 'ring-1 ring-amber-400/60' : ''}`}
    >
      {trip.aiUpdating && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs font-medium">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          AI updating…
        </div>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-start gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm">
                {trip.originCity} → {trip.destCity}
              </span>
              <span className="text-xs text-muted-foreground">{trip.dateLabel}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-800">{trip.initials}</span>
              <Badge variant="outline" className="text-[9px] capitalize">
                {trip.status}
              </Badge>
              <span className="font-mono text-muted-foreground">{trip.displayId}</span>
              {trip.aiRef && (
                <Badge variant="info" className="text-[9px]">
                  {trip.aiRef}
                </Badge>
              )}
              <EngineBadge engine={trip.solverEngine} />
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {formatDkk(trip.kgTotal)} kg · {formatDkk(trip.ldmTotal)} ldm
              </span>
              <span className="ml-auto font-semibold text-emerald-600 tabular-nums">
                ↑ + {formatDkk(trip.marginDkk)} kr.
              </span>
            </div>
          </div>
        </div>
      </button>

      {expanded && trip.stops && trip.stops.length > 0 && (
        <div className="border-t border-border px-3 pb-3">
          <table className="w-full text-[11px] mt-2">
            <thead>
              <tr className="text-muted-foreground text-left border-b border-border">
                <th className="py-1 pr-2 font-medium">Stop</th>
                <th className="py-1 pr-2 font-medium">Co.</th>
                <th className="py-1 pr-2 font-medium">Date</th>
                <th className="py-1 pr-2 font-medium text-right">kg</th>
                <th className="py-1 pr-2 font-medium text-right">ldm</th>
                <th className="py-1 font-medium text-right">kr.</th>
              </tr>
            </thead>
            <tbody>
              {trip.stops.map((row, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1.5 pr-2">
                    <span className={row.isPickup ? 'text-sky-600' : 'text-violet-600'}>
                      {row.isPickup ? '↑ ' : '↓ '}
                    </span>
                    {row.label}
                  </td>
                  <td className="py-1.5 pr-2">{row.company}</td>
                  <td className="py-1.5 pr-2">{row.dateLabel}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatDkk(row.kg)}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{formatDkk(row.ldm)}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatDkk(row.economyDkk)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-muted-foreground flex justify-between">
            <span>Expenses (illustrative)</span>
            <span className="font-mono">9.890,00 kr.</span>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function TripsPanel() {
  const {
    dispatcherTrips,
    tripTab,
    setTripTab,
    expandedTripId,
    setExpandedTripId,
  } = useStore();

  const tabs = [
    { id: 'all' as const, label: `All (${tripTabCounts.all})` },
    { id: 'drafts' as const, label: `Drafts (${tripTabCounts.drafts})` },
    { id: 'active' as const, label: `Active (${tripTabCounts.active})` },
    { id: 'delayed' as const, label: `Delayed (${tripTabCounts.delayed})` },
    { id: 'completed' as const, label: `Completed (${tripTabCounts.completed})` },
  ];

  const list =
    tripTab === 'all'
      ? dispatcherTrips
      : dispatcherTrips.filter((t) => t.status === tripTab.replace(/s$/, ''));

  return (
    <div className="flex flex-col min-w-0 flex-1 bg-background border-r border-border">
      <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 mr-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Trips</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tripTab === t.id ? 'default' : 'ghost'}
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => setTripTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button size="sm" className="h-7 text-[11px] ml-auto">
          + New export draft
        </Button>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
          17–19 December, 2025
        </span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            17th december
          </div>
          {list.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              expanded={expandedTripId === trip.id}
              onToggle={() =>
                setExpandedTripId(expandedTripId === trip.id ? null : trip.id)
              }
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
