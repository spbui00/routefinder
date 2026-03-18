import { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

export default function LeftRail() {
  const { orders, vehicles } = useStore();
  const [sortKey, setSortKey] = useState<string>('order_id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterGoods, setFilterGoods] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const goodsTypes = useMemo(
    () => ['all', ...new Set(orders.map((o) => o.goods_type))],
    [orders],
  );

  const sorted = useMemo(() => {
    let filtered = [...orders];
    if (filterGoods !== 'all') {
      filtered = filtered.filter((o) => o.goods_type === filterGoods);
    }
    if (filterPriority !== 'all') {
      filtered = filtered.filter(
        (o) => o.priority === parseInt(filterPriority),
      );
    }
    filtered.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [orders, sortKey, sortDir, filterGoods, filterPriority]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: string }) =>
    sortKey === col ? (
      <span className="ml-0.5 text-[10px]">
        {sortDir === 'asc' ? '▲' : '▼'}
      </span>
    ) : null;

  return (
    <div className="w-72 bg-slate-800 text-slate-200 flex flex-col border-r border-slate-700 overflow-hidden">
      <div className="p-3 border-b border-slate-700">
        <h2 className="font-semibold text-sm mb-2">
          Orders ({orders.length})
        </h2>
        <div className="flex gap-2 text-xs">
          <select
            value={filterGoods}
            onChange={(e) => setFilterGoods(e.target.value)}
            className="bg-slate-700 rounded px-1.5 py-0.5 text-xs flex-1"
          >
            {goodsTypes.map((g) => (
              <option key={g} value={g}>
                {g === 'all' ? 'All Goods' : `Type ${g}`}
              </option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-slate-700 rounded px-1.5 py-0.5 text-xs flex-1"
          >
            <option value="all">All Priority</option>
            <option value="1">P1</option>
            <option value="2">P2</option>
            <option value="3">P3</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto text-xs">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-700">
            <tr>
              <th
                className="px-2 py-1.5 text-left cursor-pointer hover:text-white"
                onClick={() => toggleSort('order_id')}
              >
                ID
                <SortIcon col="order_id" />
              </th>
              <th
                className="px-2 py-1.5 text-left cursor-pointer hover:text-white"
                onClick={() => toggleSort('demand')}
              >
                Demand
                <SortIcon col="demand" />
              </th>
              <th
                className="px-2 py-1.5 text-left cursor-pointer hover:text-white"
                onClick={() => toggleSort('goods_type')}
              >
                Type
                <SortIcon col="goods_type" />
              </th>
              <th
                className="px-2 py-1.5 text-left cursor-pointer hover:text-white"
                onClick={() => toggleSort('priority')}
              >
                Pri
                <SortIcon col="priority" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr
                key={o.order_id}
                className="hover:bg-slate-700/50 border-b border-slate-700/30"
              >
                <td className="px-2 py-1 font-mono">{o.order_id}</td>
                <td className="px-2 py-1">{o.demand}</td>
                <td className="px-2 py-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      o.goods_type === 'A'
                        ? 'bg-blue-900 text-blue-300'
                        : 'bg-amber-900 text-amber-300'
                    }`}
                  >
                    {o.goods_type}
                  </span>
                </td>
                <td className="px-2 py-1">{o.priority}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-2 py-4 text-center text-slate-500"
                >
                  No orders loaded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-700">
        <h2 className="font-semibold text-sm mb-1">
          Fleet ({vehicles.length})
        </h2>
        <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
          {vehicles.map((v) => (
            <div
              key={v.vehicle_id}
              className="flex justify-between bg-slate-700/50 px-2 py-1 rounded"
            >
              <span className="font-mono truncate">{v.vehicle_id}</span>
              <span className="text-slate-400">
                cap: {v.capacity} | {v.allowed_goods.join(',')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
