export interface Waypoint {
    name: string;
    city: string;
    lat: number;
    lng: number;
    stay: number; // Duration in seconds (mock)
    images: string[];
    photoUrl?: string; // Currently selected POI image
    poiPhotos?: string[]; // List of all available POI images
}

export interface RouteData {
    start: string;
    end: string;
    waypoints: Waypoint[];
    // For AMap polyline, we might need a list of [lng, lat] arrays representing the path
    path?: [number, number][];
}

export interface PlannedRoute {
    start: string;
    end: string;
    waypoints: { name: string; city: string }[];
}

export const TrackState = {
    Idle: 'Idle',
    Moving: 'Moving',
    Arrived: 'Arrived',
    AwaitAction: 'AwaitAction',
    Generating: 'Generating',
    Finished: 'Finished'
} as const;

export type TrackState = typeof TrackState[keyof typeof TrackState];

export interface CheckInPayload {
    poiName: string;
    userPhoto: File;
    scenePhoto?: string;
}

export interface CheckInResult {
    aiGeneratedPhoto: string;
}
