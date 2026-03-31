import { useStore, type DispatcherNavId } from '../../store/useStore';
import { Button } from '../ui/button';
import { Route, Truck, Package, ScrollText, Calculator, Inbox } from 'lucide-react';

const items: { id: DispatcherNavId; icon: typeof Route; label: string }[] = [
  { id: 'trips', icon: Route, label: 'Trips' },
  { id: 'fleet', icon: Truck, label: 'Fleet' },
  { id: 'deliveries', icon: Package, label: 'Deliveries' },
  { id: 'events', icon: ScrollText, label: 'Events' },
  { id: 'estimator', icon: Calculator, label: 'Estimator' },
  { id: 'bookings_hub', icon: Inbox, label: 'Bookings' },
];

export default function DispatcherNav() {
  const { activeNav, setActiveNav } = useStore();

  return (
    <nav className="w-[52px] shrink-0 bg-zinc-800 text-zinc-100 flex flex-col items-center py-3 gap-1 border-r border-zinc-700">
      {items.map(({ id, icon: Icon, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon"
          title={label}
          onClick={() => setActiveNav(id)}
          className={`h-10 w-10 rounded-lg ${
            activeNav === id
              ? 'bg-zinc-600 text-white hover:bg-zinc-600 hover:text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-700'
          }`}
        >
          <Icon className="h-5 w-5" />
        </Button>
      ))}
      <div className="flex-1" />
      <div
        className="h-8 w-8 rounded-full bg-zinc-600 flex items-center justify-center text-[10px] font-semibold"
        title="Profile"
      >
        GS
      </div>
    </nav>
  );
}
