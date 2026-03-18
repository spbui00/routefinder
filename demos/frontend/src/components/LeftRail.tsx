import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { formatTw } from './OrderPropChip';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Package,
  Truck,
} from 'lucide-react';

type SortKey = 'order_id' | 'demand' | 'priority' | 'tw_start' | 'tw_end' | 'service_time' | 'goods_type';

export default function LeftRail() {
  const { orders, vehicles } = useStore();
  const [sortKey, setSortKey] = useState<SortKey>('order_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterGoods, setFilterGoods] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const goodsTypes = useMemo(
    () => ['all', ...new Set(orders.map((o) => o.goods_type))],
    [orders],
  );

  const sorted = useMemo(() => {
    let filtered = [...orders];
    if (filterGoods !== 'all') filtered = filtered.filter((o) => o.goods_type === filterGoods);
    if (filterPriority !== 'all') filtered = filtered.filter((o) => o.priority === parseInt(filterPriority));
    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null || bv == null) return 0;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [orders, sortKey, sortDir, filterGoods, filterPriority]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  function SortBtn({ col, label }: { col: SortKey; label: string }) {
    const active = sortKey === col;
    return (
      <Button
        variant="ghost"
        size="sm"
        className={`h-6 px-1.5 text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
        onClick={() => toggleSort(col)}
      >
        {label}
        {active ? (
          sortDir === 'asc' ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />
        ) : (
          <ArrowUpDown className="h-2.5 w-2.5 opacity-40" />
        )}
      </Button>
    );
  }

  return (
    <aside className="w-[310px] bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Orders</h2>
          <Badge variant="secondary" className="ml-auto">{orders.length}</Badge>
        </div>

        <div className="flex gap-1.5">
          <select
            value={filterGoods}
            onChange={(e) => setFilterGoods(e.target.value)}
            className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {goodsTypes.map((g) => (
              <option key={g} value={g}>{g === 'all' ? 'All types' : `Type ${g}`}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All priority</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-0.5">
          <SortBtn col="order_id" label="ID" />
          <SortBtn col="demand" label="Demand" />
          <SortBtn col="priority" label="Priority" />
          <SortBtn col="tw_start" label="TW Start" />
          <SortBtn col="tw_end" label="TW End" />
          <SortBtn col="service_time" label="Svc Time" />
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sorted.map((o) => {
            const expanded = expandedId === o.order_id;
            return (
              <div
                key={o.order_id}
                onClick={() => setExpandedId(expanded ? null : o.order_id)}
                className={`rounded-lg border p-2 cursor-pointer transition-colors ${
                  expanded
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card hover:bg-accent/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-foreground">{o.order_id}</span>
                  <Badge variant={o.goods_type === 'A' ? 'info' : 'warning'} className="text-[9px]">
                    {o.goods_type}
                  </Badge>
                  <Badge variant={o.priority === 1 ? 'default' : o.priority === 2 ? 'warning' : 'destructive'} className="text-[9px]">
                    P{o.priority}
                  </Badge>
                  <span className="ml-auto text-[10px] text-muted-foreground font-medium">
                    {o.demand.toFixed(1)} LDM
                  </span>
                </div>

                {expanded && (
                  <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <div><span className="text-muted-foreground">Location:</span> {o.lat.toFixed(2)}, {o.lon.toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Time window:</span> {formatTw(o.tw_start, o.tw_end)}</div>
                    <div><span className="text-muted-foreground">Service time:</span> {o.service_time.toFixed(2)}</div>
                    <div><span className="text-muted-foreground">Demand:</span> {o.demand.toFixed(1)}</div>
                    {o.must_follow && (
                      <div className="col-span-2"><span className="text-muted-foreground">Must follow:</span> {o.must_follow}</div>
                    )}
                    {o.must_precede && (
                      <div className="col-span-2"><span className="text-muted-foreground">Must precede:</span> {o.must_precede}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No orders loaded.
              <br />
              <span className="text-xs">Click "Generate Sample" to start.</span>
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="p-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Fleet</h2>
          <Badge variant="secondary" className="ml-auto">{vehicles.length}</Badge>
        </div>
        <ScrollArea className="max-h-28">
          <div className="space-y-1">
            {vehicles.map((v) => (
              <div key={v.vehicle_id} className="flex items-center justify-between rounded-md bg-card border border-border px-2.5 py-1.5 text-xs">
                <span className="font-mono font-medium truncate">{v.vehicle_id}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>Cap: {v.capacity}</span>
                  <span className="text-[10px]">{v.allowed_goods.join(',')}</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </aside>
  );
}
