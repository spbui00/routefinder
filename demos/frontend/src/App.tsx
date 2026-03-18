import TopCommandBar from './components/TopCommandBar';
import LeftRail from './components/LeftRail';
import MapCanvas from './components/MapCanvas';
import RightRail from './components/RightRail';
import BottomStrip from './components/BottomStrip';

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <TopCommandBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftRail />
        <MapCanvas />
        <RightRail />
      </div>
      <BottomStrip />
    </div>
  );
}
