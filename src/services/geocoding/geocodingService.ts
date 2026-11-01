import { saveLocationToFirestore } from '../firebase/firebaseAdmin';

export interface GeocodingResult {
  place_id: string | number;
  name?: string;
  display_name: string;
  road?: string;
  city?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

export type GeocodingErrorCode =
  | 'INVALID_SEARCH'
  | 'LOCATION_NOT_FOUND'
  | 'NOMINATIM_FAILED'
  | 'NETWORK_ERROR';

export class GeocodingError extends Error {
  public code: GeocodingErrorCode;
  public status: number;

  constructor(code: GeocodingErrorCode, message: string, status: number = 400) {
    super(message);
    this.name = 'GeocodingError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Valid OpenStreetMap Nominatim User-Agent required by Nominatim usage policy:
 * Identifies the application name and contact point.
 */
const NOMINATIM_USER_AGENT = 'SafetyAIMap/2.0 (OpenStreetMap Nominatim Geocoding; contact: akshaymahajan2355@gmail.com)';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Forward geocoding using public OpenStreetMap Nominatim API.
 * Converts user query (e.g. "Dighori, Nagpur") into latitude, longitude, and display_name.
 * Stores result into Firebase Firestore "locations" collection.
 */
export async function searchLocationsNominatim(
  query: string,
  biasCoords?: { latitude: number; longitude: number }
): Promise<{ results: GeocodingResult[]; savedToFirestore: boolean }> {
  const cleanQ = query ? query.trim() : '';

  if (!cleanQ || cleanQ.length < 2) {
    throw new GeocodingError(
      'INVALID_SEARCH',
      'Please enter a valid address or place name to search (e.g., "Dighori, Nagpur").',
      400
    );
  }

  // Construct URL for Nominatim search
  const params = new URLSearchParams({
    q: cleanQ,
    format: 'json',
    addressdetails: '1',
    limit: '8'
  });

  // If bias coordinates are available, supply bounded viewbox or proximity
  if (biasCoords && typeof biasCoords.latitude === 'number' && typeof biasCoords.longitude === 'number') {
    const lat = biasCoords.latitude;
    const lon = biasCoords.longitude;
    const delta = 0.35; // ~38km boundary box bias
    params.set('viewbox', `${lon - delta},${lat + delta},${lon + delta},${lat - delta}`);
  }

  const url = `${NOMINATIM_BASE_URL}/search?${params.toString()}`;

  let results: GeocodingResult[] = [];
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  // 1. Primary search: OpenStreetMap Nominatim
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (Array.isArray(data) && data.length > 0) {
        results = data.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          const addr = item.address || {};
          const road = addr.road || addr.pedestrian || addr.street || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.residential || '';
          const city = addr.city || addr.town || addr.village || addr.state_district || '';
          const category = item.type || item.class || 'location';

          let friendlyName = item.name;
          if (!friendlyName || friendlyName.trim() === '') {
            friendlyName = road || suburb || item.display_name.split(',')[0].trim();
          }

          return {
            place_id: item.place_id,
            name: friendlyName,
            display_name: item.display_name,
            road: road || suburb || cleanQ,
            city,
            latitude: lat,
            longitude: lon,
            category
          };
        });
      }
    }
  } catch (err: any) {
    // If Nominatim timed out or failed, continue to OSM Photon fallback
    console.warn('Nominatim forward search notice:', err?.message || err);
  } finally {
    clearTimeout(timeoutId);
  }

  // 2. Secondary fuzzy search: OpenStreetMap Photon (Komoot OSM Lucene index)
  // Handles typos (e.g. "mannegment"), abbreviations ("Gh" -> "G H"), and partial names
  if (results.length === 0) {
    try {
      const biasParam = biasCoords && typeof biasCoords.latitude === 'number' && typeof biasCoords.longitude === 'number'
        ? `&lat=${biasCoords.latitude}&lon=${biasCoords.longitude}`
        : '';
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}${biasParam}&limit=8`;
      const photonRes = await fetch(photonUrl);

      if (photonRes.ok) {
        const photonData = await photonRes.json().catch(() => null);
        if (photonData?.features && Array.isArray(photonData.features) && photonData.features.length > 0) {
          results = photonData.features.map((feat: any, idx: number) => {
            const coords = feat.geometry?.coordinates || [0, 0]; // [lon, lat]
            const lon = coords[0];
            const lat = coords[1];
            const props = feat.properties || {};
            const name = props.name || cleanQ;
            const addressParts = [
              props.street || props.district,
              props.city || props.town || props.village || props.county,
              props.state || props.country
            ].filter(Boolean);
            const address = addressParts.join(', ');
            const displayName = address ? `${name}, ${address}` : name;

            return {
              place_id: `poi_os_${props.osm_id || idx}_${Math.abs(lat * 1000).toFixed(0)}`,
              name,
              display_name: displayName,
              road: props.street || props.district || cleanQ,
              city: props.city || props.town || '',
              latitude: lat,
              longitude: lon,
              category: props.osm_value || props.osm_key || 'place'
            };
          });
        }
      }
    } catch (photonErr: any) {
      console.warn('Photon fuzzy search notice:', photonErr?.message || photonErr);
    }
  }

  // Save top geocoded result to Firebase Firestore collection "locations"
  let savedToFirestore = false;
  if (results.length > 0) {
    try {
      const top = results[0];
      const res = await saveLocationToFirestore({
        searchText: cleanQ,
        latitude: top.latitude,
        longitude: top.longitude,
        address: top.display_name,
        createdAt: new Date().toISOString()
      });
      savedToFirestore = Boolean(res.success);
    } catch (err) {
      console.warn('⚠️ Background Firestore location save error:', err);
    }
  }

  return { results, savedToFirestore };
}

/**
 * Backward-compatible helper that returns GeocodingResult[] or throws GeocodingError.
 */
export async function searchLocations(
  query: string,
  biasCoords?: { latitude: number; longitude: number }
): Promise<GeocodingResult[]> {
  const result = await searchLocationsNominatim(query, biasCoords);
  return result.results;
}

/**
 * Reverse geocoding using OpenStreetMap Nominatim API.
 * Converts coordinates (e.g. from GPS or pothole report) into a human-readable address.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
    return `Unknown Location`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': NOMINATIM_USER_AGENT,
        'Accept': 'application/json',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn('Nominatim reverse geocode error:', err?.message || err);
  }

  return `Road sector (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
}
