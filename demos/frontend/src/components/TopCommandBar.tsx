import { useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Upload } from 'lucide-react';
import CheatSheetDialog from './CheatSheetDialog';

export default function TopCommandBar() {
  const { setOrders, setVehicles, setCurrentPlan, addAlert } = useStore();

  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.orders) {
            const mappedOrders = data.orders.map((o: Record<string, unknown>) => ({
              order_id: o.id ?? o.order_id,
              lat: (o.receiver as Record<string, unknown>)?.lat ?? o.lat ?? 0,
              lon: (o.receiver as Record<string, unknown>)?.lon ?? o.lon ?? 0,
              demand: (o.demand as Record<string, unknown>)?.ldm ?? o.demand ?? 0,
              tw_start: (o.time_window as number[])?.[0] ?? o.tw_start ?? 0,
              tw_end: (o.time_window as number[])?.[1] ?? o.tw_end ?? Infinity,
              service_time: o.service_time ?? 0,
              priority: o.priority ?? 1,
              goods_type: (o.demand as Record<string, unknown>)?.goods_type ?? o.goods_type ?? 'A',
              must_follow: o.must_follow ?? undefined,
              must_precede: o.must_precede ?? undefined,
              delivery_lat: o.delivery_lat as number | undefined,
              delivery_lon: o.delivery_lon as number | undefined,
              weight_kg: o.weight_kg as number | undefined,
              ldm: o.ldm as number | undefined,
              pll: o.pll as number | undefined,
              revenue_dkk: o.revenue_dkk as number | undefined,
            }));
            setOrders(mappedOrders);
          }
          if (data.fleet || data.vehicles) {
            const fleet = data.fleet ?? data.vehicles;
            const mappedVehicles = fleet.map((v: Record<string, unknown>) => ({
              vehicle_id: v.vehicle_id,
              capacity: v.capacity_ldm ?? v.capacity ?? 30,
              depot_lat: v.depot_lat ?? 55.49,
              depot_lon: v.depot_lon ?? 9.47,
              allowed_goods: v.allowed_goods ?? ['A', 'B'],
              shift_start: v.shift_start ?? 0,
              shift_end: v.shift_end ?? Infinity,
              max_distance: v.max_distance ?? Infinity,
              cost_class: v.cost_class ?? 'standard',
            }));
            setVehicles(mappedVehicles);
          }
          setCurrentPlan(null);
          addAlert('Data loaded from file');
        } catch (err: unknown) {
          addAlert(`Parse error: ${(err as Error).message}`);
        }
      };
      reader.readAsText(file);
    },
    [setOrders, setVehicles, setCurrentPlan, addAlert],
  );

  return (
    <header className="flex items-center gap-3 bg-card border-b border-border px-4 py-2">
      <h1 className="font-bold text-base text-primary tracking-tight mr-1">
        Dispatcher Workspace
      </h1>

      <Separator orientation="vertical" className="h-5" />

      <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
        <Upload className="h-3.5 w-3.5" />
        Upload JSON
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleFileUpload}
      />

      <CheatSheetDialog />

      <div className="flex-1" />
    </header>
  );
}
