import { create } from 'zustand';
import type {
  ConstraintViolation,
  JobStatus,
  Order,
  PlanResult,
  Vehicle,
} from '../types';
import type {
  AiToastSuggestion,
  DispatcherBooking,
  DispatcherTrip,
  FleetScheduleRow,
  FleetSummary,
  SolverEngine,
} from '../types/dispatcher';
import {
  buildDemoFleetSchedule,
  demoFleetVehicles,
  mockAiToast,
  mockFleetSummary,
} from '../data/dispatcherMock';

export type DispatcherNavId =
  | 'trips'
  | 'fleet'
  | 'deliveries'
  | 'events'
  | 'estimator'
  | 'bookings_hub';

export type TripFilterTab = 'all' | 'drafts' | 'active' | 'delayed' | 'completed';
export type BookingFilterTab = 'all' | 'suggested';

interface AppState {
  orders: Order[];
  vehicles: Vehicle[];
  scenarioId: string | null;
  numBookings: number;

  currentPlan: PlanResult | null;
  selectedVehicle: string | null;

  jobId: string | null;
  jobStatus: JobStatus | null;
  jobProgress: number;

  alerts: string[];
  violations: ConstraintViolation[];

  activeNav: DispatcherNavId;
  solverEngine: SolverEngine;
  dispatcherTrips: DispatcherTrip[];
  dispatcherBookings: DispatcherBooking[];
  tripTab: TripFilterTab;
  bookingTab: BookingFilterTab;
  expandedTripId: string | null;
  selectedBookingIds: Set<string>;
  reviewMode: boolean;
  dispatcherOptimizing: boolean;

  fleetScheduleRows: FleetScheduleRow[];
  fleetSummary: FleetSummary | null;
  fleetAiToast: AiToastSuggestion | null;

  setOrders: (orders: Order[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setScenarioId: (id: string | null) => void;
  setNumBookings: (n: number) => void;
  setCurrentPlan: (plan: PlanResult | null) => void;
  setSelectedVehicle: (id: string | null) => void;
  setJobId: (id: string | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setJobProgress: (progress: number) => void;
  addAlert: (msg: string) => void;
  clearAlerts: () => void;
  setViolations: (v: ConstraintViolation[]) => void;

  setActiveNav: (id: DispatcherNavId) => void;
  setSolverEngine: (e: SolverEngine) => void;
  setDispatcherTrips: (t: DispatcherTrip[]) => void;
  setDispatcherBookings: (b: DispatcherBooking[]) => void;
  setTripTab: (t: TripFilterTab) => void;
  setBookingTab: (t: BookingFilterTab) => void;
  setExpandedTripId: (id: string | null) => void;
  toggleBookingSelect: (id: string) => void;
  setReviewMode: (v: boolean) => void;
  setDispatcherOptimizing: (v: boolean) => void;
  resetDispatcherSelection: () => void;

  loadFleetDemoSnapshot: () => void;
  clearFleetPlanning: () => void;
  addFleetTruck: (params: {
    vehicle_id: string;
    capacity_tons: number;
    depot_lat: number;
    depot_lon: number;
  }) => void;
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  vehicles: [],
  scenarioId: null,
  numBookings: 8,
  currentPlan: null,
  selectedVehicle: null,
  jobId: null,
  jobStatus: null,
  jobProgress: 0,
  alerts: [],
  violations: [],

  activeNav: 'trips',
  solverEngine: 'routefinder',
  dispatcherTrips: [],
  dispatcherBookings: [],
  tripTab: 'all',
  bookingTab: 'all',
  expandedTripId: null,
  selectedBookingIds: new Set(),
  reviewMode: false,
  dispatcherOptimizing: false,

  fleetScheduleRows: [],
  fleetSummary: null,
  fleetAiToast: null,

  setOrders: (orders) => set({ orders }),
  setVehicles: (vehicles) => set({ vehicles }),
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setNumBookings: (numBookings) => set({ numBookings }),
  setCurrentPlan: (currentPlan) => set({ currentPlan }),
  setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
  setJobId: (jobId) => set({ jobId }),
  setJobStatus: (jobStatus) => set({ jobStatus }),
  setJobProgress: (jobProgress) => set({ jobProgress }),
  addAlert: (msg) => set((s) => ({ alerts: [...s.alerts, msg] })),
  clearAlerts: () => set({ alerts: [] }),
  setViolations: (violations) => set({ violations }),

  setActiveNav: (activeNav) => set({ activeNav }),
  setSolverEngine: (solverEngine) => set({ solverEngine }),
  setDispatcherTrips: (dispatcherTrips) => set({ dispatcherTrips }),
  setDispatcherBookings: (dispatcherBookings) => set({ dispatcherBookings }),
  setTripTab: (tripTab) => set({ tripTab }),
  setBookingTab: (bookingTab) => set({ bookingTab }),
  setExpandedTripId: (expandedTripId) => set({ expandedTripId }),
  toggleBookingSelect: (id) =>
    set((s) => {
      const next = new Set(s.selectedBookingIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedBookingIds: next };
    }),
  setReviewMode: (reviewMode) => set({ reviewMode }),
  setDispatcherOptimizing: (dispatcherOptimizing) => set({ dispatcherOptimizing }),
  resetDispatcherSelection: () => set({ selectedBookingIds: new Set(), reviewMode: false }),

  loadFleetDemoSnapshot: () =>
    set({
      fleetScheduleRows: buildDemoFleetSchedule(),
      fleetSummary: mockFleetSummary,
      fleetAiToast: mockAiToast,
      vehicles: demoFleetVehicles(),
    }),

  clearFleetPlanning: () =>
    set({
      fleetScheduleRows: [],
      fleetSummary: null,
      fleetAiToast: null,
    }),

  addFleetTruck: ({ vehicle_id, capacity_tons, depot_lat, depot_lon }) => {
    const v: Vehicle = {
      vehicle_id,
      capacity: capacity_tons,
      depot_lat,
      depot_lon,
      allowed_goods: ['A', 'B'],
      shift_start: 0,
      shift_end: 1e9,
      max_distance: 1e9,
      cost_class: 'standard',
    };
    set((s) => ({
      vehicles: [...s.vehicles, v],
      fleetScheduleRows: [
        ...s.fleetScheduleRows,
        {
          id: `truck-${vehicle_id}-${Date.now()}`,
          label: vehicle_id,
          kind: 'truck',
          blocks: [],
        },
      ],
    }));
  },
}));
