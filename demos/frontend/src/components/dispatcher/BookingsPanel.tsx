import { useStore } from '../../store/useStore';
import type { DispatcherBooking } from '../../types/dispatcher';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { formatDkk } from './formatters';
import { Inbox } from 'lucide-react';

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
    selectedBookingIds,
    toggleBookingSelect,
    reviewMode,
    resetDispatcherSelection,
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
