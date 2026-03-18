import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  createScenario,
  generateScenario,
  getJobStatus,
  publishPlan,
  rerunPlan,
  startOptimization,
} from '../api/client';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Upload,
  Play,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react';

export default function TopCommandBar() {
  const {
    orders,
    vehicles,
    scenarioId,
    currentPlan,
    setScenarioId,
    setCurrentPlan,
    setJobId,
    setJobStatus,
    setJobProgress,
    addAlert,
    setViolations,
    setOrders,
    setVehicles,
  } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = useCallback(async () => {
    try {
      const res = await generateScenario(12, 3);
      setOrders(res.orders);
      setVehicles(res.vehicles);
      setScenarioId(res.scenario_id);
      setCurrentPlan(null);
      addAlert(`Generated ${res.orders.length} orders, ${res.vehicles.length} vehicles`);
    } catch (e: unknown) {
      addAlert(`Generate error: ${(e as Error).message}`);
    }
  }, [setOrders, setVehicles, setScenarioId, setCurrentPlan, addAlert]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.orders) {
            const mappedOrders = data.orders.map((o: Record<string, unknown>) => ({
              order_id: o.id ?? o.order_id,
              lat: (o.receiver as Record<string, unknown>)?.lat ?? o.lat ?? 0,
              lon: (o.receiver as Record<string, unknown>)?.lon ?? o.lon ?? 0,
              demand: (o.demand as Record<string, unknown>)?.ldm ?? o.demand ?? 0,
              tw_start: (o.time_window as number[])?.[0] ?? o.tw_start ?? 0,
              tw_end: (o.time_window as number[])?.[1] ?? o.tw_end ?? Infinity,
              service_time: o.service_time ?? 0,
              priority: o.priority ?? 1,
              goods_type: (o.demand as Record<string, unknown>)?.goods_type ?? o.goods_type ?? 'A',
              must_follow: o.must_follow ?? undefined,
              must_precede: o.must_precede ?? undefined,
            }));
            setOrders(mappedOrders);
          }
          if (data.fleet || data.vehicles) {
            const fleet = data.fleet ?? data.vehicles;
            const mappedVehicles = fleet.map((v: Record<string, unknown>) => ({
              vehicle_id: v.vehicle_id,
              capacity: v.capacity_ldm ?? v.capacity ?? 30,
              depot_lat: v.depot_lat ?? 55.49,
              depot_lon: v.depot_lon ?? 9.47,
              allowed_goods: v.allowed_goods ?? ['A', 'B'],
              shift_start: v.shift_start ?? 0,
              shift_end: v.shift_end ?? Infinity,
              max_distance: v.max_distance ?? Infinity,
              cost_class: v.cost_class ?? 'standard',
            }));
            setVehicles(mappedVehicles);
          }
          setCurrentPlan(null);
          addAlert('Data loaded from file');
        } catch (err: unknown) {
          addAlert(`Parse error: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    },
    [setOrders, setVehicles, setCurrentPlan, addAlert],
  );

  const pollJob = useCallback(
    async (jobId: string) => {
      const poll = async () => {
        const status = await getJobStatus(jobId);
        setJobStatus(status.status);
        setJobProgress(status.progress);
        if (status.status === 'completed' && status.plan) {
          setCurrentPlan(status.plan);
          setViolations(status.plan.violations ?? []);
          addAlert(`Optimization complete — cost: ${status.plan.objective_value.toFixed(4)}`);
          return;
        }
        if (status.status === 'failed') {
          addAlert('Optimization failed');
          return;
        }
        setTimeout(poll, 500);
      };
      poll();
    },
    [setJobStatus, setJobProgress, setCurrentPlan, setViolations, addAlert],
  );

  const handleOptimize = useCallback(async () => {
    if (orders.length === 0 || vehicles.length === 0) {
      addAlert('Load orders and vehicles first');
      return;
    }
    try {
      let sid = scenarioId;
      if (!sid) {
        sid = await createScenario(orders, vehicles);
        setScenarioId(sid);
      }
      setJobStatus('pending');
      const jobId = await startOptimization(sid);
      setJobId(jobId);
      addAlert('Optimization started…');
      pollJob(jobId);
    } catch (e: unknown) {
      addAlert(`Optimize error: ${(e as Error).message}`);
    }
  }, [orders, vehicles, scenarioId, setScenarioId, setJobId, setJobStatus, addAlert, pollJob]);

  const handleReoptimize = useCallback(async () => {
    if (!currentPlan) {
      addAlert('No plan to re-optimize');
      return;
    }
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
      addAlert(`Re-optimize error: ${(e as Error).message}`);
    }
  }, [currentPlan, setJobId, setJobStatus, addAlert, pollJob]);

  const handlePublish = useCallback(async () => {
    if (!currentPlan) {
      addAlert('No plan to publish');
      return;
    }
    try {
      const result = await publishPlan(currentPlan.plan_id);
      addAlert(`Published: ${result.dispatch_snapshot_id}`);
      setCurrentPlan({ ...currentPlan, status: 'published' });
    } catch (e: unknown) {
      addAlert(`Publish error: ${(e as Error).message}`);
    }
  }, [currentPlan, setCurrentPlan, addAlert]);

  return (
    <header className="flex items-center gap-3 bg-card border-b border-border px-4 py-2">
      <h1 className="font-bold text-base text-primary tracking-tight mr-1">
        Dispatcher Workspace
      </h1>

      <Separator orientation="vertical" className="h-5" />

      <Button variant="secondary" size="sm" onClick={handleGenerate}>
        <Sparkles className="h-3.5 w-3.5" />
        Generate Sample
      </Button>

      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        Upload JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex-1" />

      <Button size="sm" onClick={handleOptimize}>
        <Play className="h-3.5 w-3.5" />
        Optimize
      </Button>
      <Button variant="warning" size="sm" onClick={handleReoptimize}>
        <RotateCcw className="h-3.5 w-3.5" />
        Re-optimize
      </Button>
      <Button variant="success" size="sm" onClick={handlePublish}>
        <Send className="h-3.5 w-3.5" />
        Publish
      </Button>

      {currentPlan && (
        <Badge variant={currentPlan.status === 'published' ? 'success' : 'info'}>
          {currentPlan.plan_id.slice(0, 8)}… · {currentPlan.status}
        </Badge>
      )}
    </header>
  );
}
