import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { CheckInPanel } from './components/CheckInPanel';
import { MapContainer } from './components/MapContainer';
import { TravelMemoriesModal } from './components/TravelMemoriesModal';
import { TravelVideoPlayer } from './components/TravelVideoPlayer';
import { routeStore } from './stores/RouteStore';
import './App.css'; // We'll assume standard app css or just inline

const App = observer(() => {
  useEffect(() => {
    // Load initial route on startup for MVP
    routeStore.loadRoute();
  }, []);

  return (
    <div className="app-container">
      <CheckInPanel />
      <MapContainer />
      <TravelMemoriesModal />
      <TravelVideoPlayer />
    </div>
  );
});

export default App;
