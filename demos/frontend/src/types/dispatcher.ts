export type TripStatus = 'draft' | 'active' | 'delayed' | 'completed';

export type SolverEngine = 'routefinder' | 'ortools';

export interface DispatcherDepot {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export interface DispatcherBooking {
  id: string;
  pickupCode: string;
  pickupCity: string;
  deliveryCode: string;
  deliveryCity: string;
  shipper: string;
  consignee: string;
  pickupWindow: string;
  deliveryWindow: string;
  pll: number;
  kg: number;
  ldm: number;
  revenueDkk: number;
  preDraftAiRef?: string;
  pickupLat: number;
  pickupLng: number;
  deliveryLat: number;
  deliveryLng: number;
}

export interface FleetScheduleRow {
  id: string;
  label: string;
  kind: 'truck' | 'trailer' | 'driver';
  blocks: GanttBlock[];
}

export interface TripStopRow {
  bookingId: string;
  label: string;
  company: string;
  dateLabel: string;
  kg: number;
  ldm: number;
  economyDkk: number;
  isPickup: boolean;
}

export interface DispatcherTrip {
  id: string;
  displayId: string;
  originCity: string;
  destCity: string;
  dateLabel: string;
  status: TripStatus;
  aiRef?: string;
  solverEngine?: SolverEngine;
  kgTotal: number;
  ldmTotal: number;
  marginDkk: number;
  initials: string;
  stops?: TripStopRow[];
  aiUpdating?: boolean;
}

export interface FleetSummary {
  trucksFree: string;
  trailersFree: string;
  driversFree: string;
  atRisk: number;
  delayedTrips: number;
}

export interface GanttBlock {
  id: string;
  assetId: string;
  assetType: 'truck' | 'trailer' | 'driver';
  startPct: number;
  widthPct: number;
  label: string;
  variant: 'route' | 'empty' | 'reposition' | 'risk' | 'shift' | 'rest' | 'maintenance';
  sublabel?: string;
}

export interface AiToastSuggestion {
  id: string;
  message: string;
  gainDkk: number;
}

export interface OptimizationJobState {
  jobId: string | null;
  status: 'idle' | 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  solverEngine: SolverEngine;
}

export interface PreProcessorPayload {
  pipeline: 'Pre-Processor';
  depots: Array<{
    id: string;
    lat: number;
    lng: number;
    truck_capacity_kg: number;
    shift_end?: string;
  }>;
  bookings: Array<{
    id: string;
    type: string;
    lat: number;
    lng: number;
    weight_kg: number;
    revenue_dkk: number;
    time_window: [string, string];
  }>;
}

export interface PostProcessorPayload {
  pipeline: 'Post-Processor';
  draft_trip_id: string;
  route_stops: string[];
  utilization_kg: number;
  projected_margin_dkk: number;
  solver_engine: SolverEngine;
  routing_cost_dkk?: number;
}
