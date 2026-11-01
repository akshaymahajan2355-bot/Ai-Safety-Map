import { DestinationPlace, NotificationItem, RoadHazard, RouteOption, UserProfile, VehicleConfig } from '../types';

export const VEHICLE_CONFIGS: Record<string, VehicleConfig> = {
  car: {
    id: 'car',
    label: 'Car',
    sublabel: 'Four-Wheeler (Standard Risk)',
    icon: '🚗',
    description: 'Stable 4-wheel chassis with moderate risk of tire puncture, rim bending, or underbody scrape.',
    riskMultiplier: 1.0,
    vulnerabilityText: 'Standard risk. Suspension and tires cushion light-to-moderate surface impacts.'
  },
  bike: {
    id: 'bike',
    label: 'Bike',
    sublabel: 'Two-Wheeler (High Risk)',
    icon: '🏍️',
    description: 'High sensitivity to road ruts, gravel, potholes, and wet surfaces. Balance & rim integrity are critical.',
    riskMultiplier: 1.8,
    vulnerabilityText: 'High risk for steering balance, sudden handlebar jerk, and rim dents.'
  },
  cycle: {
    id: 'cycle',
    label: 'Cycle',
    sublabel: 'Bicycle (Critical Risk)',
    icon: '🚲',
    description: 'Ultra-thin tires, manual pedal power, and direct rider impact. Even minor potholes can cause falls.',
    riskMultiplier: 2.4,
    vulnerabilityText: 'Severe crash risk. Potholes can instantly buckle wheels or throw rider off balance.'
  },
  other: {
    id: 'other',
    label: 'Other',
    sublabel: 'Commercial / Three-Wheeler',
    icon: '🚐',
    description: 'Vans, auto-rickshaws, commercial transport, and specialty vehicles with variable load weight.',
    riskMultiplier: 1.4,
    vulnerabilityText: 'Moderate-to-high risk. Susceptible to cargo shift and passenger jolt on damaged asphalt.'
  },
  // Backward-compatibility aliases
  scooter: {
    id: 'bike',
    label: 'Bike',
    sublabel: 'Two-Wheeler (High Risk)',
    icon: '🛵',
    description: 'High sensitivity to road ruts and potholes.',
    riskMultiplier: 1.8,
    vulnerabilityText: 'High risk for steering balance and rim dents.'
  },
  auto_rickshaw: {
    id: 'other',
    label: 'Other',
    sublabel: 'Commercial / Three-Wheeler',
    icon: '🛺',
    description: 'Vans, auto-rickshaws, and utility vehicles.',
    riskMultiplier: 1.4,
    vulnerabilityText: 'Moderate-to-high risk.'
  },
  bicycle: {
    id: 'cycle',
    label: 'Cycle',
    sublabel: 'Bicycle (Critical Risk)',
    icon: '🚲',
    description: 'Ultra-thin tires and direct rider impact.',
    riskMultiplier: 2.4,
    vulnerabilityText: 'Severe crash risk.'
  }
};

// Nagpur landmark center coordinates
export const NAGPUR_CENTER = {
  lat: 21.1458,
  lng: 79.0882
};

export const INITIAL_USER_LOCATION = {
  lat: 21.1275,
  lng: 79.0558,
  name: 'Current Location (Dharampeth, Nagpur)'
};

export const POPULAR_DESTINATIONS: DestinationPlace[] = [
  {
    id: 'dest_1',
    name: 'Nagpur Railway Station',
    address: 'Sitabuldi East, Railway Colony, Nagpur',
    category: 'Transit Hub',
    lat: 21.1528,
    lng: 79.0889,
    distance: '6.4 km',
    icon: '🚆'
  },
  {
    id: 'dest_2',
    name: 'Sitabuldi Fort & Metro Station',
    address: 'Near Reserve Bank, Sitabuldi, Nagpur',
    category: 'Landmark',
    lat: 21.1465,
    lng: 79.0845,
    distance: '4.8 km',
    icon: '🏰'
  },
  {
    id: 'dest_3',
    name: 'GMC Medical College & Hospital',
    address: 'Medical College Road, Ajni, Nagpur',
    category: 'Hospital',
    lat: 21.1342,
    lng: 79.0965,
    distance: '5.2 km',
    icon: '🏥'
  },
  {
    id: 'dest_4',
    name: 'Dr. Babasaheb Ambedkar Airport',
    address: 'Sonegaon, Wardha Road, Nagpur',
    category: 'Transit Hub',
    lat: 21.0922,
    lng: 79.0558,
    distance: '8.7 km',
    icon: '✈️'
  },
  {
    id: 'dest_5',
    name: 'VNIT Engineering Campus',
    address: 'South Ambazari Road, Nagpur',
    category: 'Education',
    lat: 21.1255,
    lng: 79.0507,
    distance: '2.4 km',
    icon: '🎓'
  },
  {
    id: 'dest_6',
    name: 'AIIMS Nagpur Campus',
    address: 'MIHAN SEZ, Nagpur',
    category: 'Hospital',
    lat: 21.0425,
    lng: 79.0430,
    distance: '14.2 km',
    icon: '🏥'
  }
];

export const EXPLORE_CATEGORIES = [
  { id: 'transit', label: 'Transit Hubs', icon: 'Train', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'hospital', label: 'Hospital', icon: 'Cross', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { id: 'college', label: 'College / Univ', icon: 'GraduationCap', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'petrol', label: 'Fuel Station', icon: 'Fuel', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  { id: 'police', label: 'Police Station', icon: 'Shield', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' },
  { id: 'repair', label: 'Mechanic / Tyre', icon: 'Wrench', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
];

export const INITIAL_HAZARDS: RoadHazard[] = [
  {
    id: 'haz_1',
    title: 'Severe Crater Pothole',
    type: 'pothole',
    severity: 'CRITICAL',
    lat: 21.1378,
    lng: 79.0712,
    roadName: 'Wardha Road near Metro Pillar 42',
    firstReportedDate: 'Today',
    lastConfirmedDate: '2 hours ago',
    confirmationsCount: 18,
    confidence: 0.96,
    depthCm: 18,
    sizeM: 1.6,
    description: 'Extremely deep jagged crater pothole in the middle lane. Immediate tire rim and balance danger.',
    reportedBy: 'AI Road Scanner Patrol',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_2',
    title: 'Major Road Depression',
    type: 'pothole',
    severity: 'CRITICAL',
    lat: 21.1445,
    lng: 79.0805,
    roadName: 'Tekdi Road underpass approach',
    firstReportedDate: 'Today',
    lastConfirmedDate: '35 mins ago',
    confirmationsCount: 26,
    confidence: 0.98,
    depthCm: 21,
    sizeM: 2.4,
    description: 'Submerged jagged asphalt depression. High chance of severe vehicle underbody strike.',
    reportedBy: 'Traffic Police #04',
    imageUrl: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_3',
    title: 'High-Risk Trench Cut',
    type: 'broken_road',
    severity: 'HIGH',
    lat: 21.1412,
    lng: 79.0754,
    roadName: 'Panchsheel Square Westbound',
    firstReportedDate: 'Yesterday',
    lastConfirmedDate: '3 hours ago',
    confirmationsCount: 14,
    confidence: 0.92,
    depthCm: 14,
    sizeM: 2.1,
    description: 'Unpaved pipeline trench cut with loose gravel and sharp asphalt corners.',
    reportedBy: 'Kunal S. (Local Rider)',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_4',
    title: 'Recessed Iron Manhole Pothole',
    type: 'pothole',
    severity: 'MODERATE',
    lat: 21.1485,
    lng: 79.0820,
    roadName: 'Station Feeder Road',
    firstReportedDate: '3 days ago',
    lastConfirmedDate: '5 hours ago',
    confirmationsCount: 9,
    confidence: 0.88,
    depthCm: 8,
    sizeM: 0.9,
    description: 'Manhole rim sunken below surface level creating a jarring impact for two-wheelers.',
    reportedBy: 'Rohit K.',
    imageUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_5',
    title: 'High Impact Pothole Cluster',
    type: 'pothole',
    severity: 'HIGH',
    lat: 21.1350,
    lng: 79.0680,
    roadName: 'Law College T-Junction',
    firstReportedDate: 'Today',
    lastConfirmedDate: '1 hour ago',
    confirmationsCount: 31,
    confidence: 0.94,
    depthCm: 15,
    sizeM: 1.8,
    description: 'Multiple clustered potholes forcing sudden lane switching during peak traffic.',
    reportedBy: 'Akshay (You)',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_6',
    title: 'Surface Unevenness',
    type: 'crack',
    severity: 'LOW',
    lat: 21.1310,
    lng: 79.0600,
    roadName: 'West High Court Road',
    firstReportedDate: 'Last week',
    lastConfirmedDate: 'Yesterday',
    confirmationsCount: 4,
    confidence: 0.83,
    depthCm: 4,
    sizeM: 1.5,
    description: 'Minor road surface ripple. No emergency lane change required.',
    reportedBy: 'City Surveyor',
    imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_7',
    title: 'Minor Surface Pothole',
    type: 'pothole',
    severity: 'LOW',
    lat: 21.1405,
    lng: 79.0630,
    roadName: 'Ramdaspeth Canal Road',
    firstReportedDate: '2 days ago',
    lastConfirmedDate: 'Today',
    confirmationsCount: 6,
    confidence: 0.85,
    depthCm: 5,
    sizeM: 0.7,
    description: 'Small edge pothole easily bypassed on outer shoulder.',
    imageUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?auto=format&fit=crop&w=600&q=80',
    verified: true
  },
  {
    id: 'haz_8',
    title: 'Scattered Debris & Edge Rut',
    type: 'debris',
    severity: 'MODERATE',
    lat: 21.1495,
    lng: 79.0860,
    roadName: 'Station Metro Gate 1 Approach',
    firstReportedDate: 'Today',
    lastConfirmedDate: '4 hours ago',
    confirmationsCount: 11,
    confidence: 0.89,
    depthCm: 7,
    sizeM: 2.8,
    description: 'Spilled concrete gravel and curb rut. Drivers should maintain steady steering.',
    reportedBy: 'Sanjay V.',
    imageUrl: 'https://images.unsplash.com/photo-1578885136359-16c8bd4d3a8e?auto=format&fit=crop&w=600&q=80',
    verified: true
  }
];

// Coordinate Waypoints for navigation
export const FASTEST_ROUTE_WAYPOINTS: [number, number][] = [
  [21.1275, 79.0558], // Start: Dharampeth
  [21.1320, 79.0620], // WHC Road
  [21.1350, 79.0680], // Law College Junction (Hazard 5)
  [21.1378, 79.0712], // Wardha Road (Hazard 1 - Deep Crater)
  [21.1412, 79.0754], // Panchsheel Sq (Hazard 3 - Broken trench)
  [21.1445, 79.0805], // Tekdi underpass (Hazard 2 - Deep depression)
  [21.1485, 79.0820], // Approach (Hazard 4)
  [21.1495, 79.0860], // Debris (Hazard 8)
  [21.1528, 79.0889]  // Arrive: Nagpur Railway Station
];

export const SAFER_ROUTE_WAYPOINTS: [number, number][] = [
  [21.1275, 79.0558], // Start: Dharampeth
  [21.1305, 79.0575], // Turn toward Civil Lines
  [21.1365, 79.0595], // Ravi Nagar Sq
  [21.1420, 79.0640], // High Court Road (Smooth VIP corridor)
  [21.1455, 79.0710], // VCA Ground Marg (Freshly paved)
  [21.1490, 79.0790], // Kasturchand Park outer ring
  [21.1515, 79.0845], // Kingsway Avenue (Clean flyover ramp)
  [21.1528, 79.0889]  // Arrive: Nagpur Railway Station
];

export const FASTEST_ROUTE_STEPS: RouteOption['steps'] = [
  { instruction: 'Head east on Dharampeth Main Road', distanceMeters: 450, streetName: 'West High Court Rd', action: 'straight', lat: 21.1275, lng: 79.0558 },
  { instruction: 'In 400m, keep right at Law College Junction', distanceMeters: 400, streetName: 'Law College Sq', action: 'turn-right', lat: 21.1350, lng: 79.0680 },
  { instruction: '⚠️ CAUTION: High-risk crater pothole ahead in 200m', distanceMeters: 750, streetName: 'Wardha Road', action: 'straight', lat: 21.1378, lng: 79.0712 },
  { instruction: 'Continue straight across Panchsheel Square', distanceMeters: 900, streetName: 'Wardha Rd', action: 'straight', lat: 21.1412, lng: 79.0754 },
  { instruction: '🚨 DANGER: Critical pothole in underpass ahead. Reduce speed', distanceMeters: 1200, streetName: 'Tekdi Rd Underpass', action: 'straight', lat: 21.1445, lng: 79.0805 },
  { instruction: 'Turn left onto Station Approach Road', distanceMeters: 550, streetName: 'Railway Feeder Marg', action: 'turn-left', lat: 21.1485, lng: 79.0820 },
  { instruction: 'Arrive at Nagpur Railway Station East Entry', distanceMeters: 150, streetName: 'Station Forecourt', action: 'arrive', lat: 21.1528, lng: 79.0889 }
];

export const SAFER_ROUTE_STEPS: RouteOption['steps'] = [
  { instruction: 'Head north via North Ambazari Road', distanceMeters: 500, streetName: 'North Ambazari Rd', action: 'straight', lat: 21.1275, lng: 79.0558 },
  { instruction: 'Turn right at Ravi Nagar onto High Court Avenue', distanceMeters: 800, streetName: 'Civil Lines VIP Corridor', action: 'turn-right', lat: 21.1365, lng: 79.0595 },
  { instruction: '🛡️ Smooth freshly paved asphalt corridor. Zero critical hazards', distanceMeters: 1800, streetName: 'High Court Rd', action: 'straight', lat: 21.1420, lng: 79.0640 },
  { instruction: 'Bear left around Kasturchand Park loop', distanceMeters: 950, streetName: 'Kasturchand Park Marg', action: 'turn-left', lat: 21.1490, lng: 79.0790 },
  { instruction: 'Cross via Kingsway Elevated Flyover into Station Gate', distanceMeters: 600, streetName: 'Kingsway Flyover', action: 'straight', lat: 21.1515, lng: 79.0845 },
  { instruction: 'Arrived safely at Nagpur Railway Station', distanceMeters: 100, streetName: 'Main Concourse', action: 'arrive', lat: 21.1528, lng: 79.0889 }
];

export const MOCK_USER_PROFILE: UserProfile = {
  name: 'Akshay Mahajan',
  email: 'akshaymahajan2355@gmail.com',
  phone: '+91 98231 44520',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
  vehicle: 'bike',
  reportsCount: 24,
  confirmedCount: 18,
  resolvedCount: 7,
  contributionPoints: 420,
  badges: [
    { id: 'b1', title: 'Road Guardian', icon: '🏆', description: 'Reported 20+ verified road hazards', earned: true },
    { id: 'b2', title: 'Safety Contributor', icon: '🛡️', description: 'Confirmed 15+ community hazard reports', earned: true },
    { id: 'b3', title: 'Hazard Reporter', icon: '🚨', description: 'First to report critical road damage', earned: true },
    { id: 'b4', title: 'Civic Hero', icon: '🌟', description: 'Documented 5+ fully resolved potholes', earned: true }
  ]
};

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n_1',
    type: 'critical_hazard',
    title: 'Critical Pothole Alert Ahead',
    message: '🚨 CRITICAL pothole detected ahead! 180m ahead on Wardha Road. Slow down immediately.',
    timestamp: '5 mins ago',
    unread: true,
    severity: 'CRITICAL',
    hazardId: 'haz_1',
    roadName: 'Wardha Road'
  },
  {
    id: 'n_2',
    type: 'high_hazard',
    title: 'High-Severity Road Hazard',
    message: '⚠️ High-severity road damage detected on your route, 420m ahead. AI Recommendation: Avoid left lane.',
    timestamp: '18 mins ago',
    unread: true,
    severity: 'HIGH',
    hazardId: 'haz_5',
    roadName: 'Law College Junction'
  },
  {
    id: 'n_3',
    type: 'safer_route',
    title: 'Safer Route Recommended',
    message: 'Civil Lines bypass has 94/100 Safety Index, avoiding 3 critical potholes with only +2 min travel time.',
    timestamp: '32 mins ago',
    unread: false,
    severity: 'LOW'
  },
  {
    id: 'n_4',
    type: 'moderate_hazard',
    title: 'Moderate Pothole Detected',
    message: '🟡 Moderate pothole detected 650m ahead on Station Approach. Drive carefully.',
    timestamp: '1 hour ago',
    unread: false,
    severity: 'MODERATE',
    hazardId: 'haz_4'
  }
];
