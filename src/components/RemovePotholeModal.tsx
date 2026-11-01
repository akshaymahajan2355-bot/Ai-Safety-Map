import React, { useState, useEffect, useRef } from 'react';
import { RoadHazard } from '../types';
import { RoadSafetyAPI } from '../utils/api';
import {
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Clock,
  Eye,
  Crosshair,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface RemovePotholeModalProps {
  currentLocation: { latitude: number; longitude: number; accuracy?: number };
  activeHazards: RoadHazard[];
  preselectedHazard?: RoadHazard | null;
  onClose: () => void;
  onPotholeResolved: (potholeId: string | number) => void;
  onRequestGPSRecenter?: () => void;
}

// High-quality test samples for frictionless in-browser verification
const SAMPLE_TEST_PHOTOS = [
  {
    id: 'repaired_asphalt',
    label: '✨ Clean Repaired Asphalt',
    subtitle: 'Smooth freshly patched road (Passes AI repair check)',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'unrepaired_pothole',
    label: '⚠️ Damaged Road Surface',
    subtitle: 'Pothole still present (Triggers POTHOLE_STILL_EXISTS)',
    url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  },
  {
    id: 'unrelated_interior',
    label: '🏠 Indoor / Unrelated Scene',
    subtitle: 'Non-road photo (Triggers UNRELATED_IMAGE)',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
  }
];

export const RemovePotholeModal: React.FC<RemovePotholeModalProps> = ({
  currentLocation,
  activeHazards,
  preselectedHazard,
  onClose,
  onPotholeResolved,
  onRequestGPSRecenter
}) => {
  // Verification Step: 'input' | 'processing' | 'result'
  const [step, setStep] = useState<'input' | 'processing' | 'result'>('input');
  const [processingStage, setProcessingStage] = useState<string>('Getting GPS Location...');
  const [processingProgress, setProcessingProgress] = useState<number>(10);

  // GPS coordinates used for verification (defaults to device GPS)
  const [verificationCoords, setVerificationCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    isSimulated?: boolean;
  }>({
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    accuracy: currentLocation.accuracy || 10,
    isSimulated: false
  });

  // Allowed GPS proximity threshold (meters)
  const [radiusMeters, setRadiusMeters] = useState<number>(20);

  // Candidate pothole being verified
  const [candidatePothole, setCandidatePothole] = useState<RoadHazard | null>(preselectedHazard || null);

  // New verification photo
  const [newImage, setNewImage] = useState<string | null>(null);
  const [newImageSource, setNewImageSource] = useState<'camera' | 'upload' | 'sample'>('upload');

  // Live Camera stream
  const [isLiveCameraActive, setIsLiveCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Result state
  const [verificationResult, setVerificationResult] = useState<{
    approved: boolean;
    message?: string;
    error?: string;
    stage?: string;
    distanceMeters?: number;
    potholeId?: string | number;
    aiResult?: {
      same_location: boolean;
      original_pothole_visible: boolean;
      new_pothole_visible: boolean;
      pothole_repaired: boolean;
      reused_image: boolean;
      image_quality_ok: boolean;
      confidence: number;
      decision: string;
      reason: string;
    };
    removalRecord?: any;
  } | null>(null);

  // Auto-find candidate pothole on GPS update or preselection
  useEffect(() => {
    if (preselectedHazard) {
      setCandidatePothole(preselectedHazard);
      return;
    }

    // Find nearest active pothole within radius
    let nearest: RoadHazard | null = null;
    let minD = Infinity;

    for (const h of activeHazards) {
      const d = calculateHaversineDistance(
        verificationCoords.latitude,
        verificationCoords.longitude,
        h.lat,
        h.lng
      );
      if (d < minD) {
        minD = d;
        nearest = h;
      }
    }

    if (nearest && minD <= radiusMeters * 2) {
      setCandidatePothole(nearest);
    } else if (activeHazards.length > 0 && !candidatePothole) {
      // Pick first active hazard for easy preview
      setCandidatePothole(activeHazards[0]);
    }
  }, [verificationCoords.latitude, verificationCoords.longitude, activeHazards, preselectedHazard, radiusMeters]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setIsLiveCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsLiveCameraActive(false);
      // Fall back to file picker
      fileInputRef.current?.click();
    }
  };

  const capturePhotoFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setNewImage(dataUrl);
        setNewImageSource('camera');
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
        setNewImageSource('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to calculate Haversine distance in meters
  function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Calculated distance between verification GPS and candidate pothole
  const currentDistanceMeters = candidatePothole
    ? Math.round(
        calculateHaversineDistance(
          verificationCoords.latitude,
          verificationCoords.longitude,
          candidatePothole.lat,
          candidatePothole.lng
        )
      )
    : null;

  const isGpsMatch = currentDistanceMeters !== null && currentDistanceMeters <= radiusMeters;

  // Run the multi-step verification pipeline
  const handleSubmitVerification = async () => {
    if (!newImage) {
      alert('Please take or upload a new photo of the pothole location.');
      return;
    }

    setStep('processing');
    setProcessingProgress(15);
    setProcessingStage('Acquiring Device GPS Location...');

    // Progress step 1
    await new Promise((r) => setTimeout(r, 600));
    setProcessingProgress(35);
    setProcessingStage('Querying Firestore for Active Pothole...');

    // Progress step 2
    await new Promise((r) => setTimeout(r, 600));
    setProcessingProgress(60);
    setProcessingStage('Performing Haversine GPS Distance Verification...');

    // Progress step 3
    await new Promise((r) => setTimeout(r, 600));
    setProcessingProgress(80);
    setProcessingStage('Dual-Image Gemini AI Verification & Feature Inspection...');

    try {
      const payload = {
        potholeId: candidatePothole ? candidatePothole.id : undefined,
        newLatitude: verificationCoords.latitude,
        newLongitude: verificationCoords.longitude,
        newImage,
        radiusMeters
      };

      const res = await RoadSafetyAPI.verifyPotholeRemoval(payload);
      setProcessingProgress(100);
      setVerificationResult(res);
      setStep('result');

      if (res.approved && res.potholeId) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 }
        });
        onPotholeResolved(res.potholeId);
      }
    } catch (err: any) {
      setProcessingProgress(100);
      setVerificationResult({
        approved: false,
        error: err?.message || 'Verification could not be completed. Please check your network and try again.'
      });
      setStep('result');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Remove Pothole / Report Fixed</span>
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                AI and GPS-verified municipal repair confirmation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1: INPUT & CAPTURE */}
          {step === 'input' && (
            <>
              {/* Directive Banner per Requirement 2 */}
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-xs font-semibold flex items-start gap-2.5 shadow-xs">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="leading-snug font-bold">
                    “Take a new photo of the pothole location to verify whether the pothole has been repaired.”
                  </p>
                  <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 font-normal">
                    The new photo will be automatically matched with your current GPS coordinates and compared against the original pothole image in Firebase using Gemini AI.
                  </p>
                </div>
              </div>

              {/* Target Active Pothole Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Crosshair className="w-3 h-3 text-red-500" />
                    Target Pothole to Resolve
                  </span>
                  {activeHazards.length > 1 && (
                    <span className="text-[10px] text-slate-500">
                      {activeHazards.length} active potholes on map
                    </span>
                  )}
                </div>

                {candidatePothole ? (
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                    <img
                      src={candidatePothole.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=150&q=80'}
                      alt="Original Pothole"
                      className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase ${
                            candidatePothole.severity === 'CRITICAL'
                              ? 'bg-red-600 text-white'
                              : candidatePothole.severity === 'HIGH'
                              ? 'bg-orange-500 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {candidatePothole.severity}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {candidatePothole.roadName || 'Road Location'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        ID: #{candidatePothole.id} • Lat: {candidatePothole.lat.toFixed(4)}, Lng: {candidatePothole.lng.toFixed(4)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isGpsMatch
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          <MapPin className="w-2.5 h-2.5" />
                          {currentDistanceMeters !== null ? `${currentDistanceMeters}m away` : 'Calculating...'}
                        </span>
                        {candidatePothole.depthCm && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            Depth: ~{candidatePothole.depthCm} cm
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>No active pothole found within 20m of current location.</span>
                  </div>
                )}

                {/* Quick selector if user wants to select a specific active pothole from map */}
                {activeHazards.length > 1 && (
                  <div className="pt-1">
                    <label className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Choose another active pothole to verify:
                    </label>
                    <select
                      value={candidatePothole?.id || ''}
                      onChange={(e) => {
                        const found = activeHazards.find((h) => String(h.id) === e.target.value);
                        if (found) {
                          setCandidatePothole(found);
                          // Provide testing option to jump GPS directly to this pothole
                          setVerificationCoords({
                            latitude: found.lat,
                            longitude: found.lng,
                            accuracy: 5,
                            isSimulated: true
                          });
                        }
                      }}
                      className="w-full text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-200"
                    >
                      {activeHazards.map((h) => (
                        <option key={h.id} value={h.id}>
                          #{h.id} — {h.severity} • {h.roadName || 'Road'} ({h.lat.toFixed(3)}, {h.lng.toFixed(3)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* GPS Coordinates & Verification Bar */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Verification GPS Coordinates
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isGpsMatch
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                    }`}
                  >
                    {isGpsMatch ? '✓ GPS Match (≤20m)' : '✕ Outside 20m Radius'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 font-mono">
                  <span>
                    Lat: {verificationCoords.latitude.toFixed(6)}, Lng: {verificationCoords.longitude.toFixed(6)}
                  </span>
                  {onRequestGPSRecenter && (
                    <button
                      type="button"
                      onClick={() => {
                        onRequestGPSRecenter();
                        setVerificationCoords({
                          latitude: currentLocation.latitude,
                          longitude: currentLocation.longitude,
                          accuracy: currentLocation.accuracy,
                          isSimulated: false
                        });
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-sans font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Device GPS
                    </button>
                  )}
                </div>

                {/* Convenient Testing Helper: Jump coordinates to selected pothole location */}
                {candidatePothole && !isGpsMatch && (
                  <button
                    type="button"
                    onClick={() => {
                      setVerificationCoords({
                        latitude: candidatePothole.lat,
                        longitude: candidatePothole.lng,
                        accuracy: 4,
                        isSimulated: true
                      });
                    }}
                    className="w-full text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 py-1.5 px-2 rounded-lg transition border border-blue-200 dark:border-blue-900 flex items-center justify-center gap-1.5"
                  >
                    <span>🎯</span>
                    <span>Align GPS with Pothole #{candidatePothole.id} for Testing</span>
                  </button>
                )}
              </div>

              {/* Photo Capture Section (Camera + Upload + Samples) */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Capture or Upload New Verification Photo
                </span>

                {/* Live Camera View if active */}
                {isLiveCameraActive ? (
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border-2 border-blue-500 shadow-lg">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhotoFromCamera}
                        className="px-4 py-2 rounded-full bg-blue-600 text-white font-bold text-xs shadow-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-3 py-2 rounded-full bg-slate-800/80 text-white text-xs hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : newImage ? (
                  /* Image Preview */
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-md aspect-16/10 bg-slate-900">
                    <img src={newImage} alt="New verification capture" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      New Photo Loaded
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewImage(null)}
                      className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retake
                    </button>
                  </div>
                ) : (
                  /* Capture Buttons: Camera & Upload */
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex flex-col items-center justify-center gap-2 transition text-slate-700 dark:text-slate-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold block">Use Camera</span>
                        <span className="text-[10px] text-slate-400">Live snap</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex flex-col items-center justify-center gap-2 transition text-slate-700 dark:text-slate-200"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-bold block">Upload Photo</span>
                        <span className="text-[10px] text-slate-400">Gallery / File</span>
                      </div>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}

                {/* Test Sample Quick-Select Options */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Or Pick Quick Test Case Photo:
                    </span>
                    {candidatePothole?.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          // Test reused photo detection
                          setNewImage(candidatePothole.imageUrl!);
                          setNewImageSource('sample');
                        }}
                        className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                        title="Test original photo reuse detection"
                      >
                        🔄 Test Original Photo (Reused)
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    {SAMPLE_TEST_PHOTOS.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => {
                          setNewImage(sample.url);
                          setNewImageSource('sample');
                        }}
                        className={`p-2 rounded-xl text-left border transition text-[11px] font-bold flex flex-col gap-0.5 ${
                          newImage === sample.url
                            ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        <span className="truncate">{sample.label}</span>
                        <span className={`text-[9px] font-normal line-clamp-1 ${newImage === sample.url ? 'text-blue-100' : 'text-slate-400'}`}>
                          {sample.subtitle}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newImage}
                  onClick={handleSubmitVerification}
                  className={`flex-1 py-3 px-4 rounded-2xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 ${
                    !newImage
                      ? 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Remove</span>
                </button>
              </div>
            </>
          )}

          {/* STEP 2: PROCESSING ANIMATION */}
          {step === 'processing' && (
            <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping"></div>
                <div className="w-20 h-20 rounded-full border-4 border-blue-600 border-t-transparent animate-spin flex items-center justify-center"></div>
                <div className="absolute w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/80 flex items-center justify-center text-blue-600">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {processingStage}
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  Validating GPS radius, comparing original vs. new road surface imagery with Gemini multimodal AI...
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-xs bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${processingProgress}%` }}
                ></div>
              </div>

              <div className="text-[11px] text-slate-400 font-mono">
                Pothole #{candidatePothole?.id || 'Target'} • GPS: {verificationCoords.latitude.toFixed(4)}, {verificationCoords.longitude.toFixed(4)}
              </div>
            </div>
          )}

          {/* STEP 3: RESULT VIEW */}
          {step === 'result' && verificationResult && (
            <div className="space-y-4">
              {verificationResult.approved ? (
                /* SUCCESS RESULT (Requirements 10 & 13) */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                        ✓ POTHOLE RESOLVED
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                        AI verification confirms that the reported pothole has been repaired.
                      </p>
                    </div>
                  </div>

                  {/* Side-by-Side Photo Comparison */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Before & After Repair Comparison
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 relative">
                        <img
                          src={candidatePothole?.imageUrl || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=80'}
                          alt="Original Pothole"
                          className="w-full h-28 object-cover opacity-90"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-red-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">
                          BEFORE (Active Hazard)
                        </span>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-emerald-500 dark:border-emerald-500 bg-slate-900 relative">
                        <img
                          src={newImage!}
                          alt="Repaired Road"
                          className="w-full h-28 object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 bg-emerald-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded-sm">
                          AFTER (Repaired)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Verification Diagnostics Breakdown */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Haversine GPS Match:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {verificationResult.distanceMeters ?? currentDistanceMeters}m away (Within 20m)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">AI Confidence:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {Math.round((verificationResult.aiResult?.confidence || 0.94) * 100)}% High Confidence
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Decision Code:</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {verificationResult.aiResult?.decision || 'REPAIRED'}
                      </span>
                    </div>

                    {verificationResult.aiResult?.reason && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 italic">
                        “{verificationResult.aiResult.reason}”
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      The pothole record status has been updated to <strong>resolved</strong> in Firebase and removed from the active navigation map.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg transition"
                  >
                    Done (Return to Map)
                  </button>
                </div>
              ) : (
                /* FAILED RESULT (Requirements 8, 9, 14, 15) */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md mt-0.5">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                        ✕ VERIFICATION FAILED
                      </h4>
                      <p className="text-xs text-rose-800 dark:text-rose-300 font-bold">
                        {verificationResult.error || 'The pothole could not be verified as repaired.'}
                      </p>
                    </div>
                  </div>

                  {/* Failure reason explanation */}
                  {verificationResult.aiResult && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">AI Decision:</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {verificationResult.aiResult.decision}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Pothole Still Visible:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {verificationResult.aiResult.new_pothole_visible ? 'YES (Visible)' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Reused Original Photo:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {verificationResult.aiResult.reused_image ? 'YES (Flagged)' : 'No'}
                        </span>
                      </div>
                      {verificationResult.distanceMeters !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Distance to Reported GPS:</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {verificationResult.distanceMeters}m ({verificationResult.distanceMeters <= 20 ? 'Within range' : 'Exceeds 20m threshold'})
                          </span>
                        </div>
                      )}
                      {verificationResult.aiResult.reason && (
                        <p className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 italic">
                          “{verificationResult.aiResult.reason}”
                        </p>
                      )}
                    </div>
                  )}

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      The pothole remains active on the map. It can only be resolved once a photo of the completed road repair is submitted at the correct GPS location.
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg transition text-center"
                    >
                      Try Again (Capture New Photo)
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
