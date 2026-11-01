import { PotholeRecord } from '../../database/seedPotholes';
import { CalculatedRoute } from '../routing/routingService';
import { PotholeService } from '../pothole/potholeService';

export interface RouteSafetyAnalysis {
  routeId: string;
  routeName: string;
  distanceKm: number;
  durationMinutes: number;
  potholes: PotholeRecord[];
  totalPotholes: number;
  criticalCount: number;
  highCount: number;
  moderateCount: number;
  lowCount: number;
  safetyScore: number; // 0 to 100
  safetyGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'DANGEROUS';
}

export interface RouteComparisonResult {
  routes: RouteSafetyAnalysis[];
  recommendedRouteId: string;
  recommendationReason: string;
  safetyDelta: number;
  timeDeltaMinutes: number;
}

export class SafetyScoreService {
  public static calculateSafetyScore(potholes: PotholeRecord[]): {
    score: number;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'DANGEROUS';
  } {
    const critical = potholes.filter((p) => p.severity === 'CRITICAL').length;
    const high = potholes.filter((p) => p.severity === 'HIGH').length;
    const moderate = potholes.filter((p) => p.severity === 'MODERATE').length;
    const low = potholes.filter((p) => p.severity === 'LOW').length;

    // STEP 7: Deterministic scoring function:
    // Base score 100
    // Deductions: Critical: -40, High: -25, Moderate: -10, Low: -5
    let score = 100 - (critical * 40 + high * 25 + moderate * 10 + low * 5);
    score = Math.max(0, Math.min(100, score));

    let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    let riskLevel: 'LOW RISK' | 'MODERATE RISK' | 'HIGH RISK' | 'DANGEROUS' = 'LOW RISK';

    if (score >= 90) {
      grade = 'A+';
      riskLevel = 'LOW RISK';
    } else if (score >= 78) {
      grade = 'A';
      riskLevel = 'LOW RISK';
    } else if (score >= 65) {
      grade = 'B';
      riskLevel = 'MODERATE RISK';
    } else if (score >= 48) {
      grade = 'C';
      riskLevel = 'HIGH RISK';
    } else if (score >= 30) {
      grade = 'D';
      riskLevel = 'DANGEROUS';
    } else {
      grade = 'F';
      riskLevel = 'DANGEROUS';
    }

    return { score, grade, riskLevel };
  }

  public static analyzeRoute(route: CalculatedRoute): RouteSafetyAnalysis {
    const potholes = PotholeService.getOnRoute(route.coordinates, 100);

    const criticalCount = potholes.filter((p) => p.severity === 'CRITICAL').length;
    const highCount = potholes.filter((p) => p.severity === 'HIGH').length;
    const moderateCount = potholes.filter((p) => p.severity === 'MODERATE').length;
    const lowCount = potholes.filter((p) => p.severity === 'LOW').length;

    const { score, grade, riskLevel } = this.calculateSafetyScore(potholes);

    return {
      routeId: route.id,
      routeName: route.name,
      distanceKm: route.distanceKm,
      durationMinutes: route.durationMinutes,
      potholes,
      totalPotholes: potholes.length,
      criticalCount,
      highCount,
      moderateCount,
      lowCount,
      safetyScore: score,
      safetyGrade: grade,
      riskLevel
    };
  }

  public static compareRoutes(routes: CalculatedRoute[]): RouteComparisonResult {
    const analyses = routes.map((r) => this.analyzeRoute(r));

    // Sort by safety score descending
    const sortedBySafety = [...analyses].sort((a, b) => b.safetyScore - a.safetyScore);
    const recommended = sortedBySafety[0];
    const fastest = [...analyses].sort((a, b) => a.durationMinutes - b.durationMinutes)[0];

    let reason = `Recommended route "${recommended.routeName}" has highest road safety score (${recommended.safetyScore}/100).`;
    const safetyDelta = recommended.safetyScore - fastest.safetyScore;
    const timeDelta = recommended.durationMinutes - fastest.durationMinutes;

    if (recommended.routeId !== fastest.routeId) {
      reason = `Only ${Math.abs(timeDelta)} mins longer, but eliminates ${
        fastest.criticalCount - recommended.criticalCount
      } critical road hazard(s) with an AI Safety Score of ${recommended.safetyScore}/100 vs ${
        fastest.safetyScore
      }/100.`;
    } else {
      reason = `The direct route is already the safest option with minimal hazards (${recommended.safetyScore}/100 Safety Index).`;
    }

    return {
      routes: analyses,
      recommendedRouteId: recommended.routeId,
      recommendationReason: reason,
      safetyDelta,
      timeDeltaMinutes: timeDelta
    };
  }
}
