import { cn } from '../lib/utils';

export function PropLabel({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-[10px]", className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{typeof value === 'number' && !Number.isFinite(value) ? '∞' : value}</span>
    </span>
  );
}

export function formatTw(start: number, end: number) {
  const s = Number.isFinite(start) ? start.toFixed(1) : '0';
  const e = Number.isFinite(end) ? end.toFixed(1) : '∞';
  return `[${s}, ${e}]`;
}
