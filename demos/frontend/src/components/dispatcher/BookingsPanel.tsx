import { useStore } from '../../store/useStore';
import type { DispatcherBooking } from '../../types/dispatcher';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import { Sparkles, Inbox } from 'lucide-react';

function BookingRow({
  b,
  selected,
  onToggle,
  showSuggestedOnly,
}: {
  b: DispatcherBooking;
  selected: boolean;
  onToggle: () => void;
  showSuggestedOnly: boolean;
}) {
  const hidden = showSuggestedOnly && !b.preDraftAiRef;
  if (hidden) return null;

  return (
    <Card
      className={`p-3 cursor-pointer transition-colors ${
        selected ? 'border-primary ring-1 ring-primary/25 bg-primary/5' : 'hover:bg-muted/30'
      }`}
      onClick={onToggle}
    >
      <div className="flex gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 rounded border-input"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap items-start gap-2">
            <div className="text-xs font-semibold">
              {b.pickupCode} {b.pickupCity} → {b.deliveryCode} {b.deliveryCity}
            </div>
            {b.preDraftAiRef && (
              <Badge variant="info" className="text-[9px] shrink-0">
                Pre-drafted — {b.preDraftAiRef}
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
            <span>
              {b.shipper} · {b.pickupWindow}
            </span>
            <span>
              {b.consignee} · {b.deliveryWindow}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {b.pll} PLL · {formatDkk(b.kg)} kg · {formatDkk(b.ldm)} ldm
            </span>
            <span className="text-sm font-bold tabular-nums">{formatDkk(b.revenueDkk)} kr.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function BookingsPanel() {
  const {
    dispatcherBookings,
    bookingTab,
    setBookingTab,
    solverEngine,
    setSolverEngine,
    selectedBookingIds,
    toggleBookingSelect,
    reviewMode,
    resetDispatcherSelection,
    setDispatcherOptimizing,
  } = useStore();

  const showSuggestedOnly = bookingTab === 'suggested';

  return (
    <div className="flex flex-col w-[min(100%,380px)] shrink-0 bg-sidebar border-l border-sidebar-border">
      <div className="p-3 border-b border-sidebar-border space-y-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Bookings</h2>
        </div>
        <div className="flex gap-1">
          <Button
            variant={bookingTab === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setBookingTab('all')}
          >
            All
          </Button>
          <Button
            variant={bookingTab === 'suggested' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setBookingTab('suggested')}
          >
            Suggested
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
            Solver
          </label>
          <select
            value={solverEngine}
            onChange={(e) => setSolverEngine(e.target.value as 'routefinder' | 'ortools')}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="routefinder">AI (RouteFinder)</option>
            <option value="ortools">OR-Tools</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1 h-8 text-[11px]" disabled>
            Release
          </Button>
          <Button
            size="sm"
            className="flex-1 h-8 text-[11px]"
            onClick={() => {
              setDispatcherOptimizing(true);
              window.setTimeout(() => setDispatcherOptimizing(false), 2000);
            }}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Optimise trip
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {dispatcherBookings.map((b) => (
            <BookingRow
              key={b.id}
              b={b}
              selected={selectedBookingIds.has(b.id)}
              onToggle={() => toggleBookingSelect(b.id)}
              showSuggestedOnly={showSuggestedOnly}
            />
          ))}
        </div>
      </ScrollArea>

      {reviewMode && (
        <div className="p-3 border-t border-sidebar-border bg-card flex gap-2 shrink-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              resetDispatcherSelection();
            }}
          >
            Reject
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              resetDispatcherSelection();
            }}
          >
            Accept
          </Button>
        </div>
      )}
    </div>
  );
}
