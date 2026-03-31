import { create } from 'zustand';
import type {
  ConstraintViolation,
  JobStatus,
  Order,
  PlanResult,
  VariantPreset,
  Vehicle,
} from '../types';
import type { DispatcherBooking, DispatcherTrip, SolverEngine } from '../types/dispatcher';
import { mockBookings, mockTrips } from '../data/dispatcherMock';

export type DispatcherNavId =
  | 'trips'
  | 'fleet'
  | 'deliveries'
  | 'events'
  | 'estimator'
  | 'bookings_hub'
  | 'classic';

export type TripFilterTab = 'all' | 'drafts' | 'active' | 'delayed' | 'completed';
export type BookingFilterTab = 'all' | 'suggested';

interface AppState {
  orders: Order[];
  vehicles: Vehicle[];
  scenarioId: string | null;
  variant: VariantPreset;
  numOrders: number;

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

  setOrders: (orders: Order[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setScenarioId: (id: string) => void;
  setVariant: (v: VariantPreset) => void;
  setNumOrders: (n: number) => void;
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
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  vehicles: [],
  scenarioId: null,
  variant: 'all',
  numOrders: 12,
  currentPlan: null,
  selectedVehicle: null,
  jobId: null,
  jobStatus: null,
  jobProgress: 0,
  alerts: [],
  violations: [],

  activeNav: 'trips',
  solverEngine: 'routefinder',
  dispatcherTrips: mockTrips,
  dispatcherBookings: mockBookings,
  tripTab: 'drafts',
  bookingTab: 'suggested',
  expandedTripId: 't2',
  selectedBookingIds: new Set(['B-IBF-1', 'B-MULTI-2', 'B-VEJ-3']),
  reviewMode: true,
  dispatcherOptimizing: false,

  setOrders: (orders) => set({ orders }),
  setVehicles: (vehicles) => set({ vehicles }),
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setVariant: (variant) => set({ variant }),
  setNumOrders: (numOrders) => set({ numOrders }),
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
}));
