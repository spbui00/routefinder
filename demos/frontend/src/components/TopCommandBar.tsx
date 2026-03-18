import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import {
  createScenario,
  getJobStatus,
  publishPlan,
  rerunPlan,
  startOptimization,
} from '../api/client';

const SAMPLE_DATA_URL = '/api/health';

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

  const handleLoadSample = useCallback(async () => {
    try {
      const res = await fetch('/logistics_data.json');
      const data = await res.json();
      const mappedOrders = data.orders.map((o: any) => ({
        order_id: o.id,
        lat: o.receiver.lat,
        lon: o.receiver.lon,
        demand: o.demand.ldm,
        tw_start: o.time_window?.[0] ?? 0,
        tw_end: o.time_window?.[1] ?? Infinity,
        service_time: 0,
        priority: 1,
        goods_type: o.demand.goods_type,
      }));
      const mappedVehicles = data.fleet.map((v: any) => ({
        vehicle_id: v.vehicle_id,
        capacity: v.capacity_ldm ?? 30,
        depot_lat: 55.49,
        depot_lon: 9.47,
        allowed_goods: v.allowed_goods ?? ['A', 'B'],
        shift_start: 0,
        shift_end: Infinity,
        max_distance: Infinity,
        cost_class: 'standard',
      }));
      setOrders(mappedOrders);
      setVehicles(mappedVehicles);
      addAlert('Sample data loaded');
    } catch (e: any) {
      addAlert(`Failed to load sample data: ${e.message}`);
    }
  }, [setOrders, setVehicles, addAlert]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.orders) {
            const mappedOrders = data.orders.map((o: any) => ({
              order_id: o.id ?? o.order_id,
              lat: o.receiver?.lat ?? o.lat ?? 0,
              lon: o.receiver?.lon ?? o.lon ?? 0,
              demand: o.demand?.ldm ?? o.demand ?? 0,
              tw_start: o.time_window?.[0] ?? o.tw_start ?? 0,
              tw_end: o.time_window?.[1] ?? o.tw_end ?? Infinity,
              service_time: o.service_time ?? 0,
              priority: o.priority ?? 1,
              goods_type: o.demand?.goods_type ?? o.goods_type ?? 'A',
            }));
            setOrders(mappedOrders);
          }
          if (data.fleet || data.vehicles) {
            const fleet = data.fleet ?? data.vehicles;
            const mappedVehicles = fleet.map((v: any) => ({
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
          addAlert('Data loaded from file');
        } catch (err: any) {
          addAlert(`Parse error: ${err.message}`);
        }
      };
      reader.readAsText(file);
    },
    [setOrders, setVehicles, addAlert],
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
          addAlert(
            `Optimization complete. Cost: ${status.plan.objective_value.toFixed(4)}`,
          );
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
      addAlert('Optimization started...');
      pollJob(jobId);
    } catch (e: any) {
      addAlert(`Optimize error: ${e.message}`);
    }
  }, [
    orders,
    vehicles,
    scenarioId,
    setScenarioId,
    setJobId,
    setJobStatus,
    addAlert,
    pollJob,
  ]);

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
      addAlert('Re-optimization started...');
      pollJob(jobId);
    } catch (e: any) {
      addAlert(`Re-optimize error: ${e.message}`);
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
    } catch (e: any) {
      addAlert(`Publish error: ${e.message}`);
    }
  }, [currentPlan, setCurrentPlan, addAlert]);

  return (
    <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 text-sm border-b border-slate-700">
      <span className="font-bold text-lg mr-4 text-blue-400">
        Dispatcher Workspace
      </span>

      <button
        onClick={handleLoadSample}
        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium"
      >
        Load Sample
      </button>

      <button
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium"
      >
        Upload JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex-1" />

      <button
        onClick={handleOptimize}
        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded font-semibold text-xs"
      >
        Optimize
      </button>
      <button
        onClick={handleReoptimize}
        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 rounded font-semibold text-xs"
      >
        Re-optimize
      </button>
      <button
        onClick={handlePublish}
        className="px-4 py-1.5 bg-green-600 hover:bg-green-500 rounded font-semibold text-xs"
      >
        Publish
      </button>

      {currentPlan && (
        <span className="ml-2 text-xs text-slate-400">
          Plan: {currentPlan.plan_id.slice(0, 8)}… ({currentPlan.status})
        </span>
      )}
    </div>
  );
}
