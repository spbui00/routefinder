import type { Order, PlanResult, Vehicle } from '../types';
import type {
  AiToastSuggestion,
  DispatcherBooking,
  DispatcherTrip,
  FleetScheduleRow,
  FleetSummary,
  GanttBlock,
  TripStopRow,
} from '../types/dispatcher';

type RouteLeg = {
  pickupCode: string;
  pickupCity: string;
  pickupLat: number;
  pickupLng: number;
  deliveryCode: string;
  deliveryCity: string;
  deliveryLat: number;
  deliveryLng: number;
};

const ROUTE_POOL: RouteLeg[] = [
  {
    pickupCode: 'DK-8200',
    pickupCity: 'Aarhus',
    pickupLat: 56.1629,
    pickupLng: 10.2039,
    deliveryCode: 'DE-10115',
    deliveryCity: 'Berlin',
    deliveryLat: 52.52,
    deliveryLng: 13.405,
  },
  {
    pickupCode: 'DK-8200',
    pickupCity: 'Aarhus',
    pickupLat: 56.1629,
    pickupLng: 10.2039,
    deliveryCode: 'DE-28195',
    deliveryCity: 'Bremen',
    deliveryLat: 53.0793,
    deliveryLng: 8.8017,
  },
  {
    pickupCode: 'DK-7100',
    pickupCity: 'Vejle',
    pickupLat: 55.7093,
    pickupLng: 9.5357,
    deliveryCode: 'DE-50667',
    deliveryCity: 'Köln',
    deliveryLat: 50.9375,
    deliveryLng: 6.9603,
  },
  {
    pickupCode: 'NL-3511',
    pickupCity: 'Utrecht',
    pickupLat: 52.0907,
    pickupLng: 5.1214,
    deliveryCode: 'DK-9900',
    deliveryCity: 'Frederikshavn',
    deliveryLat: 57.4407,
    deliveryLng: 10.5366,
  },
  {
    pickupCode: 'DK-5000',
    pickupCity: 'Odense',
    pickupLat: 55.4038,
    pickupLng: 10.4024,
    deliveryCode: 'NL-3011',
    deliveryCity: 'Rotterdam',
    deliveryLat: 51.9244,
    deliveryLng: 4.4777,
  },
  {
    pickupCode: 'DK-8000',
    pickupCity: 'Aalborg',
    pickupLat: 57.0488,
    pickupLng: 9.9217,
    deliveryCode: 'SE-41103',
    deliveryCity: 'Göteborg',
    deliveryLat: 57.7089,
    deliveryLng: 11.9746,
  },
  {
    pickupCode: 'DK-1058',
    pickupCity: 'Copenhagen',
    pickupLat: 55.6761,
    pickupLng: 12.5683,
    deliveryCode: 'DE-20095',
    deliveryCity: 'Hamburg',
    deliveryLat: 53.5511,
    deliveryLng: 9.9937,
  },
];

const SHIPPERS = ['IBF', 'BD-TRÆLAST', 'SILVAN', 'FreightCo', 'Nordic Wood', 'Scan Timber'];
const CONSIGNEES = ['EG TRÆLAST', 'Nordic Log', 'Baumarkt GmbH', 'Port NL', 'Bygma', 'STARK'];

function rnd<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

export function generatePdptwBookings(n: number): DispatcherBooking[] {
  const count = Math.max(1, Math.min(100, Math.floor(n)));
  const out: DispatcherBooking[] = [];
  for (let i = 0; i < count; i++) {
    const leg = ROUTE_POOL[i % ROUTE_POOL.length];
    const pll = 1 + ((i * 3) % 8);
    const kg = Math.round(200 + ((i * 137) % 8000) + pll * 200);
    const ldm = Math.round((0.4 + ((i * 0.31) % 12)) * 10) / 10;
    const revenueDkk = Math.round(2500 + ((i * 941) % 12000));
    out.push({
      id: `B-PDPTW-${Date.now().toString(36)}-${i}`,
      pickupCode: leg.pickupCode,
      pickupCity: leg.pickupCity,
      deliveryCode: leg.deliveryCode,
      deliveryCity: leg.deliveryCity,
      shipper: rnd(SHIPPERS, i),
      consignee: rnd(CONSIGNEES, i + 2),
      pickupWindow: '08:00 - 18:00',
      deliveryWindow: '07:00 - 18:00',
      pll,
      kg,
      ldm,
      revenueDkk,
      pickupLat: leg.pickupLat + (i % 5) * 0.004,
      pickupLng: leg.pickupLng + (i % 3) * 0.004,
      deliveryLat: leg.deliveryLat + (i % 4) * 0.004,
      deliveryLng: leg.deliveryLng + (i % 6) * 0.004,
    });
  }
  return out;
}

function bookingOrOrderFromSequenceLabel(
  label: string,
  bookings: DispatcherBooking[],
  orders: Order[],
): { booking: DispatcherBooking | null; order: Order | null } {
  const m = label.match(/^[PD]:(.+)$/);
  const prefix = m ? m[1].trim() : '';
  if (!prefix) return { booking: null, order: null };
  const booking =
    bookings.find((b) => b.id.startsWith(prefix)) ??
    bookings.find((b) => b.id.slice(0, 8) === prefix) ??
    null;
  if (booking) return { booking, order: null };
  const order =
    orders.find((o) => o.order_id.startsWith(prefix)) ??
    orders.find((o) => o.order_id.slice(0, 8) === prefix) ??
    null;
  return { booking: null, order };
}

export function tripsFromOptimizationPlan(
  plan: PlanResult,
  orders: Order[],
  bookings: DispatcherBooking[],
): DispatcherTrip[] {
  const engine = plan.solver_engine ?? 'routefinder';
  const post = plan.postprocess as
    | { projected_margin_dkk?: number; draft_trip_id?: string }
    | undefined;
  const marginShare =
    post?.projected_margin_dkk != null && plan.routes.length > 0
      ? Math.round(post.projected_margin_dkk / plan.routes.length)
      : 0;

  const trips: DispatcherTrip[] = [];
  for (const route of plan.routes) {
    const labels = route.sequence_labels ?? [];
    const stops: TripStopRow[] = [];

    if (labels.length === 0 && route.sequence.length > 0) {
      for (let i = 0; i < route.sequence.length; i++) {
        const node = route.sequence[i];
        stops.push({
          bookingId: `n${node}`,
          label: `Stop ${node}`,
          company: '—',
          bookingLeg: '—',
          dateLabel: '—',
          kg: 0,
          ldm: 0,
          economyDkk: 0,
          isPickup: false,
        });
      }
    } else {
      for (const lab of labels) {
        const { booking: b, order: o } = bookingOrOrderFromSequenceLabel(
          lab,
          bookings,
          orders,
        );
        const isPickup = lab.startsWith('P:');
        const kgRow = b?.kg ?? o?.weight_kg ?? 0;
        const ldmRow = b?.ldm ?? o?.ldm ?? 0;
        const revRow = b?.revenueDkk ?? o?.revenue_dkk ?? 0;
        stops.push({
          bookingId: b?.id ?? o?.order_id ?? lab,
          label: lab,
          company: b ? (isPickup ? b.shipper : b.consignee) : '—',
          dateLabel: '—',
          kg: kgRow,
          ldm: ldmRow,
          economyDkk: revRow,
          isPickup,
        });
      }
    }

    let kgSum = stops.reduce((s, x) => s + x.kg, 0);
    const ldmSum = stops.reduce((s, x) => s + x.ldm, 0);
    if (kgSum <= 0 && route.metrics?.total_load) {
      kgSum = Math.round(route.metrics.total_load);
    }

    const firstLab = labels[0] ?? '';
    const lastLab = labels[labels.length - 1] ?? '';
    const first = bookingOrOrderFromSequenceLabel(firstLab, bookings, orders);
    const last = bookingOrOrderFromSequenceLabel(lastLab, bookings, orders);
    const originCity =
      first.booking?.pickupCity ?? (first.order ? 'Pickup' : route.vehicle_id);
    const destCity =
      last.booking?.deliveryCity ?? (last.order ? 'Delivery' : '—');

    trips.push({
      id: `${plan.plan_id}-${route.vehicle_id}`,
      displayId: route.vehicle_id,
      originCity,
      destCity,
      dateLabel: new Date(plan.created_at || Date.now()).toLocaleDateString(),
      status: 'draft',
      aiRef: post?.draft_trip_id,
      solverEngine: engine,
      kgTotal: kgSum,
      ldmTotal: Math.round(ldmSum * 10) / 10,
      marginDkk: marginShare,
      initials: route.vehicle_id.replace(/[^A-Z0-9]/gi, '').slice(0, 3) || 'RT',
      stops: stops.length > 0 ? stops : undefined,
    });
  }
  return trips;
}

export function bookingsToOrders(bookings: DispatcherBooking[]): Order[] {
  return bookings.map((b) => ({
    order_id: b.id,
    lat: b.pickupLat,
    lon: b.pickupLng,
    delivery_lat: b.deliveryLat,
    delivery_lon: b.deliveryLng,
    demand: b.ldm,
    weight_kg: b.kg,
    ldm: b.ldm,
    pll: b.pll,
    revenue_dkk: b.revenueDkk,
    tw_start: 0,
    tw_end: 1e9,
    service_time: 0.02,
    priority: 1,
    goods_type: 'A',
  }));
}

export const mockFleetSummary: FleetSummary = {
  trucksFree: '5 of 12',
  trailersFree: '9 of 18',
  driversFree: '5 of 10',
  atRisk: 2,
  delayedTrips: 2,
};

export const mockGanttBlocks: GanttBlock[] = [
  { id: 'g1', assetId: 'Truck 17', assetType: 'truck', startPct: 8, widthPct: 28, label: 'Aarhus → Roskilde', variant: 'route' },
  { id: 'g2', assetId: 'Truck 17', assetType: 'truck', startPct: 36, widthPct: 12, label: 'Empty 18 km', variant: 'empty', sublabel: '18 km' },
  { id: 'g3', assetId: 'Truck 35', assetType: 'truck', startPct: 10, widthPct: 40, label: 'At Risk', variant: 'risk', sublabel: 'Delay: Est +45m' },
  { id: 'g4', assetId: 'Trailer 18', assetType: 'trailer', startPct: 15, widthPct: 35, label: 'In Use — Truck 06', variant: 'route' },
  { id: 'g5', assetId: 'Lars R.', assetType: 'driver', startPct: 12, widthPct: 25, label: 'Mandatory rest', variant: 'rest' },
  { id: 'g6', assetId: 'Anna M.', assetType: 'driver', startPct: 8, widthPct: 32, label: 'Shift 06–14', variant: 'shift' },
];

export function buildDemoFleetSchedule(): FleetScheduleRow[] {
  const trucks = ['Truck 17', 'Truck 35'];
  const trailers = ['Trailer 18'];
  const drivers = ['Lars R.', 'Anna M.'];
  return [
    ...trucks.map((label) => ({
      id: `row-truck-${label.replace(/\s/g, '-')}`,
      label,
      kind: 'truck' as const,
      blocks: mockGanttBlocks.filter((b) => b.assetId === label),
    })),
    ...trailers.map((label) => ({
      id: `row-trailer-${label.replace(/\s/g, '-')}`,
      label,
      kind: 'trailer' as const,
      blocks: mockGanttBlocks.filter((b) => b.assetId === label),
    })),
    ...drivers.map((label) => ({
      id: `row-driver-${label.replace(/\s/g, '-')}`,
      label,
      kind: 'driver' as const,
      blocks: mockGanttBlocks.filter((b) => b.assetId === label),
    })),
  ];
}

export function demoFleetVehicles(): Vehicle[] {
  return [
    {
      vehicle_id: 'TRK-17',
      capacity: 40,
      depot_lat: 56.1629,
      depot_lon: 10.2039,
      allowed_goods: ['A', 'B'],
      shift_start: 0,
      shift_end: 1e9,
      max_distance: 1e9,
      cost_class: 'standard',
    },
    {
      vehicle_id: 'TRK-35',
      capacity: 40,
      depot_lat: 55.6761,
      depot_lon: 12.5683,
      allowed_goods: ['A', 'B'],
      shift_start: 0,
      shift_end: 1e9,
      max_distance: 1e9,
      cost_class: 'standard',
    },
    {
      vehicle_id: 'TRK-DEMO-03',
      capacity: 24,
      depot_lat: 55.4038,
      depot_lon: 10.4024,
      allowed_goods: ['A', 'B'],
      shift_start: 0,
      shift_end: 1e9,
      max_distance: 1e9,
      cost_class: 'standard',
    },
  ];
}

export const mockTrips: DispatcherTrip[] = [];

export function tripTabCountsFromTrips(trips: DispatcherTrip[]) {
  const counts = { all: trips.length, draft: 0, active: 0, delayed: 0, completed: 0 };
  for (const t of trips) {
    if (t.status === 'draft') counts.draft += 1;
    else if (t.status === 'active') counts.active += 1;
    else if (t.status === 'delayed') counts.delayed += 1;
    else if (t.status === 'completed') counts.completed += 1;
  }
  return counts;
}

export const mockAiToast: AiToastSuggestion = {
  id: 'toast-1',
  message: 'Assign Truck 42 to Aarhus → Roskilde after service window.',
  gainDkk: 4800,
};
