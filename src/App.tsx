/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  DestinationPlace,
  NotificationItem,
  RoadHazard,
  RouteOption,
  SeverityLevel,
  UserProfile,
  VehicleType
} from './types';
import {
  FASTEST_ROUTE_STEPS,
  FASTEST_ROUTE_WAYPOINTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_USER_LOCATION,
  MOCK_USER_PROFILE,
  NAGPUR_CENTER,
  POPULAR_DESTINATIONS,
  SAFER_ROUTE_STEPS,
  SAFER_ROUTE_WAYPOINTS,
  VEHICLE_CONFIGS
} from './data/mockData';
import {
  calculateDistanceMeters,
  calculateRouteSafetyScore,
  speakSafetyAlert
} from './utils/safetyRisk';
import { LocationSearchResult, RoadSafetyAPI } from './utils/api';
import { analyzeRouteSafety, generateDemoPotholesForRoute } from './utils/demoRouteSafety';
import { getAllSessionDemoPotholes } from './utils/dynamicRoadPotholes';

// Components
import { InteractiveMap } from './components/InteractiveMap';
import { LoginVehicleFlow } from './components/LoginVehicleFlow';
import { RouteCompareSheet } from './components/RouteCompareSheet';
import { NavigationHUD, ActiveSafetyHazardAlert } from './components/NavigationHUD';
import { HazardDetailModal } from './components/HazardDetailModal';
import { AddPotholeModal } from './components/AddPotholeModal';
import { RemovePotholeModal } from './components/RemovePotholeModal';
import { NotificationPanel } from './components/NotificationPanel';
import { ExploreSearchPage } from './components/ExploreSearchPage';
import { ProfilePage } from './components/ProfilePage';
import { LoginRequiredModal, LoginRequiredAction } from './components/LoginRequiredModal';

import {
  Search,
  Bell,
  MapPin,
  Shield,
  ShieldCheck,
  Plus,
  Home,
  Compass,
  User,
  Smartphone,
  Maximize2,
  Loader2,
  AlertTriangle,
  LogIn,
  AlertCircle,
  WifiOff,
  CornerDownLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';

const DEFAULT_CALCULATING_ROUTE: RouteOption = {
  id: 'default-route',
  name: 'Calculating Route...',
  tagline: 'Analyzing road safety corridors...',
  distanceKm: 10,
  durationMinutes: 25,
  safetyScore: 85,
  hazardCount: 0,
  hazards: [],
  color: '#10b981',
  waypoints: SAFER_ROUTE_WAYPOINTS,
  steps: SAFER_ROUTE_STEPS
};

export default function App() {
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<'map' | 'explore' | 'report' | 'profile'>('map');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('safety_ai_auth_completed') === 'true';
    } catch {
      return false;
    }
  });
  const [isGuest, setIsGuest] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('safety_ai_is_guest') === 'true';
    } catch {
      return false;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loginRequiredConfig, setLoginRequiredConfig] = useState<{
    isOpen: boolean;
    actionType: LoginRequiredAction;
    customMessage?: string;
  }>({
    isOpen: false,
    actionType: 'add_pothole'
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(MOCK_USER_PROFILE);
  const [isNightMode, setIsNightMode] = useState(false);
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'auto'>('auto');

  // Remove Pothole / Report Pothole Fixed Verification State
  const [showRemovePotholeModal, setShowRemovePotholeModal] = useState(false);
  const [removeModalPreselectedHazard, setRemoveModalPreselectedHazard] = useState<RoadHazard | null>(null);

  // Location & GPS State (Google Maps Platform Standards)
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  }>({
    latitude: INITIAL_USER_LOCATION.lat,
    longitude: INITIAL_USER_LOCATION.lng,
    address: 'Sitabuldi Center, Nagpur'
  });

  const [destinationLocation, setDestinationLocation] = useState<{
    latitude: number;
    longitude: number;
    placeId?: string;
    name?: string;
    address?: string;
  } | null>({
    latitude: 21.1528,
    longitude: 79.0889,
    placeId: 'dest_1',
    name: 'Nagpur Railway Station',
    address: 'Sitabuldi East, Railway Colony, Nagpur'
  });

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; address?: string }>({
    lat: INITIAL_USER_LOCATION.lat,
    lng: INITIAL_USER_LOCATION.lng,
    address: 'Sitabuldi Center, Nagpur'
  });

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [gpsAlert, setGpsAlert] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRealGpsActive, setIsRealGpsActive] = useState(false);
  const [isGpsPermissionDenied, setIsGpsPermissionDenied] = useState(false);
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [offRouteDistance, setOffRouteDistance] = useState<number | null>(null);
  const [activeSafetyAlert, setActiveSafetyAlert] = useState<ActiveSafetyHazardAlert | null>(null);
  const [isSimulatingDriving, setIsSimulatingDriving] = useState(false);

  const lastPingTimeRef = useRef<number>(0);
  const lastOffRouteRecalcTimeRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const simStepRef = useRef<number>(0);

  // Search & Destination State (OpenStreetMap Nominatim)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchErrorType, setSearchErrorType] = useState<string | null>(null);
  const [lastSubmittedQuery, setLastSubmittedQuery] = useState<string>('');
  const [showDestinationSearchDropdown, setShowDestinationSearchDropdown] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<DestinationPlace | null>({
    id: 'dest_1',
    name: 'Nagpur Railway Station',
    address: 'Sitabuldi East, Railway Colony, Nagpur',
    category: 'Transit Hub',
    lat: 21.1528,
    lng: 79.0889,
    distance: '6.4 km'
  });

  // Hazards State from real backend
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);

  // Synchronization refs to prevent cascading re-render loops
  const hazardsRef = useRef<RoadHazard[]>(hazards);
  hazardsRef.current = hazards;
  const userProfileVehicleRef = useRef(userProfile.vehicle);
  userProfileVehicleRef.current = userProfile.vehicle;
  const currentLocationRef = useRef(currentLocation);
  currentLocationRef.current = currentLocation;
  const destinationLocationRef = useRef(destinationLocation);
  destinationLocationRef.current = destinationLocation;
  const selectedDestinationRef = useRef(selectedDestination);
  selectedDestinationRef.current = selectedDestination;
  
  // Severity Filter: 🔴 CRITICAL, 🟠 HIGH, 🟡 MODERATE, 🟢 LOW
  const [severityFilter, setSeverityFilter] = useState<Record<SeverityLevel, boolean>>({
    CRITICAL: true,
    HIGH: true,
    MODERATE: true,
    LOW: true
  });

  // Add Pothole Modal
  const [showAddPotholeModal, setShowAddPotholeModal] = useState(false);

  // Notifications State (Bell Icon top-right)
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  // Dynamic Route Options
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string>('route-safer');
  const [showRouteCompare, setShowRouteCompare] = useState(true);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [totalPotholesChecked, setTotalPotholesChecked] = useState<number>(10);

  // Live Navigation State
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [speedKmH, setSpeedKmH] = useState(38);
  const [navPosition, setNavPosition] = useState<{ lat: number; lng: number }>({
    lat: INITIAL_USER_LOCATION.lat,
    lng: INITIAL_USER_LOCATION.lng
  });
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [proximityAlertHazard, setProximityAlertHazard] = useState<RoadHazard | null>(null);
  const alertedHazardsRef = useRef<Set<string | number>>(new Set());

  // Mobile Frame Simulation vs Full Viewport Toggle
  const [isMobileFrameView, setIsMobileFrameView] = useState(true);

  // Accurate GPS Location Function (Asks permission, handles errors, updates state)
  const handleRequestCurrentGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsAlert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocatingGPS(true);
    setGpsAlert(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speedMps = pos.coords.speed;
        const speedKmh = speedMps !== null && speedMps >= 0 ? Math.round(speedMps * 3.6) : null;
        const timestamp = pos.timestamp || Date.now();

        setIsRealGpsActive(true);
        setIsGpsPermissionDenied(false);
        setGpsAccuracy(accuracy);
        if (accuracy > 150) {
          setGpsAlert(`Poor GPS accuracy (~${Math.round(accuracy)}m). Waiting for better satellite signal...`);
        } else {
          setGpsAlert(null);
        }

        if (speedKmh !== null && speedKmh > 0) {
          setSpeedKmH(speedKmh);
        }

        setCurrentLocation((prev) => ({
          ...prev,
          latitude: lat,
          longitude: lng,
          accuracy,
          speed: speedKmh,
          timestamp
        }));
        setUserLocation((prev) => ({ ...prev, lat, lng }));
        setNavPosition({ lat, lng });
        setIsLocatingGPS(false);

        try {
          const rev = await RoadSafetyAPI.reverseGeocode(lat, lng);
          if (rev) {
            setCurrentLocation((prev) => ({ ...prev, address: rev }));
            setUserLocation((prev) => ({ ...prev, address: rev }));
          }
        } catch {}
      },
      (error) => {
        setIsLocatingGPS(false);
        let msg = 'Unable to retrieve your GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission is required to show your current position and calculate your starting point.';
          setIsGpsPermissionDenied(true);
          setIsRealGpsActive(false);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS location unavailable. Please check your network or device GPS.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out. Retrying...';
        }
        setGpsAlert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // 1. Initial Load: Request GPS & Fetch hazards
  useEffect(() => {
    handleRequestCurrentGPSLocation();
    loadAllHazards();
  }, [handleRequestCurrentGPSLocation]);

  const loadAllHazards = async () => {
    try {
      const res = await RoadSafetyAPI.getAllHazards();
      if (res.success && res.hazards) {
        const mapped: RoadHazard[] = res.hazards.map((h) => ({
          id: String(h.id),
          title: `${h.severity} Pothole`,
          type: 'pothole',
          severity: h.severity,
          lat: h.latitude,
          lng: h.longitude,
          roadName: h.road_name,
          firstReportedDate: new Date(h.detected_at).toLocaleDateString(),
          confirmationsCount: h.report_count,
          confidence: h.confidence,
          depthCm: h.depth_estimate_cm,
          imageUrl: h.image_url,
          verified: h.verified
        }));
        setHazards(mapped);
      }
    } catch (err) {
      console.error('Failed to load hazards from API:', err);
    }
  };

  // 2. OpenStreetMap Nominatim Geocoding Submit Handler
  // Policy Compliance: Does NOT fire requests on keystrokes. Only queries on user submit (Enter key / Search button).
  const handleSearchSubmit = async (overrideQuery?: string) => {
    const q = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();

    if (!q || q.length < 2) {
      setSearchError('Please enter a valid address or place name to search (e.g., "Dighori, Nagpur").');
      setSearchErrorType('INVALID_SEARCH');
      setSearchResults([]);
      setShowDestinationSearchDropdown(true);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchErrorType(null);
    setLastSubmittedQuery(q);
    setShowDestinationSearchDropdown(true);

    try {
      const bias = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      };
      const res = await RoadSafetyAPI.searchLocations(q, bias);

      if (res.success && res.results.length > 0) {
        setSearchResults(res.results);
        setSearchError(null);
        setSearchErrorType(null);

        // Architecture Flow: User Search -> Nominatim -> Lat/Lng -> Existing Map -> Firebase Firestore
        const topResult = res.results[0];
        const placeName = topResult.name || topResult.road || topResult.display_name.split(',')[0];
        const placeAddress = topResult.address || topResult.display_name;

        // Auto-center map & update destination location pin
        setDestinationLocation({
          latitude: topResult.latitude,
          longitude: topResult.longitude,
          placeId: String(topResult.place_id),
          name: placeName,
          address: placeAddress
        });

        // Persist to Firebase Firestore collection "locations"
        RoadSafetyAPI.recordLocation(q, {
          latitude: topResult.latitude,
          longitude: topResult.longitude,
          address: placeAddress
        });
      } else {
        setSearchResults([]);
        setSearchError(res.error || `Location "${q}" not found. Try a more specific address or place name.`);
        setSearchErrorType(res.errorType || 'LOCATION_NOT_FOUND');
      }
    } catch (err: any) {
      console.error('Search submit error:', err);
      setSearchResults([]);
      setSearchError('Network error: Unable to connect to OpenStreetMap Nominatim geocoding service.');
      setSearchErrorType('NETWORK_ERROR');
    } finally {
      setIsSearching(false);
    }
  };

  // 3. Dynamic Route Calculation whenever currentLocation or destinationLocation changes
  const fallbackNagpurRoutes = useCallback(() => {
    const curHazards = hazardsRef.current;
    const curVehicle = userProfileVehicleRef.current;
    const saferHaz = curHazards.filter((h) => h.severity === 'LOW' || h.severity === 'MODERATE').slice(0, 2);
    const fastestHaz = curHazards.slice(0, 6);

    const saferOpt: RouteOption = {
      id: 'route-safer',
      name: 'Civil Lines Corridor (Safer)',
      tagline: 'Freshly resurfaced, avoids high-risk craters',
      distanceKm: 12.1,
      durationMinutes: 28,
      safetyScore: calculateRouteSafetyScore(saferHaz, curVehicle),
      hazardCount: saferHaz.length,
      hazards: saferHaz,
      color: '#10b981',
      waypoints: SAFER_ROUTE_WAYPOINTS,
      steps: SAFER_ROUTE_STEPS,
      isRecommended: true,
      recommendationReason: 'Eliminates critical road damage ahead.',
      criticalCount: 0,
      highCount: 0,
      moderateCount: 1,
      lowCount: 1
    };

    const fastestOpt: RouteOption = {
      id: 'route-fastest',
      name: 'Wardha Road Direct',
      tagline: 'Direct route with high pothole cluster',
      distanceKm: 11.2,
      durationMinutes: 25,
      safetyScore: calculateRouteSafetyScore(fastestHaz, curVehicle),
      hazardCount: fastestHaz.length,
      hazards: fastestHaz,
      color: '#3b82f6',
      waypoints: FASTEST_ROUTE_WAYPOINTS,
      steps: FASTEST_ROUTE_STEPS,
      criticalCount: fastestHaz.filter(h => h.severity === 'CRITICAL').length,
      highCount: fastestHaz.filter(h => h.severity === 'HIGH').length,
      moderateCount: fastestHaz.filter(h => h.severity === 'MODERATE').length,
      lowCount: fastestHaz.filter(h => h.severity === 'LOW').length
    };

    setRouteOptions([saferOpt, fastestOpt]);
    setActiveRouteId('route-safer');
  }, []);

  const calculateDynamicRoutes = useCallback(async () => {
    const dest = destinationLocationRef.current || (selectedDestinationRef.current ? {
      latitude: selectedDestinationRef.current.lat,
      longitude: selectedDestinationRef.current.lng,
      name: selectedDestinationRef.current.name,
      address: selectedDestinationRef.current.address
    } : null);

    if (!dest) return;

    setIsLoadingRoutes(true);
    try {
      const curLoc = currentLocationRef.current;
      const originParam = {
        latitude: curLoc.latitude,
        longitude: curLoc.longitude,
        name: curLoc.address || 'My Current GPS Location'
      };
      const destParam = {
        latitude: dest.latitude,
        longitude: dest.longitude,
        name: dest.name || 'Destination'
      };

      // Call backend route computation API
      const routeRes = await RoadSafetyAPI.getRoutes(originParam, destParam);

      if (routeRes.success && routeRes.routes && routeRes.routes.length > 0) {
        // Query potholes along each route corridor with configurable 30m threshold
        const corridorThreshold = 30;
        const curVehicle = userProfileVehicleRef.current;
        const optionsPromises = routeRes.routes.map(async (r) => {
          let routeHazards: RoadHazard[] = [];
          let breakdown = { critical: 0, high: 0, moderate: 0, low: 0 };
          let matchedDistancesList: Array<{ id: string | number; road: string; severity: string; distanceM: number }> = [];

          try {
            const hazRes = await RoadSafetyAPI.getHazardsOnRoute(r.coordinates, corridorThreshold);
            if (hazRes.success) {
              routeHazards = hazRes.hazards.map((h) => ({
                id: String(h.id),
                title: `${h.severity} ${h.hazard_type || 'Pothole'}`,
                type: (h.hazard_type as any) || 'pothole',
                severity: h.severity,
                lat: h.latitude,
                lng: h.longitude,
                roadName: h.road_name,
                firstReportedDate: new Date(h.detected_at || h.timestamp || Date.now()).toLocaleDateString(),
                confirmationsCount: h.report_count,
                confidence: h.confidence,
                depthCm: h.depth_estimate_cm || 10,
                imageUrl: h.image_url,
                verified: h.verified,
                distanceFromRoute: h.distanceFromRoute,
                nearestRoutePoint: h.nearestRoutePoint
              }));
              breakdown = hazRes.breakdown;
              if (hazRes.debug?.nearestDistances) {
                matchedDistancesList = hazRes.debug.nearestDistances;
              }
              if (hazRes.debug?.totalFirebaseChecked) {
                setTotalPotholesChecked(hazRes.debug.totalFirebaseChecked);
              }
            }
          } catch (err) {
            console.error('Error fetching hazards on corridor:', err);
          }

          // If backend returned no hazards (e.g. newly searched location or custom route),
          // evaluate against session demo potholes and generate route-specific demo potholes along the actual route polyline
          if (routeHazards.length === 0) {
            const sessionPotholes = getAllSessionDemoPotholes();
            const analysis = analyzeRouteSafety(r.coordinates, sessionPotholes, corridorThreshold);

            if (analysis.hazardCount > 0) {
              routeHazards = analysis.hazards;
              breakdown = analysis.breakdown;
              matchedDistancesList = analysis.matchedDistances.map((m) => ({
                id: m.id,
                road: m.road,
                severity: m.severity,
                distanceM: m.distanceM
              }));
            } else {
              const isSafer = r.type === 'safer' || r.id.includes('safe') || r.name.toLowerCase().includes('safe');
              const demoGen = generateDemoPotholesForRoute(r.coordinates, isSafer ? 1 : 5, {
                isSafeRoute: isSafer,
                routeId: r.id,
                baseRoadName: r.name
              });
              const demoAnalysis = analyzeRouteSafety(r.coordinates, demoGen, corridorThreshold);
              routeHazards = demoAnalysis.hazards;
              breakdown = demoAnalysis.breakdown;
              matchedDistancesList = demoAnalysis.matchedDistances.map((m) => ({
                id: m.id,
                road: m.road,
                severity: m.severity,
                distanceM: m.distanceM
              }));
            }
          }

          // Calculate deterministic safety score for this route and user vehicle
          const safetyScore = calculateRouteSafetyScore(routeHazards, curVehicle);

          return {
            id: r.id,
            name: r.name,
            tagline: r.summary,
            distanceKm: r.distanceKm,
            durationMinutes: r.durationMinutes,
            safetyScore: safetyScore,
            hazardCount: routeHazards.length,
            hazards: routeHazards,
            waypoints: r.coordinates,
            rawType: r.type,
            steps: r.steps.map((st, sIdx) => ({
              id: `step_${sIdx}`,
              instruction: st.instruction,
              distance: `${st.distanceMeters} m`,
              distanceMeters: st.distanceMeters,
              action: sIdx === r.steps.length - 1 ? 'arrive' : 'straight',
              streetName: st.roadName,
              lat: st.latitude,
              lng: st.longitude
            })),
            criticalCount: breakdown.critical,
            highCount: breakdown.high,
            moderateCount: breakdown.moderate,
            lowCount: breakdown.low,
            matchedDistances: matchedDistancesList
          };
        });

        const evaluated = await Promise.all(optionsPromises);

        // Safe Route Selection:
        // If primary route contains critical or high severity potholes, evaluate available alternative routes.
        // Every alternative route comes from the actual routing engine.
        let recommendedId = evaluated[0].id;
        const primary = evaluated[0];
        const primaryHasHighRisk = primary.criticalCount > 0 || primary.highCount > 0;

        if (evaluated.length > 1) {
          const sortedAlternatives = [...evaluated].sort((a, b) => {
            if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
            return a.criticalCount - b.criticalCount;
          });
          const bestSafe = sortedAlternatives[0];

          if (primaryHasHighRisk || bestSafe.safetyScore > primary.safetyScore) {
            recommendedId = bestSafe.id;
          }
        }

        const computedRoutes: RouteOption[] = evaluated.map((item) => {
          const isSafer = item.id === recommendedId && evaluated.length > 1 && (primaryHasHighRisk || item.rawType === 'safer');
          return {
            ...item,
            color: isSafer ? '#10b981' : '#3b82f6',
            isRecommended: item.id === recommendedId,
            recommendationReason: isSafer
              ? `Alternative road corridor avoids critical damage with a Safety Score of ${item.safetyScore}/100.`
              : (item.id === primary.id && !primaryHasHighRisk
                  ? `Direct road route is clean with Safety Score of ${item.safetyScore}/100.`
                  : undefined)
          } as RouteOption;
        });

        setRouteOptions(computedRoutes);
        setActiveRouteId(recommendedId);

        // Requirement 9: Development / Debug logging
        const activeRoute = computedRoutes.find((r) => r.id === recommendedId) || computedRoutes[0];
        console.group('🛣️ [SAFETY AI MAP AUDIT] Route & Pothole Matching Details');
        console.log('📍 Origin coordinates:', { lat: originParam.latitude, lng: originParam.longitude, name: originParam.name });
        console.log('🎯 Destination coordinates:', { lat: destParam.latitude, lng: destParam.longitude, name: destParam.name });
        console.log('📏 Route point count:', activeRoute.waypoints.length);
        console.log('🗺️ Selected route:', { id: activeRoute.id, name: activeRoute.name, distanceKm: activeRoute.distanceKm, durationMinutes: activeRoute.durationMinutes });
        console.log('🔀 Alternative route count:', computedRoutes.length - 1);
        console.log('🗄️ Number of Firebase potholes checked:', routeRes.debug?.totalFirebasePotholesChecked ?? hazardsRef.current.length);
        console.log(`⚠️ Number of potholes within ${corridorThreshold}m of selected route:`, activeRoute.hazardCount);
        console.log('🔍 Nearest distance of each relevant pothole:', (activeRoute.hazards || []).map((h) => ({
          id: h.id,
          road: h.roadName,
          severity: h.severity,
          distanceMeters: h.distanceFromRoute,
          confidence: h.confidence,
          type: h.type
        })));
        console.groupEnd();
      } else {
        // Fallback to offline pre-computed Nagpur corridors
        fallbackNagpurRoutes();
      }
    } catch (err) {
      console.warn('Backend route calc failed, falling back to local corridors:', err);
      fallbackNagpurRoutes();
    } finally {
      setIsLoadingRoutes(false);
    }
  }, [fallbackNagpurRoutes]);

  useEffect(() => {
    calculateDynamicRoutes();
  }, [
    destinationLocation?.latitude,
    destinationLocation?.longitude,
    selectedDestination?.id,
    selectedDestination?.lat,
    selectedDestination?.lng,
    currentLocation.latitude,
    currentLocation.longitude,
    userProfile.vehicle,
    calculateDynamicRoutes
  ]);

  const currentActiveRoute = useMemo(() => {
    return routeOptions.find((r) => r.id === activeRouteId) || routeOptions[0] || DEFAULT_CALCULATING_ROUTE;
  }, [routeOptions, activeRouteId]);

  // Auto Day/Night theme
  useEffect(() => {
    if (themeMode === 'auto') {
      const currentHour = new Date().getHours();
      setIsNightMode(currentHour < 6 || currentHour >= 19);
    } else {
      setIsNightMode(themeMode === 'dark');
    }
  }, [themeMode]);

  // 4. Real GPS watchPosition tracking & real-time backend hazard monitoring loop
  const calculateDynamicRoutesRef = useRef(calculateDynamicRoutes);
  calculateDynamicRoutesRef.current = calculateDynamicRoutes;
  const currentActiveRouteRef = useRef(currentActiveRoute);
  currentActiveRouteRef.current = currentActiveRoute;
  const voiceEnabledRef = useRef(voiceEnabled);
  voiceEnabledRef.current = voiceEnabled;

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        const speedMps = pos.coords.speed;
        const speedKmh = speedMps !== null && speedMps >= 0 ? Math.round(speedMps * 3.6) : null;
        const timestamp = pos.timestamp || Date.now();

        setIsRealGpsActive(true);
        setIsGpsPermissionDenied(false);
        setGpsAccuracy(accuracy);

        if (accuracy > 150) {
          setGpsAlert(`Poor GPS accuracy (~${Math.round(accuracy)}m). Waiting for better satellite signal...`);
        } else {
          setGpsAlert(null);
        }

        if (speedKmh !== null && speedKmh > 0) {
          setSpeedKmH(speedKmh);
        }

        setCurrentLocation((prev) => {
          if (
            prev.latitude === lat &&
            prev.longitude === lng &&
            prev.accuracy === accuracy &&
            prev.speed === speedKmh
          ) {
            return prev;
          }
          return {
            ...prev,
            latitude: lat,
            longitude: lng,
            accuracy,
            speed: speedKmh,
            timestamp
          };
        });

        setUserLocation((prev) => {
          if (prev.lat === lat && prev.lng === lng) {
            return prev;
          }
          return { ...prev, lat, lng };
        });

        // If real GPS navigation is actively underway (and not in simulated drive mode)
        if (isNavigating && !isSimulatingDriving) {
          setNavPosition({ lat, lng });

          // Destination reached check (<= 30 meters)
          if (destinationLocation) {
            const distToDest = calculateDistanceMeters(lat, lng, destinationLocation.latitude, destinationLocation.longitude);
            if (distToDest <= 30) {
              setIsNavigating(false);
              setActiveSafetyAlert(null);
              setProximityAlertHazard(null);
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
              speakSafetyAlert('You have arrived safely at your destination.', voiceEnabledRef.current);
              return;
            }
          }

          // Throttle live ping to backend (~3 seconds)
          const now = Date.now();
          const activeRt = currentActiveRouteRef.current;
          if (now - lastPingTimeRef.current >= 3000 && activeRt && activeRt.waypoints.length >= 2) {
            lastPingTimeRef.current = now;

            try {
              const pingRes = await RoadSafetyAPI.pingLiveLocation({
                currentLocation: {
                  latitude: lat,
                  longitude: lng,
                  accuracy,
                  speed: speedKmh,
                  timestamp
                },
                routeCoordinates: activeRt.waypoints,
                alreadyAlertedIds: Array.from(alertedHazardsRef.current)
              });

              if (pingRes.success) {
                if (pingRes.isOffRoute) {
                  setIsOffRoute(true);
                  setOffRouteDistance(pingRes.crossTrackDistanceMeters || null);
                  setActiveSafetyAlert(null);

                  // Recalculate route when off-route (throttled to once every 10s)
                  if (now - lastOffRouteRecalcTimeRef.current >= 10000) {
                    lastOffRouteRecalcTimeRef.current = now;
                    calculateDynamicRoutesRef.current();
                  }
                } else {
                  setIsOffRoute(false);
                  setOffRouteDistance(null);

                  if (pingRes.alert) {
                    const alertId = pingRes.alert.potholeId;
                    if (!alertedHazardsRef.current.has(alertId)) {
                      alertedHazardsRef.current.add(alertId);
                      setActiveSafetyAlert(pingRes.alert);
                      if (pingRes.alert.voiceText) {
                        speakSafetyAlert(pingRes.alert.voiceText, voiceEnabledRef.current);
                      }
                    } else {
                      setActiveSafetyAlert(pingRes.alert);
                    }
                  } else {
                    setActiveSafetyAlert(null);
                  }
                }
              }
            } catch (err) {
              console.warn('Live GPS ping error:', err);
            }
          }
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsAlert('Location permission is required to show your current position and calculate your starting point.');
          setIsGpsPermissionDenied(true);
          setIsRealGpsActive(false);
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setGpsAlert('GPS location unavailable. Please check your network or device GPS.');
        } else if (error.code === error.TIMEOUT) {
          setGpsAlert('GPS request timed out. Retrying...');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000,
        timeout: 12000
      }
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isNavigating, isSimulatingDriving, destinationLocation?.latitude, destinationLocation?.longitude]);

  // Optional Demo Drive simulation runner (for testing without physical vehicle movement)
  useEffect(() => {
    if (!isNavigating || !isSimulatingDriving || !currentActiveRoute) return;

    const currentWaypoints = currentActiveRoute.waypoints;
    const interval = setInterval(async () => {
      simStepRef.current += 1;
      if (simStepRef.current < currentWaypoints.length) {
        const nextCoord = currentWaypoints[simStepRef.current];
        const nextPos = { lat: nextCoord[0], lng: nextCoord[1] };
        setNavPosition(nextPos);
        setSpeedKmH(Math.floor(34 + Math.random() * 12));

        const stepProgress = Math.min(
          currentActiveRoute.steps.length - 1,
          Math.floor((simStepRef.current / currentWaypoints.length) * currentActiveRoute.steps.length)
        );
        setNavStepIndex(stepProgress);

        try {
          const pingRes = await RoadSafetyAPI.pingLiveLocation({
            currentLocation: {
              latitude: nextPos.lat,
              longitude: nextPos.lng,
              accuracy: 15,
              speed: 38,
              timestamp: Date.now()
            },
            routeCoordinates: currentWaypoints,
            alreadyAlertedIds: Array.from(alertedHazardsRef.current)
          });

          if (pingRes.success && pingRes.alert) {
            const alertId = pingRes.alert.potholeId;
            if (!alertedHazardsRef.current.has(alertId)) {
              alertedHazardsRef.current.add(alertId);
              setActiveSafetyAlert(pingRes.alert);
              if (pingRes.alert.voiceText) {
                speakSafetyAlert(pingRes.alert.voiceText, voiceEnabled);
              }
            } else if (activeSafetyAlert?.potholeId === alertId) {
              setActiveSafetyAlert(pingRes.alert);
            }
          } else if (pingRes.success && !pingRes.alert) {
            setActiveSafetyAlert(null);
          }
        } catch (err) {
          console.warn('Simulation live ping error:', err);
        }
      } else {
        clearInterval(interval);
        setIsNavigating(false);
        setIsSimulatingDriving(false);
        setActiveSafetyAlert(null);
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
        speakSafetyAlert('You have arrived safely at your destination.', voiceEnabled);
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [isNavigating, isSimulatingDriving, currentActiveRoute, voiceEnabled, activeSafetyAlert?.potholeId]);

  // STEP 10: MAP DISPLAY
  // When the user selects a route, display ONLY potholes relevant to that selected route (&le; 30m corridor).
  // When the user switches between Normal Route and Safe Route, update the displayed pothole list/count accordingly.
  // Do NOT show every Firebase pothole globally as if it belongs to the selected route.
  // Each pothole marker remains at its original Firebase latitude & longitude.
  const displayedHazards = useMemo(() => {
    // When a route is actively selected, include route hazards with exact distanceFromRoute metadata
    const routeHazards = currentActiveRoute?.hazards || [];
    const baseHazards = hazards || [];

    const map = new Map<string, RoadHazard>();
    for (const h of baseHazards) {
      map.set(String(h.id), h);
    }
    // Route hazards overlay base hazards with corridor distance
    for (const h of routeHazards) {
      map.set(String(h.id), h);
    }

    return Array.from(map.values()).filter((h) => {
      if (
        typeof h.lat !== 'number' ||
        isNaN(h.lat) ||
        typeof h.lng !== 'number' ||
        isNaN(h.lng)
      ) {
        return false;
      }

      if (severityFilter && !severityFilter[h.severity]) {
        return false;
      }

      return true;
    });
  }, [hazards, currentActiveRoute, severityFilter]);

  // Auth / Vehicle
  const handleAuthComplete = (data: {
    name: string;
    email: string;
    vehicle: VehicleType;
    isGuest?: boolean;
  }) => {
    const isGuestUser = Boolean(data.isGuest);
    setIsGuest(isGuestUser);
    setUserProfile((prev) => ({
      ...prev,
      name: data.name,
      email: data.email,
      vehicle: data.vehicle,
      isGuest: isGuestUser
    }));
    try {
      sessionStorage.setItem('safety_ai_is_guest', isGuestUser ? 'true' : 'false');
      sessionStorage.setItem('safety_ai_auth_completed', 'true');
    } catch {}
    setIsLoggedIn(true);
    setShowAuthModal(false);
    setLoginRequiredConfig((prev) => ({ ...prev, isOpen: false }));
    setActiveTab('map');
    speakSafetyAlert(
      isGuestUser
        ? 'Welcome! Live map active in Guest Mode.'
        : `AI Road Safety Assistant active for ${VEHICLE_CONFIGS[data.vehicle]?.label || 'your vehicle'}.`,
      voiceEnabled
    );
  };

  // Guest-Gated Action Interceptors
  const handleAddPotholeClick = () => {
    if (isGuest) {
      setLoginRequiredConfig({
        isOpen: true,
        actionType: 'add_pothole',
        customMessage: 'You need to log in to report a pothole and contribute safety data.'
      });
      return;
    }
    setShowAddPotholeModal(true);
  };

  const handleRemovePotholeClick = (preselected?: RoadHazard | null) => {
    if (isGuest) {
      setLoginRequiredConfig({
        isOpen: true,
        actionType: 'remove_pothole',
        customMessage: 'Please log in to remove or manage reported road hazards.'
      });
      return;
    }
    setRemoveModalPreselectedHazard(preselected || null);
    setShowRemovePotholeModal(true);
  };

  const handleChangeVehicle = (newVehicle: VehicleType) => {
    setUserProfile((prev) => ({ ...prev, vehicle: newVehicle }));
    speakSafetyAlert(
      `Vehicle switched to ${VEHICLE_CONFIGS[newVehicle]?.label || 'vehicle'}. Recalculating safety indices.`,
      voiceEnabled
    );
  };

  // Hazard Handlers
  const handleConfirmHazard = async (hazardId: string | number) => {
    setHazards((prev) =>
      prev.map((h) => {
        if (String(h.id) === String(hazardId)) {
          return {
            ...h,
            confirmationsCount: h.confirmationsCount + 1,
            confidence: Math.min(0.99, (h.confidence || 0.85) + 0.05)
          };
        }
        return h;
      })
    );

    setUserProfile((prev) => ({
      ...prev,
      confirmedCount: prev.confirmedCount + 1,
      contributionPoints: prev.contributionPoints + 5
    }));

    const newNotif: NotificationItem = {
      id: `n_confirm_${Date.now()}`,
      type: 'report_verified',
      severity: 'MODERATE',
      title: 'Pothole Re-Verified (+5 pts)',
      message: 'Your confirmation updated the community safety database.',
      timestamp: 'Just Now',
      unread: true
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Add new pothole from modal
  const handleAddNewHazard = (newHazard: RoadHazard) => {
    setHazards((prev) => [newHazard, ...prev]);
    setUserProfile((prev) => ({
      ...prev,
      reportsCount: prev.reportsCount + 1,
      contributionPoints: prev.contributionPoints + 10
    }));

    const newNotif: NotificationItem = {
      id: `n_new_${Date.now()}`,
      type: 'critical_hazard',
      severity: newHazard.severity,
      title: `New ${newHazard.severity} Pothole Registered`,
      message: `${newHazard.roadName || 'Road sector'}: Added to live route safety system.`,
      timestamp: 'Just Now',
      unread: true
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setShowAddPotholeModal(false);
  };

  // Handle verified pothole removal (marked as resolved in DB and removed from active map)
  const handlePotholeResolved = useCallback(
    (potholeId: string | number) => {
      const targetIdStr = String(potholeId);
      const targetIdNum = Number(potholeId);

      setHazards((prev) => prev.filter((h) => String(h.id) !== targetIdStr && h.id !== targetIdNum));

      if (selectedHazard && (String(selectedHazard.id) === targetIdStr || selectedHazard.id === targetIdNum)) {
        setSelectedHazard(null);
      }

      setUserProfile((prev) => ({
        ...prev,
        contributionPoints: prev.contributionPoints + 25
      }));

      const newNotif: NotificationItem = {
        id: `n_resolved_${Date.now()}`,
        type: 'report_verified',
        severity: 'LOW',
        title: 'Pothole Verified Repaired',
        message: `Pothole #${potholeId} has been verified repaired via AI & GPS inspection and removed from the active map. (+25 Safety Pts)`,
        timestamp: 'Just Now',
        unread: true
      };
      setNotifications((prev) => [newNotif, ...prev]);

      // Trigger safety alert feedback
      speakSafetyAlert('Pothole verified as repaired and removed from active navigation.', voiceEnabled);
    },
    [selectedHazard, voiceEnabled]
  );

  // Destination Selection
  const handleSelectDestination = (place: DestinationPlace) => {
    setSelectedDestination(place);
    setDestinationLocation({
      latitude: place.lat,
      longitude: place.lng,
      placeId: place.id,
      name: place.name,
      address: place.address
    });
    setShowDestinationSearchDropdown(false);
    setShowRouteCompare(true);
    setActiveTab('map');
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    const placeName = result.name || result.road || result.display_name.split(',')[0];
    const placeAddress = result.address || result.display_name;

    // Immediately save exact coordinates in destinationLocation
    setDestinationLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      placeId: String(result.place_id),
      name: placeName,
      address: placeAddress
    });

    const distMeters = calculateDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      result.latitude,
      result.longitude
    );

    const place: DestinationPlace = {
      id: `dest_${result.place_id}`,
      name: placeName,
      address: placeAddress,
      lat: result.latitude,
      lng: result.longitude,
      category: result.category || 'Location',
      distance: `${(distMeters / 1000).toFixed(1)} km`
    };
    setSelectedDestination(place);
    setShowDestinationSearchDropdown(false);
    setShowRouteCompare(true);
    setActiveTab('map');
    setSearchQuery(placeName);
    setSearchError(null);
    setSearchErrorType(null);

    // Save to Firebase Firestore collection "locations"
    RoadSafetyAPI.recordLocation(searchQuery || placeName, {
      latitude: result.latitude,
      longitude: result.longitude,
      address: placeAddress
    });
  };

  // Navigation Handlers
  const handleStartNavigation = (simulate = false) => {
    alertedHazardsRef.current.clear();
    setIsNavigating(true);
    setIsSimulatingDriving(simulate);
    simStepRef.current = 0;
    setIsOffRoute(false);
    setOffRouteDistance(null);
    setActiveSafetyAlert(null);
    setNavStepIndex(0);
    setNavPosition(userLocation);
    setShowRouteCompare(false);
    speakSafetyAlert(
      `Starting navigation via ${currentActiveRoute.name}. Safety score is ${currentActiveRoute.safetyScore} of 100.`,
      voiceEnabled
    );
  };

  const handleExitNavigation = () => {
    setIsNavigating(false);
    setIsSimulatingDriving(false);
    setShowRouteCompare(true);
    setProximityAlertHazard(null);
    setActiveSafetyAlert(null);
    setIsOffRoute(false);
    setOffRouteDistance(null);
  };

  const unreadNotifCount = notifications.filter((n) => n.unread).length;

  return (
    <div className={`w-screen h-screen flex flex-col items-center justify-center ${isNightMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-800'}`}>
      
      {/* Top Header Bar */}
      <header className="w-full bg-slate-900 text-white px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs z-30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            🛡️
          </div>
          <div>
            <span className="font-extrabold tracking-tight text-white">AI Road Safety Assistant</span>
            <span className="hidden sm:inline text-slate-400 ml-2 text-[11px]">“Your route. Your vehicle. Your safety.”</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Day / Night Toggle */}
          <button
            type="button"
            id="btn-quick-theme-toggle"
            onClick={() => setIsNightMode(!isNightMode)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1.5 transition"
            title="Toggle Map Night/Day Mode"
          >
            <span>{isNightMode ? '🌙 Night' : '🌞 Day'}</span>
          </button>

          {/* Device Frame View Toggle */}
          <button
            type="button"
            id="btn-toggle-frame"
            onClick={() => setIsMobileFrameView(!isMobileFrameView)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[11px] flex items-center gap-1.5 transition"
          >
            {isMobileFrameView ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Full Width</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mobile Frame</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container: Mobile Frame or Full Viewport */}
      <main className="flex-1 w-full flex items-center justify-center overflow-hidden p-0 sm:p-2">
        <div
          className={`relative w-full h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden shadow-2xl transition-all ${
            isMobileFrameView
              ? 'max-w-md max-h-[844px] rounded-none sm:rounded-[40px] border-0 sm:border-[8px] border-slate-800'
              : 'max-w-none max-h-none rounded-none'
          }`}
        >
          {/* Main Tab Content */}
          <div className="relative flex-1 w-full h-full overflow-hidden">
            {activeTab === 'map' && (
              <>
                {/* 1. Interactive Leaflet Map */}
                <InteractiveMap
                  currentLocation={currentLocation}
                  destinationLocation={destinationLocation}
                  userLocation={userLocation}
                  origin={userLocation}
                  destination={selectedDestination}
                  hazards={displayedHazards}
                  severityFilter={severityFilter}
                  selectedRoute={currentActiveRoute}
                  activeRouteId={activeRouteId}
                  allRoutes={routeOptions}
                  onSelectHazard={(hazard) => setSelectedHazard(hazard)}
                  onSelectRoute={(id) => setActiveRouteId(id)}
                  isNavigating={isNavigating}
                  currentNavPosition={navPosition}
                  isNightMode={isNightMode}
                  onRecenterGPS={handleRequestCurrentGPSLocation}
                  isLocatingGPS={isLocatingGPS}
                  userVehicle={userProfile.vehicle}
                />

                {/* GPS Alert / Signal Warning Banner (Requirement 4) */}
                {gpsAlert && (
                  <div className="absolute top-16 inset-x-3 z-30 pointer-events-auto">
                    <div className={`rounded-xl p-2.5 px-3 shadow-lg flex items-center gap-2.5 text-xs font-semibold ${
                      isGpsPermissionDenied
                        ? 'bg-rose-600 text-white border border-rose-400'
                        : 'bg-amber-500/95 text-slate-950 border border-amber-300'
                    }`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="flex-1 leading-tight">{gpsAlert}</span>
                      {isGpsPermissionDenied && (
                        <button
                          type="button"
                          onClick={handleRequestCurrentGPSLocation}
                          className="px-2 py-1 rounded-md bg-white text-rose-700 text-[11px] font-bold shrink-0 hover:bg-rose-50 transition"
                        >
                          Enable GPS
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Simulated Fallback Indicator when real GPS is unavailable or permission denied (Requirement 4) */}
                {!isRealGpsActive && (
                  <div className="absolute bottom-20 left-3 z-20 pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur-xs text-slate-300 border border-slate-700/60 rounded-full px-2.5 py-1 text-[10px] font-bold flex items-center gap-1.5 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      <span>Simulated Demo Location — GPS Inactive</span>
                    </div>
                  </div>
                )}

                {/* Top Google Maps Style Search Bar & Severity Filters */}
                {!isNavigating && (
                  <div className="absolute top-3 inset-x-3 z-30 pointer-events-none">
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 pointer-events-auto p-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSearchSubmit()}
                        disabled={isSearching}
                        className="pl-2.5 text-slate-400 hover:text-blue-600 transition disabled:opacity-50"
                        title="Search location with OpenStreetMap Nominatim"
                      >
                        {isSearching ? (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : (
                          <Search className="w-5 h-5 text-slate-400 hover:text-blue-500" />
                        )}
                      </button>

                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (searchError) setSearchError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchSubmit();
                          }
                        }}
                        onFocus={() => {
                          if (!searchQuery) {
                            setShowDestinationSearchDropdown(true);
                          }
                        }}
                        placeholder="Search address (e.g. Dighori, Nagpur)..."
                        className="flex-1 bg-transparent py-1.5 text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />

                      {searchQuery && (
                        <div className="flex items-center gap-1 mr-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setSearchResults([]);
                              setSearchError(null);
                              setSearchErrorType(null);
                              setLastSubmittedQuery('');
                            }}
                            className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold"
                            title="Clear search"
                          >
                            ✕
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSearchSubmit()}
                            disabled={isSearching}
                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-0.5 shadow-xs"
                            title="Submit search"
                          >
                            <span>Go</span>
                            <CornerDownLeft className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}

                      {/* Notification Bell */}
                      <button
                        type="button"
                        id="btn-bell-notifications"
                        onClick={() => setShowNotificationPanel(true)}
                        className="relative w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition"
                        title="Road Safety Notifications"
                      >
                        <Bell className="w-5 h-5" />
                        {unreadNotifCount > 0 && (
                          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white font-extrabold text-[9px] flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
                            {unreadNotifCount}
                          </span>
                        )}
                      </button>

                      {/* Profile shortcut avatar */}
                      <button
                        type="button"
                        id="btn-profile-shortcut"
                        onClick={() => setActiveTab('profile')}
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-blue-500 shrink-0"
                        title="My Profile & Vehicle"
                      >
                        <img
                          src={userProfile.avatarUrl}
                          alt={userProfile.name}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    </div>

                    {/* Guest Mode Indicator Chip */}
                    {isGuest && (
                      <div
                        id="guest-mode-status-chip"
                        className="mt-1.5 flex items-center justify-between bg-amber-500/95 text-slate-950 px-3 py-1.5 rounded-xl shadow-lg border border-amber-300 pointer-events-auto text-[11px] font-bold"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
                          <span>Guest Mode (Map View Only)</span>
                        </div>
                        <button
                          type="button"
                          id="btn-guest-chip-login"
                          onClick={() => setShowAuthModal(true)}
                          className="bg-slate-950 hover:bg-slate-800 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition active:scale-95 shadow-xs flex items-center gap-1"
                        >
                          <LogIn className="w-3 h-3" />
                          <span>Login / Sign Up</span>
                        </button>
                      </div>
                    )}

                    {/* GPS Alert Banner if permission or location error occurred */}
                    {gpsAlert && (
                      <div className="mt-2 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-xl p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between pointer-events-auto shadow-md">
                        <div className="flex items-center gap-2 pr-2">
                          <span>📍</span>
                          <span className="font-medium text-[11px] leading-tight">{gpsAlert}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={handleRequestCurrentGPSLocation}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Retry
                          </button>
                          <button
                            type="button"
                            onClick={() => setGpsAlert(null)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Search Dropdown */}
                    {showDestinationSearchDropdown && (
                      <div className="mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden pointer-events-auto max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                        {/* Use My Current Location Option */}
                        <div
                          onClick={() => {
                            handleRequestCurrentGPSLocation();
                            setShowDestinationSearchDropdown(false);
                          }}
                          className="p-3 flex items-center gap-3 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/70 dark:hover:bg-blue-900/50 cursor-pointer transition border-b border-blue-100 dark:border-blue-900/50"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
                            📍
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                              Use my current location
                            </h5>
                            <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 truncate">
                              {currentLocation.address || `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            Center GPS
                          </span>
                        </div>

                        <div className="p-2 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <span>
                              {lastSubmittedQuery || searchQuery.trim().length > 0
                                ? isSearching
                                  ? 'SEARCHING OPENSTREETMAP NOMINATIM...'
                                  : `NOMINATIM RESULTS (${searchResults.length})`
                                : 'POPULAR DESTINATIONS'}
                            </span>
                            {searchResults.length > 0 && (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.2 rounded">
                                Firestore Synced
                              </span>
                            )}
                          </span>
                          <button
                            onClick={() => setShowDestinationSearchDropdown(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Nominatim Geocoding Error Banner */}
                        {searchError && (
                          <div className="p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60">
                            <div className="flex items-start gap-2.5">
                              {searchErrorType === 'INVALID_SEARCH' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                              {searchErrorType === 'NETWORK_ERROR' && <WifiOff className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                              {searchErrorType === 'NOMINATIM_FAILED' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />}
                              {searchErrorType === 'LOCATION_NOT_FOUND' && <Search className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                              {!searchErrorType && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-xs font-bold text-rose-800 dark:text-rose-300">
                                    {searchErrorType === 'LOCATION_NOT_FOUND' && 'Location Not Found'}
                                    {searchErrorType === 'INVALID_SEARCH' && 'Invalid Search Query'}
                                    {searchErrorType === 'NOMINATIM_FAILED' && 'Nominatim Request Failed'}
                                    {searchErrorType === 'NETWORK_ERROR' && 'Network Connection Error'}
                                    {!searchErrorType && 'Search Notice'}
                                  </p>
                                  {searchErrorType && (
                                    <span className="text-[8px] uppercase tracking-wider px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold">
                                      {searchErrorType.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                                  {searchError}
                                </p>
                                {lastSubmittedQuery && (
                                  <p className="text-[10px] text-slate-400 mt-1 italic">
                                    Searched: &ldquo;{lastSubmittedQuery}&rdquo;
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {isSearching ? (
                          <div className="p-5 text-center flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Searching OpenStreetMap Nominatim...
                            </p>
                            <p className="text-[10px] text-slate-400">Finding precise latitude &amp; longitude</p>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((result) => {
                            const name = result.name || result.road || result.display_name.split(',')[0];
                            const distMeters = calculateDistanceMeters(
                              currentLocation.latitude,
                              currentLocation.longitude,
                              result.latitude,
                              result.longitude
                            );

                            // Icon resolver based on category/keywords
                            const catLower = (result.category || '').toLowerCase();
                            const nameLower = name.toLowerCase();
                            let icon = '📍';
                            if (catLower.includes('college') || catLower.includes('school') || catLower.includes('university') || catLower.includes('education') || nameLower.includes('college') || nameLower.includes('university') || nameLower.includes('school') || nameLower.includes('institute')) {
                              icon = '🎓';
                            } else if (catLower.includes('hospital') || catLower.includes('health') || catLower.includes('clinic') || nameLower.includes('hospital') || nameLower.includes('aiims')) {
                              icon = '🏥';
                            } else if (catLower.includes('station') || catLower.includes('airport') || catLower.includes('transport') || nameLower.includes('station') || nameLower.includes('airport') || nameLower.includes('metro')) {
                              icon = '🚆';
                            } else if (catLower.includes('shop') || catLower.includes('mall') || catLower.includes('commercial') || nameLower.includes('mall') || nameLower.includes('market')) {
                              icon = '🏪';
                            }

                            return (
                              <div
                                key={`search-res-${result.place_id}`}
                                onClick={() => handleSelectSearchResult(result)}
                                className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition border-b border-slate-100 dark:border-slate-800/60 last:border-b-0"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="text-base shrink-0">{icon}</span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {name}
                                      </h5>
                                      {result.category && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                                          {result.category}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate max-w-[210px]">
                                      {result.address || result.display_name}
                                    </p>
                                    <p className="text-[9px] text-slate-400">
                                      {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                    {(distMeters / 1000).toFixed(1)} km
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium">Select</span>
                                </div>
                              </div>
                            );
                          })
                        ) : searchQuery.trim().length > 0 && !searchError ? (
                          <div className="p-5 text-center flex flex-col items-center justify-center">
                            <span className="text-2xl mb-1">🔍</span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              Press &ldquo;Go&rdquo; or Enter to search via OpenStreetMap Nominatim.
                            </p>
                          </div>
                        ) : null}

                        {/* Popular Destinations when no search active */}
                        {searchResults.length === 0 && !isSearching && (!searchError || !searchQuery.trim()) && (
                          POPULAR_DESTINATIONS.map((dest) => (
                            <div
                              key={`dropdown-${dest.id}`}
                              onClick={() => handleSelectDestination(dest)}
                              className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="text-base">{dest.icon || '📍'}</span>
                                <div>
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                    {dest.name}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
                                    {dest.address}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">
                                {dest.distance}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* 4-Tier Severity Filter Chips: 🔴 CRITICAL, 🟠 HIGH, 🟡 MODERATE, 🟢 LOW */}
                    <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pointer-events-auto">
                      {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SeverityLevel[]).map((level) => {
                        const isEnabled = severityFilter[level];
                        const colors = {
                          CRITICAL: isEnabled ? 'bg-red-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-red-600 border border-red-200 dark:border-red-900',
                          HIGH: isEnabled ? 'bg-orange-500 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-orange-600 border border-orange-200 dark:border-orange-900',
                          MODERATE: isEnabled ? 'bg-amber-500 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-amber-600 border border-amber-200 dark:border-amber-900',
                          LOW: isEnabled ? 'bg-emerald-600 text-white' : 'bg-white/90 dark:bg-slate-800/90 text-emerald-600 border border-emerald-200 dark:border-emerald-900'
                        };

                        const iconMap = {
                          CRITICAL: '🔴',
                          HIGH: '🟠',
                          MODERATE: '🟡',
                          LOW: '🟢'
                        };

                        return (
                          <button
                            key={level}
                            type="button"
                            onClick={() =>
                              setSeverityFilter((prev) => ({ ...prev, [level]: !prev[level] }))
                            }
                            className={`px-2.5 py-1 rounded-full text-[11px] font-black transition shadow-xs flex items-center gap-1 shrink-0 ${colors[level]}`}
                          >
                            <span>{iconMap[level]}</span>
                            <span>{level}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Floating "➕ Add Pothole" Button (Bottom-Left side of Map) */}
                <div className="absolute left-4 bottom-28 z-20 pointer-events-auto">
                  <button
                    type="button"
                    id="btn-floating-add-pothole"
                    onClick={handleAddPotholeClick}
                    className="hover:bg-red-700 active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-full shadow-xl flex items-center gap-1.5 transition text-xs border-2 bg-[#f20b0b] border-[#dceef0]"
                    style={{ backgroundColor: '#f20b0b', borderColor: '#dceef0' }}
                    title={isGuest ? 'Login required to report a pothole' : 'Report a new road hazard'}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add Pothole</span>
                  </button>
                </div>

                {/* Floating "🛡️ Remove Pothole" Button (Bottom-Right side, above Profile section) */}
                <div className="absolute right-4 bottom-28 z-20 pointer-events-auto">
                  <button
                    type="button"
                    id="btn-floating-remove-pothole"
                    onClick={() => handleRemovePotholeClick(null)}
                    className="hover:bg-emerald-700 active:scale-95 text-white font-bold px-3.5 py-2.5 rounded-full shadow-xl flex items-center gap-1.5 transition text-xs border-2 bg-[#059669] border-[#d1fae5] dark:border-emerald-800"
                    style={{ backgroundColor: '#059669', borderColor: '#d1fae5' }}
                    title={isGuest ? 'Login required to remove potholes' : 'Report pothole repaired or request removal via GPS and AI verification'}
                  >
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Remove Pothole</span>
                  </button>
                </div>

                {/* Route Comparison Bottom Sheet */}
                {showRouteCompare && selectedDestination && !isNavigating && routeOptions.length > 0 && (
                  <RouteCompareSheet
                    routes={routeOptions}
                    activeRouteId={activeRouteId}
                    onSelectRoute={(id) => setActiveRouteId(id)}
                    onStartNavigation={() => handleStartNavigation(false)}
                    onClose={() => setShowRouteCompare(false)}
                    userVehicle={userProfile.vehicle}
                    destinationName={selectedDestination.name}
                    totalFirebaseChecked={totalPotholesChecked}
                  />
                )}

                {/* Live Navigation Turn-by-Turn HUD */}
                {isNavigating && (
                  <NavigationHUD
                    route={currentActiveRoute}
                    currentStepIndex={navStepIndex}
                    userVehicle={userProfile.vehicle}
                    voiceEnabled={voiceEnabled}
                    onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
                    onExitNavigation={handleExitNavigation}
                    speedKmH={speedKmH}
                    upcomingHazard={proximityAlertHazard}
                    activeHazardAlert={activeSafetyAlert}
                    isOffRoute={isOffRoute}
                    crossTrackDistanceMeters={offRouteDistance || undefined}
                    distanceRemainingKm={currentActiveRoute.distanceKm}
                    etaMinutes={currentActiveRoute.durationMinutes}
                    gpsAccuracy={gpsAccuracy || undefined}
                    onTestVoiceAlert={() => {
                      speakSafetyAlert(
                        `Warning! Critical pothole 200 meters ahead. Reduce speed immediately.`,
                        true
                      );
                    }}
                  />
                )}
              </>
            )}

            {/* 2. EXPLORE / SEARCH PAGE */}
            {activeTab === 'explore' && (
              <ExploreSearchPage
                onSelectDestination={handleSelectDestination}
                onBackToMap={() => setActiveTab('map')}
                userCoords={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
              />
            )}

            {/* 3. PROFILE PAGE */}
            {activeTab === 'profile' && (
              <ProfilePage
                profile={{ ...userProfile, isGuest }}
                onChangeVehicle={handleChangeVehicle}
                themeMode={themeMode}
                onChangeThemeMode={(m) => setThemeMode(m)}
                onReauthenticate={() => setShowAuthModal(true)}
              />
            )}
          </div>

          {/* Bottom Navigation Bar - Exactly 4 visible tabs (Notifications is top-right bell) */}
          <nav className="relative z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 flex items-center justify-around shrink-0 shadow-lg">
            <button
              type="button"
              id="tab-nav-map"
              onClick={() => setActiveTab('map')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'map'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px]">Home</span>
            </button>

            <button
              type="button"
              id="tab-nav-explore"
              onClick={() => setActiveTab('explore')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'explore'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <Compass className="w-5 h-5 bg-[#0e0101] rounded-xs" style={{ backgroundColor: '#0e0101' }} />
              <span className="text-[10px]">Explore</span>
            </button>

            {/* Center Quick Add Pothole Action */}
            <button
              type="button"
              id="tab-nav-report"
              onClick={handleAddPotholeClick}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-red-500 font-medium transition"
            >
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center -mt-4 shadow-lg shadow-red-600/30 border-2 border-white dark:border-slate-900 active:scale-90 transition-transform">
                <Plus className="w-5 h-5 stroke-[3]" />
              </div>
              <span className="text-[10px]">Report</span>
            </button>

            <button
              type="button"
              id="tab-nav-profile"
              onClick={() => setActiveTab('profile')}
              className={`flex flex-col items-center gap-1 transition ${
                activeTab === 'profile'
                  ? 'text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px]">Profile</span>
            </button>
          </nav>

          {/* Pothole / Hazard Details Modal */}
          {selectedHazard && (
            <HazardDetailModal
              hazard={selectedHazard}
              userVehicle={userProfile.vehicle}
              onClose={() => setSelectedHazard(null)}
              onConfirmHazard={handleConfirmHazard}
              onReportFixed={(h) => {
                handleRemovePotholeClick(h);
              }}
              isGuest={isGuest}
              onRequestLogin={(action) => {
                setLoginRequiredConfig({
                  isOpen: true,
                  actionType: action,
                  customMessage:
                    action === 'remove_pothole'
                      ? 'Please log in to remove or manage reported road hazards.'
                      : 'You need to log in to report a pothole and contribute safety data.'
                });
              }}
            />
          )}

          {/* Add Pothole Modal */}
          {showAddPotholeModal && (
            <AddPotholeModal
              userLocation={userLocation}
              existingHazards={hazards}
              userVehicle={userProfile.vehicle}
              onClose={() => setShowAddPotholeModal(false)}
              onSubmitReport={handleAddNewHazard}
              onConfirmExisting={handleConfirmHazard}
            />
          )}

          {/* Remove Pothole / Report Pothole Fixed Modal */}
          {showRemovePotholeModal && (
            <RemovePotholeModal
              currentLocation={currentLocation}
              activeHazards={hazards}
              preselectedHazard={removeModalPreselectedHazard}
              onClose={() => {
                setShowRemovePotholeModal(false);
                setRemoveModalPreselectedHazard(null);
              }}
              onPotholeResolved={handlePotholeResolved}
              onRequestGPSRecenter={handleRequestCurrentGPSLocation}
            />
          )}

          {/* Notifications Dropdown / Bottom Sheet */}
          <NotificationPanel
            notifications={notifications}
            isOpen={showNotificationPanel}
            onClose={() => setShowNotificationPanel(false)}
            onMarkAllAsRead={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
            onSelectNotification={(n) => {
              if (n.hazardId) {
                const target = hazards.find((h) => String(h.id) === String(n.hazardId));
                if (target) setSelectedHazard(target);
              }
              setShowNotificationPanel(false);
            }}
          />

          {/* Login Required Modal (Guest User Restriction) */}
          <LoginRequiredModal
            isOpen={loginRequiredConfig.isOpen}
            actionType={loginRequiredConfig.actionType}
            customMessage={loginRequiredConfig.customMessage}
            onClose={() => setLoginRequiredConfig((prev) => ({ ...prev, isOpen: false }))}
            onLogin={() => {
              setLoginRequiredConfig((prev) => ({ ...prev, isOpen: false }));
              setShowAuthModal(true);
            }}
          />

          {/* Login / Vehicle Selection flow */}
          {(!isLoggedIn || showAuthModal) && (
            <LoginVehicleFlow
              onComplete={handleAuthComplete}
              initialVehicle={userProfile.vehicle}
              onCancel={isLoggedIn ? () => setShowAuthModal(false) : undefined}
            />
          )}
        </div>
      </main>
    </div>
  );
}
