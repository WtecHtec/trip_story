import { observer } from 'mobx-react-lite';
import { routeStore } from '../stores/RouteStore';

export const TravelVideoPlayer = observer(() => {
    if (!routeStore.travelVideoUrl) return null;

    return (
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '360px',
            height: '240px',
            background: 'black',
            zIndex: 2000,
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'opacity 0.5s ease-in-out'
        }}>
            <iframe
                src={routeStore.travelVideoUrl}
                width="100%"
                height="100%"
                scrolling="no"
                frameBorder="0"
                allowFullScreen
                style={{ display: 'block' }}
            />
            <div style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                background: 'rgba(0,0,0,0.5)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                pointerEvents: 'none'
            }}>
                POV Mode
            </div>
        </div>
    );
});
