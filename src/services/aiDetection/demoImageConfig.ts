/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DemoPotholeId =
  | 'DEMO_POTHOLE_LOW'
  | 'DEMO_POTHOLE_MODERATE'
  | 'DEMO_POTHOLE_HIGH'
  | 'DEMO_POTHOLE_CRITICAL';

export interface DemoPotholeConfig {
  id: DemoPotholeId;
  severity: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  confidence: number;
  confidenceDisplay: string;
  safetyScore: number;
  safetyScoreDisplay: string;
  depthEstimateCm: number;
  dimensionsM: number;
  recommendedAction: string;
  suggestedRoadSide: 'LEFT' | 'CENTER' | 'RIGHT';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  filenameKeywords: string[];
}

/**
 * 4 Predefined Controlled Reference Images:
 * - Image 1: LOW severity, safety score 39/100, estimated depth 4 cm (IMG-20261009-WA0006)
 * - Image 2: MODERATE severity, safety score 50/100, estimated depth 6 cm (IMG-20261009-WA0004)
 * - Image 3: HIGH severity, confidence 80%, safety score 80/100, estimated depth 9 cm (IMG-20261009-WA0005)
 * - Image 4: CRITICAL severity, safety score 92/100, estimated depth 12 cm (IMG-20261009-WA0007)
 */
export const DEMO_IMAGE_CONFIG: Record<DemoPotholeId, DemoPotholeConfig> = {
  DEMO_POTHOLE_LOW: {
    id: 'DEMO_POTHOLE_LOW',
    severity: 'LOW',
    confidence: 0.40,
    confidenceDisplay: '40%',
    safetyScore: 39,
    safetyScoreDisplay: '39/100',
    depthEstimateCm: 4,
    dimensionsM: 0.5,
    recommendedAction: 'Drive carefully and maintain standard lane position. Minor surface defect.',
    suggestedRoadSide: 'LEFT',
    boundingBox: {
      x: 20,
      y: 38,
      width: 60,
      height: 26
    },
    filenameKeywords: [
      'low',
      'low pathole',
      'low_pathole',
      'low-pathole',
      'low pothole',
      'low_pothole',
      'pothole_low',
      'image1',
      'image 1',
      'img1',
      'img 1',
      'img-1',
      'image_1',
      'wa0006',
      '0006',
      'img-20261009-wa0006'
    ]
  },

  DEMO_POTHOLE_MODERATE: {
    id: 'DEMO_POTHOLE_MODERATE',
    severity: 'MODERATE',
    confidence: 0.65,
    confidenceDisplay: '65%',
    safetyScore: 50,
    safetyScoreDisplay: '50/100',
    depthEstimateCm: 6,
    dimensionsM: 0.8,
    recommendedAction: 'Reduce speed and avoid the pothole.',
    suggestedRoadSide: 'CENTER',
    boundingBox: {
      x: 28,
      y: 50,
      width: 52,
      height: 32
    },
    filenameKeywords: [
      'modrate',
      'moderate',
      'modrate pathole',
      'moderate pathole',
      'modrate pothole',
      'moderate pothole',
      'modrate_pathole',
      'moderate_pothole',
      'image2',
      'image 2',
      'img2',
      'img 2',
      'img-2',
      'image_2',
      'wa0004',
      '0004',
      'img-20261009-wa0004'
    ]
  },

  DEMO_POTHOLE_HIGH: {
    id: 'DEMO_POTHOLE_HIGH',
    severity: 'HIGH',
    confidence: 0.80,
    confidenceDisplay: '80%',
    safetyScore: 80,
    safetyScoreDisplay: '80/100',
    depthEstimateCm: 9,
    dimensionsM: 1.2,
    recommendedAction: 'Slow down immediately and avoid the damaged road section.',
    suggestedRoadSide: 'CENTER',
    boundingBox: {
      x: 18,
      y: 26,
      width: 64,
      height: 46
    },
    filenameKeywords: [
      'high',
      'high.webp',
      'high pothole',
      'high pathole',
      'high_pathole',
      'high-pathole',
      'high_pothole',
      'image3',
      'image 3',
      'img3',
      'img 3',
      'img-3',
      'image_3',
      'wa0005',
      '0005',
      'img-20261009-wa0005'
    ]
  },

  DEMO_POTHOLE_CRITICAL: {
    id: 'DEMO_POTHOLE_CRITICAL',
    severity: 'CRITICAL',
    confidence: 0.95,
    confidenceDisplay: '95%',
    safetyScore: 92,
    safetyScoreDisplay: '92/100',
    depthEstimateCm: 12,
    dimensionsM: 1.8,
    recommendedAction: 'Avoid this road section and use a safer route if available.',
    suggestedRoadSide: 'RIGHT',
    boundingBox: {
      x: 14,
      y: 32,
      width: 70,
      height: 50
    },
    filenameKeywords: [
      'critical',
      'critical pathole',
      'critical_pathole',
      'critical-pathole',
      'critical pothole',
      'critical_pothole',
      'image4',
      'image 4',
      'img4',
      'img 4',
      'img-4',
      'image_4',
      'wa0007',
      '0007',
      'img-20261009-wa0007'
    ]
  }
};
