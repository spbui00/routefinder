export type GoodsType = 'A' | 'B';

export interface Order {
  order_id: string;
  lat: number;
  lon: number;
  demand: number;
  tw_start: number;
  tw_end: number;
  service_time: number;
  priority: number;
  goods_type: GoodsType;
  must_follow?: string;
  must_precede?: string;
  demand_linehaul?: number;
  demand_backhaul?: number;
  demand_unit?: string;
  weight_kg?: number;
  ldm?: number;
  pll?: number;
  delivery_lat?: number;
  delivery_lon?: number;
  revenue_dkk?: number;
}

export interface Vehicle {
  vehicle_id: string;
  capacity: number;
  depot_lat: number;
  depot_lon: number;
  allowed_goods: GoodsType[];
  shift_start: number;
  shift_end: number;
  max_distance: number;
  cost_class: string;
  capacity_by_goods?: Partial<Record<GoodsType, number>>;
}

export interface RouteMetrics {
  total_distance: number;
  total_load: number;
  num_stops: number;
  estimated_time: number;
}

export interface RouteResult {
  vehicle_id: string;
  sequence: number[];
  lock_flags: boolean[];
  metrics: RouteMetrics;
  sequence_labels?: string[];
}

export interface ConstraintViolation {
  type: string;
  severity: string;
  entity: string;
  details: string;
  blocking: boolean;
}

export interface PlanResult {
  plan_id: string;
  scenario_id: string;
  status: string;
  routes: RouteResult[];
  objective_value: number;
  violations: ConstraintViolation[];
  created_at: string;
  published_version?: string;
  solver_engine?: import('./dispatcher').SolverEngine;
  postprocess?: Record<string, unknown>;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobStatusResponse {
  job_id: string;
  status: JobStatus;
  progress: number;
  plan?: PlanResult;
}

export interface GenerateResponse {
  scenario_id: string;
  variant: string;
  orders: Order[];
  vehicles: Vehicle[];
}

export const VARIANT_PRESETS = [
  'all', 'cvrp', 'ovrp', 'ovrpb', 'ovrpbl', 'ovrpbltw', 'ovrpbtw',
  'ovrpl', 'ovrpltw', 'ovrptw', 'vrpb', 'vrpbl', 'vrpbltw', 'vrpbtw',
  'vrpl', 'vrpltw', 'vrptw',
] as const;

export type VariantPreset = typeof VARIANT_PRESETS[number];

export type {
  AiToastSuggestion,
  DispatcherBooking,
  DispatcherDepot,
  DispatcherTrip,
  FleetSummary,
  GanttBlock,
  OptimizationJobState,
  PostProcessorPayload,
  PreProcessorPayload,
  SolverEngine,
  TripStatus,
  TripStopRow,
} from './dispatcher';
