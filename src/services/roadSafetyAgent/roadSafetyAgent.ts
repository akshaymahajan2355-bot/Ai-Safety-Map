import { projectPointOntoRoute } from '../../database/db';
import { PotholeRecord } from '../../database/seedPotholes';

export interface UpcomingHazardAlert {
  potholeId: number | string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  roadName: string;
  distanceAheadMeters: number;
  message: string;
  voiceText: string;
  recommendedAction: string;
  timestamp: string;
}

export class RoadSafetyAgent {
  /**
   * Route proximity threshold in meters (configurable between 15-25m).
   * Potholes with cross-track distance greater than this are on parallel
   * or unrelated roads and will NOT trigger alerts.
   */
  public static readonly ROUTE_PROXIMITY_THRESHOLD_METERS = 20;

  /**
   * Off-route threshold in meters.
   */
  public static readonly OFF_ROUTE_THRESHOLD_METERS = 65;

  /**
   * Distance ahead thresholds (in meters) for alerting based on severity.
   */
  private static ALERT_THRESHOLDS: Record<string, number> = {
    CRITICAL: 450, // alert up to 450m ahead
    HIGH: 380,     // alert up to 380m ahead
    MODERATE: 280, // alert up to 280m ahead
    LOW: 180       // alert up to 180m ahead
  };

  /**
   * Evaluates approaching hazards along the route ahead of the vehicle.
   * Uses projectPointOntoRoute to project vehicle and potholes onto the route geometry.
   * Calculates distanceAhead = potholeAlongRouteDistance - vehicleAlongRouteDistance.
   */
  public static evaluateUpcomingHazards(
    currentLocation: { latitude: number; longitude: number; accuracy?: number },
    routeCoordinates: [number, number][],
    allHazards: PotholeRecord[],
    alreadyAlertedPotholeIds: Set<number | string> = new Set()
  ): UpcomingHazardAlert | null {
    if (!routeCoordinates || routeCoordinates.length < 2 || allHazards.length === 0) {
      return null;
    }

    // Ignore hazard calculations if GPS accuracy is too poor (> 150m)
    if (typeof currentLocation.accuracy === 'number' && currentLocation.accuracy > 150) {
      return null;
    }

    // 1. Project vehicle onto the route
    const vehicleProj = projectPointOntoRoute(
      currentLocation.latitude,
      currentLocation.longitude,
      routeCoordinates
    );

    // If user has moved significantly away from route, do not generate alerts from old route
    if (vehicleProj.crossTrackDistanceMeters > this.OFF_ROUTE_THRESHOLD_METERS) {
      return null;
    }

    const vehicleAlongRouteDistance = vehicleProj.alongRouteDistanceMeters;

    // 2. Filter hazards that are close to the route and ahead of the user
    const upcomingCandidates: {
      pothole: PotholeRecord;
      distanceAheadMeters: number;
    }[] = [];

    for (const p of allHazards) {
      // Prevent duplicate alerts for the same pothole
      if (alreadyAlertedPotholeIds.has(p.id) || alreadyAlertedPotholeIds.has(String(p.id))) {
        continue;
      }

      // Project pothole onto route geometry
      const potholeProj = projectPointOntoRoute(p.latitude, p.longitude, routeCoordinates);

      // CRITICAL: Consider only potholes that are actually close to the selected route (within ~20m).
      // Do NOT trigger alerts for potholes on parallel or nearby unrelated roads.
      if (potholeProj.crossTrackDistanceMeters > this.ROUTE_PROXIMITY_THRESHOLD_METERS) {
        continue;
      }

      // Calculate distance along actual route geometry
      const distanceAhead = potholeProj.alongRouteDistanceMeters - vehicleAlongRouteDistance;

      // Ignore potholes that have already been passed (passed buffer: -5m)
      if (distanceAhead < -5) {
        continue;
      }

      const threshold = this.ALERT_THRESHOLDS[p.severity] || 350;

      // Candidate must be within alerting distance threshold ahead
      if (distanceAhead <= threshold) {
        upcomingCandidates.push({
          pothole: p,
          distanceAheadMeters: Math.max(0, Math.round(distanceAhead))
        });
      }
    }

    if (upcomingCandidates.length === 0) {
      return null;
    }

    // Sort by Severity Priority: CRITICAL > HIGH > MODERATE > LOW, then by proximity
    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MODERATE: 2,
      LOW: 1
    };

    upcomingCandidates.sort((a, b) => {
      const weightDiff = (severityWeight[b.pothole.severity] || 0) - (severityWeight[a.pothole.severity] || 0);
      if (weightDiff !== 0) return weightDiff;
      return a.distanceAheadMeters - b.distanceAheadMeters;
    });

    const target = upcomingCandidates[0];
    const { pothole, distanceAheadMeters } = target;

    let message = '';
    let voiceText = '';
    let recommendedAction = '';

    switch (pothole.severity) {
      case 'CRITICAL':
        message = `🚨 CRITICAL pothole detected ${distanceAheadMeters}m ahead on ${pothole.road_name}. Reduce speed immediately!`;
        voiceText = `Warning! Critical pothole ${distanceAheadMeters} meters ahead on ${pothole.road_name}. Reduce speed immediately.`;
        recommendedAction = 'Slow down below 20 km/h and prepare to steer around crater.';
        break;
      case 'HIGH':
        message = `⚠️ High-severity pothole detected ${distanceAheadMeters}m ahead on ${pothole.road_name}.`;
        voiceText = `Caution! High severity pothole ${distanceAheadMeters} meters ahead on ${pothole.road_name}.`;
        recommendedAction = 'Reduce speed and maintain safe distance from lane edge.';
        break;
      case 'MODERATE':
        message = `🟡 Moderate road damage detected ${distanceAheadMeters}m ahead on ${pothole.road_name}.`;
        voiceText = `Moderate road hazard ${distanceAheadMeters} meters ahead. Proceed with caution.`;
        recommendedAction = 'Keep steady steering and stay centered in lane.';
        break;
      case 'LOW':
        message = `🟢 Low-severity road unevenness ${distanceAheadMeters}m ahead on ${pothole.road_name}.`;
        voiceText = `Minor road unevenness ahead.`;
        recommendedAction = 'Normal driving condition.';
        break;
    }

    return {
      potholeId: pothole.id,
      severity: pothole.severity,
      roadName: pothole.road_name,
      distanceAheadMeters,
      message,
      voiceText,
      recommendedAction,
      timestamp: new Date().toISOString()
    };
  }
}
