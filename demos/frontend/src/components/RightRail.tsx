import { useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { RouteResult } from '../types';

function RouteCard({
  route,
  isSelected,
  onSelect,
  onToggleLock,
}: {
  route: RouteResult;
  isSelected: boolean;
  onSelect: () => void;
  onToggleLock: (idx: number) => void;
}) {
  const hasLocked = route.lock_flags.some(Boolean);

  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
        isSelected
          ? 'border-blue-500 bg-slate-700'
          : 'border-slate-700 bg-slate-800 hover:bg-slate-750'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm truncate">
          {route.vehicle_id}
        </span>
        {hasLocked && (
          <span className="text-[10px] px-1.5 py-0.5 bg-amber-900 text-amber-300 rounded">
            LOCKED
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300 mb-2">
        <div>
          <span className="text-slate-500">Distance:</span>{' '}
          {route.metrics.total_distance.toFixed(3)}
        </div>
        <div>
          <span className="text-slate-500">Load:</span>{' '}
          {route.metrics.total_load.toFixed(1)}
        </div>
        <div>
          <span className="text-slate-500">Stops:</span>{' '}
          {route.metrics.num_stops}
        </div>
        <div>
          <span className="text-slate-500">ETA:</span>{' '}
          {route.metrics.estimated_time.toFixed(0)}m
        </div>
      </div>

      {isSelected && (
        <div className="mt-2 border-t border-slate-600 pt-2">
          <div className="text-xs text-slate-400 mb-1">Route sequence:</div>
          <div className="flex flex-wrap gap-1">
            {route.sequence.map((stop, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(i);
                }}
                title={
                  route.lock_flags[i]
                    ? 'Click to unlock'
                    : 'Click to lock'
                }
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  route.lock_flags[i]
                    ? 'bg-amber-800 text-amber-200 border border-amber-600'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                {stop}
                {route.lock_flags[i] && ' 🔒'}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RightRail() {
  const { currentPlan, selectedVehicle, setSelectedVehicle, setCurrentPlan } =
    useStore();

  const handleToggleLock = useCallback(
    (vehicleId: string, stopIdx: number) => {
      if (!currentPlan) return;
      const updated = {
        ...currentPlan,
        routes: currentPlan.routes.map((r) => {
          if (r.vehicle_id !== vehicleId) return r;
          const newFlags = [...r.lock_flags];
          newFlags[stopIdx] = !newFlags[stopIdx];
          return { ...r, lock_flags: newFlags };
        }),
      };
      setCurrentPlan(updated);
    },
    [currentPlan, setCurrentPlan],
  );

  const handleUnlockAll = useCallback(() => {
    if (!currentPlan) return;
    const updated = {
      ...currentPlan,
      routes: currentPlan.routes.map((r) => ({
        ...r,
        lock_flags: r.lock_flags.map(() => false),
      })),
    };
    setCurrentPlan(updated);
  }, [currentPlan, setCurrentPlan]);

  return (
    <div className="w-80 bg-slate-800 text-slate-200 flex flex-col border-l border-slate-700 overflow-hidden">
      <div className="p-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-sm">Vehicle Routes</h2>
        {currentPlan && (
          <button
            onClick={handleUnlockAll}
            className="text-[10px] px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded"
          >
            Unlock All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {currentPlan?.routes.map((route) => (
          <RouteCard
            key={route.vehicle_id}
            route={route}
            isSelected={selectedVehicle === route.vehicle_id}
            onSelect={() =>
              setSelectedVehicle(
                selectedVehicle === route.vehicle_id
                  ? null
                  : route.vehicle_id,
              )
            }
            onToggleLock={(idx) => handleToggleLock(route.vehicle_id, idx)}
          />
        ))}

        {!currentPlan && (
          <div className="text-center text-slate-500 text-sm py-8">
            No plan generated yet.
            <br />
            Click "Optimize" to create routes.
          </div>
        )}
      </div>

      {currentPlan && (
        <div className="p-3 border-t border-slate-700 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Total cost:</span>
            <span className="font-semibold">
              {currentPlan.objective_value.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Vehicles used:</span>
            <span>{currentPlan.routes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Status:</span>
            <span
              className={
                currentPlan.status === 'published'
                  ? 'text-green-400'
                  : 'text-blue-400'
              }
            >
              {currentPlan.status}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
