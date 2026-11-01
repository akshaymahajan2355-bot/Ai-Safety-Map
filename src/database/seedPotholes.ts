export interface PotholeRecord {
  id: number;
  latitude: number;
  longitude: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  road_name: string;
  confidence: number;
  report_count: number;
  depth_estimate_cm?: number;
  image_url?: string;
  reported_by?: number;
  detected_at: string;
  verified: boolean;
  status?: 'active' | 'resolved' | string;
  isDemo?: boolean;
  dataType?: string;
  source?: string;
  hazard_type?: string;
  vehicle_type?: string;
  timestamp?: string;
  distanceFromRoute?: number; // Calculated on spatial queries
  nearestRoutePoint?: [number, number]; // Nearest point on route polyline [lat, lon]
}

export const INITIAL_SEED_POTHOLES: PotholeRecord[] = [
  // 1. Matched to Normal Route (R0) within 30m corridor (9.1m from R0, 528.6m from R1)
  {
    id: 1,
    latitude: 21.13135,
    longitude: 79.06620,
    severity: 'CRITICAL',
    road_name: 'Central Bazar Road near Bajaj Nagar Square',
    confidence: 0.96,
    report_count: 14,
    depth_estimate_cm: 18.5,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'bike',
    verified: true,
    status: 'active'
  },
  // 2. Matched to Normal Route (R0) within 30m corridor (10.0m from R0, 473.2m from R1)
  {
    id: 2,
    latitude: 21.13034,
    longitude: 79.06270,
    severity: 'HIGH',
    road_name: 'Central Bazar Road West Approach',
    confidence: 0.92,
    report_count: 8,
    depth_estimate_cm: 12.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'car',
    verified: true,
    status: 'active'
  },
  // 3. Matched to Safe/Alternative Route (R1) within 30m corridor (10.3m from R1, 457.8m from R0)
  {
    id: 3,
    latitude: 21.12628,
    longitude: 79.06397,
    severity: 'MODERATE',
    road_name: 'South Ambazari Road near Shraddhanand Peth',
    confidence: 0.88,
    report_count: 5,
    depth_estimate_cm: 8.5,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'bike',
    verified: true,
    status: 'active'
  },
  // 4. Test Case: 100m Off-Route (94.6m from R0, 615.5m from R1) -> NOT detected as route pothole
  {
    id: 4,
    latitude: 21.13216,
    longitude: 79.06620,
    severity: 'HIGH',
    road_name: 'Alley 100m off Central Bazar Road',
    confidence: 0.85,
    report_count: 4,
    depth_estimate_cm: 11.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 14).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'car',
    verified: true,
    status: 'active'
  },
  // 5. Test Case: Near Hospital 500m Off-Route (337.3m from R0, 737.5m from R1) -> NOT counted for either route
  {
    id: 5,
    latitude: 21.13600,
    longitude: 79.07100,
    severity: 'CRITICAL',
    road_name: 'Near Care Hospital Wardha Road Service Lane',
    confidence: 0.95,
    report_count: 15,
    depth_estimate_cm: 19.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 20).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'car',
    verified: true,
    status: 'active'
  },
  // 6. Test Case: Near Lake 1400m Off-Route (1398.8m from R0, 1423.6m from R1) -> NOT counted for either route
  {
    id: 6,
    latitude: 21.13900,
    longitude: 79.04950,
    severity: 'MODERATE',
    road_name: 'Ambazari Lake Outer Road',
    confidence: 0.87,
    report_count: 6,
    depth_estimate_cm: 7.2,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'bike',
    verified: true,
    status: 'active'
  },
  // 7. Sitabuldi Main Road (729m from routes)
  {
    id: 7,
    latitude: 21.14580,
    longitude: 79.08820,
    severity: 'MODERATE',
    road_name: 'Sitabuldi Main Road',
    confidence: 0.88,
    report_count: 5,
    depth_estimate_cm: 8.5,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'bike',
    verified: true,
    status: 'active'
  },
  // 8. Airport Road approach (1.8km south)
  {
    id: 8,
    latitude: 21.11200,
    longitude: 79.04800,
    severity: 'CRITICAL',
    road_name: 'Airport Road flyover approach',
    confidence: 0.98,
    report_count: 22,
    depth_estimate_cm: 21.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'car',
    verified: true,
    status: 'active'
  },
  // 9. Civil Lines West High Court Road (968m north)
  {
    id: 9,
    latitude: 21.15240,
    longitude: 79.07150,
    severity: 'LOW',
    road_name: 'Civil Lines West High Court Road',
    confidence: 0.84,
    report_count: 3,
    depth_estimate_cm: 4.0,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'cycle',
    verified: true,
    status: 'active'
  },
  // 10. Central Avenue Telephone Exchange Sq (734m east)
  {
    id: 10,
    latitude: 21.16010,
    longitude: 79.09200,
    severity: 'CRITICAL',
    road_name: 'Central Avenue Telephone Exchange Sq',
    confidence: 0.97,
    report_count: 19,
    depth_estimate_cm: 19.8,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    hazard_type: 'pothole',
    vehicle_type: 'truck',
    verified: true,
    status: 'active'
  }
];

// Geographically Accurate Demo Potholes across Nagpur Road Networks:
// 1. Sitabuldi Road (3 potholes)
// 2. Nagpur Railway Station area (3 potholes)
// 3. GMC Medical College area (3-4 potholes)
// 4. VNIT area (3-4 potholes)
// 5. AIIMS Nagpur area (3-4 potholes)
// 6. Dr. B. R. Ambedkar area (3-4 potholes)
// 7. Dighori (3-4 potholes)
// 8. Mahal (3-4 potholes)
// 9. Additional test corridors (Futala, Koradi, Lokmanya Nagar, Pardi)
export const DEMO_AREA_POTHOLES: PotholeRecord[] = [
  // --- 1. Sitabuldi (3 potholes on main roads) ---
  {
    id: 101,
    latitude: 21.14620,
    longitude: 79.08500,
    severity: 'CRITICAL',
    road_name: 'Sitabuldi Main Road',
    confidence: 0.95,
    report_count: 14,
    depth_estimate_cm: 18.5,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 102,
    latitude: 21.14780,
    longitude: 79.08720,
    severity: 'HIGH',
    road_name: 'Sitabuldi Main Road near Metro Station',
    confidence: 0.91,
    report_count: 9,
    depth_estimate_cm: 13.5,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 103,
    latitude: 21.14950,
    longitude: 79.08850,
    severity: 'MODERATE',
    road_name: 'Sitabuldi East near Munje Chowk',
    confidence: 0.84,
    report_count: 5,
    depth_estimate_cm: 8.0,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 9).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 2. Nagpur Railway Station Area (3 potholes - on public roads, NOT inside station premises) ---
  {
    id: 104,
    latitude: 21.15100,
    longitude: 79.08680,
    severity: 'CRITICAL',
    road_name: 'Station Road (Nagpur Railway Station West)',
    confidence: 0.96,
    report_count: 18,
    depth_estimate_cm: 20.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 105,
    latitude: 21.15380,
    longitude: 79.08880,
    severity: 'HIGH',
    road_name: 'Manas Chowk Railway Feeder Road',
    confidence: 0.89,
    report_count: 8,
    depth_estimate_cm: 12.5,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 106,
    latitude: 21.15150,
    longitude: 79.09250,
    severity: 'LOW',
    road_name: 'Cotton Market - Station East Access Road',
    confidence: 0.79,
    report_count: 3,
    depth_estimate_cm: 4.5,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 3. GMC Medical College Area (3-4 potholes on surrounding public streets) ---
  {
    id: 107,
    latitude: 21.13600,
    longitude: 79.09450,
    severity: 'CRITICAL',
    road_name: 'Medical College Road near Medical Square',
    confidence: 0.94,
    report_count: 15,
    depth_estimate_cm: 19.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 108,
    latitude: 21.13780,
    longitude: 79.09700,
    severity: 'HIGH',
    road_name: 'Medical College Road North Approach',
    confidence: 0.88,
    report_count: 8,
    depth_estimate_cm: 13.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 7).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 109,
    latitude: 21.13420,
    longitude: 79.09800,
    severity: 'MODERATE',
    road_name: 'Hanuman Nagar Public Road (South of GMC)',
    confidence: 0.83,
    report_count: 5,
    depth_estimate_cm: 8.0,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 11).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 110,
    latitude: 21.13900,
    longitude: 79.09350,
    severity: 'LOW',
    road_name: 'Rambagh Public Marg (West of GMC)',
    confidence: 0.77,
    report_count: 3,
    depth_estimate_cm: 4.0,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 4. VNIT Area (3-4 potholes on surrounding public streets, not inside campus) ---
  {
    id: 111,
    latitude: 21.12980,
    longitude: 79.05850,
    severity: 'CRITICAL',
    road_name: 'South Ambazari Road near VNIT Main Gate',
    confidence: 0.97,
    report_count: 17,
    depth_estimate_cm: 21.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 112,
    latitude: 21.13250,
    longitude: 79.06020,
    severity: 'HIGH',
    road_name: 'South Ambazari Road near Bajaj Nagar Square',
    confidence: 0.90,
    report_count: 9,
    depth_estimate_cm: 14.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 113,
    latitude: 21.12550,
    longitude: 79.05500,
    severity: 'MODERATE',
    road_name: 'IT Park Road (South of VNIT Campus)',
    confidence: 0.85,
    report_count: 6,
    depth_estimate_cm: 8.5,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 114,
    latitude: 21.13650,
    longitude: 79.06550,
    severity: 'LOW',
    road_name: 'Abhyankar Nagar Public Link Road',
    confidence: 0.78,
    report_count: 3,
    depth_estimate_cm: 4.5,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 22).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 5. AIIMS Nagpur Area (3-4 potholes on public access roads) ---
  {
    id: 115,
    latitude: 21.05950,
    longitude: 79.02350,
    severity: 'CRITICAL',
    road_name: 'MIHAN Outer Boulevard near AIIMS Nagpur',
    confidence: 0.95,
    report_count: 14,
    depth_estimate_cm: 19.5,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 116,
    latitude: 21.06300,
    longitude: 79.02500,
    severity: 'HIGH',
    road_name: 'AIIMS Public Access Marg',
    confidence: 0.89,
    report_count: 8,
    depth_estimate_cm: 13.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 117,
    latitude: 21.07150,
    longitude: 79.03550,
    severity: 'MODERATE',
    road_name: 'Khapri Metro Station to AIIMS Link Road',
    confidence: 0.82,
    report_count: 5,
    depth_estimate_cm: 7.5,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 15).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 118,
    latitude: 21.06850,
    longitude: 79.03250,
    severity: 'LOW',
    road_name: 'MIHAN Outer Boulevard Sector 2',
    confidence: 0.76,
    report_count: 2,
    depth_estimate_cm: 4.0,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 6. Dr. B. R. Ambedkar Area (3-4 potholes on nearby public roads) ---
  {
    id: 119,
    latitude: 21.12950,
    longitude: 79.06900,
    severity: 'CRITICAL',
    road_name: 'Deekshabhoomi Marg (East of Memorial)',
    confidence: 0.96,
    report_count: 16,
    depth_estimate_cm: 18.5,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 120,
    latitude: 21.13200,
    longitude: 79.07100,
    severity: 'HIGH',
    road_name: 'Deekshabhoomi Marg near Bajaj Nagar T-Point',
    confidence: 0.90,
    report_count: 8,
    depth_estimate_cm: 13.5,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 7).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 121,
    latitude: 21.13850,
    longitude: 79.07500,
    severity: 'MODERATE',
    road_name: 'Congress Nagar Main Road',
    confidence: 0.84,
    report_count: 5,
    depth_estimate_cm: 8.0,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 13).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 122,
    latitude: 21.13500,
    longitude: 79.06700,
    severity: 'LOW',
    road_name: 'Bajaj Nagar Road near Deekshabhoomi Square',
    confidence: 0.77,
    report_count: 2,
    depth_estimate_cm: 4.2,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 7. Dighori (3-4 potholes on main roads) ---
  {
    id: 123,
    latitude: 21.11180,
    longitude: 79.13850,
    severity: 'CRITICAL',
    road_name: 'Umred Road near Dighori Naka',
    confidence: 0.95,
    report_count: 14,
    depth_estimate_cm: 20.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 124,
    latitude: 21.10650,
    longitude: 79.14300,
    severity: 'HIGH',
    road_name: 'Dighori Outer Ring Road Junction',
    confidence: 0.91,
    report_count: 8,
    depth_estimate_cm: 14.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 125,
    latitude: 21.11520,
    longitude: 79.13400,
    severity: 'MODERATE',
    road_name: 'Beldar Nagar Main Road, Dighori',
    confidence: 0.85,
    report_count: 5,
    depth_estimate_cm: 8.0,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 126,
    latitude: 21.11800,
    longitude: 79.14650,
    severity: 'LOW',
    road_name: 'Umred Road East Corridor, Dighori',
    confidence: 0.78,
    report_count: 3,
    depth_estimate_cm: 4.5,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // --- 8. Mahal (3-4 potholes on main roads) ---
  {
    id: 127,
    latitude: 21.14550,
    longitude: 79.10800,
    severity: 'CRITICAL',
    road_name: 'Mahal Main Road near Tilak Statue',
    confidence: 0.94,
    report_count: 13,
    depth_estimate_cm: 18.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 128,
    latitude: 21.14800,
    longitude: 79.10850,
    severity: 'HIGH',
    road_name: 'Chitnis Park Approach Road, Mahal',
    confidence: 0.88,
    report_count: 7,
    depth_estimate_cm: 12.5,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 7).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 129,
    latitude: 21.14650,
    longitude: 79.11250,
    severity: 'MODERATE',
    road_name: 'Kotwali Marg to Badkas Chowk',
    confidence: 0.82,
    report_count: 4,
    depth_estimate_cm: 7.5,
    image_url: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 14).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 130,
    latitude: 21.15000,
    longitude: 79.11450,
    severity: 'LOW',
    road_name: 'Mahal East Link Road',
    confidence: 0.76,
    report_count: 2,
    depth_estimate_cm: 4.0,
    image_url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 25).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },

  // Additional corridors (Pardi, Lokmanya Nagar, Koradi, Futala)
  {
    id: 131,
    latitude: 21.14720,
    longitude: 79.15400,
    severity: 'CRITICAL',
    road_name: 'Old Bhandara Road near Pardi Flyover',
    confidence: 0.97,
    report_count: 16,
    depth_estimate_cm: 20.2,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 132,
    latitude: 21.11750,
    longitude: 79.01350,
    severity: 'CRITICAL',
    road_name: 'Hingna Road near Lokmanya Nagar Metro Station',
    confidence: 0.96,
    report_count: 15,
    depth_estimate_cm: 18.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 133,
    latitude: 21.23850,
    longitude: 79.09800,
    severity: 'CRITICAL',
    road_name: 'Koradi Main Road near Temple Gate',
    confidence: 0.98,
    report_count: 24,
    depth_estimate_cm: 22.0,
    image_url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  },
  {
    id: 134,
    latitude: 21.15550,
    longitude: 79.04850,
    severity: 'HIGH',
    road_name: 'Telangkhedi Futala Waterfront Promenade Road',
    confidence: 0.94,
    report_count: 13,
    depth_estimate_cm: 15.0,
    image_url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    detected_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    verified: true,
    isDemo: true,
    dataType: 'demo',
    source: 'demo' as any
  }
];

// Unified dataset: initial seed potholes + all demo area potholes
export const ALL_INITIAL_POTHOLES: PotholeRecord[] = [
  ...INITIAL_SEED_POTHOLES,
  ...DEMO_AREA_POTHOLES
];
