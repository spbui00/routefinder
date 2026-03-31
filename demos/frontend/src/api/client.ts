import type {
  GenerateResponse,
  JobStatusResponse,
  Order,
  PlanResult,
  Vehicle,
  PreProcessorPayload,
  PostProcessorPayload,
  SolverEngine,
} from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function generateScenario(
  numOrders = 12,
  numVehicles = 3,
  variant = 'all',
): Promise<GenerateResponse> {
  return request<GenerateResponse>('/scenarios/generate', {
    method: 'POST',
    body: JSON.stringify({ num_orders: numOrders, num_vehicles: numVehicles, variant }),
  });
}

export async function createScenario(
  orders: Order[],
  vehicles: Vehicle[],
): Promise<string> {
  const data = await request<{ scenario_id: string }>('/scenarios', {
    method: 'POST',
    body: JSON.stringify({ orders, vehicles }),
  });
  return data.scenario_id;
}

export async function startOptimization(
  scenarioId: string,
  vehicleIds?: string[],
  lockedSegments?: { vehicle_id: string; fixed_prefix: number[] }[],
  variant?: string,
  solverEngine: SolverEngine = 'routefinder',
  maxRuntimeSeconds = 30,
): Promise<string> {
  const data = await request<{ job_id: string }>('/optimization-runs', {
    method: 'POST',
    body: JSON.stringify({
      scenario_id: scenarioId,
      vehicle_ids: vehicleIds ?? [],
      locked_segments: lockedSegments ?? [],
      variant: variant ?? undefined,
      solver_engine: solverEngine,
      max_runtime_seconds: maxRuntimeSeconds,
    }),
  });
  return data.job_id;
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return request<JobStatusResponse>(`/optimization-runs/${jobId}`);
}

export async function getPlan(planId: string): Promise<PlanResult> {
  return request<PlanResult>(`/plans/${planId}`);
}

export async function rerunPlan(
  planId: string,
  lockedSegments: { vehicle_id: string; fixed_prefix: number[] }[],
): Promise<string> {
  const data = await request<{ job_id: string }>(`/plans/${planId}/rerun`, {
    method: 'POST',
    body: JSON.stringify({ locked_segments: lockedSegments }),
  });
  return data.job_id;
}

export async function publishPlan(
  planId: string,
): Promise<{ dispatch_snapshot_id: string }> {
  return request<{ dispatch_snapshot_id: string }>(`/routes/${planId}/publish`, {
    method: 'POST',
  });
}

export function mockPreProcessorPayload(): PreProcessorPayload {
  return {
    pipeline: 'Pre-Processor',
    depots: [
      {
        id: 'D1',
        lat: 55.6761,
        lng: 12.5683,
        truck_capacity_kg: 40_000,
        shift_end: '2026-12-18T18:00:00Z',
      },
    ],
    bookings: [
      {
        id: 'B1',
        type: 'delivery',
        lat: 52.52,
        lng: 13.405,
        weight_kg: 3660,
        revenue_dkk: 5861,
        time_window: ['2026-12-18T07:00:00Z', '2026-12-18T16:00:00Z'],
      },
    ],
  };
}

export function mockPostProcessorPayload(): PostProcessorPayload {
  return {
    pipeline: 'Post-Processor',
    draft_trip_id: 'AI-REF-MOCK',
    route_stops: ['Aarhus (Depot)', 'Booking B1 (Berlin)'],
    utilization_kg: 3660,
    projected_margin_dkk: 6551,
    solver_engine: 'routefinder',
  };
}
