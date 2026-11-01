import { Request, Response } from 'express';
import {
  searchLocationsNominatim,
  reverseGeocode,
  GeocodingError
} from '../services/geocoding/geocodingService';
import { saveLocationToFirestore, getRecentLocationsFromFirestore } from '../services/firebase/firebaseAdmin';
import { GoogleMapsPlatformService } from '../services/googleMaps/googleMapsService';
import { RoadSafetyAgent } from '../services/roadSafetyAgent/roadSafetyAgent';
import { PotholeService } from '../services/pothole/potholeService';
import { projectPointOntoRoute } from '../database/db';

export class LocationController {
  /**
   * Forward geocoding via OpenStreetMap Nominatim.
   * Converts query string (e.g. "Dighori, Nagpur") into lat, lon, display_name.
   * Auto-stores top result into Firebase Firestore collection "locations".
   */
  public static async search(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const cleanQ = q.trim();

      if (!cleanQ || cleanQ.length < 2) {
        res.status(400).json({
          success: false,
          errorType: 'INVALID_SEARCH',
          error: 'Please enter a valid address or place name to search (e.g., "Dighori, Nagpur").',
          results: []
        });
        return;
      }

      const lat = req.query.lat ? Number(req.query.lat) : undefined;
      const lng = req.query.lng ? Number(req.query.lng) : undefined;
      const biasCoords = lat && lng && !isNaN(lat) && !isNaN(lng) ? { latitude: lat, longitude: lng } : undefined;

      const { results, savedToFirestore } = await searchLocationsNominatim(cleanQ, biasCoords);

      if (!results || results.length === 0) {
        res.json({
          success: false,
          results: [],
          errorType: 'LOCATION_NOT_FOUND',
          error: `Location "${cleanQ}" not found. Try a more specific road, landmark, or city name.`,
          savedToFirestore: false,
          query: cleanQ
        });
        return;
      }

      res.json({
        success: true,
        results,
        savedToFirestore,
        query: cleanQ
      });
    } catch (err: any) {
      if (err instanceof GeocodingError) {
        if (err.code === 'LOCATION_NOT_FOUND') {
          res.json({
            success: false,
            errorType: 'LOCATION_NOT_FOUND',
            error: err.message,
            results: []
          });
          return;
        }
        res.status(err.status).json({
          success: false,
          errorType: err.code,
          error: err.message,
          results: []
        });
        return;
      }

      console.error('Location search unexpected error:', err);
      const isNetwork = err?.name === 'TypeError' || err?.message?.includes('fetch') || err?.code === 'ENOTFOUND';
      res.status(500).json({
        success: false,
        errorType: isNetwork ? 'NETWORK_ERROR' : 'NOMINATIM_FAILED',
        error: isNetwork
          ? 'Network error: Unable to connect to OpenStreetMap Nominatim service.'
          : (err.message || 'Geocoding request failed.'),
        results: []
      });
    }
  }

  /**
   * Explicitly record/save a selected geocoded location to Firebase Firestore collection "locations".
   */
  public static async saveLocationRecord(req: Request, res: Response): Promise<void> {
    try {
      const { searchText, latitude, longitude, address } = req.body;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({ success: false, error: 'Valid latitude and longitude numbers are required' });
        return;
      }

      const record = await saveLocationToFirestore({
        searchText: searchText || address || 'Search Location',
        latitude,
        longitude,
        address: address || `Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        createdAt: new Date().toISOString()
      });

      res.json({ success: true, id: record.id });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Retrieve recent geocoded locations from Firebase Firestore "locations" collection.
   */
  public static async getRecentLocations(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const locations = await getRecentLocationsFromFirestore(limit);
      res.json({ success: true, locations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async details(req: Request, res: Response): Promise<void> {
    try {
      const placeId = req.query.placeId as string;
      if (!placeId) {
        res.status(400).json({ success: false, error: 'placeId required' });
        return;
      }
      const details = await GoogleMapsPlatformService.getPlaceDetails(placeId);
      res.json({ success: true, details });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async current(req: Request, res: Response): Promise<void> {
    try {
      const defaultLat = 21.1458;
      const defaultLon = 79.0882;

      const lat = req.body?.latitude || req.query?.latitude ? Number(req.body?.latitude || req.query?.latitude) : defaultLat;
      const lon = req.body?.longitude || req.query?.longitude ? Number(req.body?.longitude || req.query?.longitude) : defaultLon;

      const address = await reverseGeocode(lat, lon);

      res.json({
        success: true,
        location: {
          latitude: lat,
          longitude: lon,
          address,
          accuracy: 12
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async reverse(req: Request, res: Response): Promise<void> {
    try {
      const { latitude, longitude } = req.body;
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
        return;
      }
      const address = await reverseGeocode(latitude, longitude);
      res.json({ success: true, address });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateLocationAndCheckHazards(req: Request, res: Response): Promise<void> {
    try {
      const {
        currentLocation,
        latitude,
        longitude,
        accuracy,
        speed,
        timestamp,
        routeCoordinates,
        alreadyAlertedIds = []
      } = req.body;

      // Extract latitude, longitude and accuracy from either currentLocation or top-level body
      const lat = typeof latitude === 'number' ? latitude : currentLocation?.latitude;
      const lon = typeof longitude === 'number' ? longitude : currentLocation?.longitude;
      const acc = typeof accuracy === 'number' ? accuracy : currentLocation?.accuracy;
      const spd = typeof speed === 'number' ? speed : currentLocation?.speed;
      const ts = timestamp || currentLocation?.timestamp || new Date().toISOString();

      // 1. Validate latitude and longitude
      if (typeof lat !== 'number' || isNaN(lat) || typeof lon !== 'number' || isNaN(lon)) {
        res.status(400).json({
          success: false,
          error: 'Valid numeric latitude and longitude are required'
        });
        return;
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        res.status(400).json({
          success: false,
          error: 'Latitude (-90 to 90) or Longitude (-180 to 180) out of valid bounds'
        });
        return;
      }

      const validatedLocation = {
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        speed: spd,
        timestamp: ts
      };

      // 2. Validate GPS accuracy: ignore for hazard calculation if accuracy is worse than ~150m
      if (typeof acc === 'number' && acc > 150) {
        res.json({
          success: true,
          currentLocation: validatedLocation,
          alert: null,
          isOffRoute: false,
          accuracyWarning: `GPS accuracy (${Math.round(acc)}m) exceeds 150m threshold. Waiting for higher accuracy satellite lock before evaluating road damage.`
        });
        return;
      }

      // 3. Return alert: null when there is no active route
      if (!routeCoordinates || !Array.isArray(routeCoordinates) || routeCoordinates.length < 2) {
        res.json({
          success: true,
          currentLocation: validatedLocation,
          alert: null,
          isOffRoute: false,
          message: 'No active route selected'
        });
        return;
      }

      // 4. Off-Route Detection
      const vehicleProj = projectPointOntoRoute(lat, lon, routeCoordinates);
      const isOffRoute = vehicleProj.crossTrackDistanceMeters > RoadSafetyAgent.OFF_ROUTE_THRESHOLD_METERS;

      if (isOffRoute) {
        res.json({
          success: true,
          currentLocation: validatedLocation,
          alert: null,
          isOffRoute: true,
          crossTrackDistanceMeters: Math.round(vehicleProj.crossTrackDistanceMeters),
          message: `Vehicle moved ${Math.round(vehicleProj.crossTrackDistanceMeters)}m off the selected route`
        });
        return;
      }

      // 5. Retrieve all relevant potholes (from Firestore if available, or local database)
      const allPotholes = await PotholeService.getAllAsync();

      // Filter only potholes on the route within proximity threshold (~20m)
      const routeHazards = PotholeService.getOnRoute(
        routeCoordinates,
        RoadSafetyAgent.ROUTE_PROXIMITY_THRESHOLD_METERS,
        allPotholes
      );

      // 6. Pass data to RoadSafetyAgent
      const alertedSet = new Set<string | number>(alreadyAlertedIds.map(String));
      const alert = RoadSafetyAgent.evaluateUpcomingHazards(
        validatedLocation,
        routeCoordinates,
        routeHazards,
        alertedSet
      );

      res.json({
        success: true,
        currentLocation: validatedLocation,
        alert,
        isOffRoute: false,
        crossTrackDistanceMeters: Math.round(vehicleProj.crossTrackDistanceMeters),
        activeHazardsCount: routeHazards.length
      });
    } catch (err: any) {
      console.error('updateLocationAndCheckHazards error:', err);
      res.status(500).json({ success: false, error: err.message || 'Internal location update error' });
    }
  }
}
