import { PrimaryVehicleType, RoadHazard, SeverityLevel, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';

export interface CalculatedRisk {
  level: SeverityLevel;
  score: number; // 0 - 100 risk score
  baseSeverity: SeverityLevel;
  vehicleLabel: string;
  label: string;
  color: string;
  badgeBg: string;
  reason: string;
  voicePrompt: string;
}

/**
 * Normalizes any vehicle key (including legacy aliases) to one of the 4 primary types:
 * car | bike | cycle | other
 */
export function normalizeVehicleType(vehicle: VehicleType | string): PrimaryVehicleType {
  const v = (vehicle || '').toLowerCase();
  if (v === 'bike' || v === 'scooter' || v === 'motorcycle') return 'bike';
  if (v === 'cycle' || v === 'bicycle') return 'cycle';
  if (v === 'other' || v === 'auto_rickshaw' || v === 'auto' || v === 'truck' || v === 'bus') return 'other';
  return 'car';
}

/**
 * Configurable Vehicle-Specific Risk Matrix
 * Base Pothole Severity + Vehicle Risk = Vehicle-Specific Risk
 *
 * | Base Severity | Car      | Bike     | Cycle    | Other    |
 * | Low           | Low      | Moderate | High     | Low      |
 * | Moderate      | Moderate | High     | Critical | Moderate |
 * | High          | High     | Critical | Critical | High     |
 * | Critical      | Critical | Critical | Critical | Critical |
 */
export const VEHICLE_RISK_MATRIX: Record<
  SeverityLevel,
  Record<PrimaryVehicleType, SeverityLevel>
> = {
  LOW: {
    car: 'LOW',
    bike: 'MODERATE',
    cycle: 'HIGH',
    other: 'LOW'
  },
  MODERATE: {
    car: 'MODERATE',
    bike: 'HIGH',
    cycle: 'CRITICAL',
    other: 'MODERATE'
  },
  HIGH: {
    car: 'HIGH',
    bike: 'CRITICAL',
    cycle: 'CRITICAL',
    other: 'HIGH'
  },
  CRITICAL: {
    car: 'CRITICAL',
    bike: 'CRITICAL',
    cycle: 'CRITICAL',
    other: 'CRITICAL'
  }
};

/**
 * Calculate vehicle-specific risk from base severity and vehicle type
 */
export function getVehicleSpecificRisk(
  baseSeverity: SeverityLevel,
  vehicle: VehicleType | string
): SeverityLevel {
  const normVehicle = normalizeVehicleType(vehicle);
  const matrixRow = VEHICLE_RISK_MATRIX[baseSeverity] || VEHICLE_RISK_MATRIX.MODERATE;
  return matrixRow[normVehicle] || baseSeverity;
}

export interface ConfidenceCalculationInput {
  aiConfidence: number; // 0 - 100
  manualConfidence: number; // 0 - 100
  photoAvailable?: boolean;
  gpsVerified?: boolean;
}

export interface ConfidenceCalculationResult {
  aiConfidence: number;
  manualEvidenceConfidence: number;
  finalConfidence: number;
  photoAvailable: boolean;
  gpsVerified: boolean;
  formulaDescription: string;
}

/**
 * Calculate final confidence score from AI confidence + Manual/Evidence confidence + Supporting evidence
 */
export function calculateFinalConfidence({
  aiConfidence,
  manualConfidence,
  photoAvailable = true,
  gpsVerified = true
}: ConfidenceCalculationInput): ConfidenceCalculationResult {
  const clampedAi = Math.max(0, Math.min(100, Math.round(aiConfidence > 1 ? aiConfidence : aiConfidence * 100)));
  const clampedManual = Math.max(0, Math.min(100, Math.round(manualConfidence > 1 ? manualConfidence : manualConfidence * 100)));

  const photoBonus = photoAvailable ? 5 : 0;
  const gpsBonus = gpsVerified ? 5 : 0;

  // 55% AI detection confidence + 35% manual verification + 5% photo evidence + 5% GPS accuracy
  const weighted = (clampedAi * 0.55) + (clampedManual * 0.35) + photoBonus + gpsBonus;
  const finalConfidence = Math.max(15, Math.min(100, Math.round(weighted)));

  return {
    aiConfidence: clampedAi,
    manualEvidenceConfidence: clampedManual,
    finalConfidence,
    photoAvailable,
    gpsVerified,
    formulaDescription: `AI Vision (${clampedAi}%) + Manual Evidence (${clampedManual}%) + Photo (${photoAvailable ? 'Yes' : 'No'}) + GPS (${gpsVerified ? 'Yes' : 'No'})`
  };
}

/**
 * Calculates vehicle-specific risk based on Configurable Matrix & Vehicle dynamics
 */
export function calculateHazardRiskForVehicle(
  hazard: RoadHazard,
  vehicle: VehicleType | string
): CalculatedRisk {
  const normKey = normalizeVehicleType(vehicle);
  const vehicleConfig = VEHICLE_CONFIGS[vehicle as VehicleType] || VEHICLE_CONFIGS[normKey] || VEHICLE_CONFIGS.car;
  const vehicleRiskLevel = getVehicleSpecificRisk(hazard.severity, vehicle);

  let score = 50;
  switch (vehicleRiskLevel) {
    case 'CRITICAL':
      score = 92;
      break;
    case 'HIGH':
      score = 74;
      break;
    case 'MODERATE':
      score = 48;
      break;
    case 'LOW':
      score = 22;
      break;
  }

  if (vehicleRiskLevel === 'CRITICAL') {
    return {
      level: 'CRITICAL',
      score,
      baseSeverity: hazard.severity,
      vehicleLabel: vehicleConfig.label,
      label: `Critical Risk for ${vehicleConfig.label}`,
      color: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300',
      reason: `Base Severity: ${hazard.severity} → Severe hazard for ${vehicleConfig.label}. Depth of ~${hazard.depthCm || 12}cm can cause loss of vehicle control.`,
      voicePrompt: `Critical pothole detected ahead! 180m ahead. Slow down and stay alert.`
    };
  } else if (vehicleRiskLevel === 'HIGH') {
    return {
      level: 'HIGH',
      score,
      baseSeverity: hazard.severity,
      vehicleLabel: vehicleConfig.label,
      label: `High Risk for ${vehicleConfig.label}`,
      color: 'text-orange-500 dark:text-orange-400',
      badgeBg: 'bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300',
      reason: `Base Severity: ${hazard.severity} → High risk for ${vehicleConfig.label} due to wheel diameter and stability factors.`,
      voicePrompt: `High-severity pothole detected on your route, 420m ahead. AI Recommendation: Reduce speed and avoid the left side of the road.`
    };
  } else if (vehicleRiskLevel === 'MODERATE') {
    return {
      level: 'MODERATE',
      score,
      baseSeverity: hazard.severity,
      vehicleLabel: vehicleConfig.label,
      label: `Moderate Risk for ${vehicleConfig.label}`,
      color: 'text-amber-500 dark:text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
      reason: `Base Severity: ${hazard.severity} → Moderate risk for ${vehicleConfig.label}. Requires caution and reduced speed.`,
      voicePrompt: `Moderate pothole detected 650m ahead. Drive carefully.`
    };
  } else {
    return {
      level: 'LOW',
      score,
      baseSeverity: hazard.severity,
      vehicleLabel: vehicleConfig.label,
      label: `Low Risk for ${vehicleConfig.label}`,
      color: 'text-emerald-500 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
      reason: `Base Severity: ${hazard.severity} → Low risk for ${vehicleConfig.label}. Minimal surface impact under standard driving speeds.`,
      voicePrompt: `Low-severity pothole detected 900m ahead. No route change required.`
    };
  }
}

/**
 * STEP 7 — SAFETY SCORE
 * Deterministic scoring function:
 * Start at 100.
 * Deduct penalties:
 * CRITICAL = 40 penalty
 * HIGH = 25 penalty
 * Deterministic Safety Scoring System:
 * - Start = 100
 * - CRITICAL = 16 penalty
 * - HIGH = 6 penalty
 * - MODERATE = 5 penalty
 * - LOW = 2 penalty
 * Clamp between 0 and 100.
 */
export function calculateRouteSafetyScore(
  hazards: Array<{ severity: SeverityLevel | string }>,
  _vehicle?: VehicleType
): number {
  if (!hazards || hazards.length === 0) return 100;

  let score = 100;
  for (const hazard of hazards) {
    const sev = (hazard.severity || '').toUpperCase();
    if (sev === 'CRITICAL') {
      score -= 16;
    } else if (sev === 'HIGH') {
      score -= 6;
    } else if (sev === 'MODERATE') {
      score -= 5;
    } else if (sev === 'LOW') {
      score -= 2;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Haversine formula to compute distance in meters between two coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Spoken voice alert using browser Web Speech API
 */
export function speakSafetyAlert(text: string, voiceEnabled: boolean): void {
  if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.02;
    utterance.volume = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
