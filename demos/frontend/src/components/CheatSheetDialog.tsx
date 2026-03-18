import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { BookOpen, X } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  VARIANT_TABLE,
  FEATURE_LEGEND,
  WORKFLOW_STEPS,
  ROUTE_LEGEND,
} from '../data/cheatSheet';

const featureColorMap = Object.fromEntries(
  FEATURE_LEGEND.map((f) => [f.key, f.color]),
);

function FeatureChip({ code }: { code: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
        featureColorMap[code] ?? 'bg-muted text-muted-foreground',
      )}
    >
      {code}
    </span>
  );
}

const complexityStyle = {
  Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  High: 'bg-red-50 text-red-700 border-red-200',
} as const;

export default function CheatSheetDialog() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => dialogRef.current?.focus());
    }
  }, [open]);

  const variantRows = useMemo(() => VARIANT_TABLE, []);
  const workflowSteps = useMemo(() => WORKFLOW_STEPS, []);
  const routeLegend = useMemo(() => ROUTE_LEGEND, []);
  const featureLegend = useMemo(() => FEATURE_LEGEND, []);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <BookOpen className="h-3.5 w-3.5" />
        Cheat Sheet
      </Button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            role="presentation"
          >
            {/* backdrop */}
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
              onClick={close}
              aria-hidden="true"
            />

            {/* dialog */}
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Cheat Sheet"
              tabIndex={-1}
              className="relative z-10 w-[95vw] max-w-2xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-2xl outline-none"
            >
              {/* header */}
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Dispatcher Workspace — Cheat Sheet
                  </h2>
                </div>
                <button
                  onClick={close}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* body */}
              <ScrollArea className="flex-1 min-h-0 px-5 py-4">
                <div className="space-y-6 pb-2">
                  {/* Quick Start */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Quick Start
                    </h3>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      This workspace lets you generate VRP scenarios using RouteFinder's
                      neural solver, inspect orders and routes on the map, lock specific
                      stops, re-optimize around locked segments, and publish final dispatch
                      plans.
                    </p>
                  </section>

                  {/* Workflow */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Workflow
                    </h3>
                    <ol className="space-y-1.5">
                      {workflowSteps.map((s) => (
                        <li key={s.step} className="flex gap-2.5 text-sm">
                          <span className="flex-none w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                            {s.step}
                          </span>
                          <span>
                            <strong className="text-foreground">{s.action}</strong>
                            <span className="text-foreground/60"> — {s.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Feature Legend */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Feature Codes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {featureLegend.map((f) => (
                        <span key={f.key} className="inline-flex items-center gap-1.5 text-xs text-foreground/70">
                          <FeatureChip code={f.key} />
                          {f.label}
                        </span>
                      ))}
                    </div>
                  </section>

                  {/* Variants Table */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Variant Presets
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="sticky top-0 bg-muted/50 text-left px-3 py-2 font-semibold text-foreground">Variant</th>
                            <th className="sticky top-0 bg-muted/50 text-left px-3 py-2 font-semibold text-foreground">Features</th>
                            <th className="sticky top-0 bg-muted/50 text-left px-3 py-2 font-semibold text-foreground">Complexity</th>
                            <th className="sticky top-0 bg-muted/50 text-left px-3 py-2 font-semibold text-foreground">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {variantRows.map((v, i) => (
                            <tr
                              key={v.key}
                              className={cn(
                                'border-t border-border',
                                i % 2 === 0 ? 'bg-card' : 'bg-muted/20',
                              )}
                            >
                              <td className="px-3 py-1.5 font-mono font-semibold text-foreground whitespace-nowrap">
                                {v.label}
                              </td>
                              <td className="px-3 py-1.5">
                                <div className="flex gap-1 flex-wrap">
                                  {v.features.map((f) => (
                                    <FeatureChip key={f} code={f} />
                                  ))}
                                </div>
                              </td>
                              <td className="px-3 py-1.5">
                                <Badge
                                  className={cn(
                                    'text-[9px]',
                                    complexityStyle[v.complexity],
                                  )}
                                >
                                  {v.complexity}
                                </Badge>
                              </td>
                              <td className="px-3 py-1.5 text-foreground/70">
                                {v.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Semantics are defined by the RouteFinder backend preset configuration.
                      All variants include capacity (C) by default.
                    </p>
                  </section>

                  {/* Route Legend */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Route Semantics
                    </h3>
                    <div className="space-y-1.5">
                      {routeLegend.map((r) => (
                        <div key={r.label} className="flex items-center gap-2 text-sm">
                          <span className={cn('w-3 h-3 rounded-sm flex-none', r.color)} />
                          <span className="text-foreground/80">{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Notes */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Notes &amp; Limitations
                    </h3>
                    <ul className="space-y-1 text-sm text-foreground/70 list-disc list-inside">
                      <li>Coordinates are normalized [0,1] internally; map locations are approximate.</li>
                      <li>Distance metric is Euclidean on normalized coordinates.</li>
                      <li>In-memory storage — data is lost on server restart.</li>
                      <li>Greedy nearest-neighbor policy is used when no trained checkpoint is available.</li>
                    </ul>
                  </section>
                </div>
              </ScrollArea>

              {/* footer */}
              <div className="border-t border-border px-5 py-3 flex justify-end">
                <Button size="sm" onClick={close}>
                  Got it
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
