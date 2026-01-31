import type { RouteData, CheckInPayload, CheckInResult, PlannedRoute } from '../types';

// Mock Data
const MOCK_ROUTE: RouteData = {
    start: "桂林",
    end: "南宁",
    waypoints: [
        {
            name: "象鼻山",
            city: "桂林",
            lat: 25.2673, // Mock coords
            lng: 110.2946,
            stay: 30,
            images: ["https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=1000&auto=format&fit=crop"]
        },
        {
            name: "两江四湖",
            city: "桂林",
            lat: 25.2750,
            lng: 110.2900,
            stay: 40,
            images: ["https://images.unsplash.com/photo-1543051932-6ef9fecfbc80?q=80&w=1000&auto=format&fit=crop"]
        },
        {
            name: "南宁青秀山",
            city: "南宁",
            lat: 22.8129,
            lng: 108.3850,
            stay: 60,
            images: ["https://images.unsplash.com/photo-1626084968415-3221b65593c6?q=80&w=1000&auto=format&fit=crop"]
        }
    ],
    path: [
        [110.290195, 25.273566], // Guilin Start
        [110.2946, 25.2673],     // Xiangbi
        [110.2900, 25.2750],     // Liangjiang
        [109.4, 24.3],           // Waypoint
        [108.3850, 22.8129]      // Qingxiu
    ]
};

export const api = {
    fetchRoute: async (): Promise<RouteData> => {
        return new Promise((resolve) => {
            setTimeout(() => resolve(MOCK_ROUTE), 1000);
        });
    },

    checkIn: async (payload: CheckInPayload): Promise<CheckInResult> => {
        console.log("Checkin Payload", payload);

        // 1. Convert File to Base64
        const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });

        const base64Image = await toBase64(payload.userPhoto);

        // 2. Call Backend
        const response = await fetch(`http://localhost:3001/api/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                poiName: payload.poiName,
                image: base64Image
            })
        });

        return response.json();
    },

    planRoute: async (origin: string, destination: string): Promise<PlannedRoute> => {
        const response = await fetch(`http://localhost:3001/api/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, city: destination })
        });
        return response.json();
    },

    fetchTravelVideo: async (origin: string, destination: string): Promise<any> => {
        const response = await fetch(`http://localhost:3001/api/travel-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ origin, destination })
        });
        if (!response.ok) return null;
        return response.json();
    },

    fetchPhotoGuide: async (poiName: string): Promise<any> => {
        const response = await fetch(`http://localhost:3001/api/photo-guide`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ poiName })
        });
        if (!response.ok) return { guide: null };
        return response.json();
    }
};
