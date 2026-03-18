import type { VariantPreset } from '../types';

export interface VariantInfo {
  key: VariantPreset;
  label: string;
  features: string[];
  complexity: 'Low' | 'Medium' | 'High';
  description: string;
}

export const VARIANT_TABLE: VariantInfo[] = [
  { key: 'cvrp',      label: 'CVRP',      features: ['C'],                complexity: 'Low',    description: 'Capacitated VRP — baseline with vehicle capacity only' },
  { key: 'ovrp',      label: 'OVRP',      features: ['O'],                complexity: 'Low',    description: 'Open routes — vehicles do not return to depot' },
  { key: 'vrptw',     label: 'VRPTW',     features: ['TW'],               complexity: 'Medium', description: 'Time windows on each customer' },
  { key: 'vrpb',      label: 'VRPB',      features: ['B'],                complexity: 'Medium', description: 'Backhaul — some customers require pickup instead of delivery' },
  { key: 'vrpl',      label: 'VRPL',      features: ['L'],                complexity: 'Medium', description: 'Distance limit — maximum route length constraint' },
  { key: 'ovrptw',    label: 'OVRPTW',    features: ['O', 'TW'],          complexity: 'Medium', description: 'Open routes with time windows' },
  { key: 'ovrpb',     label: 'OVRPB',     features: ['O', 'B'],           complexity: 'Medium', description: 'Open routes with backhaul customers' },
  { key: 'ovrpl',     label: 'OVRPL',     features: ['O', 'L'],           complexity: 'Medium', description: 'Open routes with distance limit' },
  { key: 'vrpbtw',    label: 'VRPBTW',    features: ['B', 'TW'],          complexity: 'Medium', description: 'Backhaul with time windows' },
  { key: 'vrpbl',     label: 'VRPBL',     features: ['B', 'L'],           complexity: 'Medium', description: 'Backhaul with distance limit' },
  { key: 'vrpltw',    label: 'VRPLTW',    features: ['L', 'TW'],          complexity: 'Medium', description: 'Distance limit with time windows' },
  { key: 'ovrpbtw',   label: 'OVRPBTW',   features: ['O', 'B', 'TW'],     complexity: 'High',   description: 'Open + backhaul + time windows' },
  { key: 'ovrpbl',    label: 'OVRPBL',    features: ['O', 'B', 'L'],      complexity: 'High',   description: 'Open + backhaul + distance limit' },
  { key: 'ovrpltw',   label: 'OVRPLTW',   features: ['O', 'L', 'TW'],     complexity: 'High',   description: 'Open + distance limit + time windows' },
  { key: 'vrpbltw',   label: 'VRPBLTW',   features: ['B', 'L', 'TW'],     complexity: 'High',   description: 'Backhaul + distance limit + time windows' },
  { key: 'ovrpbltw',  label: 'OVRPBLTW',  features: ['O', 'B', 'L', 'TW'], complexity: 'High',  description: 'All constraints combined' },
  { key: 'all',       label: 'ALL',       features: ['*'],                complexity: 'High',   description: 'Mixed-batch — randomly samples from all variant families' },
];

export const FEATURE_LEGEND: { key: string; label: string; color: string }[] = [
  { key: 'C', label: 'Capacity',       color: 'bg-slate-100 text-slate-700' },
  { key: 'O', label: 'Open route',     color: 'bg-violet-50 text-violet-700' },
  { key: 'TW', label: 'Time windows', color: 'bg-sky-50 text-sky-700' },
  { key: 'B', label: 'Backhaul',       color: 'bg-amber-50 text-amber-700' },
  { key: 'L', label: 'Distance limit', color: 'bg-emerald-50 text-emerald-700' },
  { key: '*', label: 'Mixed / all',    color: 'bg-primary/10 text-primary' },
];

export const WORKFLOW_STEPS = [
  { step: 1, action: 'Select variant', detail: 'Pick a problem type from the dropdown (e.g. VRPTW, OVRP)' },
  { step: 2, action: 'Generate or upload', detail: 'Click Generate to create a sample, or Upload JSON for your own data' },
  { step: 3, action: 'Optimize', detail: 'Run the RL solver — routes appear on the map and right panel' },
  { step: 4, action: 'Lock segments', detail: 'Toggle locks on stops you want to keep fixed' },
  { step: 5, action: 'Re-optimize', detail: 'Solver respects locked prefixes and re-routes the rest' },
  { step: 6, action: 'Publish', detail: 'Snapshot the plan for dispatch' },
];

export const ROUTE_LEGEND = [
  { color: 'bg-blue-500', label: 'AI-generated route segment' },
  { color: 'bg-amber-500', label: 'Locked / fixed segment' },
  { color: 'bg-slate-300', label: 'Unassigned order (no route)' },
];
