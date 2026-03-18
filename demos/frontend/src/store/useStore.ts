import { create } from 'zustand';
import type {
  ConstraintViolation,
  JobStatus,
  Order,
  PlanResult,
  Vehicle,
} from '../types';

interface AppState {
  orders: Order[];
  vehicles: Vehicle[];
  scenarioId: string | null;

  currentPlan: PlanResult | null;
  selectedVehicle: string | null;

  jobId: string | null;
  jobStatus: JobStatus | null;
  jobProgress: number;

  alerts: string[];
  violations: ConstraintViolation[];

  setOrders: (orders: Order[]) => void;
  setVehicles: (vehicles: Vehicle[]) => void;
  setScenarioId: (id: string) => void;
  setCurrentPlan: (plan: PlanResult | null) => void;
  setSelectedVehicle: (id: string | null) => void;
  setJobId: (id: string | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setJobProgress: (progress: number) => void;
  addAlert: (msg: string) => void;
  clearAlerts: () => void;
  setViolations: (v: ConstraintViolation[]) => void;
}

export const useStore = create<AppState>((set) => ({
  orders: [],
  vehicles: [],
  scenarioId: null,
  currentPlan: null,
  selectedVehicle: null,
  jobId: null,
  jobStatus: null,
  jobProgress: 0,
  alerts: [],
  violations: [],

  setOrders: (orders) => set({ orders }),
  setVehicles: (vehicles) => set({ vehicles }),
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setCurrentPlan: (currentPlan) => set({ currentPlan }),
  setSelectedVehicle: (selectedVehicle) => set({ selectedVehicle }),
  setJobId: (jobId) => set({ jobId }),
  setJobStatus: (jobStatus) => set({ jobStatus }),
  setJobProgress: (jobProgress) => set({ jobProgress }),
  addAlert: (msg) => set((s) => ({ alerts: [...s.alerts, msg] })),
  clearAlerts: () => set({ alerts: [] }),
  setViolations: (violations) => set({ violations }),
}));
