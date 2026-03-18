import { useStore } from '../store/useStore';

export default function BottomStrip() {
  const { jobStatus, jobProgress, alerts, violations, clearAlerts } =
    useStore();

  return (
    <div className="bg-slate-900 text-slate-300 border-t border-slate-700 px-4 py-2 flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2 min-w-[180px]">
        <span className="text-slate-500">Status:</span>
        {jobStatus ? (
          <span
            className={`font-semibold ${
              jobStatus === 'completed'
                ? 'text-green-400'
                : jobStatus === 'running'
                  ? 'text-blue-400'
                  : jobStatus === 'failed'
                    ? 'text-red-400'
                    : 'text-slate-400'
            }`}
          >
            {jobStatus}
            {jobStatus === 'running' &&
              ` (${(jobProgress * 100).toFixed(0)}%)`}
          </span>
        ) : (
          <span className="text-slate-500">idle</span>
        )}
      </div>

      {violations.length > 0 && (
        <div className="flex items-center gap-1">
          <span className="text-red-400 font-semibold">
            {violations.filter((v) => v.severity === 'hard').length} hard
          </span>
          <span className="text-amber-400">
            {violations.filter((v) => v.severity === 'soft').length} soft
          </span>
          <span className="text-slate-500">violations</span>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 truncate">
              {alerts[alerts.length - 1]}
            </span>
            {alerts.length > 1 && (
              <span className="text-slate-600">
                (+{alerts.length - 1} more)
              </span>
            )}
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <button
          onClick={clearAlerts}
          className="text-slate-500 hover:text-slate-300 text-[10px]"
        >
          Clear
        </button>
      )}

      {violations.length > 0 && (
        <div className="border-l border-slate-700 pl-3 max-w-xs">
          <div className="text-[10px] text-slate-500 mb-0.5">
            Constraint issues:
          </div>
          {violations.slice(0, 2).map((v, i) => (
            <div
              key={i}
              className={`text-[10px] ${
                v.severity === 'hard' ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              [{v.type}] {v.entity}: {v.details}
            </div>
          ))}
          {violations.length > 2 && (
            <div className="text-[10px] text-slate-600">
              +{violations.length - 2} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
