import TopCommandBar from './components/TopCommandBar';
import BottomStrip from './components/BottomStrip';
import DispatcherWorkspace from './components/dispatcher/DispatcherWorkspace';

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <TopCommandBar />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <DispatcherWorkspace />
      </div>
      <BottomStrip />
    </div>
  );
}
