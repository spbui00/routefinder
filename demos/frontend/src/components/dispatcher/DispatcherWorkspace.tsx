import { useStore } from '../../store/useStore';
import DispatcherNav from './DispatcherNav';
import TripsPanel from './TripsPanel';
import BookingsPanel from './BookingsPanel';
import FleetPlanningView from './FleetPlanningView';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-muted/20 text-muted-foreground text-sm p-8">
      {title} view — connect workflows in a later iteration.
    </div>
  );
}

export default function DispatcherWorkspace() {
  const { activeNav, dispatcherOptimizing, solverEngine } = useStore();

  if (activeNav === 'fleet') {
    return (
      <>
        <DispatcherNav />
        <FleetPlanningView />
      </>
    );
  }

  if (activeNav === 'trips') {
    return (
      <>
        <DispatcherNav />
        <div className="flex-1 flex min-w-0 min-h-0 relative">
          {dispatcherOptimizing && (
            <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-amber-950 text-xs font-medium">
              <span className="animate-pulse">Optimizing…</span>
              <span className="text-muted-foreground">
                ({solverEngine === 'routefinder' ? 'RouteFinder' : 'OR-Tools'})
              </span>
            </div>
          )}
          <div
            className={`flex-1 flex min-w-0 min-h-0 ${dispatcherOptimizing ? 'pt-10' : ''}`}
          >
            <TripsPanel />
            <BookingsPanel />
          </div>
        </div>
      </>
    );
  }

  const titles: Record<string, string> = {
    deliveries: 'Deliveries',
    events: 'Event Log',
    estimator: 'Estimator',
    bookings_hub: 'Bookings hub',
  };

  return (
    <>
      <DispatcherNav />
      <Placeholder title={titles[activeNav] ?? 'Section'} />
    </>
  );
}
