import { useStore } from '../store/useStore';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
  X,
} from 'lucide-react';

export default function BottomStrip() {
  const { jobStatus, jobProgress, alerts, violations, clearAlerts } = useStore();

  const hardCount = violations.filter((v) => v.severity === 'hard').length;
  const softCount = violations.filter((v) => v.severity === 'soft').length;

  return (
    <footer className="bg-card border-t border-border px-4 py-1.5 flex items-center gap-3 text-xs min-h-[36px]">
      <div className="flex items-center gap-1.5 min-w-[140px]">
        {!jobStatus && <span className="text-muted-foreground">Idle</span>}
        {jobStatus === 'pending' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Pending…</span>
          </>
        )}
        {jobStatus === 'running' && (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-primary font-medium">Running {(jobProgress * 100).toFixed(0)}%</span>
          </>
        )}
        {jobStatus === 'completed' && (
          <>
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            <span className="text-emerald-600 font-medium">Completed</span>
          </>
        )}
        {jobStatus === 'failed' && (
          <>
            <XCircle className="h-3 w-3 text-destructive" />
            <span className="text-destructive font-medium">Failed</span>
          </>
        )}
      </div>

      {violations.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            {hardCount > 0 && <Badge variant="destructive">{hardCount} hard</Badge>}
            {softCount > 0 && <Badge variant="warning">{softCount} soft</Badge>}
          </div>
        </>
      )}

      <div className="flex-1 overflow-hidden">
        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground truncate">{alerts[alerts.length - 1]}</span>
            {alerts.length > 1 && (
              <span className="text-muted-foreground/50 text-[10px]">(+{alerts.length - 1})</span>
            )}
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={clearAlerts}>
          <X className="h-3 w-3" />
        </Button>
      )}

      {violations.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <div className="max-w-xs space-y-0.5">
            {violations.slice(0, 2).map((v, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px]">
                <AlertTriangle className={`h-2.5 w-2.5 shrink-0 ${
                  v.severity === 'hard' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <span className="truncate">
                  <span className="font-medium">[{v.type}]</span> {v.entity}: {v.details}
                </span>
              </div>
            ))}
            {violations.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{violations.length - 2} more</span>
            )}
          </div>
        </>
      )}
    </footer>
  );
}
