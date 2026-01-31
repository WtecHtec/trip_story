import { observer } from 'mobx-react-lite';
import { routeStore } from '../stores/RouteStore';
import styles from './TravelMemoriesModal.module.css';

export const TravelMemoriesModal = observer(() => {
    if (!routeStore.showAlbum) return null;

    return (
        <div className={styles.overlay} onClick={() => routeStore.toggleAlbum(false)}>
            {/* Stop propagation on content wrapper to allow clicking background to close */}
            <div className={styles.content} onClick={(e) => e.stopPropagation()}>
                <button
                    className={styles.closeButton}
                    onClick={() => routeStore.toggleAlbum(false)}
                    aria-label="Close"
                >
                    &times;
                </button>
                <h2 className={styles.title}>My Travel Memories</h2>
                <div className={styles.albumGrid}>
                    {routeStore.userPhotos.map((photo, index) => (
                        <div
                            key={index}
                            className={styles.albumItem}
                            style={{ backgroundImage: `url(${photo})` }}
                            title={`Memory ${index + 1}`}
                        />
                    ))}
                    {routeStore.userPhotos.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>No photos yet. Start your journey to collect memories!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
