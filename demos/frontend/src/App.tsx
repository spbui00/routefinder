import TopCommandBar from './components/TopCommandBar';
import BottomStrip from './components/BottomStrip';
import DispatcherWorkspace from './components/dispatcher/DispatcherWorkspace';
import { useStore } from './store/useStore';

export default function App() {
  const activeNav = useStore((s) => s.activeNav);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopCommandBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <DispatcherWorkspace />
      </div>
      {activeNav === 'classic' && <BottomStrip />}
    </div>
  );
}
