import AMapLoader from '@amap/amap-jsapi-loader';
import type { RouteData, Waypoint } from '../types';

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || 'YOUR_AMAP_KEY_HERE';
const AMAP_SECURITY_CODE = import.meta.env.VITE_AMAP_SECURITY_CODE || 'YOUR_SECURITY_CODE';

// Ensure security config
// @ts-ignore
if (!window._AMapSecurityConfig) {
    // @ts-ignore
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
}

export const mapService = {
    // Load AMap if needed (singleton-ish)
    loadAMap: async () => {
        return AMapLoader.load({
            key: AMAP_KEY,
            version: "2.0",
            plugins: ["AMap.PlaceSearch", "AMap.Driving"], // Need Driving for path? Or just PlaceSearch
        });
    },

    // Resolve a list of POI names to a full RouteData with coords and photos
    resolveRoute: async (city: string, startName: string, endName: string, waypointNames: { name: string, city: string }[]): Promise<RouteData> => {
        const AMap = await mapService.loadAMap();
        const placeSearch = new AMap.PlaceSearch({ city: city, pageSize: 1, extensions: 'all' });

        const searchLocation = (keyword: string): Promise<any> => {
            return new Promise((resolve) => {
                placeSearch.search(keyword, (status: string, result: any) => {
                    if (status === 'complete' && result.info === 'OK' && result.poiList.pois.length > 0) {
                        resolve(result.poiList.pois[0]);
                    } else {
                        // Fallback or error? resolve null
                        console.warn(`POI not found: ${keyword}`);
                        resolve(null);
                    }
                });
            });
        };

        // 1. Resolve Waypoints
        const resolvedWaypoints: Waypoint[] = [];
        const validCoords: [number, number][] = [];

        // 1a. Resolve Start Point First
        const startPoi = await searchLocation(startName);
        if (startPoi) {
            const photos = startPoi.photos ? startPoi.photos.map((p: any) => p.url) : [];
            resolvedWaypoints.push({
                name: startPoi.name,
                city: city, // Assumed origin city, or flexible
                lat: startPoi.location.lat,
                lng: startPoi.location.lng,
                stay: 0, // Start point usually 0 stay or short
                images: photos.length > 0 ? photos : ["https://via.placeholder.com/400x300?text=Start+Point"],
                photoUrl: photos.length > 0 ? photos[0] : undefined,
                poiPhotos: photos
            });
            validCoords.push([startPoi.location.lng, startPoi.location.lat]);
        }

        // 1b. Resolve Attractions
        for (const wp of waypointNames) {
            const poi = await searchLocation(wp.name);
            if (poi) {
                const photos = poi.photos ? poi.photos.map((p: any) => p.url) : [];
                resolvedWaypoints.push({
                    name: poi.name,
                    city: wp.city,
                    lat: poi.location.lat,
                    lng: poi.location.lng,
                    stay: 3600, // Default stay
                    images: photos.length > 0 ? photos : ["https://via.placeholder.com/400x300?text=No+Image"],
                    photoUrl: photos.length > 0 ? photos[0] : undefined,
                    poiPhotos: photos
                });
                validCoords.push([poi.location.lng, poi.location.lat]);
            }
        }

        // 2. Resolve Start (Optional, usually User location or City center)
        // For MVP, if startName is generic like "City Center", map might find it.
        // Let's just track the path through waypoints for now.

        // 3. Construct Path (Simple connection for now)
        // If we want real driving path, we need AMap.Driving.
        // Let's stick to straight lines for the "Sci-fi" flight effect first, 
        // OR simply use the waypoints as the path nodes.

        return {
            start: startName,
            end: endName,
            waypoints: resolvedWaypoints,
            path: validCoords // Simple direct path
        };
    }
};
