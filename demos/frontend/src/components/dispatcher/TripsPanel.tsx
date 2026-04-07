import { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import type { DispatcherTrip, SolverEngine } from '../../types/dispatcher';
import { bookingsToOrders, generatePdptwBookings, tripTabCountsFromTrips } from '../../data/dispatcherMock';
import {
  createScenario,
  getJobStatus,
  rerunPlan,
  startOptimization,
} from '../../api/client';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import { ChevronDown, ChevronRight, Play, RotateCcw, Sparkles, Truck } from 'lucide-react';

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

const TAB_TO_STATUS: Record<string, DispatcherTrip['status'] | null> = {
  all: null,
  drafts: 'draft',
  active: 'active',
  delayed: 'delayed',
  completed: 'completed',
};

export default function TripsPanel() {
  const {
    dispatcherTrips,
    tripTab,
    setTripTab,
    expandedTripId,
    setExpandedTripId,
    numBookings,
    setNumBookings,
    setDispatcherBookings,
    setScenarioId,
    setCurrentPlan,
    setOrders,
    addAlert,
    orders,
    vehicles,
    scenarioId,
    dispatcherBookings,
    currentPlan,
    setJobId,
    setJobStatus,
    setJobProgress,
    setViolations,
    solverEngine,
    setSolverEngine,
    setDispatcherOptimizing,
  } = useStore();

  const pollJob = useCallback(
    async (jobId: string) => {
      const poll = async () => {
        const status = await getJobStatus(jobId);
        setJobStatus(status.status);
        setJobProgress(status.progress);
        if (status.status === 'completed' && status.plan) {
          setCurrentPlan(status.plan);
          setViolations(status.plan.violations ?? []);
          setDispatcherOptimizing(false);
          addAlert(`Optimization complete — cost: ${status.plan.objective_value.toFixed(4)}`);
          return;
        }
        if (status.status === 'failed') {
          setDispatcherOptimizing(false);
          addAlert('Optimization failed');
          return;
        }
        setTimeout(poll, 500);
      };
      poll();
    },
    [
      setJobStatus,
      setJobProgress,
      setCurrentPlan,
      setViolations,
      setDispatcherOptimizing,
      addAlert,
    ],
  );

  const handleOptimize = useCallback(async () => {
    const ordersForRun =
      orders.length > 0 ? orders : bookingsToOrders(dispatcherBookings);
    const vehiclesForRun = vehicles;

    if (ordersForRun.length === 0) {
      addAlert('Generate bookings first (or upload orders JSON)');
      return;
    }
    if (vehiclesForRun.length === 0) {
      addAlert('Add fleet vehicles in Fleet (Add truck or Generate demo fleet)');
      return;
    }
    setDispatcherOptimizing(true);
    try {
      let sid = scenarioId;
      if (!sid) {
        sid = await createScenario(ordersForRun, vehiclesForRun);
        setScenarioId(sid);
        setOrders(ordersForRun);
      }
      setJobStatus('pending');
      const jobId = await startOptimization(
        sid,
        undefined,
        undefined,
        undefined,
        solverEngine,
      );
      setJobId(jobId);
      addAlert('Optimization started (PDPTW)…');
      pollJob(jobId);
    } catch (e: unknown) {
      setDispatcherOptimizing(false);
      addAlert(`Optimize error: ${(e as Error).message}`);
    }
  }, [
    orders,
    vehicles,
    scenarioId,
    dispatcherBookings,
    solverEngine,
    setScenarioId,
    setJobId,
    setJobStatus,
    setOrders,
    addAlert,
    pollJob,
    setDispatcherOptimizing,
  ]);

  const handleReoptimize = useCallback(async () => {
    if (!currentPlan) {
      addAlert('No plan to re-optimize');
      return;
    }
    setDispatcherOptimizing(true);
    try {
      const locked = currentPlan.routes
        .filter((r) => r.lock_flags.some(Boolean))
        .map((r) => ({
          vehicle_id: r.vehicle_id,
          fixed_prefix: r.sequence.filter((_, i) => r.lock_flags[i]),
        }));
      setJobStatus('pending');
      const jobId = await rerunPlan(currentPlan.plan_id, locked);
      setJobId(jobId);
      addAlert('Re-optimization started…');
      pollJob(jobId);
    } catch (e: unknown) {
      setDispatcherOptimizing(false);
      addAlert(`Re-optimize error: ${(e as Error).message}`);
    }
  }, [currentPlan, setJobId, setJobStatus, addAlert, pollJob, setDispatcherOptimizing]);

  const handleGenerateBookings = useCallback(() => {
    const list = generatePdptwBookings(numBookings);
    setDispatcherBookings(list);
    setScenarioId(null);
    setCurrentPlan(null);
    setOrders([]);
    addAlert(`Generated ${list.length} PDPTW bookings`);
  }, [
    numBookings,
    setDispatcherBookings,
    setScenarioId,
    setCurrentPlan,
    setOrders,
    addAlert,
  ]);

  const counts = tripTabCountsFromTrips(dispatcherTrips);

  const tabs = [
    { id: 'all' as const, label: `All (${counts.all})` },
    { id: 'drafts' as const, label: `Drafts (${counts.draft})` },
    { id: 'active' as const, label: `Active (${counts.active})` },
    { id: 'delayed' as const, label: `Delayed (${counts.delayed})` },
    { id: 'completed' as const, label: `Completed (${counts.completed})` },
  ];

  const statusFilter = TAB_TO_STATUS[tripTab];
  const list = statusFilter
    ? dispatcherTrips.filter((t) => t.status === statusFilter)
    : dispatcherTrips;

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
        <Button size="sm" className="h-7 text-[11px] ml-auto" variant="outline" disabled>
          + New trip (after plan)
        </Button>
      </div>
      <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-2 bg-muted/25">
        <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
          PDPTW
        </Badge>
        <span className="text-[10px] text-muted-foreground">Generate</span>
        <input
          type="number"
          min={1}
          max={100}
          value={numBookings}
          onChange={(e) =>
            setNumBookings(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
          }
          className="w-14 bg-background border border-border rounded-md px-2 py-1 text-xs font-medium text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring"
          title="Number of bookings to generate"
        />
        <span className="text-[10px] text-muted-foreground">bookings</span>
        <Button variant="secondary" size="sm" className="h-7 text-[11px]" onClick={handleGenerateBookings}>
          <Sparkles className="h-3.5 w-3.5" />
          Generate bookings
        </Button>
      </div>
      <div className="px-3 py-2 border-b border-border flex flex-wrap items-center gap-2 bg-muted/15">
        <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide shrink-0">
          Solver
        </label>
        <select
          value={solverEngine}
          onChange={(e) => setSolverEngine(e.target.value as 'routefinder' | 'ortools')}
          className="h-7 min-w-[140px] rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="routefinder">AI (RouteFinder)</option>
          <option value="ortools">OR-Tools</option>
        </select>
        <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />
        <Button size="sm" className="h-7 text-[11px]" onClick={handleOptimize}>
          <Play className="h-3.5 w-3.5" />
          Optimize
        </Button>
        <Button variant="warning" size="sm" className="h-7 text-[11px]" onClick={handleReoptimize}>
          <RotateCcw className="h-3.5 w-3.5" />
          Re-optimize
        </Button>
        {currentPlan && (
          <Badge
            variant={currentPlan.status === 'published' ? 'success' : 'info'}
            className="text-[10px] font-mono ml-auto"
          >
            {currentPlan.plan_id.slice(0, 8)}… · {currentPlan.status}
          </Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground/80 mb-1">No trips yet</p>
              <p className="text-xs max-w-sm mx-auto">
                Trips appear here after you optimize, or when you attach bookings to a
                draft. Use <strong>Generate bookings</strong> above, add trucks under Fleet, then run
                <strong> Optimize</strong> in this column.
              </p>
            </div>
          ) : (
            list.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                expanded={expandedTripId === trip.id}
                onToggle={() =>
                  setExpandedTripId(expandedTripId === trip.id ? null : trip.id)
                }
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
