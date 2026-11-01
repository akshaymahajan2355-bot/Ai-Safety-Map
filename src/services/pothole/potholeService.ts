import { db, projectPointOntoRoute, PotholeRemovalRequestRecord } from '../../database/db';
import { PotholeRecord } from '../../database/seedPotholes';
import {
  getPotholesFromFirestore,
  savePotholeToFirestore,
  updatePotholeStatusInFirestore,
  saveRemovalRequestToFirestore,
  getRemovalRequestsFromFirestore
} from '../firebase/firebaseAdmin';

export class PotholeService {
  /**
   * Retrieves all potholes from Firestore if configured, falling back to local database engine.
   * By default filters out 'resolved' potholes so they no longer appear as active road hazards.
   */
  public static async getAllAsync(includeResolved: boolean = false): Promise<PotholeRecord[]> {
    try {
      const firestorePotholes = await getPotholesFromFirestore();
      if (firestorePotholes && firestorePotholes.length > 0) {
        if (includeResolved) {
          return firestorePotholes;
        }
        return firestorePotholes.filter((p) => p.status !== 'resolved');
      }
    } catch (err) {
      console.warn('PotholeService.getAllAsync error with Firestore:', err);
    }
    return db.getAllPotholes(includeResolved);
  }

  public static getAll(includeResolved: boolean = false): PotholeRecord[] {
    return db.getAllPotholes(includeResolved);
  }

  public static getById(id: number | string): PotholeRecord | undefined {
    return db.getPotholeById(id);
  }

  /**
   * Resolve a pothole after successful verification.
   * Updates in-memory database engine and Firestore asynchronously.
   */
  public static resolve(id: number | string): PotholeRecord | null {
    const resolved = db.resolvePothole(id);
    // Asynchronously update status in Firestore
    updatePotholeStatusInFirestore(id, 'resolved').catch((err) => {
      console.warn('Background Firestore status update error:', err);
    });
    return resolved;
  }

  /**
   * Record a removal verification request audit entry.
   */
  public static addRemovalRequest(record: PotholeRemovalRequestRecord): void {
    db.addRemovalRequest(record);
    saveRemovalRequestToFirestore(record).catch((err) => {
      console.warn('Background Firestore removal request save error:', err);
    });
  }

  /**
   * Get all removal verification request records.
   */
  public static async getRemovalRequests(): Promise<PotholeRemovalRequestRecord[]> {
    try {
      const firestoreRequests = await getRemovalRequestsFromFirestore();
      if (firestoreRequests && firestoreRequests.length > 0) {
        return firestoreRequests;
      }
    } catch (err) {
      console.warn('Error fetching removal requests from Firestore:', err);
    }
    return db.getRemovalRequests();
  }

  /**
   * Identifies potholes that strictly lie within the route corridor (default 30m, configurable)
   * using high-precision perpendicular cross-track projection onto the route polyline.
   * Ignores hazards beyond the corridor and ignores resolved potholes.
   */
  public static getOnRoute(
    routeCoordinates: [number, number][],
    corridorMeters: number = 30,
    sourcePotholes?: PotholeRecord[]
  ): PotholeRecord[] {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return [];
    }

    const pool = (sourcePotholes || db.getAllPotholes()).filter((p) => p.status !== 'resolved');
    const matched: PotholeRecord[] = [];

    for (const pothole of pool) {
      if (typeof pothole.latitude !== 'number' || typeof pothole.longitude !== 'number' || isNaN(pothole.latitude) || isNaN(pothole.longitude)) {
        continue;
      }
      const proj = projectPointOntoRoute(pothole.latitude, pothole.longitude, routeCoordinates);
      if (proj.crossTrackDistanceMeters <= corridorMeters) {
        matched.push({
          ...pothole,
          distanceFromRoute: Math.round(proj.crossTrackDistanceMeters),
          nearestRoutePoint: proj.nearestPoint
        });
      }
    }

    return matched.sort((a, b) => (a.distanceFromRoute ?? 0) - (b.distanceFromRoute ?? 0));
  }

  /**
   * Retrieves potholes from Firebase Firestore and matches them against the route polyline.
   * Logs every pothole coordinate before analysis, checks lat/lon swap, and returns matched hazards
   * with nearestRoutePoint and exact distance in meters.
   */
  public static async getOnRouteFromFirebase(
    routeCoordinates: [number, number][],
    corridorMeters: number = 30
  ): Promise<{
    hazards: PotholeRecord[];
    totalFirebaseChecked: number;
    matchedWithinThreshold: number;
    corridorThresholdMeters: number;
    distances: {
      id: string | number;
      road: string;
      severity: string;
      latitude: number;
      longitude: number;
      nearestRoutePoint: [number, number];
      distanceM: number;
      confidence: number;
      hazardType: string;
      timestamp: string;
      vehicleType?: string;
      routeRelevant: boolean;
    }[];
  }> {
    const ROUTE_POTHOLE_RADIUS_METERS = corridorMeters;

    if (!routeCoordinates || routeCoordinates.length < 2) {
      return {
        hazards: [],
        totalFirebaseChecked: 0,
        matchedWithinThreshold: 0,
        corridorThresholdMeters: ROUTE_POTHOLE_RADIUS_METERS,
        distances: []
      };
    }

    const allPotholes = await this.getAllAsync();
    const activePotholes = allPotholes.filter((p) => p.status !== 'resolved');

    // STEP 1: Log every pothole coordinate before route analysis & verify lat/lon are not swapped
    console.log(`[Pothole Analysis] Inspecting ${activePotholes.length} active pothole documents:`);
    for (const p of activePotholes) {
      const isSwapped = p.latitude > 70 && p.longitude < 30; // In India lat is ~21, lon is ~79
      if (isSwapped) {
        console.warn(`[Pothole #${p.id}] WARNING: Latitude (${p.latitude}) and Longitude (${p.longitude}) appear swapped!`);
      }
      console.log(
        `[Pothole #${p.id}] Coords: [lat: ${p.latitude}, lng: ${p.longitude}], Severity: ${p.severity}, Conf: ${p.confidence}, Type: ${p.hazard_type || 'pothole'}, Veh: ${p.vehicle_type || 'N/A'}`
      );
    }

    const matched: PotholeRecord[] = [];
    const distances: {
      id: string | number;
      road: string;
      severity: string;
      latitude: number;
      longitude: number;
      nearestRoutePoint: [number, number];
      distanceM: number;
      confidence: number;
      hazardType: string;
      timestamp: string;
      vehicleType?: string;
      routeRelevant: boolean;
    }[] = [];

    for (const pothole of activePotholes) {
      if (
        typeof pothole.latitude !== 'number' ||
        typeof pothole.longitude !== 'number' ||
        isNaN(pothole.latitude) ||
        isNaN(pothole.longitude)
      ) {
        continue;
      }

      // STEP 3: Complete route polyline projection
      const proj = projectPointOntoRoute(pothole.latitude, pothole.longitude, routeCoordinates);
      const dist = Math.round(proj.crossTrackDistanceMeters);
      const isRelevant = dist <= ROUTE_POTHOLE_RADIUS_METERS;

      if (isRelevant) {
        matched.push({
          ...pothole,
          distanceFromRoute: dist,
          nearestRoutePoint: proj.nearestPoint
        });

        // STEP 3: Log matched pothole details
        console.log(
          `🎯 [Matched Pothole] ID: #${pothole.id} | Firebase Coords: [${pothole.latitude}, ${pothole.longitude}] | Nearest Route Point: [${proj.nearestPoint[0]}, ${proj.nearestPoint[1]}] | Dist: ${dist}m | Severity: ${pothole.severity}`
        );

        distances.push({
          id: pothole.id,
          road: pothole.road_name,
          severity: pothole.severity,
          latitude: pothole.latitude,
          longitude: pothole.longitude,
          nearestRoutePoint: proj.nearestPoint,
          distanceM: dist,
          confidence: pothole.confidence,
          hazardType: pothole.hazard_type || 'pothole',
          timestamp: pothole.detected_at || pothole.timestamp || '',
          vehicleType: pothole.vehicle_type,
          routeRelevant: true
        });
      }
    }

    matched.sort((a, b) => (a.distanceFromRoute ?? 0) - (b.distanceFromRoute ?? 0));
    distances.sort((a, b) => a.distanceM - b.distanceM);

    return {
      hazards: matched,
      totalFirebaseChecked: activePotholes.length,
      matchedWithinThreshold: matched.length,
      corridorThresholdMeters: ROUTE_POTHOLE_RADIUS_METERS,
      distances
    };
  }

  public static getNearby(
    lat: number,
    lon: number,
    radiusMeters: number = 2000,
    includeResolved: boolean = false
  ): PotholeRecord[] {
    return db.findPotholesNear(lat, lon, radiusMeters, includeResolved);
  }

  public static report(data: {
    latitude: number;
    longitude: number;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    road_name: string;
    confidence?: number;
    depth_estimate_cm?: number;
    image_url?: string;
    reported_by?: number;
  }): { pothole: PotholeRecord; isDuplicate: boolean } {
    const result = db.reportPothole(data);

    // Save to Firestore in background without blocking
    savePotholeToFirestore({
      id: result.pothole.id,
      latitude: result.pothole.latitude,
      longitude: result.pothole.longitude,
      severity: result.pothole.severity,
      road_name: result.pothole.road_name,
      address: result.pothole.road_name,
      confidence: result.pothole.confidence,
      depth_estimate_cm: result.pothole.depth_estimate_cm,
      image_url: result.pothole.image_url,
      status: result.pothole.verified ? 'verified' : 'active',
      created_at: result.pothole.detected_at
    }).catch((err) => {
      console.warn('Background Firestore save error:', err);
    });

    return result;
  }

  public static update(id: number, updates: Partial<Omit<PotholeRecord, 'id'>>) {
    return db.updatePothole(id, updates);
  }
}
