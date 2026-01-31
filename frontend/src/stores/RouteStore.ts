import { makeAutoObservable, runInAction } from "mobx";
import type { RouteData, Waypoint, PlannedRoute } from "../types";
import { TrackState } from "../types";
import { api } from "../services/api";
import { mapService } from "../services/mapService";

class RouteStore {
    route: RouteData | null = null;
    trackState: TrackState = TrackState.Idle;
    currentWaypointIndex: number = -1; // -1 means start, 0 is first waypoint

    // Planning State
    cityInput: string = "";
    originInput: string = "";
    isPlanning: boolean = false;
    plannedRoute: PlannedRoute | null = null;

    // Global User Photos
    userPhotos: string[] = [];

    // Check-in State
    uploadedPhoto: File | null = null;
    generatedPhoto: string | null = null;
    isProcessing: boolean = false;
    showAlbum: boolean = false;

    // ...

    constructor() {
        makeAutoObservable(this);
        this.loadPhotos();
    }

    loadPhotos() {
        const saved = localStorage.getItem('tripstory_photos');
        if (saved) {
            try {
                this.userPhotos = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load photos", e);
            }
        }
    }

    toggleAlbum = (show: boolean) => {
        this.showAlbum = show;
    };

    setCityInput = (city: string) => {
        this.cityInput = city;
    };

    setOriginInput = (city: string) => {
        this.originInput = city;
    };

    generateRoute = async () => {
        if (!this.cityInput || !this.originInput) return;
        this.isPlanning = true;
        this.plannedRoute = null;
        try {
            // 1. Get Plan (Names only) - Step 1
            const plan = await api.planRoute(this.originInput, this.cityInput);
            runInAction(() => {
                this.plannedRoute = plan;
                this.isPlanning = false;
            });
        } catch (error) {
            console.error("Planning failed", error);
            runInAction(() => {
                this.isPlanning = false;
            });
        }
    };

    confirmRoute = async () => {
        if (!this.plannedRoute) return;
        this.isPlanning = true;

        try {
            // 2. Resolve Plan to Real Route (Coords + Images) - Step 2
            const realRoute = await mapService.resolveRoute(
                this.cityInput,
                this.plannedRoute.start,
                this.plannedRoute.end,
                this.plannedRoute.waypoints
            );

            runInAction(() => {
                this.route = realRoute;
                this.trackState = TrackState.Idle;
                this.isPlanning = false;
                this.plannedRoute = null; // Clear plan
                this.currentWaypointIndex = -1; // Reset
            });
        } catch (error) {
            console.error("Resolution failed", error);
            runInAction(() => {
                this.isPlanning = false;
            });
        }
    };

    cancelPlan = () => {
        this.plannedRoute = null;
        this.isPlanning = false;
    };

    addToUserGallery = (photoUrl: string) => {
        this.userPhotos.push(photoUrl);
        localStorage.setItem('tripstory_photos', JSON.stringify(this.userPhotos));
    };

    get currentWaypoint(): Waypoint | null {
        if (!this.route || this.currentWaypointIndex < 0 || this.currentWaypointIndex >= this.route.waypoints.length) {
            return null;
        }
        return this.route.waypoints[this.currentWaypointIndex];
    }

    get progress(): number {
        if (!this.route) return 0;
        // Simple progress based on waypoint index
        return ((this.currentWaypointIndex + 1) / this.route.waypoints.length) * 100;
    }

    loadRoute = async () => {
        try {
            // const data = await api.fetchRoute();
            // runInAction(() => {
            //     console.log(" data--", data)
            //     this.route = data;
            //     this.trackState = TrackState.Idle;
            // });
        } catch (error) {
            console.error("Failed to load route", error);
        }
    };

    // Travel Video
    travelVideoUrl: string | null = null;
    isLoadingVideo: boolean = false;

    loadTravelVideo = async () => {
        if (!this.route) return;

        let origin = "";
        let destination = "";

        const nextIndex = this.currentWaypointIndex + 1;
        if (nextIndex >= this.route.waypoints.length) return;

        if (this.currentWaypointIndex === -1) {
            origin = this.route.start;
            destination = this.route.waypoints[0].name;
        } else {
            origin = this.route.waypoints[this.currentWaypointIndex].name;
            destination = this.route.waypoints[nextIndex].name;
        }

        console.log(`Loading video for ${origin} -> ${destination}`);
        this.travelVideoUrl = null; // Reset previous

        runInAction(() => {
            this.isLoadingVideo = true;
        });

        try {
            const result = await api.fetchTravelVideo(origin, destination);
            if (result && result.video) {
                // Construct iframe url
                const { bvid, aid, id } = result.video;
                const finalAid = aid || id;
                let src = `//player.bilibili.com/player.html?isOutside=true&autoplay=1`;
                if (bvid) src += `&bvid=${bvid}`;
                else if (finalAid) src += `&aid=${finalAid}`;

                src += `&muted=1`; // Autoplay usually requires mute

                runInAction(() => {
                    this.travelVideoUrl = src;
                });
            }
        } catch (e) {
            console.error("Failed to load travel video", e);
        } finally {
            runInAction(() => {
                this.isLoadingVideo = false;
            });
        }
    };

    startJourney = async () => {
        if (!this.route) return;

        // Per user request: Do NOT load video for "Start Journey". 
        // Just move immediately.
        // await this.loadTravelVideo(); 
        // await new Promise(resolve => setTimeout(resolve, 2000));

        runInAction(() => {
            this.trackState = TrackState.Moving;
        });
        // In real map implementation, map events will trigger 'arriveAtWaypoint'
        // For MVP simulation (if no map events), we might use timeout in component
    };

    // Called by Map Component when polyline reaches a marker
    arriveAtWaypoint = (index: number) => {
        runInAction(() => {
            this.currentWaypointIndex = index;
            this.trackState = TrackState.Arrived;
            // Keep video playing until next move!
        });

        // Auto transition to AwaitAction after a short delay (simulating 'Looking at scenery') or immediately
        setTimeout(() => {
            runInAction(() => {
                this.trackState = TrackState.AwaitAction;
            });
        }, 1500);
    };

    setUploadedPhoto = (file: File) => {
        this.uploadedPhoto = file;
    };

    updateWaypointPoiPhotos = (index: number, photos: string[]) => {
        if (this.route && this.route.waypoints[index]) {
            this.route.waypoints[index].poiPhotos = photos;
            // Default to the first one if not set
            if (!this.route.waypoints[index].photoUrl && photos.length > 0) {
                this.route.waypoints[index].photoUrl = photos[0];
            }
        }
    };

    selectWaypointPhoto = (index: number, url: string) => {
        if (this.route && this.route.waypoints[index]) {
            this.route.waypoints[index].photoUrl = url;
        }
    };

    confirmCheckIn = async () => {
        if (!this.uploadedPhoto || !this.currentWaypoint) return;

        this.trackState = TrackState.Generating;
        this.isProcessing = true;

        try {
            const result = await api.checkIn({
                poiName: this.currentWaypoint.name,
                userPhoto: this.uploadedPhoto
            });

            if (!result || !result.aiGeneratedPhoto) {
                throw new Error("Generation returned empty result");
            }

            runInAction(() => {
                this.generatedPhoto = result.aiGeneratedPhoto;
                this.addToUserGallery(result.aiGeneratedPhoto);
                this.trackState = TrackState.Finished;
                this.isProcessing = false;
            });
        } catch (error) {
            console.error("Check-in failed", error);
            runInAction(() => {
                alert("AI Generation failed. Please try again or skip.");
                // Revert to AwaitAction to let user try again or choose to skip
                this.trackState = TrackState.AwaitAction;
                this.isProcessing = false;
                // Do NOT proceed to Finished automatically
            });
        }
    };

    resumeJourney = async () => {
        this.uploadedPhoto = null;
        this.generatedPhoto = null;
        // If more waypoints, move
        if (this.route && this.currentWaypointIndex < this.route.waypoints.length - 1) {
            runInAction(() => {
                this.isProcessing = true;
            });

            // Wait for video before moving
            await this.loadTravelVideo();
            // Optional: Extra delay to ensure video player buffers
            await new Promise(resolve => setTimeout(resolve, 2000));

            runInAction(() => {
                this.trackState = TrackState.Moving;
                this.isProcessing = false;
            });
        } else {
            // End of trip
            runInAction(() => {
                this.trackState = TrackState.Idle;
                if (this.route) {
                    this.currentWaypointIndex = this.route.waypoints.length;
                }
            });
            alert("Journey Finished! Time to plan your next adventure.");
        }
    };
}
export const routeStore = new RouteStore();
