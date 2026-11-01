import { Request, Response } from 'express';
import { PotholeService } from '../services/pothole/potholeService';
import { AIDetectionService } from '../services/aiDetection/aiDetectionService';
import { AIVerificationService } from '../services/aiDetection/aiVerificationService';
import { reverseGeocode } from '../services/geocoding/geocodingService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { haversineDistanceMeters } from '../database/db';

export class HazardController {
  public static async getHazardsOnRoute(req: Request, res: Response): Promise<void> {
    try {
      const { routeCoordinates, corridorMeters = 30 } = req.body;
      if (!routeCoordinates || !Array.isArray(routeCoordinates)) {
        res.status(400).json({
          success: false,
          error: 'routeCoordinates array is required'
        });
        return;
      }

      const threshold = Number(corridorMeters) || 30;
      const result = await PotholeService.getOnRouteFromFirebase(routeCoordinates, threshold);
      const hazards = result.hazards;

      // Breakdown by severity
      const breakdown = {
        total: hazards.length,
        critical: hazards.filter((h) => h.severity === 'CRITICAL').length,
        high: hazards.filter((h) => h.severity === 'HIGH').length,
        moderate: hazards.filter((h) => h.severity === 'MODERATE').length,
        low: hazards.filter((h) => h.severity === 'LOW').length
      };

      res.json({
        success: true,
        hazards,
        breakdown,
        debug: {
          totalFirebaseChecked: result.totalFirebaseChecked,
          matchedWithinThreshold: result.matchedWithinThreshold,
          corridorThresholdMeters: result.corridorThresholdMeters,
          nearestDistances: result.distances
        }
      });
    } catch (err: any) {
      console.error('getHazardsOnRoute error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lon, radius } = req.query;
      if (lat && lon) {
        const radiusMeters = radius ? Number(radius) : 5000;
        const hazards = PotholeService.getNearby(Number(lat), Number(lon), radiusMeters);
        res.json({ success: true, hazards });
        return;
      }

      const hazards = await PotholeService.getAllAsync();
      res.json({ success: true, hazards });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const hazard = PotholeService.getById(id);
      if (!hazard) {
        res.status(404).json({ success: false, error: 'Hazard not found' });
        return;
      }
      res.json({ success: true, hazard });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async report(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        latitude,
        longitude,
        severity: userSeverity,
        road_name,
        image_url,
        depth_estimate_cm
      } = req.body;

      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({
          success: false,
          error: 'latitude and longitude numbers are required'
        });
        return;
      }

      let roadName = road_name;
      if (!roadName || !roadName.trim()) {
        roadName = await reverseGeocode(latitude, longitude);
      }

      // If user uploaded an image or didn't supply severity, pass through AI Detection
      let finalSeverity = userSeverity;
      let aiConfidence = 0.89;
      let depthEstimate = depth_estimate_cm;

      if (image_url || !finalSeverity) {
        const aiResult = await AIDetectionService.analyzeRoadFrame({
          image: image_url,
          latitude,
          longitude,
          roadName
        });
        if (!finalSeverity) {
          finalSeverity = aiResult.severity;
        }
        aiConfidence = aiResult.confidence;
        if (!depthEstimate) {
          depthEstimate = aiResult.depthEstimateCm;
        }
      }

      // Validate severity
      const validSeverities = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
      if (!validSeverities.includes(finalSeverity)) {
        finalSeverity = 'HIGH';
      }

      const result = PotholeService.report({
        latitude,
        longitude,
        severity: finalSeverity,
        road_name: roadName,
        confidence: aiConfidence,
        depth_estimate_cm: depthEstimate,
        image_url,
        reported_by: req.user?.id
      });

      res.status(201).json({
        success: true,
        pothole: result.pothole,
        isDuplicate: result.isDuplicate,
        message: result.isDuplicate
          ? 'Existing pothole record verified and vote count updated.'
          : 'New road safety hazard registered successfully.'
      });
    } catch (err: any) {
      console.error('report pothole error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async update(req: Request, res: Response): Promise<void> {
    try {
      const id = Number(req.params.id);
      const updated = PotholeService.update(id, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Hazard not found' });
        return;
      }
      res.json({ success: true, pothole: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Search for nearby active pothole candidates near given GPS coordinates
   */
  public static async getNearbyCandidate(req: Request, res: Response): Promise<void> {
    try {
      const { lat, lng, radius = 25 } = req.query;
      if (!lat || !lng) {
        res.status(400).json({ success: false, error: 'lat and lng parameters are required' });
        return;
      }

      const latitude = Number(lat);
      const longitude = Number(lng);
      const radiusMeters = Number(radius);

      // Only search for active (unresolved) potholes
      const nearby = PotholeService.getNearby(latitude, longitude, radiusMeters, false);

      res.json({
        success: true,
        candidate: nearby.length > 0 ? nearby[0] : null,
        nearbyCount: nearby.length,
        allNearby: nearby
      });
    } catch (err: any) {
      console.error('getNearbyCandidate error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get removal verification history records
   */
  public static async getRemovalHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = await PotholeService.getRemovalRequests();
      res.json({
        success: true,
        history
      });
    } catch (err: any) {
      console.error('getRemovalHistory error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Pothole Removal / Report Pothole Fixed Verification Pipeline:
   * 1. Check for Active Pothole in DB / Firestore
   * 2. Haversine GPS Distance Check (10-20m threshold)
   * 3. AI Dual-Image Multimodal Verification (Gemini AI)
   * 4. Structured Decision Evaluation & Audit Logging
   */
  public static async verifyRemoval(req: Request, res: Response): Promise<void> {
    try {
      const {
        potholeId,
        newLatitude,
        newLongitude,
        newImage,
        submittedBy = 'Citizen Reporter',
        radiusMeters = 20
      } = req.body;

      if (!newImage) {
        res.status(400).json({
          success: false,
          approved: false,
          error: 'Image quality is too low for verification. Please capture a clearer photo.',
          stage: 'IMAGE_MISSING'
        });
        return;
      }

      if (typeof newLatitude !== 'number' || typeof newLongitude !== 'number') {
        res.status(400).json({
          success: false,
          approved: false,
          error: 'Current GPS coordinates (latitude and longitude) are required.',
          stage: 'GPS_MISSING'
        });
        return;
      }

      // 1. Locate the active pothole
      let targetPothole: any = null;
      if (potholeId) {
        targetPothole = PotholeService.getById(potholeId);
      }

      // If not supplied or not found by ID, search nearby within radius
      if (!targetPothole || targetPothole.status === 'resolved') {
        const nearby = PotholeService.getNearby(newLatitude, newLongitude, radiusMeters, false);
        if (nearby.length > 0) {
          targetPothole = nearby[0];
        }
      }

      if (!targetPothole || targetPothole.status === 'resolved') {
        res.status(404).json({
          success: false,
          approved: false,
          error: 'No active pothole found at this location.',
          stage: 'SEARCH_FAILED',
          message: 'No active pothole found at this location.'
        });
        return;
      }

      // 2. Haversine GPS Distance Verification
      const distance = haversineDistanceMeters(
        targetPothole.latitude,
        targetPothole.longitude,
        newLatitude,
        newLongitude
      );

      // Threshold check (configurable, default 20 meters)
      const allowedRadius = Math.max(10, Number(radiusMeters) || 20);
      if (distance > allowedRadius) {
        res.status(400).json({
          success: false,
          approved: false,
          error: 'Location mismatch. Please capture the photo at the reported pothole location.',
          stage: 'GPS_MISMATCH',
          distanceMeters: Math.round(distance),
          allowedRadiusMeters: allowedRadius,
          pothole: targetPothole
        });
        return;
      }

      // 3. AI Multimodal Verification via Gemini
      const originalImageUrl =
        targetPothole.image_url ||
        'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80';

      const aiResult = await AIVerificationService.verifyPotholeRepair({
        originalImageUrl,
        newImageUrl: newImage,
        roadName: targetPothole.road_name,
        severity: targetPothole.severity,
        depthCm: targetPothole.depth_estimate_cm
      });

      // 4. Evaluate decision
      const isApproved =
        aiResult.decision === 'REPAIRED' &&
        aiResult.pothole_repaired === true &&
        aiResult.new_pothole_visible === false &&
        aiResult.same_location === true &&
        !aiResult.reused_image &&
        aiResult.confidence >= 0.70;

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      if (!isApproved) {
        let rejectionError = 'Verification could not be completed confidently. Please submit another clear photo.';

        if (aiResult.decision === 'REUSED_IMAGE' || aiResult.reused_image) {
          rejectionError = 'This appears to be the original/reused image. Please capture a new photo.';
        } else if (aiResult.decision === 'POTHOLE_STILL_EXISTS' || aiResult.new_pothole_visible) {
          rejectionError = 'Pothole still exists at this location. Removal cannot be approved.';
        } else if (aiResult.decision === 'LOCATION_MISMATCH' || !aiResult.same_location) {
          rejectionError = 'Location mismatch. Please capture the photo at the reported pothole location.';
        } else if (aiResult.decision === 'UNRELATED_IMAGE') {
          rejectionError = 'The uploaded image does not appear to show the reported pothole location.';
        } else if (aiResult.decision === 'LOW_CONFIDENCE' || !aiResult.image_quality_ok) {
          rejectionError = 'Image quality is too low for verification. Please capture a clearer photo.';
        }

        // Audit log rejected verification
        PotholeService.addRemovalRequest({
          id: requestId,
          potholeId: targetPothole.id,
          oldImageUrl: originalImageUrl,
          newImageUrl: newImage,
          oldLatitude: targetPothole.latitude,
          oldLongitude: targetPothole.longitude,
          newLatitude,
          newLongitude,
          gpsDistanceMeters: Math.round(distance),
          aiResult: aiResult.decision,
          aiConfidence: aiResult.confidence,
          aiReason: aiResult.reason || rejectionError,
          status: 'rejected',
          submittedBy,
          createdAt: new Date().toISOString()
        });

        res.json({
          success: false,
          approved: false,
          error: rejectionError,
          aiResult,
          distanceMeters: Math.round(distance),
          pothole: targetPothole,
          requestId
        });
        return;
      }

      // 5. Approved: Mark Pothole as Resolved
      PotholeService.resolve(targetPothole.id);

      // Audit log approved verification record
      const removalRecord = {
        id: requestId,
        potholeId: targetPothole.id,
        oldImageUrl: originalImageUrl,
        newImageUrl: newImage,
        oldLatitude: targetPothole.latitude,
        oldLongitude: targetPothole.longitude,
        newLatitude,
        newLongitude,
        gpsDistanceMeters: Math.round(distance),
        aiResult: 'REPAIRED',
        aiConfidence: aiResult.confidence,
        aiReason: aiResult.reason || 'AI verification confirms that the reported pothole has been repaired.',
        status: 'approved' as const,
        submittedBy,
        createdAt: new Date().toISOString()
      };

      PotholeService.addRemovalRequest(removalRecord);

      res.json({
        success: true,
        approved: true,
        message: 'Pothole verified as repaired. It has been removed from the active map.',
        potholeId: targetPothole.id,
        distanceMeters: Math.round(distance),
        aiResult,
        removalRecord
      });
    } catch (err: any) {
      console.error('verifyRemoval error:', err);
      res.status(500).json({ success: false, error: err.message || 'Removal verification failed' });
    }
  }
}
