import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { PotholeRecord } from '../../database/seedPotholes';
import { db as dbLocal, GeocodedLocationRecord } from '../../database/db';

export type { GeocodedLocationRecord };

let firestoreInstance: Firestore | null = null;
let isInitialized = false;
let initFailed = false;

/**
 * Lazily initialize Firebase Admin SDK using backend environment variables.
 * Never throws at module load time.
 */
export function getFirestoreDb(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  if (initFailed) return null;

  try {
    if (getApps().length > 0) {
      firestoreInstance = getFirestore();
      isInitialized = true;
      return firestoreInstance;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      // Fix potential escaped newline characters in private key string
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      privateKey = privateKey.replace(/\\n/g, '\n');

      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });

      firestoreInstance = getFirestore();
      isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized with Firestore credentials for project:', projectId);
      return firestoreInstance;
    }

    // Check if default application credentials exist
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp();
      firestoreInstance = getFirestore();
      isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized with default application credentials');
      return firestoreInstance;
    }

    // Not configured yet; silently return null so system uses local spatial DB without crashing
    return null;
  } catch (err: any) {
    console.warn('⚠️ Firebase Admin Firestore not initialized:', err?.message || err);
    initFailed = true;
    return null;
  }
}

export function isFirestoreConfigured(): boolean {
  return getFirestoreDb() !== null;
}

/**
 * Retrieve all potholes from Firestore collection 'potholes'
 */
export async function getPotholesFromFirestore(): Promise<PotholeRecord[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const snapshot = await db.collection('potholes').get();
    if (snapshot.empty) {
      return [];
    }

    const records: PotholeRecord[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: typeof data.id === 'number' ? data.id : Number(doc.id) || Math.floor(Math.random() * 90000 + 1000),
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        severity: data.severity || 'MODERATE',
        road_name: data.road_name || 'Road Sector',
        confidence: Number(data.confidence) || 0.9,
        report_count: Number(data.report_count) || 1,
        depth_estimate_cm: Number(data.depth_estimate_cm) || 10,
        image_url: data.image_url,
        detected_at: data.created_at || data.detected_at || data.timestamp || new Date().toISOString(),
        verified: data.status === 'verified' || data.verified === true,
        status: data.status || 'active',
        hazard_type: data.hazard_type || data.type || 'pothole',
        vehicle_type: data.vehicle_type || data.vehicle || undefined,
        timestamp: data.created_at || data.detected_at || data.timestamp || new Date().toISOString(),
        isDemo: data.isDemo ?? false,
        dataType: data.dataType || (data.isDemo ? 'demo' : 'live')
      });
    });

    return records;
  } catch (err) {
    console.warn('⚠️ Failed to fetch potholes from Firestore:', err);
    return null;
  }
}

/**
 * Update pothole status in Firestore (e.g. mark as 'resolved' or 'active')
 */
export async function updatePotholeStatusInFirestore(
  potholeId: string | number,
  status: 'resolved' | 'active' | string
): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docId = String(potholeId);
    await db.collection('potholes').doc(docId).set(
      {
        status,
        updated_at: new Date().toISOString()
      },
      { merge: true }
    );
    console.log(`✅ Updated pothole #${potholeId} status to '${status}' in Firestore.`);
    return true;
  } catch (err) {
    console.warn(`⚠️ Failed to update pothole status in Firestore for #${potholeId}:`, err);
    return false;
  }
}

/**
 * Save a pothole removal verification audit record into 'potholeRemovalRequests' collection
 */
export async function saveRemovalRequestToFirestore(record: {
  id?: string;
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
}): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const requestId = record.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.collection('potholeRemovalRequests').doc(requestId).set({
      id: requestId,
      ...record
    });
    console.log(`✅ Saved removal verification record ${requestId} into Firestore.`);
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save removal request to Firestore:', err);
    return false;
  }
}

/**
 * Fetch all removal verification records from 'potholeRemovalRequests'
 */
export async function getRemovalRequestsFromFirestore(): Promise<any[] | null> {
  const db = getFirestoreDb();
  if (!db) return null;

  try {
    const snapshot = await db
      .collection('potholeRemovalRequests')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) return [];

    const list: any[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data());
    });
    return list;
  } catch (err) {
    console.warn('⚠️ Failed to fetch removal requests from Firestore:', err);
    return null;
  }
}

/**
 * Save or update a pothole record in Firestore
 */
export async function savePotholeToFirestore(pothole: {
  id: number | string;
  latitude: number;
  longitude: number;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  road_name: string;
  address?: string;
  confidence?: number;
  depth_estimate_cm?: number;
  image_url?: string;
  status?: string;
  created_at?: string;
}): Promise<boolean> {
  const db = getFirestoreDb();
  if (!db) return false;

  try {
    const docId = String(pothole.id);
    const payload = {
      id: pothole.id,
      latitude: pothole.latitude,
      longitude: pothole.longitude,
      severity: pothole.severity,
      road_name: pothole.road_name,
      address: pothole.address || pothole.road_name,
      confidence: pothole.confidence ?? 0.88,
      depth_estimate_cm: pothole.depth_estimate_cm ?? 10,
      image_url: pothole.image_url ?? null,
      status: pothole.status ?? 'active',
      created_at: pothole.created_at ?? new Date().toISOString()
    };

    await db.collection('potholes').doc(docId).set(payload, { merge: true });
    console.log(`✅ Saved pothole #${pothole.id} with readable address to Firestore.`);
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to save pothole to Firestore:', err);
    return false;
  }
}

/**
 * Save geocoded search location into Firebase Firestore collection "locations"
 */
export async function saveLocationToFirestore(loc: {
  searchText: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt?: string;
}): Promise<{ success: boolean; id?: string }> {
  const db = getFirestoreDb();
  const timestamp = loc.createdAt || new Date().toISOString();

  // Always mirror to local database engine for fast in-memory access
  const localRecord = dbLocal.saveLocation({
    searchText: loc.searchText,
    latitude: loc.latitude,
    longitude: loc.longitude,
    address: loc.address,
    createdAt: timestamp
  });

  if (!db) {
    return { success: true, id: localRecord.id };
  }

  try {
    const docRef = db.collection('locations').doc();
    await docRef.set({
      id: docRef.id,
      searchText: loc.searchText,
      latitude: loc.latitude,
      longitude: loc.longitude,
      address: loc.address,
      createdAt: timestamp
    });
    console.log(`✅ Saved geocoded location "${loc.searchText}" to Firestore collection 'locations' (id: ${docRef.id})`);
    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.warn('⚠️ Failed to save location to Firestore:', err?.message || err);
    return { success: false, id: localRecord.id };
  }
}

/**
 * Fetch recent geocoded locations from Firebase Firestore collection "locations"
 */
export async function getRecentLocationsFromFirestore(limitCount: number = 20): Promise<GeocodedLocationRecord[]> {
  const db = getFirestoreDb();
  if (!db) {
    return dbLocal.getLocations(limitCount);
  }

  try {
    const snap = await db.collection('locations').orderBy('createdAt', 'desc').limit(limitCount).get();
    if (snap.empty) {
      return dbLocal.getLocations(limitCount);
    }
    const list: GeocodedLocationRecord[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: doc.id,
        searchText: data.searchText || '',
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        address: data.address || '',
        createdAt: data.createdAt || ''
      });
    });
    return list;
  } catch (err) {
    console.warn('⚠️ Error fetching locations from Firestore:', err);
    return dbLocal.getLocations(limitCount);
  }
}

/**
 * Seed initial & demo potholes to Firestore if not already present.
 * Never deletes, resets, or overwrites existing user records in Firestore.
 */
export async function syncInitialPotholesToFirestore(initialPotholes: PotholeRecord[]): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const existingSnap = await db.collection('potholes').get();
    const existingDocIds = new Set<string>();
    existingSnap.forEach((doc) => existingDocIds.add(doc.id));

    // Only add records whose IDs do not already exist in Firestore (never overwrite or delete existing data)
    const toAdd = initialPotholes.filter((p) => !existingDocIds.has(String(p.id)));
    if (toAdd.length === 0) {
      console.log('✅ Firestore pothole records are already populated and up to date.');
      return;
    }

    console.log(`Seeding ${toAdd.length} missing initial/demo pothole records to Firestore...`);
    const batch = db.batch();
    for (const p of toAdd) {
      const docRef = db.collection('potholes').doc(String(p.id));
      batch.set(docRef, {
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        severity: p.severity,
        road_name: p.road_name,
        confidence: p.confidence,
        report_count: p.report_count,
        depth_estimate_cm: p.depth_estimate_cm,
        image_url: p.image_url || null,
        detected_at: p.detected_at,
        created_at: p.detected_at,
        verified: p.verified ?? true,
        status: p.status || (p.verified ? 'verified' : 'active'),
        isDemo: p.isDemo ?? false,
        dataType: p.dataType || (p.isDemo ? 'demo' : 'live')
      });
    }
    await batch.commit();
    console.log(`✅ Safely seeded ${toAdd.length} potholes into Firestore without overwriting existing data.`);
  } catch (err) {
    console.warn('Could not seed initial potholes to Firestore:', err);
  }
}
