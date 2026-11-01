import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import { RoadHazard, RouteOption, SeverityLevel, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { calculateHazardRiskForVehicle, getVehicleSpecificRisk } from '../utils/safetyRisk';
import { getDynamicRoadPotholesForVisibleArea, VisibleMapBounds } from '../utils/dynamicRoadPotholes';

export interface LocationCoord {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  placeId?: string;
}

interface InteractiveMapProps {
  currentLocation?: LocationCoord;
  destinationLocation?: LocationCoord | null;
  userLocation?: { lat: number; lng: number; name?: string; address?: string };
  origin?: { lat: number; lng: number; name?: string } | null;
  destination?: { lat: number; lng: number; name: string; address?: string } | null;
  hazards: RoadHazard[];
  severityFilter?: Record<SeverityLevel, boolean>;
  selectedRoute: RouteOption | null;
  activeRouteId: string;
  allRoutes: RouteOption[];
  onSelectHazard: (hazard: RoadHazard) => void;
  onSelectRoute?: (routeId: string) => void;
  isNavigating: boolean;
  currentNavPosition?: { lat: number; lng: number };
  isNightMode: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onRecenterGPS?: () => void;
  isLocatingGPS?: boolean;
  userVehicle?: VehicleType;
  onVisibleHazardsChange?: (hazards: RoadHazard[]) => void;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  currentLocation,
  destinationLocation,
  userLocation,
  origin,
  destination,
  hazards,
  severityFilter = {
    CRITICAL: true,
    HIGH: true,
    MODERATE: true,
    LOW: true
  },
  selectedRoute,
  activeRouteId,
  allRoutes,
  onSelectHazard,
  onSelectRoute,
  isNavigating,
  currentNavPosition,
  isNightMode,
  onMapClick,
  onRecenterGPS,
  isLocatingGPS = false,
  userVehicle = 'bike',
  onVisibleHazardsChange
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const gpsLocationMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const hazardMarkersGroupRef = useRef<L.LayerGroup | null>(null);
  const routesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Dynamic road potholes generated for current visible map area
  const [dynamicRoadPotholes, setDynamicRoadPotholes] = useState<RoadHazard[]>([]);

  // Resolved current GPS coordinates
  const currentGpsLat = currentLocation?.latitude ?? userLocation?.lat ?? 21.1458;
  const currentGpsLng = currentLocation?.longitude ?? userLocation?.lng ?? 79.0882;
  const currentGpsAddress = currentLocation?.address || userLocation?.address || 'Current GPS Location';

  // Resolved exact destination coordinates
  const destLat = destinationLocation?.latitude ?? destination?.lat;
  const destLng = destinationLocation?.longitude ?? destination?.lng;
  const destName = destinationLocation?.name || destination?.name || 'Selected Destination';
  const destAddress = destinationLocation?.address || destination?.address || '';

  // State & refs to track user manual zoom and prevent unexpected zoom resets
  const userHasManuallyZoomedRef = useRef<boolean>(false);
  const lastFittedRouteKeyRef = useRef<string | null>(null);
  const recalcDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVisibleHazardsChangeRef = useRef(onVisibleHazardsChange);
  onVisibleHazardsChangeRef.current = onVisibleHazardsChange;

  // Recalculate dynamic road potholes based on current visible bounds and zoom level
  const recalculateVisibleRoadPotholes = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const b = map.getBounds();
      const z = map.getZoom();
      const bounds: VisibleMapBounds = {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest()
      };

      const waypoints = selectedRoute?.waypoints;
      const dyn = getDynamicRoadPotholesForVisibleArea(bounds, z, waypoints);
      setDynamicRoadPotholes(dyn);

      if (onVisibleHazardsChangeRef.current) {
        onVisibleHazardsChangeRef.current(dyn);
      }
    } catch (err) {
      console.warn('Error updating visible road potholes:', err);
    }
  }, [selectedRoute?.id]);

  // Debounced pothole recalculation during smooth panning and zooming
  const schedulePotholeRecalculation = useCallback(() => {
    if (recalcDebounceRef.current) {
      clearTimeout(recalcDebounceRef.current);
    }
    recalcDebounceRef.current = setTimeout(() => {
      recalculateVisibleRoadPotholes();
    }, 120);
  }, [recalculateVisibleRoadPotholes]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const startPos = origin || userLocation;

    const map = L.map(mapContainerRef.current, {
      center: [startPos.lat, startPos.lng],
      zoom: 14,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      dragging: true
    });

    // Detect user manual interaction so we do not override their manual zoom
    map.on('zoomstart', () => {
      userHasManuallyZoomedRef.current = true;
    });
    map.on('dragstart', () => {
      userHasManuallyZoomedRef.current = true;
    });

    const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap | AI Road Safety'
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add route vectors first, then hazard markers on top so markers are never hidden behind route polylines
    const routesGroup = L.layerGroup().addTo(map);
    const hazardGroup = L.layerGroup().addTo(map);
    routesLayerGroupRef.current = routesGroup;
    hazardMarkersGroupRef.current = hazardGroup;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    });

    // Hook visible map movement and zooming with debounced recalculation
    map.on('moveend', schedulePotholeRecalculation);
    map.on('zoomend', schedulePotholeRecalculation);

    mapInstanceRef.current = map;

    // Initial visible area calculation
    recalculateVisibleRoadPotholes();

    return () => {
      if (recalcDebounceRef.current) {
        clearTimeout(recalcDebounceRef.current);
      }
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update visible potholes whenever route changes or map moves
  useEffect(() => {
    recalculateVisibleRoadPotholes();
  }, [selectedRoute?.id, recalculateVisibleRoadPotholes]);

  // Night Mode
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (isNightMode) {
      mapContainerRef.current.classList.add('map-night-mode');
    } else {
      mapContainerRef.current.classList.remove('map-night-mode');
    }
  }, [isNightMode]);

  // 1. Accurate Current GPS Location Marker (Google Maps Style Blue Dot with Pulsing Ring)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = currentGpsLat;
    const lng = currentGpsLng;

    const gpsHtml = `
      <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
        <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center;">
          <div style="position:absolute; width:36px; height:36px; border-radius:50%; background:rgba(37,99,235,0.25); border:1.5px solid rgba(59,130,246,0.5);"></div>
          <div style="width:16px; height:16px; border-radius:50%; background:#2563eb; border:3px solid #ffffff; box-shadow:0 2px 8px rgba(0,0,0,0.35); position:relative; z-index:2;"></div>
        </div>
      </div>
    `;

    const gpsIcon = L.divIcon({
      className: 'gps-current-location-marker',
      html: gpsHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    if (gpsLocationMarkerRef.current) {
      gpsLocationMarkerRef.current.setLatLng([lat, lng]);
    } else {
      gpsLocationMarkerRef.current = L.marker([lat, lng], {
        icon: gpsIcon,
        zIndexOffset: 940
      }).addTo(map);

      gpsLocationMarkerRef.current.bindPopup(
        `<div style="font-size:12px; font-weight:700; color:#1e293b;">🔵 My Current GPS Location</div><div style="font-size:10px; color:#64748b; margin-top:2px;">${currentGpsAddress}</div>`,
        { offset: [0, -10] }
      );
    }
  }, [currentGpsLat, currentGpsLng, currentGpsAddress]);

  // 2. Exact Destination Marker (Google-Style Red Pin with Place Details & Camera Fly-To)
  const prevDestCoordsRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (destMarkerRef.current) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }

    if (destLat !== undefined && destLng !== undefined) {
      const destHtml = `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
          <div style="background:#dc2626; color:white; padding:5px 10px; border-radius:14px; font-size:11px; font-weight:800; white-space:nowrap; box-shadow:0 4px 12px rgba(220,38,38,0.4); display:flex; align-items:center; gap:5px; border:2px solid white;">
            <span>📍</span>
            <div style="display:flex; flex-direction:column; align-items:flex-start; line-height:1.2;">
              <span style="max-width:130px; overflow:hidden; text-overflow:ellipsis;">${destName}</span>
              ${destAddress ? `<span style="font-size:9px; opacity:0.85; max-width:130px; overflow:hidden; text-overflow:ellipsis;">${destAddress}</span>` : ''}
            </div>
          </div>
          <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid #dc2626;"></div>
        </div>
      `;

      const destIcon = L.divIcon({
        className: 'dest-pin',
        html: destHtml,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });

      destMarkerRef.current = L.marker([destLat, destLng], {
        icon: destIcon,
        zIndexOffset: 950
      }).addTo(map);

      // Smoothly move map camera to the selected destination if it's new
      const coordKey = `${destLat.toFixed(5)},${destLng.toFixed(5)}`;
      if (prevDestCoordsRef.current !== coordKey && !isNavigating) {
        prevDestCoordsRef.current = coordKey;
        map.flyTo([destLat, destLng], 15, { duration: 1.0 });
      }
    }
  }, [destLat, destLng, destName, destAddress, isNavigating]);

  // Live Vehicle Navigation Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pos = currentNavPosition || userLocation;

    if (!vehicleMarkerRef.current) {
      const vehicleHtml = `
        <div class="pulsing-user-pin" style="width:36px; height:36px; border-radius:50%; background:#2563eb; border:3px solid white; box-shadow:0 4px 12px rgba(37,99,235,0.5); display:flex; align-items:center; justify-content:center; font-size:18px;">
          🚗
        </div>
      `;

      const vehicleIcon = L.divIcon({
        className: 'nav-vehicle-marker',
        html: vehicleHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      vehicleMarkerRef.current = L.marker([pos.lat, pos.lng], {
        icon: vehicleIcon,
        zIndexOffset: 1100
      }).addTo(map);
    } else {
      vehicleMarkerRef.current.setLatLng([pos.lat, pos.lng]);
    }

    if (isNavigating) {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.8 });
    }
  }, [userLocation?.lat, userLocation?.lng, currentNavPosition?.lat, currentNavPosition?.lng, isNavigating]);

  // Merge dynamic visible road potholes and provided route/database hazards into one clean, non-overlapping set
  const allDisplayHazards = useMemo(() => {
    const result: RoadHazard[] = [];
    const placed: Array<{ lat: number; lng: number }> = [];

    // 1. First add on-route matched hazards (priority for active route navigation)
    const onRouteHazards = hazards.filter(
      (h) => h.distanceFromRoute !== undefined && h.distanceFromRoute <= 60
    );
    for (const h of onRouteHazards) {
      result.push(h);
      placed.push({ lat: h.lat, lng: h.lng });
    }

    // 2. Add dynamically generated road potholes that do not spatially clash (< 90m) with on-route hazards
    for (const h of dynamicRoadPotholes) {
      const isClashing = placed.some((p) => {
        const dLat = (p.lat - h.lat) * 111139;
        const dLng = (p.lng - h.lng) * 111139 * 0.93;
        return Math.hypot(dLat, dLng) < 90;
      });
      if (!isClashing) {
        result.push(h);
        placed.push({ lat: h.lat, lng: h.lng });
      }
    }

    // 3. If no active route hazards exist, also allow base non-route hazards that don't clash
    if (onRouteHazards.length === 0) {
      for (const h of hazards) {
        if (result.some((r) => String(r.id) === String(h.id))) continue;
        const isClashing = placed.some((p) => {
          const dLat = (p.lat - h.lat) * 111139;
          const dLng = (p.lng - h.lng) * 111139 * 0.93;
          return Math.hypot(dLat, dLng) < 90;
        });
        if (!isClashing) {
          result.push(h);
          placed.push({ lat: h.lat, lng: h.lng });
        }
      }
    }

    return result;
  }, [dynamicRoadPotholes, hazards]);

  // Render Pothole & Road Hazard Markers with Strict 4-Tier Severity System
  useEffect(() => {
    const group = hazardMarkersGroupRef.current;
    if (!group) return;

    group.clearLayers();

    allDisplayHazards.forEach((hazard) => {
      // Validate coordinates: only ignore records with missing or invalid coordinates
      if (
        typeof hazard.lat !== 'number' ||
        isNaN(hazard.lat) ||
        typeof hazard.lng !== 'number' ||
        isNaN(hazard.lng)
      ) {
        return;
      }

      // Filter check
      if (severityFilter && !severityFilter[hazard.severity]) return;

      // Strict 4-Tier Severity System:
      // 🔴 CRITICAL = Red
      // 🟠 HIGH = Orange
      // 🟡 MODERATE = Yellow
      // 🟢 LOW = Green
      let bgStyle = 'background: #dc2626; border: 2.5px solid white;';
      let badgeLabel = 'CRITICAL';
      let iconEmoji = '🔴';
      let glowRing = 'box-shadow: 0 0 0 5px rgba(220, 38, 38, 0.45);';
      let markerColor = '#dc2626';

      if (hazard.severity === 'HIGH') {
        bgStyle = 'background: #ea580c; border: 2.5px solid white;';
        badgeLabel = 'HIGH';
        iconEmoji = '🟠';
        glowRing = 'box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.4);';
        markerColor = '#ea580c';
      } else if (hazard.severity === 'MODERATE') {
        bgStyle = 'background: #eab308; border: 2.5px solid white;';
        badgeLabel = 'MODERATE';
        iconEmoji = '🟡';
        glowRing = 'box-shadow: 0 0 0 3.5px rgba(234, 179, 8, 0.35);';
        markerColor = '#ca8a04';
      } else if (hazard.severity === 'LOW') {
        bgStyle = 'background: #10b981; border: 2.5px solid white;';
        badgeLabel = 'LOW';
        iconEmoji = '🟢';
        glowRing = 'box-shadow: 0 0 0 2.5px rgba(16, 185, 129, 0.3);';
        markerColor = '#059669';
      }

      // Proximity to route indicator if present
      const isOnRoute = hazard.distanceFromRoute !== undefined && hazard.distanceFromRoute <= 60;
      const onRouteTag = isOnRoute
        ? `<div style="font-size:8px; font-weight:900; background:#2563eb; color:white; padding:1px 4px; border-radius:4px; margin-top:1px; border:1px solid white;">ON ROUTE (${hazard.distanceFromRoute}m)</div>`
        : '';

      const markerHtml = `
        <div style="cursor:pointer; display:flex; flex-direction:column; align-items:center; transition:transform 0.15s ease;" class="hover:scale-115">
          <div style="width:30px; height:30px; border-radius:50%; ${bgStyle} ${glowRing} display:flex; align-items:center; justify-content:center; font-size:14px; color:white; position:relative;">
            ${iconEmoji}
          </div>
          <div style="font-size:9px; font-weight:800; background:rgba(15,23,42,0.9); color:white; padding:1.5px 6px; border-radius:6px; margin-top:2px; white-space:nowrap; border:1px solid rgba(255,255,255,0.3); box-shadow:0 2px 6px rgba(0,0,0,0.3);">
            ${badgeLabel}
          </div>
          ${onRouteTag}
        </div>
      `;

      const hazardIcon = L.divIcon({
        className: `hazard-marker-${hazard.id}`,
        html: markerHtml,
        iconSize: [32, 48],
        iconAnchor: [16, 24]
      });

      const zIndex = hazard.severity === 'CRITICAL' ? 1500 : hazard.severity === 'HIGH' ? 1400 : 1300;
      const marker = L.marker([hazard.lat, hazard.lng], {
        icon: hazardIcon,
        zIndexOffset: zIndex
      });

      // Calculate Vehicle-specific risk and confidence breakdown
      const vehConfig = VEHICLE_CONFIGS[userVehicle] || VEHICLE_CONFIGS.car;
      const vehicleRisk = getVehicleSpecificRisk(hazard.severity, userVehicle);
      const calculatedRisk = calculateHazardRiskForVehicle(hazard, userVehicle);
      const aiConf =
        hazard.aiConfidence !== undefined
          ? hazard.aiConfidence
          : Math.round(hazard.confidence > 1 ? hazard.confidence : hazard.confidence * 100);
      const manualConf =
        hazard.manualConfidence !== undefined ? hazard.manualConfidence : (hazard.verified ? 90 : 80);
      const finalConf =
        hazard.finalConfidence !== undefined
          ? hazard.finalConfidence
          : Math.min(100, Math.round(aiConf * 0.55 + manualConf * 0.35 + 10));

      // Bind rich popup with required attributes:
      // Severity, Pothole ID, Road/Street name, Confidence percentage, Demo status
      const popupHtml = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; max-width: 280px; padding: 2px;">
          <!-- Demo Data Status Indicator -->
          <div style="background:#fffbeb; border:1px solid #fde68a; color:#b45309; padding:3px 7px; border-radius:6px; font-size:10px; font-weight:800; display:flex; align-items:center; gap:5px; margin-bottom:6px;">
            <span style="font-size:12px;">🧪</span>
            <span>DEMO DATA • SIMULATED - NOT VERIFIED</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin-bottom:4px;">
            <span style="font-size:11px; font-weight:900; color:${markerColor}; text-transform:uppercase; letter-spacing:0.5px;">
              ${iconEmoji} ${hazard.severity} SEVERITY
            </span>
            <span style="font-size:9px; font-weight:800; background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; padding:1px 5px; border-radius:4px; font-family:monospace;">
              #${hazard.id}
            </span>
          </div>

          <!-- Road / Street Name -->
          <div style="font-size:13px; font-weight:800; color:#0f172a; margin-bottom:4px; line-height:1.3;">
            🛣️ ${hazard.roadName}
          </div>

          <!-- Confidence percentage -->
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:10px; margin-bottom:6px; background:#eff6ff; padding:3px 7px; border-radius:6px; border:1px solid #bfdbfe;">
            <span style="font-weight:700; color:#1e40af;">Confidence Score:</span>
            <strong style="font-weight:900; color:#1d4ed8;">${finalConf}% (AI Vision)</strong>
          </div>

          <!-- Vehicle Specific Risk Banner -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:5px 8px; margin-bottom:6px;">
            <div style="display:flex; align-items:center; justify-content:space-between; font-size:10px;">
              <span style="font-weight:700; color:#334155;">${vehConfig.icon} ${vehConfig.label} Risk:</span>
              <strong style="font-weight:900; color:${calculatedRisk.color.includes('rose') || calculatedRisk.color.includes('red') ? '#dc2626' : calculatedRisk.color.includes('orange') ? '#ea580c' : calculatedRisk.color.includes('amber') ? '#d97706' : '#16a34a'};">
                ${vehicleRisk} RISK
              </strong>
            </div>
          </div>

          <div style="font-size:10px; font-family:monospace; color:#64748b; margin-bottom:4px; background:#f8fafc; padding:2px 4px; border-radius:3px;">
            GPS: ${hazard.lat.toFixed(5)}, ${hazard.lng.toFixed(5)}
          </div>

          ${hazard.imageUrl ? `
            <div style="margin-bottom:6px; border-radius:6px; overflow:hidden; border:1px solid #e2e8f0; height:80px; background:#000;">
              <img src="${hazard.imageUrl}" alt="Pothole photo" style="width:100%; height:100%; object-fit:cover;" />
            </div>
          ` : ''}

          <div style="font-size:10px; color:#475569; display:grid; grid-template-columns:1fr 1fr; gap:3px; margin-bottom:4px;">
            <div>👥 Reports: <strong>${hazard.confirmationsCount || 1}</strong></div>
            ${hazard.depthCm ? `<div>📏 Depth: <strong>~${hazard.depthCm}cm</strong></div>` : '<div></div>'}
            ${hazard.firstReportedDate ? `<div style="grid-column:1/-1; color:#94a3b8;">🗓️ Detected: ${hazard.firstReportedDate}</div>` : ''}
          </div>

          <button
            type="button"
            id="popup-btn-${hazard.id}"
            style="width:100%; margin-top:4px; padding:6px 8px; background:#2563eb; color:white; font-size:11px; font-weight:700; border:none; border-radius:6px; cursor:pointer; text-align:center; display:block;"
          >
            Open Full Safety Report →
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        offset: [0, -20],
        closeButton: true,
        autoPan: true
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`popup-btn-${hazard.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.stopPropagation();
            onSelectHazard(hazard);
          };
        }
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectHazard(hazard);
      });

      group.addLayer(marker);
    });
  }, [allDisplayHazards, severityFilter, onSelectHazard, userVehicle]);

  // Route Lines Drawing
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = routesLayerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    if (allRoutes.length > 0) {
      allRoutes.forEach((route) => {
        const isSelected = route.id === activeRouteId;
        const isSafer =
          route.id === 'safer' ||
          route.id.includes('safer') ||
          route.color === '#10b981' ||
          Boolean((route as any).isRecommended) ||
          route.name.toLowerCase().includes('safe');

        // Outer glow casing
        const casingColor = isNightMode ? '#000000' : '#ffffff';
        const casingWeight = isSelected ? 10 : 6;

        const casing = L.polyline(route.waypoints, {
          color: casingColor,
          weight: casingWeight,
          opacity: 0.9,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false
        });
        group.addLayer(casing);

        // Core Route Line (Green for safe route, blue for alternative, gray dashed for unselected)
        let coreColor = '#2563eb';
        if (isSafer) {
          coreColor = isSelected ? '#10b981' : '#059669';
        } else if (!isSelected) {
          coreColor = isNightMode ? '#64748b' : '#94a3b8';
        }

        const line = L.polyline(route.waypoints, {
          color: coreColor,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.95 : 0.65,
          dashArray: !isSelected && !isSafer ? '6, 8' : undefined,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: true
        });

        line.on('click', () => {
          if (onSelectRoute) {
            onSelectRoute(route.id);
          }
        });

        group.addLayer(line);

        // Mid-point ETA badge
        const midIdx = Math.floor(route.waypoints.length / 2);
        const midPoint = route.waypoints[midIdx];

        if (midPoint) {
          const badgeHtml = `
            <div style="background:${isSelected ? (isSafer ? '#059669' : '#2563eb') : '#475569'}; color:white; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:800; display:flex; align-items:center; gap:4px; box-shadow:0 3px 8px rgba(0,0,0,0.3); border:1.5px solid white; white-space:nowrap; cursor:pointer;">
              <span>${isSafer ? '🛡️' : '⚡'}</span>
              <span>${route.durationMinutes} min</span>
              <span style="opacity:0.85; font-size:9px;">(${route.distanceKm} km)</span>
            </div>
          `;

          const badgeIcon = L.divIcon({
            className: `route-mid-badge-${route.id}`,
            html: badgeHtml,
            iconSize: [0, 0],
            iconAnchor: [35, 12]
          });

          const badgeMarker = L.marker(midPoint, { icon: badgeIcon, zIndexOffset: 850 });
          badgeMarker.on('click', () => {
            if (onSelectRoute) {
              onSelectRoute(route.id);
            }
          });
          group.addLayer(badgeMarker);
        }
      });

      // Fit bounds ONLY when a genuinely new route is calculated.
      // Do NOT fitBounds on activeRouteId toggle or re-render, preserving user manual zoom & pan.
      const routeGeometryKey =
        allRoutes.length > 0 && allRoutes[0].waypoints.length > 0
          ? `${allRoutes[0].waypoints[0][0].toFixed(4)},${allRoutes[0].waypoints[0][1].toFixed(4)}->${allRoutes[0].waypoints[allRoutes[0].waypoints.length - 1][0].toFixed(4)},${allRoutes[0].waypoints[allRoutes[0].waypoints.length - 1][1].toFixed(4)}`
          : null;

      const isNewRoute = Boolean(routeGeometryKey && routeGeometryKey !== lastFittedRouteKeyRef.current);

      if (isNewRoute && !isNavigating) {
        lastFittedRouteKeyRef.current = routeGeometryKey;
        userHasManuallyZoomedRef.current = false;
        const allPoints = allRoutes.flatMap((r) => r.waypoints);
        if (allPoints.length > 0) {
          map.fitBounds(L.latLngBounds(allPoints), {
            padding: [75, 45],
            maxZoom: 16
          });
        }
      }
    }
  }, [allRoutes, activeRouteId, isNavigating, isNightMode, onSelectRoute]);

  const handleRecenter = () => {
    userHasManuallyZoomedRef.current = false;
    lastFittedRouteKeyRef.current = null;
    if (onRecenterGPS) {
      onRecenterGPS();
    }
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([currentGpsLat, currentGpsLng], 16, { duration: 0.8 });
  };

  const handleZoomIn = () => {
    userHasManuallyZoomedRef.current = true;
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomIn(1, { animate: true });
  };

  const handleZoomOut = () => {
    userHasManuallyZoomedRef.current = true;
    const map = mapInstanceRef.current;
    if (!map) return;
    map.zoomOut(1, { animate: true });
  };

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        id="road-safety-map"
        ref={mapContainerRef}
        className="w-full h-full border border-[#18191b]"
        style={{ borderColor: '#18191b' }}
      />

      {/* 1. DEMO DATA Indicator Overlay */}
      <div className="absolute top-20 left-3.5 z-20 pointer-events-auto">
        <div className="bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md text-white border border-amber-500/50 rounded-xl px-2.5 py-1.5 shadow-xl flex items-center gap-2 max-w-[260px]">
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute" />
            <span className="w-2 h-2 rounded-full bg-amber-400 relative" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black tracking-wider text-amber-400 uppercase">DEMO DATA</span>
              <span className="text-[8px] bg-amber-500/20 text-amber-300 font-extrabold px-1 py-0.2 rounded border border-amber-500/40">
                PROTOTYPE
              </span>
            </div>
            <p className="text-[9px] text-slate-300 leading-tight truncate">
              Dynamic road safety monitoring on road network
            </p>
          </div>
        </div>
      </div>

      {/* Floating Map Controls on right */}
      <div className="absolute right-3.5 bottom-44 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Recenter GPS */}
        <button
          id="btn-recenter-gps"
          onClick={handleRecenter}
          disabled={isLocatingGPS}
          className={`w-11 h-11 rounded-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-transform active:scale-95 hover:bg-slate-50 dark:hover:bg-slate-700 ${
            isLocatingGPS ? 'opacity-70 animate-pulse' : ''
          }`}
          title="Center on My GPS Location"
        >
          {isLocatingGPS ? (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow" />
              <div className="absolute -inset-1 rounded-full border border-blue-400 opacity-60" />
            </div>
          )}
        </button>

        {/* Zoom In/Out */}
        <div className="flex flex-col bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            className="w-11 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-200 dark:border-slate-700 font-bold text-lg"
          >
            +
          </button>
          <button
            id="btn-zoom-out"
            onClick={handleZoomOut}
            className="w-11 h-10 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-lg"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
};
