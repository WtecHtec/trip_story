import { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { routeStore } from '../stores/RouteStore';
import AMapLoader from '@amap/amap-jsapi-loader';
import { TrackState } from '../types';

export const MapContainer = observer(() => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const polylineRef = useRef<any>(null);
    const moveAnimationRef = useRef<any>(null);

    useEffect(() => {
        // Determine AMap Key from Env or use a placeholder if user didn't set it (This might fail if no key)
        const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'YOUR_AMAP_KEY_HERE';
        const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || 'YOUR_SECURITY_CODE';

        // @ts-ignore
        window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };

        AMapLoader.load({
            key: AMAP_KEY,
            version: "2.0",
            plugins: ["AMap.MoveAnimation", "AMap.Polyline", "AMap.PlaceSearch"],
        }).then((AMap) => {
            console.log(" AMap--", mapRef.current)
            if (!mapRef.current) return;

            mapInstance.current = new AMap.Map(mapRef.current, {
                viewMode: "3D",
                zoom: 10,
                center: [110.290195, 25.273566], // Guilin Default
                mapStyle: 'amap://styles/darkblue', // Premium Dark Style
            });
            console.log(" AMap--", routeStore.route)
            // Initialize route if available
            if (routeStore.route) {

                drawRoute(AMap);

                // Fetch POI Images
                const placeSearch = new AMap.PlaceSearch({
                    pageSize: 1,
                    pageIndex: 1,
                    extensions: 'all', // Return detail info including photos
                });
                console.log(" result--",)
                routeStore.route.waypoints.forEach((wp, index) => {
                    console.log(" result--", wp)
                    placeSearch.search(wp.name, (status: string, result: any) => {
                        console.log(" result--", result)
                        if (status === 'complete' && result.info === 'OK') {
                            const pois = result.poiList.pois;
                            if (pois && pois.length > 0 && pois[0].photos && pois[0].photos.length > 0) {
                                // Extract all photos
                                const photoUrls = pois[0].photos.map((p: any) => p.url);
                                routeStore.updateWaypointPoiPhotos(index, photoUrls);
                            }
                        }
                    });
                });
            }

        }).catch((e) => {
            console.error("AMap load failed", e);
        });

        return () => {
            if (mapInstance.current) {
                mapInstance.current.destroy();
            }
        };
    }, []);

    // Watch for route changes to draw
    useEffect(() => {
        if (routeStore.route && mapInstance.current && !polylineRef.current) {
            // @ts-ignore
            const AMap = window.AMap;
            drawRoute(AMap);
        }
    }, [routeStore.route]);

    // Watch for State Changes to trigger Animation
    useEffect(() => {
        if (routeStore.trackState === TrackState.Moving) {
            startAnimation();
        } else if (routeStore.trackState === TrackState.Arrived) {
            // Animation handled by events, but we pause here if needed
            // Actually, 'moveAlong' is continuous. We need to segment it or pause it.
            // MVP Strategy: Play segment by segment.
        }
    }, [routeStore.trackState]);

    const drawRoute = (AMap: any) => {
        if (!routeStore.route || !routeStore.route.path) return;

        // Clear existing overlays
        mapInstance.current.clearMap();

        // Create markers for Waypoints
        routeStore.route.waypoints.forEach((wp) => {
            new AMap.Marker({
                map: mapInstance.current,
                position: [wp.lng, wp.lat],
                title: wp.name,
            });
        });

        // 1. Draw the static usage line (Tech Style - Dashed)
        const path = routeStore.route.path;

        // 0. Draw Start Point Icon
        if (path && path.length > 0) {
            const startContent = `<div style="
                width: 24px; height: 24px; 
                background: #00d7ff; 
                border-radius: 50%; 
                border: 3px solid rgba(255,255,255,0.8);
                box-shadow: 0 0 15px #00d7ff;
                display: flex; justify-content: center; align-items: center;
                font-size: 10px; font-weight: bold; color: black;
            ">S</div>`;

            new AMap.Marker({
                map: mapInstance.current,
                position: path[0],
                content: startContent,
                offset: new AMap.Pixel(-12, -12),
                zIndex: 60
            });

            // Set view to fit the whole path with padding
            // Use setFitView which is simpler than manual setCenter/setZoom
            setTimeout(() => {
                mapInstance.current.setFitView();
            }, 500);
        }

        new AMap.Polyline({
            map: mapInstance.current,
            path: path,
            showDir: false,
            strokeColor: "#00d7ff",
            strokeOpacity: 1,
            strokeWeight: 2,
            strokeStyle: "dashed", // Dashed Line
            strokeDasharray: [10, 6], // Dash pattern
            lineJoin: 'round',
            lineCap: 'round',
            zIndex: 50,
            isOutline: true,
            outlineColor: "rgba(0, 215, 255, 0.2)",
            borderWeight: 1
        });

        // 2. Create the Moving DOT Marker (Tech Style)
        const markerContent = `<div style="
            width: 16px; 
            height: 16px; 
            background: #ffffff; 
            border: 2px solid #00d7ff; 
            border-radius: 50%; 
            box-shadow: 0 0 20px #00d7ff, 0 0 40px #00d7ff;
            animation: pulse 1s infinite;
        "></div>`;

        // Add pulse animation style to head
        if (!document.getElementById('marker-style')) {
            const style = document.createElement('style');
            style.id = 'marker-style';
            style.innerHTML = `
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 215, 255, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 215, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 215, 255, 0); }
                }
            `;
            document.head.appendChild(style);
        }

        const marker = new AMap.Marker({
            map: mapInstance.current,
            position: path[0],
            content: markerContent,
            offset: new AMap.Pixel(-7, -7), // Center the dot
        });

        moveAnimationRef.current = marker;

        // Camera Follow Logic
        marker.on('moving', () => {
            // e.passedPath is available, but simplest is just center on marker
            // We can also getPosition()
            const currentPos = marker.getPosition();
            mapInstance.current.setCenter(currentPos);

            // Dynamic Zoom? Optional, but user asked to "Zoom In", we do that at start.
        });

        marker.on('moveend', () => {
        });
    };

    const startAnimation = () => {
        if (!moveAnimationRef.current || !routeStore.route) return;

        const nextIndex = routeStore.currentWaypointIndex + 1;
        if (nextIndex >= routeStore.route.waypoints.length) return;

        const nextWP = routeStore.route.waypoints[nextIndex];
        const targetPos = [nextWP.lng, nextWP.lat];

        // 1. Calculate distance first
        const currentPos = moveAnimationRef.current.getPosition();
        const dx = targetPos[0] - currentPos.getLng();
        const dy = targetPos[1] - currentPos.getLat();
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 2. Dynamic Zoom based on distance
        let targetZoom = 15;
        if (distance > 2.0) targetZoom = 8;       // > 200km approx -> Zoom Out Far
        else if (distance > 0.5) targetZoom = 10; // > 50km -> Zoom Mid
        else if (distance > 0.1) targetZoom = 12; // > 10km -> Zoom Closer
        else targetZoom = 15;                     // Close range

        mapInstance.current.setZoom(targetZoom);

        // 3. Adjust this factor to tune speed. 
        // User feedback: "Long distance should be faster, i hope 3s end"
        let duration;

        if (distance > 2.0) {
            // Long distance (>200km approx), force ~3s
            duration = 1000 * 10;
        } else {
            // Short/Medium distance: Use linear speed but fast
            // Base multiplier 12000 => 1 deg takes 12s.
            // Maybe we want it even faster generally?
            // Let's cap short moves to be quick too.
            const speedMultiplier = 1000 * 20;
            duration = Math.max(distance * speedMultiplier, 1000 * 5);
        }

        // @ts-ignore
        moveAnimationRef.current.moveTo(targetPos, {
            duration: duration,
            autoRotation: false // Dot needs no rotation
        });

        moveAnimationRef.current.once('moveend', () => {
            routeStore.arriveAtWaypoint(nextIndex);
            // Optionally Zoom out slightly when arrived?
        });
    };

    return (
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
            <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            {/* Overlay for "No Key" warning if map doesn't load? */}
        </div>
    );
});
// MapService will be created in a new file, removing this block from thought process to actual action.
// Just ensuring current file MapContainer is fine.
