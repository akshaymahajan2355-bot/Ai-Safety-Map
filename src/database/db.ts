import { ALL_INITIAL_POTHOLES, INITIAL_SEED_POTHOLES, PotholeRecord } from './seedPotholes';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  vehicle_type: string;
  created_at: string;
}

export interface GeocodedLocationRecord {
  id?: string;
  searchText: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
}

// Haversine formula to compute great-circle distance between two points in meters
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from a point (P) to a line segment (A-B) in meters
export function distanceToSegmentMeters(
  pLat: number,
  pLon: number,
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number
): number {
  // Approximate using flat-earth projection scaled by latitude for short distances
  const latMid = (((aLat + bLat) / 2) * Math.PI) / 180;
  const kx = 111320 * Math.cos(latMid); // meters per deg lon
  const ky = 110574; // meters per deg lat

  const px = pLon * kx;
  const py = pLat * ky;
  const ax = aLon * kx;
  const ay = aLat * ky;
  const bx = bLon * kx;
  const by = bLat * ky;

  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return haversineDistanceMeters(pLat, pLon, aLat, aLon);
  }

  // Projection scalar t on segment AB
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = ax + t * dx;
  const projY = ay + t * dy;

  const distSq = (px - projX) * (px - projX) + (py - projY) * (py - projY);
  return Math.sqrt(distSq);
}

export interface RouteProjectionResult {
  crossTrackDistanceMeters: number;
  alongRouteDistanceMeters: number;
  nearestSegmentIndex: number;
  fractionAlongSegment: number;
  nearestPoint: [number, number]; // [lat, lon] on the route polyline
}

/**
 * Projects a geographic point (lat, lon) onto a multi-segment route geometry.
 * Returns:
 * - crossTrackDistanceMeters: perpendicular distance from the point to the closest route segment
 * - alongRouteDistanceMeters: cumulative distance from the route start to the projected point
 * - nearestSegmentIndex: index i of the segment (between waypoint i and i+1)
 * - nearestPoint: [lat, lon] coordinates of the exact nearest point on the route polyline
 */
export function projectPointOntoRoute(
  pLat: number,
  pLon: number,
  routeCoordinates: [number, number][]
): RouteProjectionResult {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return {
      crossTrackDistanceMeters: Infinity,
      alongRouteDistanceMeters: 0,
      nearestSegmentIndex: 0,
      fractionAlongSegment: 0,
      nearestPoint: [pLat, pLon]
    };
  }

  if (routeCoordinates.length === 1) {
    const dist = haversineDistanceMeters(pLat, pLon, routeCoordinates[0][0], routeCoordinates[0][1]);
    return {
      crossTrackDistanceMeters: dist,
      alongRouteDistanceMeters: 0,
      nearestSegmentIndex: 0,
      fractionAlongSegment: 0,
      nearestPoint: [routeCoordinates[0][0], routeCoordinates[0][1]]
    };
  }

  // Calculate cumulative segment distances
  const segDistances: number[] = [];
  let cum = 0;
  const cumulativeBeforeSeg: number[] = [0];

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const segLen = haversineDistanceMeters(
      routeCoordinates[i][0],
      routeCoordinates[i][1],
      routeCoordinates[i + 1][0],
      routeCoordinates[i + 1][1]
    );
    segDistances.push(segLen);
    cum += segLen;
    cumulativeBeforeSeg.push(cum);
  }

  let minCrossTrack = Infinity;
  let bestAlongRoute = 0;
  let bestSegIndex = 0;
  let bestT = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const aLat = routeCoordinates[i][0];
    const aLon = routeCoordinates[i][1];
    const bLat = routeCoordinates[i + 1][0];
    const bLon = routeCoordinates[i + 1][1];
    const segLen = segDistances[i];

    if (segLen === 0) continue;

    // Flat-earth approximation scaled for this segment
    const latMid = (((aLat + bLat) / 2) * Math.PI) / 180;
    const kx = 111320 * Math.cos(latMid);
    const ky = 110574;

    const px = pLon * kx;
    const py = pLat * ky;
    const ax = aLon * kx;
    const ay = aLat * ky;
    const bx = bLon * kx;
    const by = bLat * ky;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
    }

    const projX = ax + t * dx;
    const projY = ay + t * dy;
    const dist = Math.sqrt((px - projX) * (px - projX) + (py - projY) * (py - projY));

    if (dist < minCrossTrack) {
      minCrossTrack = dist;
      bestSegIndex = i;
      bestT = t;
      bestAlongRoute = cumulativeBeforeSeg[i] + t * segLen;
    }
  }

  const aLat = routeCoordinates[bestSegIndex][0];
  const aLon = routeCoordinates[bestSegIndex][1];
  const bLat = routeCoordinates[bestSegIndex + 1][0];
  const bLon = routeCoordinates[bestSegIndex + 1][1];
  const nearestLat = Number((aLat + bestT * (bLat - aLat)).toFixed(6));
  const nearestLon = Number((aLon + bestT * (bLon - aLon)).toFixed(6));

  return {
    crossTrackDistanceMeters: Math.round(minCrossTrack * 10) / 10,
    alongRouteDistanceMeters: Math.round(bestAlongRoute * 10) / 10,
    nearestSegmentIndex: bestSegIndex,
    fractionAlongSegment: bestT,
    nearestPoint: [nearestLat, nearestLon]
  };
}

export interface PotholeRemovalRequestRecord {
  id: string;
  potholeId: number | string;
  oldImageUrl?: string;
  newImageUrl?: string;
  oldLatitude: number;
  oldLongitude: number;
  newLatitude: number;
  newLongitude: number;
  gpsDistanceMeters: number;
  aiResult: 'REPAIRED' | 'POTHOLE_STILL_EXISTS' | 'LOCATION_MISMATCH' | 'UNRELATED_IMAGE' | 'REUSED_IMAGE' | 'LOW_CONFIDENCE' | string;
  aiConfidence: number;
  aiReason?: string;
  status: 'approved' | 'rejected';
  submittedBy?: string;
  createdAt: string;
}

// Spatial database service with PostGIS spatial indexing & queries
class DatabaseEngine {
  private potholes: PotholeRecord[] = [];
  private users: UserRecord[] = [];
  private removalRequests: PotholeRemovalRequestRecord[] = [];
  private locations: GeocodedLocationRecord[] = [];
  private nextPotholeId = 100;
  private nextUserId = 10;

  constructor() {
    this.potholes = ALL_INITIAL_POTHOLES.map((p) => ({
      ...p,
      status: p.status || 'active'
    }));
    // Seed default user
    this.users.push({
      id: 1,
      name: 'Alex Driver',
      email: 'driver@roadsafe.ai',
      password_hash: '$2a$10$w8T0y8zT...', // mock hash
      vehicle_type: 'car',
      created_at: new Date().toISOString()
    });
  }

  // PostGIS equivalent: SELECT * FROM potholes
  public getAllPotholes(includeResolved: boolean = false): PotholeRecord[] {
    if (includeResolved) {
      return [...this.potholes];
    }
    return this.potholes.filter((p) => p.status !== 'resolved');
  }

  public getActivePotholes(): PotholeRecord[] {
    return this.potholes.filter((p) => p.status !== 'resolved');
  }

  // Mark pothole as resolved
  public resolvePothole(id: number | string): PotholeRecord | null {
    const numId = Number(id);
    const target = this.potholes.find((p) => p.id === numId || String(p.id) === String(id));
    if (!target) return null;
    target.status = 'resolved';
    return target;
  }

  // Audit removal requests log
  public addRemovalRequest(record: PotholeRemovalRequestRecord): void {
    this.removalRequests.unshift(record);
  }

  public getRemovalRequests(): PotholeRemovalRequestRecord[] {
    return [...this.removalRequests];
  }

  // PostGIS equivalent: SELECT * FROM potholes WHERE id = $1
  public getPotholeById(id: number | string): PotholeRecord | undefined {
    const numId = Number(id);
    return this.potholes.find((p) => p.id === numId || String(p.id) === String(id));
  }

  // PostGIS equivalent:
  // SELECT * FROM potholes WHERE ST_DWithin(location, ST_SetSRID(ST_Point(lon, lat), 4326), radiusMeters)
  public findPotholesNear(
    lat: number,
    lon: number,
    radiusMeters: number,
    includeResolved: boolean = false
  ): PotholeRecord[] {
    return this.potholes
      .filter((p) => includeResolved || p.status !== 'resolved')
      .map((p) => {
        const dist = haversineDistanceMeters(lat, lon, p.latitude, p.longitude);
        return { ...p, distanceFromRoute: Math.round(dist) };
      })
      .filter((p) => (p.distanceFromRoute ?? Infinity) <= radiusMeters)
      .sort((a, b) => (a.distanceFromRoute ?? 0) - (b.distanceFromRoute ?? 0));
  }

  // PostGIS equivalent:
  // SELECT *, ST_Distance(location, route_geom) as dist FROM potholes
  // WHERE ST_DWithin(location, route_geom, corridorMeters)
  public findPotholesOnRoute(
    routeCoordinates: [number, number][], // [lat, lon]
    corridorMeters: number = 100
  ): PotholeRecord[] {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      return [];
    }

    const matched: PotholeRecord[] = [];

    // Pre-filter with bounding box for fast spatial indexing
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;

    for (const [lat, lon] of routeCoordinates) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }

    const padDeg = (corridorMeters / 111000) * 1.5;
    minLat -= padDeg;
    maxLat += padDeg;
    minLon -= padDeg;
    maxLon += padDeg;

    for (const pothole of this.potholes) {
      if (pothole.status === 'resolved') {
        continue;
      }
      // Bounding box check
      if (
        pothole.latitude < minLat ||
        pothole.latitude > maxLat ||
        pothole.longitude < minLon ||
        pothole.longitude > maxLon
      ) {
        continue;
      }

      // Exact segment distance check
      let minDistance = Infinity;
      for (let i = 0; i < routeCoordinates.length - 1; i++) {
        const [aLat, aLon] = routeCoordinates[i];
        const [bLat, bLon] = routeCoordinates[i + 1];
        const dist = distanceToSegmentMeters(
          pothole.latitude,
          pothole.longitude,
          aLat,
          aLon,
          bLat,
          bLon
        );
        if (dist < minDistance) {
          minDistance = dist;
        }
        if (minDistance <= 15) {
          // Extremely close, early exit
          break;
        }
      }

      if (minDistance <= corridorMeters) {
        matched.push({
          ...pothole,
          distanceFromRoute: Math.round(minDistance)
        });
      }
    }

    // Sort by proximity to route
    return matched.sort((a, b) => (a.distanceFromRoute ?? 0) - (b.distanceFromRoute ?? 0));
  }

  // Create or report pothole with duplicate check within ~25 meters
  public reportPothole(data: {
    latitude: number;
    longitude: number;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
    road_name: string;
    confidence?: number;
    depth_estimate_cm?: number;
    image_url?: string;
    reported_by?: number;
  }): { pothole: PotholeRecord; isDuplicate: boolean } {
    // Check for existing duplicate within 25m
    const existing = this.potholes.find((p) => {
      const d = haversineDistanceMeters(data.latitude, data.longitude, p.latitude, p.longitude);
      return d <= 25;
    });

    if (existing) {
      existing.report_count += 1;
      // Upgrade severity if higher report comes in
      const severityRank: Record<string, number> = {
        LOW: 1,
        MODERATE: 2,
        HIGH: 3,
        CRITICAL: 4
      };
      if (severityRank[data.severity] > severityRank[existing.severity]) {
        existing.severity = data.severity;
      }
      if (data.image_url && !existing.image_url) {
        existing.image_url = data.image_url;
      }
      return { pothole: existing, isDuplicate: true };
    }

    const newRecord: PotholeRecord = {
      id: ++this.nextPotholeId,
      latitude: data.latitude,
      longitude: data.longitude,
      severity: data.severity,
      road_name: data.road_name,
      confidence: data.confidence ?? 0.88,
      report_count: 1,
      depth_estimate_cm: data.depth_estimate_cm ?? 10.0,
      image_url: data.image_url,
      reported_by: data.reported_by,
      detected_at: new Date().toISOString(),
      verified: true
    };

    this.potholes.unshift(newRecord);
    return { pothole: newRecord, isDuplicate: false };
  }

  public updatePothole(
    id: number,
    updates: Partial<Omit<PotholeRecord, 'id'>>
  ): PotholeRecord | null {
    const p = this.potholes.find((item) => item.id === id);
    if (!p) return null;
    Object.assign(p, updates);
    return p;
  }

  // Users
  public createUser(user: Omit<UserRecord, 'id' | 'created_at'>): UserRecord {
    const newRecord: UserRecord = {
      id: ++this.nextUserId,
      ...user,
      created_at: new Date().toISOString()
    };
    this.users.push(newRecord);
    return newRecord;
  }

  public findUserByEmail(email: string): UserRecord | undefined {
    return this.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: number): UserRecord | undefined {
    return this.users.find((u) => u.id === id);
  }

  // Geocoded Locations (Nominatim & Demo Data)
  public saveLocation(loc: GeocodedLocationRecord): GeocodedLocationRecord {
    const record: GeocodedLocationRecord = {
      ...loc,
      id: loc.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: loc.createdAt || new Date().toISOString()
    };
    this.locations.unshift(record);
    if (this.locations.length > 100) this.locations.pop();
    return record;
  }

  public getLocations(limitCount: number = 20): GeocodedLocationRecord[] {
    return this.locations.slice(0, limitCount);
  }
}

export const db = new DatabaseEngine();
