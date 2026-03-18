import type { JobStatusResponse, Order, PlanResult, Vehicle } from '../types';

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
): Promise<string> {
  const data = await request<{ job_id: string }>('/optimization-runs', {
    method: 'POST',
    body: JSON.stringify({
      scenario_id: scenarioId,
      vehicle_ids: vehicleIds ?? [],
      locked_segments: lockedSegments ?? [],
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
