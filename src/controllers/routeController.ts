import { Request, Response } from 'express';
import { calculateRoutes, CalculatedRoute } from '../services/routing/routingService';
import { SafetyScoreService } from '../services/safetyScore/safetyScoreService';
import { PotholeService } from '../services/pothole/potholeService';

export class RouteController {
  public static async getRoutes(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, corridorMeters = 30 } = req.body;
      if (!origin || !destination) {
        res.status(400).json({
          success: false,
          error: 'Both origin and destination coordinates are required'
        });
        return;
      }

      const threshold = Number(corridorMeters) || 30;
      const rawRoutes = await calculateRoutes(origin, destination);

      if (!rawRoutes || rawRoutes.length === 0) {
        res.status(404).json({ success: false, error: 'No road routes found' });
        return;
      }

      // Analyze every route against Firebase potholes with the 30m corridor threshold
      const evaluatedRoutes: Array<CalculatedRoute & {
        potholesCount: number;
        criticalCount: number;
        highCount: number;
        safetyScore: number;
        hazardBreakdown: { critical: number; high: number; moderate: number; low: number };
        matchedDistances: Array<{ id: string | number; road: string; severity: string; distanceM: number }>;
      }> = [];

      let totalFirebasePotholesChecked = 0;

      for (let i = 0; i < rawRoutes.length; i++) {
        const route = rawRoutes[i];
        const potholeMatch = await PotholeService.getOnRouteFromFirebase(route.coordinates, threshold);
        totalFirebasePotholesChecked = Math.max(totalFirebasePotholesChecked, potholeMatch.totalFirebaseChecked);

        const criticalCount = potholeMatch.hazards.filter((h) => h.severity === 'CRITICAL').length;
        const highCount = potholeMatch.hazards.filter((h) => h.severity === 'HIGH').length;
        const moderateCount = potholeMatch.hazards.filter((h) => h.severity === 'MODERATE').length;
        const lowCount = potholeMatch.hazards.filter((h) => h.severity === 'LOW').length;

        // STEP 7: Deterministic score calculation
        let score = 100 - (criticalCount * 40 + highCount * 25 + moderateCount * 10 + lowCount * 5);
        score = Math.max(0, Math.min(100, score));

        evaluatedRoutes.push({
          ...route,
          potholesCount: potholeMatch.matchedWithinThreshold,
          criticalCount,
          highCount,
          safetyScore: score,
          hazardBreakdown: {
            critical: criticalCount,
            high: highCount,
            moderate: moderateCount,
            low: lowCount
          },
          matchedDistances: potholeMatch.distances.map((d) => ({
            id: d.id,
            road: d.road,
            severity: d.severity,
            latitude: d.latitude,
            longitude: d.longitude,
            nearestRoutePoint: d.nearestRoutePoint,
            distanceM: d.distanceM
          }))
        });
      }

      // STEP 8: Safe Route Selection
      // Compare all available routes using pothole risk, total pothole count, distance, duration.
      // The Safe Route must be one of the actual routes returned by the routing engine.
      const primary = evaluatedRoutes[0];
      let recommendedSafeRouteId = primary.id;

      if (evaluatedRoutes.length > 1) {
        // Find route with highest safety score (lowest risk)
        const sortedBySafety = [...evaluatedRoutes].sort((a, b) => {
          if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
          return a.potholesCount - b.potholesCount;
        });
        const bestSafetyRoute = sortedBySafety[0];

        // Ensure reasonable duration: alternative should not take more than 1.6x of primary duration
        const isReasonableTime = bestSafetyRoute.durationMinutes <= Math.max(primary.durationMinutes * 1.6, primary.durationMinutes + 15);

        if (isReasonableTime && (bestSafetyRoute.safetyScore > primary.safetyScore || primary.criticalCount > 0 || primary.highCount > 0)) {
          recommendedSafeRouteId = bestSafetyRoute.id;
          bestSafetyRoute.type = 'safer';
          if (primary.id !== bestSafetyRoute.id) {
            primary.type = 'fastest';
          }
        }
      }

      // Requirement 9: Structured Development/Debug Logging
      console.log('======================================================');
      console.log('🛣️  [SAFETY AI ROUTE AUDIT] DEBUG INFORMATION');
      console.log('📍 Origin coordinates:', {
        lat: origin.latitude,
        lon: origin.longitude,
        name: origin.name || 'Current GPS'
      });
      console.log('🎯 Destination coordinates:', {
        lat: destination.latitude,
        lon: destination.longitude,
        name: destination.name || 'Destination'
      });
      console.log('📏 Route point count (primary):', evaluatedRoutes[0].coordinates.length);
      console.log('🗺️ Selected route:', evaluatedRoutes[0].name, `(ID: ${evaluatedRoutes[0].id})`);
      console.log('🔀 Alternative route count:', evaluatedRoutes.length - 1);
      console.log('🗄️ Number of Firebase potholes checked:', totalFirebasePotholesChecked);
      console.log(`⚠️ Number of potholes within ${threshold}m of primary route:`, evaluatedRoutes[0].potholesCount);
      console.log('🔍 Nearest distance of each relevant pothole on primary route:', evaluatedRoutes[0].matchedDistances);
      if (evaluatedRoutes.length > 1) {
        console.log(`🛡️ Recommended Safe Route: ${recommendedSafeRouteId} (Score: ${evaluatedRoutes.find(r => r.id === recommendedSafeRouteId)?.safetyScore}/100)`);
      }
      console.log('======================================================');

      res.json({
        success: true,
        routes: evaluatedRoutes,
        recommendedSafeRouteId,
        debug: {
          origin: { lat: origin.latitude, lon: origin.longitude, name: origin.name },
          destination: { lat: destination.latitude, lon: destination.longitude, name: destination.name },
          routePointCount: evaluatedRoutes[0].coordinates.length,
          selectedRoute: evaluatedRoutes[0].id,
          alternativeRouteCount: evaluatedRoutes.length - 1,
          totalFirebasePotholesChecked,
          potholesWithinCorridor: evaluatedRoutes[0].potholesCount,
          corridorThresholdMeters: threshold,
          nearestDistances: evaluatedRoutes[0].matchedDistances
        }
      });
    } catch (err: any) {
      console.error('Route calculation error:', err);
      res.status(500).json({ success: false, error: err.message || 'Route calculation failed' });
    }
  }

  public static async compareSafe(req: Request, res: Response): Promise<void> {
    try {
      const { origin, destination, routes: incomingRoutes } = req.body;

      let routesToAnalyze = incomingRoutes;
      if (!routesToAnalyze && origin && destination) {
        routesToAnalyze = await calculateRoutes(origin, destination);
      }

      if (!routesToAnalyze || routesToAnalyze.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Routes or valid origin/destination required'
        });
        return;
      }

      const comparison = SafetyScoreService.compareRoutes(routesToAnalyze);
      res.json({ success: true, ...comparison });
    } catch (err: any) {
      console.error('Route safety comparison error:', err);
      res.status(500).json({ success: false, error: err.message || 'Safety comparison failed' });
    }
  }
}
