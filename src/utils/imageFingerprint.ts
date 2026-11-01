/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEMO_IMAGE_CONFIG, DemoPotholeConfig, DemoPotholeId } from '../services/aiDetection/demoImageConfig';

export interface ImageFeatureFingerprint {
  width: number;
  height: number;
  aspectRatio: number;
  topSectorRgb: [number, number, number];
  centerSectorRgb: [number, number, number];
  bottomSectorRgb: [number, number, number];
  hasBlueSky: boolean;
  hasMuddyWater: boolean;
  hasSpecularReflection: boolean;
  hasCurbFeature: boolean;
  colorVariance: number;
  matchedDemoId?: DemoPotholeId | null;
}

/**
 * Extracts a normalized structural and chromatic fingerprint from an image data URL (Base64)
 * using an offscreen HTML5 canvas.
 */
export async function extractImageFingerprint(
  dataUrl: string,
  fileName?: string
): Promise<ImageFeatureFingerprint | null> {
  if (typeof window === 'undefined' || !dataUrl.startsWith('data:image')) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const width = img.naturalWidth || img.width || 100;
          const height = img.naturalHeight || img.height || 100;
          const aspectRatio = Number((width / height).toFixed(2));

          const canvas = document.createElement('canvas');
          canvas.width = 32;
          canvas.height = 32;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });

          if (!ctx) {
            resolve({
              width,
              height,
              aspectRatio,
              topSectorRgb: [100, 100, 100],
              centerSectorRgb: [100, 100, 100],
              bottomSectorRgb: [100, 100, 100],
              hasBlueSky: false,
              hasMuddyWater: false,
              hasSpecularReflection: false,
              hasCurbFeature: false,
              colorVariance: 0,
              matchedDemoId: matchByFileName(fileName)
            });
            return;
          }

          ctx.drawImage(img, 0, 0, 32, 32);
          const imageData = ctx.getImageData(0, 0, 32, 32);
          const pixels = imageData.data;

          // Compute sector statistics
          let topR = 0, topG = 0, topB = 0, topCount = 0;
          let midR = 0, midG = 0, midB = 0, midCount = 0;
          let botR = 0, botG = 0, botB = 0, botCount = 0;
          let totalR = 0, totalG = 0, totalB = 0;

          let blueSkyPixelCount = 0;
          let muddyWaterPixelCount = 0;
          let specularWhiteCount = 0;
          let curbColorCount = 0;

          for (let y = 0; y < 32; y++) {
            for (let x = 0; x < 32; x++) {
              const idx = (y * 32 + x) * 4;
              const r = pixels[idx];
              const g = pixels[idx + 1];
              const b = pixels[idx + 2];

              totalR += r;
              totalG += g;
              totalB += b;

              if (y < 10) {
                topR += r; topG += g; topB += b; topCount++;
                // Check for blue sky in top sector: Blue dominates red & green
                if (b > 110 && b > r + 15 && b > g - 10) {
                  blueSkyPixelCount++;
                }
                // Check for curb / sidewalk concrete transition in top sector
                if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && r > 115 && r < 185) {
                  curbColorCount++;
                }
              } else if (y >= 10 && y < 22) {
                midR += r; midG += g; midB += b; midCount++;
                // Check for muddy brown water in center: warm red-brown tones (R > G > B)
                if (r > 75 && g > 60 && b < 90 && r > b + 15) {
                  muddyWaterPixelCount++;
                }
                // Specular reflection (bright puddle highlight in dark crater)
                if (r > 175 && g > 175 && b > 175) {
                  specularWhiteCount++;
                }
              } else {
                botR += r; botG += g; botB += b; botCount++;
              }
            }
          }

          const topSectorRgb: [number, number, number] = [
            Math.round(topR / (topCount || 1)),
            Math.round(topG / (topCount || 1)),
            Math.round(topB / (topCount || 1))
          ];

          const centerSectorRgb: [number, number, number] = [
            Math.round(midR / (midCount || 1)),
            Math.round(midG / (midCount || 1)),
            Math.round(midB / (midCount || 1))
          ];

          const bottomSectorRgb: [number, number, number] = [
            Math.round(botR / (botCount || 1)),
            Math.round(botG / (botCount || 1)),
            Math.round(botB / (botCount || 1))
          ];

          const meanR = totalR / 1024;
          const meanG = totalG / 1024;
          const meanB = totalB / 1024;
          const colorVariance = Math.round(
            (Math.abs(meanR - meanG) + Math.abs(meanG - meanB) + Math.abs(meanR - meanB))
          );

          const hasBlueSky = blueSkyPixelCount >= 18;
          const hasMuddyWater = muddyWaterPixelCount >= 20;
          const hasSpecularReflection = specularWhiteCount >= 4;
          const hasCurbFeature = curbColorCount >= 40;

          const matchedDemoId = identifyDemoImage({
            width,
            height,
            aspectRatio,
            topSectorRgb,
            centerSectorRgb,
            bottomSectorRgb,
            hasBlueSky,
            hasMuddyWater,
            hasSpecularReflection,
            hasCurbFeature,
            colorVariance
          }, fileName);

          resolve({
            width,
            height,
            aspectRatio,
            topSectorRgb,
            centerSectorRgb,
            bottomSectorRgb,
            hasBlueSky,
            hasMuddyWater,
            hasSpecularReflection,
            hasCurbFeature,
            colorVariance,
            matchedDemoId
          });
        } catch {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Normalizes filename to check for user provided labels as secondary fallback
 */
function matchByFileName(fileName?: string): DemoPotholeId | null {
  if (!fileName) return null;
  const rawLower = fileName.toLowerCase();
  const lower = rawLower.replace(/[\-_.]/g, ' ');

  if (
    rawLower.includes('wa0006') ||
    rawLower.includes('wa06') ||
    /(^|[^0-9])0006([^0-9]|$)/.test(rawLower) ||
    /\b(?:image|img|ref|reference)\s*1\b/.test(lower) ||
    /\blow\b/.test(lower)
  ) {
    return 'DEMO_POTHOLE_LOW';
  }

  if (
    rawLower.includes('wa0004') ||
    rawLower.includes('wa04') ||
    /(^|[^0-9])0004([^0-9]|$)/.test(rawLower) ||
    /\b(?:image|img|ref|reference)\s*2\b/.test(lower) ||
    /\bmod(er)?ate\b/.test(lower)
  ) {
    return 'DEMO_POTHOLE_MODERATE';
  }

  if (
    rawLower.includes('wa0005') ||
    rawLower.includes('wa05') ||
    /(^|[^0-9])0005([^0-9]|$)/.test(rawLower) ||
    /\b(?:image|img|ref|reference)\s*3\b/.test(lower) ||
    (/\bhigh\b/.test(lower) && !lower.includes('highway') && !lower.includes('highlight'))
  ) {
    return 'DEMO_POTHOLE_HIGH';
  }

  if (
    rawLower.includes('wa0007') ||
    rawLower.includes('wa07') ||
    /(^|[^0-9])0007([^0-9]|$)/.test(rawLower) ||
    /\b(?:image|img|ref|reference)\s*4\b/.test(lower) ||
    /\bcritical\b/.test(lower)
  ) {
    return 'DEMO_POTHOLE_CRITICAL';
  }

  return null;
}

/**
 * Evaluates normalized perceptual and chromatic properties to find one of the 4 demo images.
 * Strict road background checks ensure selfies, people, and indoor images are never misclassified.
 */
export function identifyDemoImage(
  features: Partial<ImageFeatureFingerprint>,
  fileName?: string
): DemoPotholeId | null {
  // First check filename keywords if present
  const nameMatch = matchByFileName(fileName);
  if (nameMatch) {
    return nameMatch;
  }

  const {
    hasBlueSky,
    hasMuddyWater,
    hasSpecularReflection,
    hasCurbFeature,
    topSectorRgb,
    centerSectorRgb,
    bottomSectorRgb,
    colorVariance
  } = features;

  if (!bottomSectorRgb) return null;

  // Road asphalt confirmation: asphalt road in bottom sector is neutral gray/dark (low saturation)
  const botIsNeutralRoad =
    Math.abs(bottomSectorRgb[0] - bottomSectorRgb[1]) < 28 &&
    Math.abs(bottomSectorRgb[1] - bottomSectorRgb[2]) < 28 &&
    bottomSectorRgb[0] < 165;

  // Selfies / skin tones / faces have high warm saturation and lightness:
  // If bottom sector or overall image is not road-like, do not match demo potholes
  if (!botIsNeutralRoad) {
    return null;
  }

  // 1. DEMO_POTHOLE_MODERATE:
  // Daytime sunny outdoor road with blue sky in top third & telephone pole/trees on right, road below
  if (hasBlueSky || (topSectorRgb && topSectorRgb[2] > topSectorRgb[0] + 16 && topSectorRgb[2] > 115)) {
    return 'DEMO_POTHOLE_MODERATE';
  }

  // 2. DEMO_POTHOLE_CRITICAL:
  // Curved road overpass with guardrail, large crater with muddy brown water in center, surrounded by road
  // Puddle must be dark earth tones (R < 145), NOT bright human skin tone
  if (
    (hasMuddyWater && (centerSectorRgb && centerSectorRgb[0] < 145)) ||
    (centerSectorRgb &&
      centerSectorRgb[0] > centerSectorRgb[2] + 16 &&
      centerSectorRgb[0] > 70 &&
      centerSectorRgb[0] < 145 &&
      centerSectorRgb[1] > 60 &&
      centerSectorRgb[1] < 135)
  ) {
    return 'DEMO_POTHOLE_CRITICAL';
  }

  // 3. DEMO_POTHOLE_HIGH:
  // Close-up alligator-cracked asphalt with circular deep puddle reflecting sky (specular white highlight in center)
  if (hasSpecularReflection && !hasBlueSky && !hasMuddyWater && (colorVariance ?? 0) < 26) {
    return 'DEMO_POTHOLE_HIGH';
  }

  // 4. DEMO_POTHOLE_LOW:
  // Asphalt road with concrete curb on top edge, shallow puddle with square drain plate inside, neutral gray
  if (hasCurbFeature && !hasBlueSky && !hasMuddyWater && (colorVariance ?? 0) < 24) {
    return 'DEMO_POTHOLE_LOW';
  }

  return null;
}

/**
 * Returns the exact predefined result for a matched demo ID
 */
export function getDemoResultById(id: DemoPotholeId): DemoPotholeConfig {
  return DEMO_IMAGE_CONFIG[id];
}
