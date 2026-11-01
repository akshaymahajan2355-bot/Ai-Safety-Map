import { RoadHazard, SeverityLevel } from '../types';

/**
 * Haversine formula to calculate accurate distance between two lat/lng coordinates in meters
 */
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
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

/**
 * Project a coordinate onto a polyline segment using perpendicular cross-track projection.
 * Returns the cross-track distance in meters and the nearest point on the route polyline.
 */
export function projectPointOntoRoutePolyline(
  pLat: number,
  pLon: number,
  routeCoordinates: [number, number][]
): {
  crossTrackDistanceMeters: number;
  nearestPoint: [number, number];
  segmentIndex: number;
} {
  if (!routeCoordinates || routeCoordinates.length < 2) {
    return {
      crossTrackDistanceMeters: Infinity,
      nearestPoint: [pLat, pLon],
      segmentIndex: -1
    };
  }

  let minDistance = Infinity;
  let bestPoint: [number, number] = routeCoordinates[0];
  let bestSegmentIndex = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const p1 = routeCoordinates[i];
    const p2 = routeCoordinates[i + 1];

    const lat1 = p1[0];
    const lon1 = p1[1];
    const lat2 = p2[0];
    const lon2 = p2[1];

    // Convert to local Euclidean meters centered at lat1, lon1
    const meanLatRad = ((lat1 + lat2 + pLat) / 3) * (Math.PI / 180);
    const cosMeanLat = Math.cos(meanLatRad);

    const x1 = 0;
    const y1 = 0;
    const x2 = (lon2 - lon1) * 111139 * cosMeanLat;
    const y2 = (lat2 - lat1) * 111139;

    const px = (pLon - lon1) * 111139 * cosMeanLat;
    const py = (pLat - lat1) * 111139;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const segLenSq = dx * dx + dy * dy;

    let projX: number;
    let projY: number;

    if (segLenSq < 1e-4) {
      projX = x1;
      projY = y1;
    } else {
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / segLenSq));
      projX = x1 + t * dx;
      projY = y1 + t * dy;
    }

    const distMeters = Math.hypot(px - projX, py - projY);

    if (distMeters < minDistance) {
      minDistance = distMeters;
      bestSegmentIndex = i;

      const nearestLat = lat1 + projY / 111139;
      const nearestLon = lon1 + projX / (111139 * cosMeanLat);
      bestPoint = [Number(nearestLat.toFixed(6)), Number(nearestLon.toFixed(6))];
    }
  }

  return {
    crossTrackDistanceMeters: Math.round(minDistance * 10) / 10,
    nearestPoint: bestPoint,
    segmentIndex: bestSegmentIndex
  };
}

export interface DemoPotholeOptions {
  isSafeRoute?: boolean;
  routeId?: string;
  roadNames?: string[];
  baseRoadName?: string;
}

/**
 * Generates route-specific DEMO pothole data along the ACTUAL decoded route polyline.
 *
 * Rules strictly followed:
 * - NO hardcoded city coordinates
 * - NO random global or off-road locations
 * - Potholes are placed 5-15 meters perpendicular from the actual route polyline centerline
 * - Clearly tagged with isDemo: true
 * - Deterministic placement based on route length & geometry
 */
export function generateDemoPotholesForRoute(
  routeCoordinates: [number, number][],
  count: number,
  options?: DemoPotholeOptions
): RoadHazard[] {
  if (!routeCoordinates || routeCoordinates.length < 2 || count <= 0) {
    return [];
  }

  const isSafe = options?.isSafeRoute ?? false;
  const routeId = options?.routeId || (isSafe ? 'safer' : 'normal');
  const baseRoadName = options?.baseRoadName || (isSafe ? 'Alternative Arterial Road' : 'Main Road');
  const roadNames = options?.roadNames || [];

  // Deterministic configs for Normal Route (count=5) vs Safe Route (count=1)
  const normalConfigs: Array<{
    ratio: number;
    severity: SeverityLevel;
    offsetMeters: number;
    depthCm: number;
    confidence: number;
    reportCount: number;
    desc: string;
  }> = [
    {
      ratio: 0.18,
      severity: 'HIGH',
      offsetMeters: 7.5,
      depthCm: 14,
      confidence: 0.89,
      reportCount: 9,
      desc: 'Substantial asphalt crater across left driving lane'
    },
    {
      ratio: 0.36,
      severity: 'CRITICAL',
      offsetMeters: -9.0,
      depthCm: 22,
      confidence: 0.95,
      reportCount: 16,
      desc: 'Deep severe cavity with exposed aggregate & edge rupture'
    },
    {
      ratio: 0.54,
      severity: 'HIGH',
      offsetMeters: 8.0,
      depthCm: 15,
      confidence: 0.86,
      reportCount: 7,
      desc: 'Longitudinal road fracture and sink depression'
    },
    {
      ratio: 0.72,
      severity: 'MODERATE',
      offsetMeters: -7.0,
      depthCm: 10,
      confidence: 0.81,
      reportCount: 5,
      desc: 'Surface wear depression near transition joint'
    },
    {
      ratio: 0.88,
      severity: 'LOW',
      offsetMeters: 6.5,
      depthCm: 5,
      confidence: 0.74,
      reportCount: 3,
      desc: 'Minor asphalt pitting on outer road shoulder'
    }
  ];

  const safeConfigs: Array<{
    ratio: number;
    severity: SeverityLevel;
    offsetMeters: number;
    depthCm: number;
    confidence: number;
    reportCount: number;
    desc: string;
  }> = [
    {
      ratio: 0.50,
      severity: 'MODERATE',
      offsetMeters: 8.0,
      depthCm: 8,
      confidence: 0.79,
      reportCount: 4,
      desc: 'Isolated moderate depression on resurfaced corridor'
    }
  ];

  const targetConfigs = isSafe ? safeConfigs : normalConfigs;
  const numToGenerate = Math.min(count, targetConfigs.length);
  const hazards: RoadHazard[] = [];

  for (let i = 0; i < numToGenerate; i++) {
    const cfg = targetConfigs[i];

    // Pick point along polyline at predetermined ratio
    const targetIdx = Math.max(
      0,
      Math.min(routeCoordinates.length - 2, Math.floor((routeCoordinates.length - 1) * cfg.ratio))
    );

    const p1 = routeCoordinates[targetIdx];
    const p2 = routeCoordinates[targetIdx + 1];

    const lat1 = p1[0];
    const lon1 = p1[1];
    const lat2 = p2[0];
    const lon2 = p2[1];

    // Vector along road segment
    const cosLat = Math.cos((lat1 * Math.PI) / 180);
    const dLatMeters = (lat2 - lat1) * 111139;
    const dLonMeters = (lon2 - lon1) * 111139 * cosLat;
    const segLen = Math.hypot(dLatMeters, dLonMeters);

    let normalX = 0;
    let normalY = 1;

    if (segLen > 0.5) {
      // Unit perpendicular normal vector
      normalX = -dLatMeters / segLen;
      normalY = dLonMeters / segLen;
    }

    // Offset 5-15 meters perpendicular from road centerline
    const offsetLat = (cfg.offsetMeters * normalY) / 111139;
    const offsetLon = (cfg.offsetMeters * normalX) / (111139 * cosLat);

    const potholeLat = Number((lat1 + offsetLat).toFixed(6));
    const potholeLon = Number((lon1 + offsetLon).toFixed(6));

    // Choose relevant road name from route steps or fallback
    const roadName =
      roadNames[i % roadNames.length] ||
      (i === 1 ? `${baseRoadName} Sector B` : `${baseRoadName} Lane ${i + 1}`);

    hazards.push({
      id: `demo-${routeId}-${i + 1}`,
      title: `${cfg.severity} Pothole (Demo)`,
      type: 'pothole',
      severity: cfg.severity,
      lat: potholeLat,
      lng: potholeLon,
      roadName,
      firstReportedDate: new Date(Date.now() - 3600000 * (i + 2)).toLocaleDateString(),
      confirmationsCount: cfg.reportCount,
      confidence: cfg.confidence,
      aiConfidence: Math.round(cfg.confidence * 100),
      manualConfidence: Math.round(cfg.confidence * 92),
      finalConfidence: Math.round(cfg.confidence * 97),
      depthCm: cfg.depthCm,
      description: `[Simulated Demo Pothole] ${cfg.desc}`,
      verified: false,
      isDemo: true,
      distanceFromRoute: Math.round(Math.abs(cfg.offsetMeters) * 10) / 10,
      nearestRoutePoint: [lat1, lon1]
    });
  }

  return hazards;
}

export interface RouteSafetyAnalysisResult {
  safetyScore: number; // 0 - 100
  hazardCount: number;
  hazards: RoadHazard[];
  breakdown: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    total: number;
  };
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  matchedDistances: Array<{
    id: string | number;
    road: string;
    severity: SeverityLevel;
    distanceM: number;
    isDemo?: boolean;
    lat: number;
    lng: number;
  }>;
}

/**
 * Unified deterministic route safety analysis function.
 * Both real Firebase potholes and demo potholes MUST pass through this SAME function.
 *
 * Scoring Formula:
 * Start = 100
 * - CRITICAL: -16 pts
 * - HIGH: -6 pts
 * - MODERATE: -5 pts
 * - LOW: -2 pts
 * Clamped strictly between 0 and 100.
 *
 * Normal Route (1 Critical, 2 High, 1 Moderate, 1 Low) => 100 - (16 + 12 + 5 + 2) = 65/100
 * Safe Route (1 Moderate) => 100 - 5 = 95/100
 */
export function analyzeRouteSafety(
  routeCoordinates: [number, number][],
  allPotholes: RoadHazard[],
  corridorMeters: number = 30
): RouteSafetyAnalysisResult {
  if (!routeCoordinates || routeCoordinates.length < 2 || !allPotholes || allPotholes.length === 0) {
    return {
      safetyScore: 100,
      hazardCount: 0,
      hazards: [],
      breakdown: { critical: 0, high: 0, moderate: 0, low: 0, total: 0 },
      criticalCount: 0,
      highCount: 0,
      moderateCount: 0,
      lowCount: 0,
      matchedDistances: []
    };
  }

  const matchedHazards: RoadHazard[] = [];
  const matchedDistances: RouteSafetyAnalysisResult['matchedDistances'] = [];

  for (const pothole of allPotholes) {
    if (
      typeof pothole.lat !== 'number' ||
      isNaN(pothole.lat) ||
      typeof pothole.lng !== 'number' ||
      isNaN(pothole.lng)
    ) {
      continue;
    }

    const proj = projectPointOntoRoutePolyline(pothole.lat, pothole.lng, routeCoordinates);

    if (proj.crossTrackDistanceMeters <= corridorMeters) {
      matchedHazards.push({
        ...pothole,
        distanceFromRoute: proj.crossTrackDistanceMeters,
        nearestRoutePoint: proj.nearestPoint
      });

      matchedDistances.push({
        id: pothole.id,
        road: pothole.roadName,
        severity: pothole.severity,
        distanceM: proj.crossTrackDistanceMeters,
        isDemo: pothole.isDemo,
        lat: pothole.lat,
        lng: pothole.lng
      });
    }
  }

  const criticalCount = matchedHazards.filter((h) => h.severity === 'CRITICAL').length;
  const highCount = matchedHazards.filter((h) => h.severity === 'HIGH').length;
  const moderateCount = matchedHazards.filter((h) => h.severity === 'MODERATE').length;
  const lowCount = matchedHazards.filter((h) => h.severity === 'LOW').length;

  const penalty =
    criticalCount * 16 +
    highCount * 6 +
    moderateCount * 5 +
    lowCount * 2;

  const safetyScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    safetyScore,
    hazardCount: matchedHazards.length,
    hazards: matchedHazards,
    breakdown: {
      critical: criticalCount,
      high: highCount,
      moderate: moderateCount,
      low: lowCount,
      total: matchedHazards.length
    },
    criticalCount,
    highCount,
    moderateCount,
    lowCount,
    matchedDistances
  };
}

/**
 * City Quick-Demo Presets for Testing Anywhere in the World
 */
export interface DemoCityPreset {
  id: string;
  cityName: string;
  tag: string;
  origin: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  destination: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
}

export const DEMO_CITY_PRESETS: DemoCityPreset[] = [
  {
    id: 'nagpur-station',
    cityName: 'Nagpur',
    tag: 'Test 1',
    origin: {
      name: 'Dharampeth, Nagpur',
      address: 'West High Court Road, Dharampeth, Nagpur',
      latitude: 21.1438,
      longitude: 79.0598
    },
    destination: {
      name: 'Nagpur Railway Station',
      address: 'Sitabuldi East, Railway Colony, Nagpur',
      latitude: 21.1528,
      longitude: 79.0889
    }
  },
  {
    id: 'mumbai-gateway',
    cityName: 'Mumbai',
    tag: 'Test 2',
    origin: {
      name: 'Mumbai Airport (BOM)',
      address: 'Chhatrapati Shivaji Maharaj International Airport, Mumbai',
      latitude: 19.0896,
      longitude: 72.8656
    },
    destination: {
      name: 'Gateway of India',
      address: 'Apollo Bandar, Colaba, Mumbai',
      latitude: 18.9220,
      longitude: 72.8347
    }
  },
  {
    id: 'pune-hinjewadi',
    cityName: 'Pune',
    tag: 'Test 3',
    origin: {
      name: 'Pune Railway Station',
      address: 'Somwar Peth, Pune',
      latitude: 18.5284,
      longitude: 73.8739
    },
    destination: {
      name: 'Hinjewadi IT Park',
      address: 'Phase 1, Hinjewadi Rajiv Gandhi Infotech Park, Pune',
      latitude: 18.5913,
      longitude: 73.7389
    }
  },
  {
    id: 'delhi-indiagate',
    cityName: 'Delhi',
    tag: 'National',
    origin: {
      name: 'Connaught Place',
      address: 'Inner Circle, Connaught Place, New Delhi',
      latitude: 28.6315,
      longitude: 77.2167
    },
    destination: {
      name: 'India Gate',
      address: 'Rajpath, India Gate, New Delhi',
      latitude: 28.6129,
      longitude: 77.2295
    }
  },
  {
    id: 'bengaluru-whitefield',
    cityName: 'Bengaluru',
    tag: 'Silicon Valley',
    origin: {
      name: 'Majestic Bus Stand',
      address: 'Gubbi Thotadappa Rd, Bengaluru',
      latitude: 12.9767,
      longitude: 77.5713
    },
    destination: {
      name: 'Indiranagar Metro',
      address: '100 Feet Rd, Indiranagar, Bengaluru',
      latitude: 12.9784,
      longitude: 77.6408
    }
  }
];
