import { DestinationPlace, RoadHazard, RouteOption, SeverityLevel } from '../types';

export interface LocationSearchResult {
  place_id: string | number;
  name?: string;
  display_name: string;
  road?: string;
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

export interface GeocodingResponse {
  success: boolean;
  results: LocationSearchResult[];
  savedToFirestore?: boolean;
  error?: string;
  errorType?: 'INVALID_SEARCH' | 'LOCATION_NOT_FOUND' | 'NOMINATIM_FAILED' | 'NETWORK_ERROR' | string;
}

export class RoadSafetyAPI {
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {})
      }
    });
    if (!res.ok) {
      const errorText = await res.text();
      let parsedMessage = errorText;
      try {
        const json = JSON.parse(errorText);
        if (json.error) parsedMessage = json.error;
      } catch {}
      throw new Error(`API Error (${res.status}): ${parsedMessage}`);
    }
    return res.json();
  }

  // 1. Location Search (OpenStreetMap Nominatim Geocoding API)
  public static async searchLocations(
    query: string,
    biasCoords?: { latitude: number; longitude: number }
  ): Promise<GeocodingResponse> {
    const clean = query ? query.trim() : '';
    if (!clean || clean.length < 2) {
      return {
        success: false,
        results: [],
        errorType: 'INVALID_SEARCH',
        error: 'Please enter a valid address or place name to search (e.g., "Dighori, Nagpur").'
      };
    }

    try {
      const biasParams = biasCoords
        ? `&lat=${biasCoords.latitude}&lng=${biasCoords.longitude}`
        : '';
      const res = await fetch(`/api/location/search?q=${encodeURIComponent(clean)}${biasParams}`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data.success || !data.results || data.results.length === 0) {
        return {
          success: false,
          results: [],
          errorType: (data.errorType as any) || 'LOCATION_NOT_FOUND',
          error: data.error || `Location "${clean}" not found. Try a more specific address or landmark.`
        };
      }

      return {
        success: true,
        results: data.results,
        savedToFirestore: data.savedToFirestore
      };
    } catch (err: any) {
      console.warn('searchLocations lookup notice:', err?.message || err);
      let errorType = 'NOMINATIM_FAILED';
      let errorMsg = err?.message || 'Geocoding request failed';

      if (err?.message?.includes('404') || err?.message?.includes('not found') || err?.message?.includes('LOCATION_NOT_FOUND')) {
        errorType = 'LOCATION_NOT_FOUND';
        errorMsg = `Location "${clean}" not found. Try a more specific address or place name.`;
      } else if (err?.message?.includes('400') || err?.message?.includes('INVALID_SEARCH')) {
        errorType = 'INVALID_SEARCH';
        errorMsg = 'Please enter a valid address or place name to search.';
      } else if (
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('503') ||
        err?.message?.includes('504') ||
        err?.message?.includes('NETWORK_ERROR')
      ) {
        errorType = 'NETWORK_ERROR';
        errorMsg = 'Network error: Unable to connect to OpenStreetMap Nominatim geocoding service.';
      } else if (err?.message?.includes('429')) {
        errorType = 'NOMINATIM_FAILED';
        errorMsg = 'Nominatim rate limit reached. Please wait a few moments before searching again.';
      }

      return {
        success: false,
        results: [],
        errorType,
        error: errorMsg
      };
    }
  }

  // Record a selected geocoded location to Firebase Firestore collection "locations"
  public static async recordLocation(searchText: string, location: { latitude: number; longitude: number; address: string }) {
    try {
      return await this.request<{ success: boolean; id?: string }>('/api/location/save', {
        method: 'POST',
        body: JSON.stringify({
          searchText,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address
        })
      });
    } catch (err) {
      console.warn('recordLocation error:', err);
      return { success: false };
    }
  }

  public static async getRecentLocations() {
    try {
      return await this.request<{ success: boolean; locations: any[] }>('/api/location/recent');
    } catch {
      return { success: false, locations: [] };
    }
  }

  public static async getPlaceDetails(placeId: string) {
    try {
      const data = await this.request<{
        success: boolean;
        details: { place_id: string; name: string; address: string; latitude: number; longitude: number };
      }>(`/api/location/details?placeId=${encodeURIComponent(placeId)}`);
      return data.details || null;
    } catch {
      return null;
    }
  }

  // 2. Current Location & Reverse Geocoding
  public static async getCurrentLocation(coords?: { latitude: number; longitude: number }) {
    return this.request<{
      success: boolean;
      location: { latitude: number; longitude: number; address: string };
    }>('/api/location/current', {
      method: 'POST',
      body: JSON.stringify(coords || {})
    });
  }

  public static async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const res = await this.request<{ success: boolean; address: string }>(
        '/api/location/reverse',
        {
          method: 'POST',
          body: JSON.stringify({ latitude, longitude })
        }
      );
      return res.address;
    } catch {
      return `Road sector (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    }
  }

  // 3. Routes Calculation
  public static async getRoutes(
    origin: { latitude: number; longitude: number; name?: string },
    destination: { latitude: number; longitude: number; name?: string }
  ) {
    return this.request<{
      success: boolean;
      routes: Array<{
        id: string;
        name: string;
        type: 'fastest' | 'safer' | 'scenic';
        distanceKm: number;
        durationMinutes: number;
        coordinates: [number, number][];
        steps: Array<{
          instruction: string;
          distanceMeters: number;
          durationSeconds: number;
          roadName: string;
          latitude: number;
          longitude: number;
        }>;
        summary: string;
        potholesCount?: number;
        criticalCount?: number;
        highCount?: number;
        safetyScore?: number;
        hazardBreakdown?: { critical: number; high: number; moderate: number; low: number };
        matchedDistances?: Array<{ id: string | number; road: string; severity: string; distanceM: number }>;
      }>;
      recommendedSafeRouteId?: string;
      debug?: {
        origin: { lat: number; lon: number; name?: string };
        destination: { lat: number; lon: number; name?: string };
        routePointCount: number;
        selectedRoute: string;
        alternativeRouteCount: number;
        totalFirebasePotholesChecked: number;
        potholesWithinCorridor: number;
        corridorThresholdMeters: number;
        nearestDistances: Array<{ id: string | number; road: string; severity: string; distanceM: number }>;
      };
    }>('/api/routes', {
      method: 'POST',
      body: JSON.stringify({ origin, destination })
    });
  }

  // 4. Hazards on Selected Route Corridor (PostGIS ST_DWithin / Firebase Firestore)
  public static async getAllHazards(coords?: { lat: number; lon: number; radius?: number }) {
    const qs = coords ? `?lat=${coords.lat}&lon=${coords.lon}&radius=${coords.radius || 5000}` : '';
    return this.request<{
      success: boolean;
      hazards: Array<{
        id: number | string;
        latitude: number;
        longitude: number;
        severity: SeverityLevel;
        road_name: string;
        confidence: number;
        report_count: number;
        depth_estimate_cm?: number;
        image_url?: string;
        detected_at: string;
        verified: boolean;
        hazard_type?: string;
        vehicle_type?: string;
        timestamp?: string;
      }>;
    }>(`/api/hazards${qs}`);
  }

  public static async getHazardsOnRoute(
    routeCoordinates: [number, number][],
    corridorMeters: number = 30
  ) {
    return this.request<{
      success: boolean;
      hazards: Array<{
        id: number | string;
        latitude: number;
        longitude: number;
        severity: SeverityLevel;
        road_name: string;
        confidence: number;
        report_count: number;
        depth_estimate_cm?: number;
        image_url?: string;
        detected_at: string;
        verified: boolean;
        hazard_type?: string;
        vehicle_type?: string;
        timestamp?: string;
        distanceFromRoute?: number;
        nearestRoutePoint?: [number, number];
      }>;
      breakdown: {
        total: number;
        critical: number;
        high: number;
        moderate: number;
        low: number;
      };
      debug?: {
        totalFirebaseChecked: number;
        matchedWithinThreshold: number;
        corridorThresholdMeters: number;
        nearestDistances: Array<{
          id: string | number;
          road: string;
          severity: string;
          latitude?: number;
          longitude?: number;
          nearestRoutePoint?: [number, number];
          distanceM: number;
          confidence: number;
          hazardType: string;
          timestamp: string;
          vehicleType?: string;
        }>;
      };
    }>('/api/hazards/route', {
      method: 'POST',
      body: JSON.stringify({ routeCoordinates, corridorMeters })
    });
  }

  // 5. Safe Route Comparison
  public static async compareSafeRoutes(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    routes?: any[]
  ) {
    return this.request<{
      success: boolean;
      routes: Array<{
        routeId: string;
        routeName: string;
        distanceKm: number;
        durationMinutes: number;
        totalPotholes: number;
        criticalCount: number;
        highCount: number;
        moderateCount: number;
        lowCount: number;
        safetyScore: number;
        safetyGrade: string;
        riskLevel: string;
      }>;
      recommendedRouteId: string;
      recommendationReason: string;
      safetyDelta: number;
      timeDeltaMinutes: number;
    }>('/api/routes/safe', {
      method: 'POST',
      body: JSON.stringify({ origin, destination, routes })
    });
  }

  // 6. Report New Pothole with AI Detection and Duplicate Guard
  public static async reportPothole(data: {
    latitude: number;
    longitude: number;
    severity: SeverityLevel;
    road_name: string;
    image_url?: string;
    depth_estimate_cm?: number;
  }) {
    return this.request<{
      success: boolean;
      pothole: any;
      isDuplicate: boolean;
      message: string;
    }>('/api/hazards', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 6b. Verify Pothole Removal / Report Pothole Fixed (GPS + AI Verification Pipeline)
  public static async verifyPotholeRemoval(data: {
    potholeId?: string | number;
    newLatitude: number;
    newLongitude: number;
    newImage: string;
    submittedBy?: string;
    radiusMeters?: number;
  }) {
    return this.request<{
      success: boolean;
      approved: boolean;
      message?: string;
      error?: string;
      stage?: string;
      potholeId?: string | number;
      distanceMeters?: number;
      allowedRadiusMeters?: number;
      aiResult?: {
        same_location: boolean;
        original_pothole_visible: boolean;
        new_pothole_visible: boolean;
        pothole_repaired: boolean;
        reused_image: boolean;
        image_quality_ok: boolean;
        confidence: number;
        decision:
          | 'REPAIRED'
          | 'POTHOLE_STILL_EXISTS'
          | 'LOCATION_MISMATCH'
          | 'UNRELATED_IMAGE'
          | 'REUSED_IMAGE'
          | 'LOW_CONFIDENCE';
        reason: string;
      };
      pothole?: any;
      removalRecord?: any;
    }>('/api/hazards/verify-removal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  public static async getPotholeRemovalHistory() {
    return this.request<{
      success: boolean;
      history: Array<{
        id: string;
        potholeId: string | number;
        oldImageUrl?: string;
        newImageUrl?: string;
        oldLatitude: number;
        oldLongitude: number;
        newLatitude: number;
        newLongitude: number;
        gpsDistanceMeters: number;
        aiResult: string;
        aiConfidence: number;
        aiReason?: string;
        status: 'approved' | 'rejected';
        submittedBy?: string;
        createdAt: string;
      }>;
    }>('/api/hazards/removal-history');
  }

  public static async getNearbyActivePotholeCandidate(lat: number, lng: number, radius: number = 25) {
    return this.request<{
      success: boolean;
      candidate: any;
      nearbyCount: number;
      allNearby: any[];
    }>(`/api/hazards/nearby-candidate?lat=${lat}&lng=${lng}&radius=${radius}`);
  }

  // 7. AI Detection Integration
  public static async runAIDetection(data: {
    image?: string;
    fileName?: string;
    fingerprintMatch?: string | null;
    latitude?: number;
    longitude?: number;
    roadName?: string;
    vehicleType?: string;
    vehicle?: string;
  }) {
    return this.request<{
      success: boolean;
      error?: string;
      detection?: {
        detected: boolean;
        isNegativeReference?: boolean;
        title?: string;
        type: string;
        severity: SeverityLevel;
        confidence: number;
        confidenceDisplay?: string;
        safetyScore: number;
        safetyScoreDisplay: string;
        potholeCount?: number;
        potholes?: Array<{
          confidence: number;
          box: { x1: number; y1: number; x2: number; y2: number };
        }>;
        depthEstimateCm: number;
        dimensionsM: number;
        boundingBox?: { x: number; y: number; width: number; height: number };
        recommendedAction: string;
        suggestedRoadSide: 'LEFT' | 'CENTER' | 'RIGHT';
      };
      roadName?: string;
    }>('/api/ai/detect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // 8. Real-time GPS location update & AI Agent hazard check
  public static async pingLiveLocation(
    locOrParams:
      | {
          currentLocation?: {
            latitude: number;
            longitude: number;
            accuracy?: number;
            speed?: number | null;
            timestamp?: string | number;
          };
          latitude?: number;
          longitude?: number;
          accuracy?: number;
          speed?: number | null;
          timestamp?: string | number;
          routeCoordinates?: [number, number][];
          alreadyAlertedIds?: (number | string)[];
        }
      | { latitude: number; longitude: number; accuracy?: number },
    routeCoordsArg?: [number, number][],
    alreadyAlertedIdsArg?: (number | string)[]
  ) {
    let payload: any = {};

    if ('routeCoordinates' in locOrParams) {
      payload = locOrParams;
    } else {
      payload = {
        currentLocation: locOrParams,
        routeCoordinates: routeCoordsArg || [],
        alreadyAlertedIds: alreadyAlertedIdsArg || []
      };
    }

    return this.request<{
      success: boolean;
      currentLocation?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
        speed?: number | null;
        timestamp?: string | number;
      };
      alert: {
        potholeId: number | string;
        severity: SeverityLevel;
        roadName: string;
        distanceAheadMeters: number;
        message: string;
        voiceText: string;
        recommendedAction: string;
        timestamp?: string;
      } | null;
      isOffRoute?: boolean;
      crossTrackDistanceMeters?: number;
      activeHazardsCount?: number;
      accuracyWarning?: string;
      message?: string;
    }>('/api/location/update', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}
