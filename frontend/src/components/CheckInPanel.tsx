import { observer } from 'mobx-react-lite';
import { routeStore } from '../stores/RouteStore';
import { TrackState } from '../types';
import styles from './CheckInPanel.module.css';

export const CheckInPanel = observer(() => {
    const { currentWaypoint, trackState, uploadedPhoto, generatedPhoto, isProcessing, isPlanning, cityInput, plannedRoute } = routeStore;

    const renderContent = () => {
        if (!currentWaypoint && trackState !== TrackState.Finished) {
            return (
                <>
                    <h1 className={styles.title}>TripStory</h1>
                    {!plannedRoute ? (
                        <>
                            <p className={styles.subtitle}>Where do you want to go?</p>
                            <div style={{ marginBottom: '1rem' }}>
                                <input
                                    className={styles.styledInput}
                                    type="text"
                                    placeholder="Start From (e.g. Beijing)"
                                    value={routeStore.originInput}
                                    onChange={(e) => routeStore.setOriginInput(e.target.value)}
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <input
                                    className={styles.styledInput}
                                    type="text"
                                    placeholder="Destination (e.g. Tokyo)"
                                    value={cityInput}
                                    onChange={(e) => routeStore.setCityInput(e.target.value)}
                                />
                            </div>
                            <button
                                className={styles.btnPrimary}
                                onClick={() => routeStore.generateRoute()}
                                disabled={isProcessing || isPlanning || !cityInput || !routeStore.originInput}
                            >
                                {isPlanning ? 'Planning Trip...' : '✨ Generate Plan'}
                            </button>
                        </>
                    ) : (
                        <>
                            <p className={styles.subtitle}>Confirm your Trip to {plannedRoute.start.split('cen')[0]}?</p>
                            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                                    {plannedRoute.waypoints.map((wp, idx) => (
                                        <li key={idx} style={{ marginBottom: '0.5rem' }}>{wp.name}</li>
                                    ))}
                                </ul>
                            </div>
                            <button
                                className={styles.btnPrimary}
                                onClick={() => routeStore.confirmRoute()}
                                disabled={isPlanning}
                            >
                                {isPlanning ? 'Resolving Map...' : '🚀 Start Journey'}
                            </button>

                            <button
                                className={styles.btnSecondary}
                                style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}
                                onClick={() => routeStore.generateRoute()} // Re-call generate
                                disabled={isPlanning}
                            >
                                {isPlanning ? 'Planning...' : '🔄 Re-generate Plan'}
                            </button>
                            <button
                                className={styles.btnSecondary}
                                style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                                onClick={() => routeStore.cancelPlan()}
                                disabled={isPlanning}
                            >
                                Cancel
                            </button>
                        </>
                    )}
                    {routeStore.route && trackState === TrackState.Idle && !plannedRoute && (
                        <button className={styles.btnSecondary} style={{ marginTop: '1rem' }} onClick={() => routeStore.startJourney()}>
                            Start Journey
                        </button>
                    )}
                </>
            );
        }

        // Check-in / Journey View
        return (
            <>
                <h2 className={styles.locationTitle}>{currentWaypoint?.name}</h2>
                <p className={styles.city}>{currentWaypoint?.city}</p>

                <div className={styles.imageContainer}>
                    <img
                        src={currentWaypoint?.photoUrl || currentWaypoint?.images[0]}
                        alt={currentWaypoint?.name}
                        className={styles.scenicImage}
                        onError={(e) => {
                            e.currentTarget.src = currentWaypoint?.images[0] || '';
                        }}
                    />
                </div>

                {/* POI Gallery */}
                {currentWaypoint?.poiPhotos && currentWaypoint.poiPhotos.length > 0 && (
                    <div className={styles.galleryContainer}>
                        {currentWaypoint.poiPhotos.map((photo, index) => (
                            <div
                                key={index}
                                className={`${styles.galleryThumbnail} ${currentWaypoint.photoUrl === photo ? styles.selected : ''}`}
                                style={{ backgroundImage: `url(${photo})` }}
                                onClick={() => routeStore.selectWaypointPhoto(routeStore.currentWaypointIndex, photo)}
                            />
                        ))}
                    </div>
                )}

                <div className={styles.actionArea}>
                    {trackState === TrackState.Moving && (
                        <div className={styles.movingSection}>
                            <p className={styles.statusText}>Traveling to {
                                routeStore.route?.waypoints[routeStore.currentWaypointIndex + 1]?.name || "Next Stop"
                            }...</p>
                            <button
                                className={styles.btnSecondary}
                                style={{ marginTop: '1rem', fontSize: '0.9rem', opacity: 0.8 }}
                                onClick={() => routeStore.arriveAtWaypoint(routeStore.currentWaypointIndex + 1)}
                            >
                                Skip Travel ⏩
                            </button>
                        </div>
                    )}

                    {trackState === TrackState.Arrived && (
                        <p className={styles.statusText}>Arrived! Enjoying the view...</p>
                    )}

                    {(trackState === TrackState.AwaitAction || trackState === TrackState.Generating) && (
                        <div className={styles.uploadSection}>
                            <h3>Time to Check-in!</h3>
                            <p>Upload your photo to mark this spot.</p>

                            <input
                                type="file"
                                id="photo-upload"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) routeStore.setUploadedPhoto(e.target.files[0]);
                                }}
                            />
                            <label htmlFor="photo-upload" className={styles.uploadLabel}>
                                {uploadedPhoto ? `Selected: ${uploadedPhoto.name}` : '📷 Select Photo'}
                            </label>

                            {uploadedPhoto && (
                                <div className={styles.preview}>
                                    <p>Photo selected: {uploadedPhoto.name}</p>
                                </div>
                            )}

                            <button
                                className={styles.btnPrimary}
                                disabled={!uploadedPhoto || isProcessing}
                                onClick={() => routeStore.confirmCheckIn()}
                            >
                                {isProcessing ? 'Generating...' : '✨ AI Check-in'}
                            </button>

                            <button
                                className={styles.btnSecondary}
                                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
                                onClick={() => routeStore.resumeJourney()}
                                // Disable if processing check-in or loading video
                                disabled={isProcessing || routeStore.isLoadingVideo}
                            >
                                {routeStore.isLoadingVideo
                                    ? 'Finding Video...'
                                    : (isProcessing ? 'Starting...' : 'Skip / Next Spot ➡')}
                            </button>
                        </div>
                    )}

                    {trackState === TrackState.Finished && generatedPhoto && (
                        <div className={styles.resultSection}>
                            <h3>Check-in Complete!</h3>
                            <div className={styles.resultImageContainer}>
                                <img src={generatedPhoto} alt="AI Checkin" className={styles.resultImage} />
                            </div>
                            <div className={styles.btnGroup}>
                                <a href={generatedPhoto} download="checkin.jpg" className={styles.btnSecondary} style={{ textAlign: 'center' }}>Download Memory</a>
                                <button className={styles.btnPrimary} onClick={() => routeStore.resumeJourney()}>
                                    {routeStore.currentWaypointIndex < (routeStore.route?.waypoints.length || 0) - 1
                                        ? `Next: ${routeStore.route?.waypoints[routeStore.currentWaypointIndex + 1].name} ➡`
                                        : "Finish Journey 🎉"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </>
        );
    };

    return (
        <div className={styles.panel}>
            <div className={styles.scrollableContent}>
                {renderContent()}
            </div>

            {/* Global Album Button - Fixed in Panel Frame */}
            <button className={styles.albumButton} onClick={() => routeStore.toggleAlbum(true)}>
                <span>📸 My Album</span>
            </button>

            {/* Global Album Overlay - Fixed in Panel Frame */}
            {/* Global Album Overlay - Moved to Global Component (TravelMemoriesModal) */}
        </div>
    );
});
