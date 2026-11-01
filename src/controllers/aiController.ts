import { Request, Response } from 'express';
import { AIDetectionService } from '../services/aiDetection/aiDetectionService';
import { reverseGeocode } from '../services/geocoding/geocodingService';

export class AIController {
  public static async detect(req: Request, res: Response): Promise<void> {
    try {
      const { image, fileName, fingerprintMatch, latitude, longitude, roadName, vehicleType, vehicle } = req.body;

      if (!image || typeof image !== 'string' || image.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Please provide a valid road image for AI pothole detection.'
        });
        return;
      }

      let resolvedRoad = roadName;
      if (!resolvedRoad && latitude && longitude) {
        try {
          resolvedRoad = await reverseGeocode(Number(latitude), Number(longitude));
        } catch {
          resolvedRoad = undefined;
        }
      }

      const result = await AIDetectionService.analyzeRoadFrame({
        image,
        fileName,
        fingerprintMatch,
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        roadName: resolvedRoad,
        vehicleType: vehicleType || vehicle || 'car'
      });

      res.json({
        success: true,
        detection: result,
        roadName: resolvedRoad || 'Observed Road Sector',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('AI detection error:', err?.message || err);
      res.status(500).json({
        success: false,
        error: err.message || 'AI vision inspection failed. Please try again.'
      });
    }
  }
}
