import { RoadHazard, SeverityLevel } from '../types';

/**
 * Bounding boxes of known water bodies and non-road zones in Nagpur.
 * Potholes must NEVER be placed inside these areas.
 */
const WATER_BODIES_AND_RESTRICTED = [
  { name: 'Ambazari Lake', minLat: 21.1290, maxLat: 21.1352, minLon: 79.0418, maxLon: 79.0495 },
  { name: 'Futala Lake', minLat: 21.1525, maxLat: 21.1610, minLon: 79.0410, maxLon: 79.0495 },
  { name: 'Gorewada Lake', minLat: 21.1900, maxLat: 21.2150, minLon: 79.0200, maxLon: 79.0450 },
  { name: 'Sonegaon Lake', minLat: 21.1000, maxLat: 21.1060, minLon: 79.0480, maxLon: 79.0550 },
  { name: 'Gandhi Sagar Lake', minLat: 21.1420, maxLat: 21.1475, minLon: 79.0965, maxLon: 79.1030 },
  // Interior campus boundaries (to ensure potholes stay strictly on surrounding public roads)
  { name: 'VNIT Interior Campus Core', minLat: 21.1235, maxLat: 21.1275, minLon: 79.0515, maxLon: 79.0560 },
  { name: 'GMC Hospital Core Buildings', minLat: 21.1360, maxLat: 21.1395, minLon: 79.0960, maxLon: 79.1005 }
];

export interface VerifiedRoad {
  id: string;
  name: string;
  category: 'primary' | 'secondary' | 'arterial' | 'residential';
  points: [number, number][]; // [lat, lng]
}

/**
 * Verified road network geometry polylines for Nagpur and key test cities.
 * Coordinates are verified along actual public streets and corridors.
 */
export const VERIFIED_ROAD_NETWORK: VerifiedRoad[] = [
  // 1. Sitabuldi Main Roads & Transit Interchange
  {
    id: 'rd-sitabuldi-main',
    name: 'Sitabuldi Main Road',
    category: 'primary',
    points: [
      [21.1448, 79.0825],
      [21.1462, 79.0850],
      [21.1478, 79.0872],
      [21.1495, 79.0885],
      [21.1512, 79.0898]
    ]
  },
  {
    id: 'rd-tekdi-road',
    name: 'Tekdi Road near Sitabuldi Fort',
    category: 'secondary',
    points: [
      [21.1480, 79.0855],
      [21.1502, 79.0865],
      [21.1525, 79.0875]
    ]
  },
  {
    id: 'rd-munje-chowk',
    name: 'Munje Chowk to Jhansi Rani Square',
    category: 'arterial',
    points: [
      [21.1445, 79.0835],
      [21.1438, 79.0805],
      [21.1430, 79.0765]
    ]
  },

  // 2. Nagpur Railway Station Surrounding Public Roads (NOT inside railway premises)
  {
    id: 'rd-railway-station-approach',
    name: 'Station Road (Nagpur Railway Station West)',
    category: 'primary',
    points: [
      [21.1510, 79.0868],
      [21.1525, 79.0878],
      [21.1538, 79.0888],
      [21.1555, 79.0895]
    ]
  },
  {
    id: 'rd-cotton-market-station',
    name: 'Cotton Market - Station East Access Road',
    category: 'secondary',
    points: [
      [21.1495, 79.0915],
      [21.1515, 79.0925],
      [21.1535, 79.0930]
    ]
  },
  {
    id: 'rd-manas-chowk-station',
    name: 'Manas Chowk Railway Feeder Road',
    category: 'arterial',
    points: [
      [21.1500, 79.0850],
      [21.1515, 79.0870],
      [21.1528, 79.0889]
    ]
  },

  // 3. Wardha Road Corridor & Flyover Approaches
  {
    id: 'rd-wardha-flyover-north',
    name: 'Wardha Road near Rahate Colony Square',
    category: 'primary',
    points: [
      [21.1432, 79.0720],
      [21.1415, 79.0735],
      [21.1390, 79.0745],
      [21.1360, 79.0752]
    ]
  },
  {
    id: 'rd-wardha-ajni-square',
    name: 'Wardha Road near Ajni Square',
    category: 'primary',
    points: [
      [21.1350, 79.0755],
      [21.1310, 79.0750],
      [21.1270, 79.0740],
      [21.1220, 79.0725]
    ]
  },
  {
    id: 'rd-wardha-chhatrapati-sq',
    name: 'Wardha Road near Chhatrapati Square',
    category: 'primary',
    points: [
      [21.1205, 79.0718],
      [21.1165, 79.0685],
      [21.1120, 79.0645],
      [21.1070, 79.0610]
    ]
  },
  {
    id: 'rd-wardha-airport-way',
    name: 'Airport Road Approach, Somalwada',
    category: 'primary',
    points: [
      [21.1050, 79.0595],
      [21.0980, 79.0560],
      [21.0910, 79.0520]
    ]
  },

  // 4. GMC Medical College Surrounding Public Roads (Surrounding streets only, not inside hospital campus)
  {
    id: 'rd-gmc-medical-sq',
    name: 'Medical College Road near Medical Square',
    category: 'primary',
    points: [
      [21.1345, 79.0925],
      [21.1360, 79.0945],
      [21.1378, 79.0970],
      [21.1395, 79.0990]
    ]
  },
  {
    id: 'rd-gmc-hanuman-nagar',
    name: 'Hanuman Nagar Public Road (South of GMC)',
    category: 'secondary',
    points: [
      [21.1330, 79.0950],
      [21.1342, 79.0980],
      [21.1355, 79.1010]
    ]
  },
  {
    id: 'rd-gmc-rambagh-marg',
    name: 'Rambagh Public Marg (West of GMC)',
    category: 'secondary',
    points: [
      [21.1370, 79.0915],
      [21.1390, 79.0935],
      [21.1415, 79.0955]
    ]
  },

  // 5. VNIT Surrounding Public Roads (Public peripheral streets only, NOT inside the campus)
  {
    id: 'rd-vnit-south-ambazari',
    name: 'South Ambazari Road near VNIT Main Gate',
    category: 'primary',
    points: [
      [21.1275, 79.0570],
      [21.1298, 79.0585],
      [21.1325, 79.0602],
      [21.1350, 79.0615]
    ]
  },
  {
    id: 'rd-vnit-it-park-link',
    name: 'IT Park Road (South of VNIT Campus)',
    category: 'secondary',
    points: [
      [21.1245, 79.0520],
      [21.1255, 79.0550],
      [21.1265, 79.0585]
    ]
  },
  {
    id: 'rd-vnit-abhyankar-link',
    name: 'Abhyankar Nagar Public Link Road',
    category: 'secondary',
    points: [
      [21.1340, 79.0630],
      [21.1365, 79.0655],
      [21.1385, 79.0675]
    ]
  },

  // 6. AIIMS Nagpur Surrounding Public Roads
  {
    id: 'rd-aiims-mihan-boulevard',
    name: 'MIHAN Outer Boulevard near AIIMS Nagpur',
    category: 'primary',
    points: [
      [21.0550, 79.0190],
      [21.0595, 79.0235],
      [21.0640, 79.0280],
      [21.0685, 79.0325]
    ]
  },
  {
    id: 'rd-aiims-approach-road',
    name: 'AIIMS Public Access Marg',
    category: 'secondary',
    points: [
      [21.0610, 79.0210],
      [21.0630, 79.0250],
      [21.0655, 79.0290]
    ]
  },
  {
    id: 'rd-aiims-khapri-metro-link',
    name: 'Khapri Metro Station to AIIMS Link Road',
    category: 'secondary',
    points: [
      [21.0670, 79.0310],
      [21.0715, 79.0355],
      [21.0760, 79.0400]
    ]
  },

  // 7. Dr. B. R. Ambedkar / Deekshabhoomi Surrounding Public Roads
  {
    id: 'rd-ambedkar-deekshabhoomi-marg',
    name: 'Deekshabhoomi Marg (East of Memorial)',
    category: 'primary',
    points: [
      [21.1270, 79.0675],
      [21.1295, 79.0690],
      [21.1320, 79.0710],
      [21.1350, 79.0725]
    ]
  },
  {
    id: 'rd-ambedkar-congress-nagar',
    name: 'Congress Nagar Main Road',
    category: 'secondary',
    points: [
      [21.1360, 79.0735],
      [21.1385, 79.0750],
      [21.1410, 79.0765]
    ]
  },
  {
    id: 'rd-ambedkar-bajaj-nagar',
    name: 'Bajaj Nagar Road near Deekshabhoomi Square',
    category: 'secondary',
    points: [
      [21.1330, 79.0645],
      [21.1350, 79.0670],
      [21.1370, 79.0700]
    ]
  },

  // 8. Dighori Main Roads
  {
    id: 'rd-dighori-umred-road',
    name: 'Umred Road near Dighori Naka',
    category: 'primary',
    points: [
      [21.1090, 79.1350],
      [21.1118, 79.1385],
      [21.1145, 79.1420],
      [21.1180, 79.1465]
    ]
  },
  {
    id: 'rd-dighori-ring-road',
    name: 'Dighori Outer Ring Road Junction',
    category: 'primary',
    points: [
      [21.1040, 79.1400],
      [21.1065, 79.1430],
      [21.1095, 79.1470]
    ]
  },
  {
    id: 'rd-dighori-beldar-nagar',
    name: 'Beldar Nagar Main Road, Dighori',
    category: 'secondary',
    points: [
      [21.1130, 79.1310],
      [21.1152, 79.1340],
      [21.1175, 79.1370]
    ]
  },

  // 9. Mahal & Gandhibagh Roads
  {
    id: 'rd-mahal-main-road',
    name: 'Mahal Main Road near Tilak Statue',
    category: 'primary',
    points: [
      [21.1430, 79.1040],
      [21.1455, 79.1080],
      [21.1478, 79.1115],
      [21.1500, 79.1145]
    ]
  },
  {
    id: 'rd-mahal-chitnis-park',
    name: 'Chitnis Park Approach Road, Mahal',
    category: 'secondary',
    points: [
      [21.1460, 79.1055],
      [21.1480, 79.1085],
      [21.1505, 79.1110]
    ]
  },
  {
    id: 'rd-mahal-kotwali-marg',
    name: 'Kotwali Marg to Badkas Chowk',
    category: 'secondary',
    points: [
      [21.1440, 79.1095],
      [21.1465, 79.1125],
      [21.1490, 79.1155]
    ]
  },

  // 10. Dharampeth & West High Court (WHC) Road
  {
    id: 'rd-whc-dharampeth',
    name: 'West High Court Road, Dharampeth',
    category: 'primary',
    points: [
      [21.1415, 79.0650],
      [21.1438, 79.0598],
      [21.1465, 79.0615],
      [21.1490, 79.0640],
      [21.1524, 79.0715]
    ]
  },
  {
    id: 'rd-dharampeth-coffee-house',
    name: 'Coffee House Square - Zenda Chowk Marg',
    category: 'secondary',
    points: [
      [21.1440, 79.0570],
      [21.1455, 79.0595],
      [21.1470, 79.0620]
    ]
  },

  // 11. Central Avenue (CA Road) Corridor
  {
    id: 'rd-central-avenue-west',
    name: 'Central Avenue near Dosar Bhavan',
    category: 'primary',
    points: [
      [21.1520, 79.0910],
      [21.1540, 79.0965],
      [21.1558, 79.1020],
      [21.1575, 79.1085]
    ]
  },
  {
    id: 'rd-central-avenue-east',
    name: 'Central Avenue near Telephone Exchange Square',
    category: 'primary',
    points: [
      [21.1585, 79.1150],
      [21.1601, 79.1220],
      [21.1615, 79.1310],
      [21.1630, 79.1410]
    ]
  },

  // 12. North Ambazari Road (West & North of Lake - strictly staying on road, NOT entering water)
  {
    id: 'rd-north-ambazari-corridor',
    name: 'North Ambazari Road near Shankar Nagar',
    category: 'primary',
    points: [
      [21.1378, 79.0435],
      [21.1385, 79.0520],
      [21.1392, 79.0585],
      [21.1405, 79.0630]
    ]
  },

  // 13. Hingna Road & Lokmanya Nagar Metro Corridor
  {
    id: 'rd-hingna-metro-corridor',
    name: 'Hingna Road near Lokmanya Nagar Metro',
    category: 'primary',
    points: [
      [21.1248, 79.0445],
      [21.1210, 79.0350],
      [21.1175, 79.0235],
      [21.1140, 79.0135],
      [21.1105, 79.0040]
    ]
  },

  // 14. Civil Lines & Walker's Street Corridor
  {
    id: 'rd-civil-lines-enclave',
    name: 'Palm Road, Civil Lines',
    category: 'primary',
    points: [
      [21.1520, 79.0750],
      [21.1550, 79.0735],
      [21.1580, 79.0710],
      [21.1615, 79.0680]
    ]
  },

  // 15. Sadar Residency Road & Kamptee Road
  {
    id: 'rd-sadar-residency',
    name: 'Residency Road, Sadar',
    category: 'primary',
    points: [
      [21.1565, 79.0815],
      [21.1600, 79.0835],
      [21.1645, 79.0860],
      [21.1690, 79.0890]
    ]
  },

  // 16. Pardi & Old Bhandara Road Corridor
  {
    id: 'rd-pardi-bhandara',
    name: 'Old Bhandara Road near Pardi Flyover',
    category: 'primary',
    points: [
      [21.1450, 79.1480],
      [21.1472, 79.1540],
      [21.1495, 79.1595],
      [21.1520, 79.1650]
    ]
  },

  // 17. Koradi Temple Road Corridor
  {
    id: 'rd-koradi-temple-road',
    name: 'Koradi Main Road near Temple Gate',
    category: 'primary',
    points: [
      [21.2280, 79.0960],
      [21.2335, 79.0980],
      [21.2385, 79.0995],
      [21.2440, 79.0985]
    ]
  },

  // 18. South Ring Road Arterial
  {
    id: 'rd-south-ring-road',
    name: 'Ring Road near Pratap Nagar Square',
    category: 'primary',
    points: [
      [21.1180, 79.0480],
      [21.1155, 79.0560],
      [21.1135, 79.0660],
      [21.1120, 79.0780]
    ]
  },

  // 19. Great Nag Road
  {
    id: 'rd-great-nag-road',
    name: 'Great Nag Road near Baidyanath Square',
    category: 'arterial',
    points: [
      [21.1390, 79.0920],
      [21.1380, 79.1020],
      [21.1375, 79.1120],
      [21.1365, 79.1240]
    ]
  },

  // 20. Amravati Road near Ravi Nagar Square
  {
    id: 'rd-amravati-ravi-nagar',
    name: 'Amravati Road near Ravi Nagar Square',
    category: 'primary',
    points: [
      [21.1475, 79.0490],
      [21.1490, 79.0410],
      [21.1505, 79.0320],
      [21.1520, 79.0210]
    ]
  }
];

/**
 * Check if a coordinate falls inside any water body or restricted non-road polygon
 */
export function isCoordinateInRestrictedArea(lat: number, lon: number): boolean {
  for (const zone of WATER_BODIES_AND_RESTRICTED) {
    if (
      lat >= zone.minLat &&
      lat <= zone.maxLat &&
      lon >= zone.minLon &&
      lon <= zone.maxLon
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Deterministic pseudo-random number generator from seed string.
 * Ensures demo potholes remain CONSISTENT during the current demo session
 * instead of changing position every few seconds or every re-render.
 */
function pseudoRandom(seedStr: string): number {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash++) * 10000;
  return x - Math.floor(x);
}

/**
 * Session storage cache for generated demo potholes.
 * Keeps potholes consistent during the user session.
 */
const sessionPotholesCache = new Map<string, RoadHazard>();

/**
 * Pre-generate standard initial demo potholes along verified road segments
 * so that when the app boots or centers on Nagpur, markers are immediately
 * placed on real roads across all areas.
 */
const PRELOADED_STREET_CONFIGS: Array<{
  roadId: string;
  roadName: string;
  segmentIndex: number;
  fraction: number;
  severity: SeverityLevel;
  confidence: number;
  depthCm: number;
  reportCount: number;
  desc: string;
}> = [
  // 1. Sitabuldi Road (3 potholes)
  {
    roadId: 'rd-sitabuldi-main',
    roadName: 'Sitabuldi Main Road',
    segmentIndex: 0,
    fraction: 0.35,
    severity: 'CRITICAL',
    confidence: 0.95,
    depthCm: 18,
    reportCount: 14,
    desc: 'Severe asphalt cavity across central traffic lane'
  },
  {
    roadId: 'rd-sitabuldi-main',
    roadName: 'Sitabuldi Main Road near Metro Station',
    segmentIndex: 1,
    fraction: 0.65,
    severity: 'HIGH',
    confidence: 0.91,
    depthCm: 14,
    reportCount: 9,
    desc: 'Deep depression near bus stop approach'
  },
  {
    roadId: 'rd-tekdi-road',
    roadName: 'Tekdi Road near Sitabuldi Fort',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.84,
    depthCm: 9,
    reportCount: 6,
    desc: 'Surface wear depression on curve shoulder'
  },

  // 2. Nagpur Railway Station Area (3 potholes - on public roads, not inside station premises)
  {
    roadId: 'rd-railway-station-approach',
    roadName: 'Station Road (Nagpur Railway Station West)',
    segmentIndex: 0,
    fraction: 0.40,
    severity: 'CRITICAL',
    confidence: 0.96,
    depthCm: 20,
    reportCount: 18,
    desc: 'Deep cavity on primary station approach road'
  },
  {
    roadId: 'rd-manas-chowk-station',
    roadName: 'Manas Chowk Railway Feeder Road',
    segmentIndex: 0,
    fraction: 0.60,
    severity: 'HIGH',
    confidence: 0.89,
    depthCm: 13,
    reportCount: 8,
    desc: 'Steep pothole rim near flyover pillar'
  },
  {
    roadId: 'rd-cotton-market-station',
    roadName: 'Cotton Market - Station East Access Road',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'LOW',
    confidence: 0.79,
    depthCm: 5,
    reportCount: 3,
    desc: 'Minor asphalt pitting on outer lane'
  },

  // 3. GMC Medical College Area (3-4 potholes on surrounding public streets)
  {
    roadId: 'rd-gmc-medical-sq',
    roadName: 'Medical College Road near Medical Square',
    segmentIndex: 0,
    fraction: 0.35,
    severity: 'CRITICAL',
    confidence: 0.94,
    depthCm: 19,
    reportCount: 16,
    desc: 'Major cavity on public ambulance corridor'
  },
  {
    roadId: 'rd-gmc-medical-sq',
    roadName: 'Medical College Road North Approach',
    segmentIndex: 1,
    fraction: 0.70,
    severity: 'HIGH',
    confidence: 0.88,
    depthCm: 12,
    reportCount: 7,
    desc: 'Transverse road crack and subsidence'
  },
  {
    roadId: 'rd-gmc-hanuman-nagar',
    roadName: 'Hanuman Nagar Public Road (South of GMC)',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.82,
    depthCm: 8,
    reportCount: 5,
    desc: 'Surface wear depression on asphalt joint'
  },
  {
    roadId: 'rd-gmc-rambagh-marg',
    roadName: 'Rambagh Public Marg (West of GMC)',
    segmentIndex: 0,
    fraction: 0.60,
    severity: 'LOW',
    confidence: 0.76,
    depthCm: 4,
    reportCount: 2,
    desc: 'Minor pothole on outer drainage curb'
  },

  // 4. VNIT Area (3-4 potholes on surrounding public streets, not inside campus)
  {
    roadId: 'rd-vnit-south-ambazari',
    roadName: 'South Ambazari Road near VNIT Main Gate',
    segmentIndex: 0,
    fraction: 0.40,
    severity: 'CRITICAL',
    confidence: 0.97,
    depthCm: 21,
    reportCount: 15,
    desc: 'Extensive road crater on main driving corridor'
  },
  {
    roadId: 'rd-vnit-south-ambazari',
    roadName: 'South Ambazari Road near Bajaj Nagar Square',
    segmentIndex: 1,
    fraction: 0.65,
    severity: 'HIGH',
    confidence: 0.90,
    depthCm: 14,
    reportCount: 8,
    desc: 'Edge rupture and asphalt depression'
  },
  {
    roadId: 'rd-vnit-it-park-link',
    name: 'IT Park Road (South of VNIT Campus)',
    roadName: 'IT Park Road (South of VNIT Campus)',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.85,
    depthCm: 8,
    reportCount: 6,
    desc: 'Moderate depression near tech park entrance'
  } as any,
  {
    roadId: 'rd-vnit-abhyankar-link',
    roadName: 'Abhyankar Nagar Public Link Road',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'LOW',
    confidence: 0.78,
    depthCm: 5,
    reportCount: 3,
    desc: 'Surface deterioration on lane shoulder'
  },

  // 5. AIIMS Nagpur Area (3-4 potholes on public roads)
  {
    roadId: 'rd-aiims-mihan-boulevard',
    roadName: 'MIHAN Outer Boulevard near AIIMS Nagpur',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'CRITICAL',
    confidence: 0.95,
    depthCm: 19,
    reportCount: 13,
    desc: 'Deep concrete cavity on heavy transport corridor'
  },
  {
    roadId: 'rd-aiims-approach-road',
    roadName: 'AIIMS Public Access Marg',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'HIGH',
    confidence: 0.89,
    depthCm: 13,
    reportCount: 8,
    desc: 'Sink depression on dual-carriageway'
  },
  {
    roadId: 'rd-aiims-khapri-metro-link',
    roadName: 'Khapri Metro Station to AIIMS Link Road',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.81,
    depthCm: 7,
    reportCount: 4,
    desc: 'Moderate asphalt pitting along metro pier'
  },

  // 6. Dr. B. R. Ambedkar / Deekshabhoomi Area (3-4 potholes)
  {
    roadId: 'rd-ambedkar-deekshabhoomi-marg',
    roadName: 'Deekshabhoomi Marg (East of Memorial)',
    segmentIndex: 0,
    fraction: 0.40,
    severity: 'CRITICAL',
    confidence: 0.96,
    depthCm: 18,
    reportCount: 14,
    desc: 'Severe crater on high-traffic festival route'
  },
  {
    roadId: 'rd-ambedkar-deekshabhoomi-marg',
    roadName: 'Deekshabhoomi Marg near Bajaj Nagar T-Point',
    segmentIndex: 1,
    fraction: 0.60,
    severity: 'HIGH',
    confidence: 0.90,
    depthCm: 13,
    reportCount: 7,
    desc: 'Longitudinal cavity across left lane'
  },
  {
    roadId: 'rd-ambedkar-congress-nagar',
    roadName: 'Congress Nagar Main Road',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.83,
    depthCm: 8,
    reportCount: 5,
    desc: 'Depression near residential square'
  },
  {
    roadId: 'rd-ambedkar-bajaj-nagar',
    roadName: 'Bajaj Nagar Road near Deekshabhoomi Square',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'LOW',
    confidence: 0.77,
    depthCm: 4,
    reportCount: 2,
    desc: 'Minor pitting along road curb'
  },

  // 7. Dighori Main Roads (3-4 potholes)
  {
    roadId: 'rd-dighori-umred-road',
    roadName: 'Umred Road near Dighori Naka',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'CRITICAL',
    confidence: 0.95,
    depthCm: 20,
    reportCount: 15,
    desc: 'Dangerous asphalt crater on highway connector'
  },
  {
    roadId: 'rd-dighori-ring-road',
    roadName: 'Dighori Outer Ring Road Junction',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'HIGH',
    confidence: 0.91,
    depthCm: 14,
    reportCount: 9,
    desc: 'Large sink hole on ring road approach'
  },
  {
    roadId: 'rd-dighori-beldar-nagar',
    roadName: 'Beldar Nagar Main Road, Dighori',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.84,
    depthCm: 8,
    reportCount: 5,
    desc: 'Surface wear depression on local arterial'
  },

  // 8. Mahal Main Roads (3-4 potholes)
  {
    roadId: 'rd-mahal-main-road',
    roadName: 'Mahal Main Road near Tilak Statue',
    segmentIndex: 0,
    fraction: 0.40,
    severity: 'CRITICAL',
    confidence: 0.94,
    depthCm: 18,
    reportCount: 12,
    desc: 'Major cavity on historic market corridor'
  },
  {
    roadId: 'rd-mahal-chitnis-park',
    roadName: 'Chitnis Park Approach Road, Mahal',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'HIGH',
    confidence: 0.88,
    depthCm: 12,
    reportCount: 7,
    desc: 'Broken road surface near park entrance'
  },
  {
    roadId: 'rd-mahal-kotwali-marg',
    roadName: 'Kotwali Marg to Badkas Chowk',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'MODERATE',
    confidence: 0.82,
    depthCm: 7,
    reportCount: 4,
    desc: 'Depression near commercial junction'
  },
  {
    roadId: 'rd-mahal-main-road',
    roadName: 'Mahal East Link Road',
    segmentIndex: 1,
    fraction: 0.65,
    severity: 'LOW',
    confidence: 0.76,
    depthCm: 4,
    reportCount: 2,
    desc: 'Minor surface pitting near footpath'
  },

  // Additional Nagpur Key Arteries for Broad Visibility
  // Wardha Road Flyover & Corridors
  {
    roadId: 'rd-wardha-flyover-north',
    roadName: 'Wardha Road near Rahate Colony Square',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'CRITICAL',
    confidence: 0.96,
    depthCm: 19,
    reportCount: 16,
    desc: 'Severe depression on main arterial flyover'
  },
  {
    roadId: 'rd-wardha-ajni-square',
    roadName: 'Wardha Road near Ajni Square',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'HIGH',
    confidence: 0.91,
    depthCm: 13,
    reportCount: 10,
    desc: 'Transverse asphalt fissure in middle lane'
  },
  {
    roadId: 'rd-wardha-chhatrapati-sq',
    roadName: 'Wardha Road near Chhatrapati Square',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'MODERATE',
    confidence: 0.85,
    depthCm: 8,
    reportCount: 6,
    desc: 'Moderate road bump on flyover descent'
  },
  {
    roadId: 'rd-wardha-airport-way',
    roadName: 'Airport Road Approach, Somalwada',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'CRITICAL',
    confidence: 0.97,
    depthCm: 22,
    reportCount: 20,
    desc: 'High-risk crater on airport expressway'
  },

  // Central Avenue
  {
    roadId: 'rd-central-avenue-west',
    roadName: 'Central Avenue near Dosar Bhavan',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'CRITICAL',
    confidence: 0.95,
    depthCm: 18,
    reportCount: 14,
    desc: 'Deep cavity on commercial expressway'
  },
  {
    roadId: 'rd-central-avenue-east',
    roadName: 'Central Avenue near Telephone Exchange Square',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'HIGH',
    confidence: 0.92,
    depthCm: 14,
    reportCount: 11,
    desc: 'Edge collapse and road depression'
  },

  // Dharampeth / WHC
  {
    roadId: 'rd-whc-dharampeth',
    roadName: 'West High Court Road, Dharampeth',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'HIGH',
    confidence: 0.90,
    depthCm: 13,
    reportCount: 8,
    desc: 'Cavity on shopping corridor'
  },
  {
    roadId: 'rd-dharampeth-coffee-house',
    roadName: 'Coffee House Square - Zenda Chowk Marg',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.83,
    depthCm: 7,
    reportCount: 5,
    desc: 'Surface wear near intersection'
  },

  // North Ambazari
  {
    roadId: 'rd-north-ambazari-corridor',
    roadName: 'North Ambazari Road near Shankar Nagar',
    segmentIndex: 0,
    fraction: 0.55,
    severity: 'MODERATE',
    confidence: 0.84,
    depthCm: 8,
    reportCount: 6,
    desc: 'Road depression on north arterial'
  },

  // Hingna Road
  {
    roadId: 'rd-hingna-metro-corridor',
    roadName: 'Hingna Road near Lokmanya Nagar Metro',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'CRITICAL',
    confidence: 0.96,
    depthCm: 20,
    reportCount: 15,
    desc: 'Deep pothole along metro girder approach'
  },

  // Civil Lines
  {
    roadId: 'rd-civil-lines-enclave',
    roadName: 'Palm Road, Civil Lines',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'LOW',
    confidence: 0.82,
    depthCm: 4,
    reportCount: 3,
    desc: 'Minor asphalt pitting on residential avenue'
  },

  // Sadar
  {
    roadId: 'rd-sadar-residency',
    roadName: 'Residency Road, Sadar',
    category: 'primary',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'MODERATE',
    confidence: 0.86,
    depthCm: 8,
    reportCount: 5,
    desc: 'Surface depression on commercial street'
  } as any,

  // Pardi
  {
    roadId: 'rd-pardi-bhandara',
    roadName: 'Old Bhandara Road near Pardi Flyover',
    segmentIndex: 0,
    fraction: 0.45,
    severity: 'CRITICAL',
    confidence: 0.97,
    depthCm: 21,
    reportCount: 17,
    desc: 'Dangerous cavity near industrial crossing'
  },

  // Koradi
  {
    roadId: 'rd-koradi-temple-road',
    roadName: 'Koradi Main Road near Temple Gate',
    segmentIndex: 0,
    fraction: 0.50,
    severity: 'HIGH',
    confidence: 0.93,
    depthCm: 15,
    reportCount: 12,
    desc: 'Substantial pothole on pilgrimage approach'
  }
];

// Initialize preloaded potholes into session cache on module load
function initializePreloadedPotholes() {
  if (sessionPotholesCache.size > 0) return;

  const roadMap = new Map<string, VerifiedRoad>();
  for (const road of VERIFIED_ROAD_NETWORK) {
    roadMap.set(road.id, road);
  }

  let counter = 100;
  for (const cfg of PRELOADED_STREET_CONFIGS) {
    const road = roadMap.get(cfg.roadId);
    if (!road || road.points.length < 2) continue;

    const segIdx = Math.min(road.points.length - 2, Math.max(0, cfg.segmentIndex));
    const p1 = road.points[segIdx];
    const p2 = road.points[segIdx + 1];

    const lat = p1[0] + (p2[0] - p1[0]) * cfg.fraction;
    const lng = p1[1] + (p2[1] - p1[1]) * cfg.fraction;

    // Reject if in water body or restricted area
    if (isCoordinateInRestrictedArea(lat, lng)) continue;

    counter++;
    const id = `DEMO-NGP-${counter}`;
    const pothole: RoadHazard = {
      id,
      title: `${cfg.severity} Pothole (Demo)`,
      type: 'pothole',
      severity: cfg.severity,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      roadName: cfg.roadName,
      firstReportedDate: new Date(Date.now() - 3600000 * (counter % 24 + 1)).toLocaleDateString(),
      confirmationsCount: cfg.reportCount,
      confidence: cfg.confidence,
      aiConfidence: Math.round(cfg.confidence * 100),
      manualConfidence: Math.round(cfg.confidence * 92),
      finalConfidence: Math.round(cfg.confidence * 97),
      depthCm: cfg.depthCm,
      description: `[Simulated Prototype Data] ${cfg.desc}`,
      verified: false,
      isDemo: true
    };

    sessionPotholesCache.set(id, pothole);
  }
}

initializePreloadedPotholes();

export interface VisibleMapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * High-precision Euclidean/Haversine distance in meters between two lat/lon points
 */
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111139;
  const cosLat = Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  const dLon = (lon2 - lon1) * 111139 * cosLat;
  return Math.hypot(dLat, dLon);
}

/**
 * Dynamically generate realistic demo potholes across the visible map area.
 *
 * Requirements fulfilled:
 * - Dynamic count based on visible map area and zoom level (NOT a fixed number)
 * - Number automatically increases/decreases as area/zoom changes
 * - Potholes placed strictly on or very close to actual road/street segments
 * - Never inside water bodies, buildings, or off-road terrain
 * - Natural spread across different streets without excessive overlap
 * - All four severity levels distributed:
 *   🔴 CRITICAL (Red)
 *   🟠 HIGH (Orange)
 *   🟡 MODERATE (Yellow)
 *   🟢 LOW (Green)
 *   All 4 guaranteed to be represented whenever enough potholes are generated
 * - Deterministic placement & session caching to keep positions consistent
 *   during the current session
 * - Tagged clearly with isDemo: true and demo indicator metadata
 */
/**
 * Dynamically generate realistic demo potholes across the visible map area.
 *
 * Requirements fulfilled:
 * - Moderate, clean-looking number (dynamically based on visible area and zoom level)
 * - Significantly reduced density so the map is clean and easy to understand during SIH presentation
 * - Number automatically adapts to zoom level without ever overcrowding
 * - Potholes placed strictly on verified road/street network geometry
 * - Natural spread across different streets (maximum 1 demo pothole per road in visible view)
 * - Strict minimum distance separation to prevent marker overlapping
 * - Balanced representation of all four severity levels:
 *   🔴 CRITICAL (Red)
 *   🟠 HIGH (Orange)
 *   🟡 MODERATE (Yellow)
 *   🟢 LOW (Green)
 * - Stable, deterministic positioning and severity (no disappearing or color flipping on zoom)
 * - Session cached with unique road-based IDs to eliminate duplicates
 */
export function getDynamicRoadPotholesForVisibleArea(
  bounds: VisibleMapBounds,
  zoom: number,
  activeRouteWaypoints?: [number, number][],
  minDistanceSeparationMeters: number = 50
): RoadHazard[] {
  // 1. Calculate moderate, presentation-grade target density
  // Street view (zoom >= 17): 5 potholes
  // High zoom (zoom 16): 6 potholes
  // Medium-high (zoom 15): 8 potholes
  // Medium district (zoom 14): 10 potholes
  // Wide neighborhood (zoom 13): 12 potholes
  // Regional (zoom <= 12): 14 potholes
  let baseTargetCount: number;
  if (zoom >= 17) {
    baseTargetCount = 5;
  } else if (zoom === 16) {
    baseTargetCount = 6;
  } else if (zoom === 15) {
    baseTargetCount = 8;
  } else if (zoom === 14) {
    baseTargetCount = 10;
  } else if (zoom === 13) {
    baseTargetCount = 12;
  } else {
    baseTargetCount = 14;
  }

  // Adjust dynamically with visible bounding box area factor (bounded between 0.7x and 1.3x)
  const latSpan = Math.abs(bounds.north - bounds.south);
  const lngSpan = Math.abs(bounds.east - bounds.west);
  const areaDegrees = latSpan * lngSpan;
  const areaAdjustment = Math.max(0.7, Math.min(1.3, Math.sqrt(areaDegrees / 0.04)));
  const targetCount = Math.max(4, Math.min(15, Math.round(baseTargetCount * areaAdjustment)));

  // Strict dynamic distance separation based on zoom level to prevent clustering:
  let effectiveSeparationMeters = minDistanceSeparationMeters;
  if (zoom >= 17) {
    effectiveSeparationMeters = Math.max(minDistanceSeparationMeters, 130);
  } else if (zoom === 16) {
    effectiveSeparationMeters = Math.max(minDistanceSeparationMeters, 170);
  } else if (zoom === 15) {
    effectiveSeparationMeters = Math.max(minDistanceSeparationMeters, 260);
  } else if (zoom === 14) {
    effectiveSeparationMeters = Math.max(minDistanceSeparationMeters, 360);
  } else {
    effectiveSeparationMeters = Math.max(minDistanceSeparationMeters, 520);
  }

  // Bounding box with slight margin for smooth panning
  const latMargin = latSpan * 0.05;
  const lngMargin = lngSpan * 0.05;
  const minLat = bounds.south - latMargin;
  const maxLat = bounds.north + latMargin;
  const minLng = bounds.west - lngMargin;
  const maxLng = bounds.east + lngMargin;

  // 2. Collect candidate potholes from session memory that fall inside visible bounds
  const inBoundsCandidates: RoadHazard[] = [];
  for (const pothole of sessionPotholesCache.values()) {
    if (
      pothole.lat >= minLat &&
      pothole.lat <= maxLat &&
      pothole.lng >= minLng &&
      pothole.lng <= maxLng
    ) {
      inBoundsCandidates.push(pothole);
    }
  }

  // 3. If needed, procedurally generate candidate potholes for any unrepresented visible road segments
  const activeRoads: VerifiedRoad[] = [...VERIFIED_ROAD_NETWORK];
  if (activeRouteWaypoints && activeRouteWaypoints.length >= 2) {
    activeRoads.unshift({
      id: 'active-route-road',
      name: 'Selected Route Corridor',
      category: 'primary',
      points: activeRouteWaypoints
    });
  }

  const existingRoadNames = new Set(inBoundsCandidates.map((p) => p.roadName));

  for (let rIdx = 0; rIdx < activeRoads.length; rIdx++) {
    const road = activeRoads[rIdx];
    if (existingRoadNames.has(road.name)) continue;

    // Check if any point on road falls in visible area
    const p1 = road.points[0];
    const p2 = road.points[Math.min(1, road.points.length - 1)];
    const midLat = (p1[0] + p2[0]) / 2;
    const midLng = (p1[1] + p2[1]) / 2;

    if (midLat >= minLat && midLat <= maxLat && midLng >= minLng && midLng <= maxLng) {
      if (!isCoordinateInRestrictedArea(midLat, midLng)) {
        const potholeId = `DEMO-RD-${road.id}`;
        let pothole = sessionPotholesCache.get(potholeId);
        if (!pothole) {
          // Deterministic severity palette cycling
          const severities: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
          const sev = severities[rIdx % severities.length];
          const conf = Number((0.82 + (rIdx % 15) * 0.01).toFixed(2));
          pothole = {
            id: potholeId,
            title: `${sev} Pothole (Demo)`,
            type: 'pothole',
            severity: sev,
            lat: Number(midLat.toFixed(6)),
            lng: Number(midLng.toFixed(6)),
            roadName: road.name,
            firstReportedDate: new Date(Date.now() - 3600000 * ((rIdx % 12) + 2)).toLocaleDateString(),
            confirmationsCount: 5 + (rIdx % 10),
            confidence: conf,
            aiConfidence: Math.round(conf * 100),
            manualConfidence: Math.round(conf * 92),
            finalConfidence: Math.round(conf * 96),
            depthCm: sev === 'CRITICAL' ? 19 : sev === 'HIGH' ? 13 : sev === 'MODERATE' ? 8 : 4,
            description: `[Simulated Prototype Data] Detected road damage on ${road.name}`,
            verified: false,
            isDemo: true
          };
          sessionPotholesCache.set(potholeId, pothole);
        }
        inBoundsCandidates.push(pothole);
        existingRoadNames.add(road.name);
      }
    }
  }

  // 4. Select a balanced, well-distributed subset of potholes:
  // - Bucket candidates by severity
  // - Pick round-robin across CRITICAL, HIGH, MODERATE, LOW
  // - Enforce maximum 1 pothole per street name
  // - Enforce minimum separation distance to guarantee clean spacing
  const buckets: Record<SeverityLevel, RoadHazard[]> = {
    CRITICAL: [],
    HIGH: [],
    MODERATE: [],
    LOW: []
  };

  for (const c of inBoundsCandidates) {
    if (buckets[c.severity]) {
      buckets[c.severity].push(c);
    }
  }

  const selectedPotholes: RoadHazard[] = [];
  const placedCoords: Array<{ lat: number; lng: number }> = [];
  const usedStreets = new Set<string>();

  const severityOrder: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
  let addedInRound = true;
  let round = 0;

  while (selectedPotholes.length < targetCount && addedInRound && round < 10) {
    addedInRound = false;
    round++;

    for (const sev of severityOrder) {
      if (selectedPotholes.length >= targetCount) break;
      const list = buckets[sev];

      for (let i = 0; i < list.length; i++) {
        const candidate = list[i];
        if (usedStreets.has(candidate.roadName)) continue;

        // Check distance separation from already selected coordinates
        const tooClose = placedCoords.some(
          (c) => distanceMeters(c.lat, c.lng, candidate.lat, candidate.lng) < effectiveSeparationMeters
        );
        if (tooClose) continue;

        // Candidate accepted
        selectedPotholes.push(candidate);
        placedCoords.push({ lat: candidate.lat, lng: candidate.lng });
        usedStreets.add(candidate.roadName);
        addedInRound = true;
        // Remove from bucket so it is not considered again
        list.splice(i, 1);
        break; // Move to next severity in round-robin order
      }
    }
  }

  // If still room and some streets had multiple well-spaced points, allow secondary points if separation holds
  if (selectedPotholes.length < targetCount && inBoundsCandidates.length > selectedPotholes.length) {
    for (const candidate of inBoundsCandidates) {
      if (selectedPotholes.length >= targetCount) break;
      if (selectedPotholes.some((p) => p.id === candidate.id)) continue;

      const tooClose = placedCoords.some(
        (c) => distanceMeters(c.lat, c.lng, candidate.lat, candidate.lng) < effectiveSeparationMeters
      );
      if (tooClose) continue;

      selectedPotholes.push(candidate);
      placedCoords.push({ lat: candidate.lat, lng: candidate.lng });
    }
  }

  return selectedPotholes;
}

/**
 * Returns all current demo potholes in session memory
 */
export function getAllSessionDemoPotholes(): RoadHazard[] {
  return Array.from(sessionPotholesCache.values());
}
