/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Source: Google Maps Platform Code Assist
// Attribution ID: gmp_mcp_codeassist_v1_aistudio

export interface GooglePlaceSuggestion {
  place_id: string;
  name: string;
  display_name: string;
  address?: string;
  city?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

export interface GooglePlaceDetail {
  place_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export class GoogleMapsPlatformService {
  private static getApiKey(): string | null {
    return process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || null;
  }

  /**
   * Autocomplete search using Google Places API (New)
   * Falls back to high-accuracy OSM/Photon index with local geographic bias when API key is unconfigured.
   */
  public static async autocomplete(
    query: string,
    biasCoords?: { latitude: number; longitude: number }
  ): Promise<GooglePlaceSuggestion[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const apiKey = this.getApiKey();

    // 1. If Google Maps API key is present, call Google Places API (New) Autocomplete
    if (apiKey) {
      try {
        const body: Record<string, any> = {
          input: cleanQuery,
          regionCode: 'IN' // India-focused search configuration
        };

        if (biasCoords) {
          body.locationBias = {
            circle: {
              center: {
                latitude: biasCoords.latitude,
                longitude: biasCoords.longitude
              },
              radius: 50000.0 // 50km radius bias around current location
            }
          };
        }

        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types'
          },
          body: JSON.stringify(body)
        });

        if (res.ok) {
          const data = await res.json();
          if (data.suggestions && data.suggestions.length > 0) {
            // Resolve place coordinates in parallel for the top suggestions
            const detailPromises = data.suggestions.slice(0, 6).map(async (item: any) => {
              const pred = item.placePrediction;
              if (!pred || !pred.placeId) return null;

              const placeId = pred.placeId;
              const mainText =
                pred.structuredFormat?.mainText?.text || pred.text?.text || cleanQuery;
              const secondaryText = pred.structuredFormat?.secondaryText?.text || '';
              const fullText = pred.text?.text || `${mainText}, ${secondaryText}`;

              const detail = await this.getPlaceDetails(placeId);
              return {
                place_id: placeId,
                name: mainText,
                display_name: fullText,
                address: secondaryText || detail?.address || fullText,
                latitude: detail ? detail.latitude : 0,
                longitude: detail ? detail.longitude : 0,
                category: pred.types?.[0] || 'place'
              } as GooglePlaceSuggestion;
            });

            const resolvedSuggestions = (await Promise.all(detailPromises)).filter(
              Boolean
            ) as GooglePlaceSuggestion[];

            if (resolvedSuggestions.length > 0) {
              return resolvedSuggestions;
            }
          }
        }
      } catch (err) {
        console.warn('Google Places API (New) call error, using resilient fallback:', err);
      }
    }

    // 2. High-Accuracy Location Resolver (Photon + Nominatim)
    // Matches exact real locations (colleges, landmarks, streets, sectors) without mock/fake coordinates.
    return this.searchGeospatialDatabase(cleanQuery, biasCoords);
  }

  /**
   * Place Details from Google Places API (New)
   */
  public static async getPlaceDetails(placeId: string): Promise<GooglePlaceDetail | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,types'
          }
        }
      );

      if (res.ok) {
        const data = await res.json();
        return {
          place_id: data.id || placeId,
          name: data.displayName?.text || '',
          address: data.formattedAddress || '',
          latitude: data.location?.latitude || 0,
          longitude: data.location?.longitude || 0
        };
      }
    } catch (err) {
      console.warn('Error fetching Google Place details:', err);
    }
    return null;
  }

  /**
   * Reverse geocode using Google Maps Geocoding API if key configured
   */
  public static async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) return null;

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results[0].formatted_address;
        }
      }
    } catch (err) {
      console.warn('Google reverse geocode error:', err);
    }
    return null;
  }

  /**
   * Resilient, high-accuracy geospatial search using real geographical databases.
   * Accurately resolves:
   * - "GH Raisoni College" -> G.H Raisoni college of engineering (CRPF Gate No. 3, Hingna Rd, Digdoh Hills, Nagpur)
   * - "Dharampeth Nagpur" -> Dharampeth, Nagpur
   * - "Sitabuldi Nagpur" -> Sitabuldi, Nagpur
   * - "Vasudev Nagar Nagpur" -> Vasudev Nagar, Nagpur
   * - "Nagpur" -> Nagpur City
   * - Any other landmark, hospital, college, or street address.
   */
  private static async searchGeospatialDatabase(
    query: string,
    biasCoords?: { latitude: number; longitude: number }
  ): Promise<GooglePlaceSuggestion[]> {
    const results: GooglePlaceSuggestion[] = [];
    const seenCoordinates = new Set<string>();

    // Step A: Query Photon (OpenStreetMap Lucene index) with optional geographical bias
    try {
      const biasParam = biasCoords
        ? `&lat=${biasCoords.latitude}&lon=${biasCoords.longitude}`
        : '';
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}${biasParam}&limit=7`;
      const res = await fetch(photonUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features)) {
          for (const feat of data.features) {
            const coords = feat.geometry?.coordinates; // [lon, lat]
            if (!coords || coords.length < 2) continue;

            const lon = coords[0];
            const lat = coords[1];
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
            if (seenCoordinates.has(key)) continue;
            seenCoordinates.add(key);

            const props = feat.properties || {};
            const name = props.name || query;
            const addressParts = [
              props.street || props.district,
              props.city || props.town || props.village || props.county,
              props.state || props.country
            ].filter(Boolean);

            const address = addressParts.join(', ');
            const displayName = address ? `${name}, ${address}` : name;

            results.push({
              place_id: `poi_os_${props.osm_id || Math.abs(lat * 10000)}`,
              name,
              display_name: displayName,
              address,
              city: props.city || props.town || '',
              latitude: lat,
              longitude: lon,
              category: props.osm_value || props.osm_key || 'place'
            });
          }
        }
      }
    } catch (err) {
      console.warn('Photon lookup error:', err);
    }

    // Step B: If results < 3, supplement with Nominatim
    if (results.length < 3) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&addressdetails=1&limit=5`;
        const res = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'RoadSafetyApp/2.0' }
        });
        if (res.ok) {
          const data = await res.json();
          for (const item of data) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
            if (seenCoordinates.has(key)) continue;
            seenCoordinates.add(key);

            const name = item.address?.road || item.address?.amenity || item.display_name.split(',')[0];
            results.push({
              place_id: `nom_${item.place_id}`,
              name,
              display_name: item.display_name,
              address: item.display_name,
              city: item.address?.city || item.address?.town || '',
              latitude: lat,
              longitude: lon,
              category: item.type || item.class || 'place'
            });
          }
        }
      } catch (err) {
        console.warn('Nominatim lookup error:', err);
      }
    }

    return results;
  }
}
