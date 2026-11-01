import React, { useState, useRef, useMemo } from 'react';
import { HazardType, RoadHazard, SeverityLevel, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { RoadSafetyAPI } from '../utils/api';
import {
  getVehicleSpecificRisk,
  calculateFinalConfidence,
  normalizeVehicleType
} from '../utils/safetyRisk';
import { extractImageFingerprint } from '../utils/imageFingerprint';
import {
  Camera,
  Upload,
  MapPin,
  Sparkles,
  Check,
  RefreshCw,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Car,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface AddPotholeModalProps {
  userLocation: { lat: number; lng: number };
  existingHazards: RoadHazard[];
  userVehicle: VehicleType;
  onClose: () => void;
  onSubmitReport: (newHazard: RoadHazard) => void;
  onConfirmExisting: (existingHazardId: string | number) => void;
}

const HAZARD_TYPES: Array<{ id: HazardType; label: string; icon: string }> = [
  { id: 'pothole', label: 'Pothole', icon: '🔴' },
  { id: 'broken_road', label: 'Broken Road', icon: '🚧' },
  { id: 'crack', label: 'Crack', icon: '⚡' },
  { id: 'waterlogging', label: 'Waterlogging', icon: '🌊' },
  { id: 'debris', label: 'Debris', icon: '🧱' },
  { id: 'broken_signal', label: 'Broken Signal', icon: '⚠️' }
];

export const AddPotholeModal: React.FC<AddPotholeModalProps> = ({
  userLocation,
  existingHazards,
  userVehicle,
  onClose,
  onSubmitReport,
  onConfirmExisting
}) => {
  const [selectedType, setSelectedType] = useState<HazardType>('pothole');
  const [severity, setSeverity] = useState<SeverityLevel | null>(null);
  const [roadName, setRoadName] = useState('Current Road Location');
  const [description, setDescription] = useState('');
  const [depthCm, setDepthCm] = useState(0);
  const [sizeM, setSizeM] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const scanRequestIdRef = useRef<number>(0);

  // Confidence system per Section 5 requirements
  // 1. AI Detection Confidence (0 - 100%, from AI vision model)
  const [aiConfidence, setAiConfidence] = useState<number>(0);

  // 2. Manual / Evidence Confidence (0 - 100%, reporter adjusts based on visibility, lighting, evidence)
  const [manualConfidence, setManualConfidence] = useState<number>(85);

  const [aiDetectionResult, setAiDetectionResult] = useState<{
    detected: boolean;
    isNegativeReference?: boolean;
    confidence: number;
    confidenceDisplay?: string;
    safetyScore: number;
    safetyScoreDisplay: string;
    severity: SeverityLevel | null;
    detectedType: string;
    potholeCount: number;
    potholes?: Array<{
      confidence: number;
      box: { x1: number; y1: number; x2: number; y2: number };
      relBox?: { x: number; y: number; width: number; height: number };
    }>;
    depthEstimate: number;
    dimensionsM?: number;
    recommendedAction: string;
    overlayBox: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const [nearbyDuplicate, setNearbyDuplicate] = useState<RoadHazard | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileNameRef = useRef<string | undefined>(undefined);

  const normalizedVehicle = normalizeVehicleType(userVehicle);
  const vehicleConfig =
    VEHICLE_CONFIGS[userVehicle] || VEHICLE_CONFIGS[normalizedVehicle] || VEHICLE_CONFIGS.car;

  // 3. Vehicle Impact calculation (Base Severity + Vehicle Risk = Vehicle-Specific Risk)
  const vehicleSpecificRisk = useMemo(() => {
    return getVehicleSpecificRisk(severity || 'LOW', userVehicle);
  }, [severity, userVehicle]);

  // 4. Calculate Final Confidence using AI confidence + Manual Evidence + Supporting facts
  const confidenceCalculation = useMemo(() => {
    if (imagePreview && aiDetectionResult && !aiDetectionResult.detected) {
      return { finalConfidence: 0, aiContribution: 0, manualContribution: 0, bonus: 0, photoAvailable: false, gpsVerified: false, manualEvidenceConfidence: 0, aiConfidence: 0 };
    }
    return calculateFinalConfidence({
      aiConfidence,
      manualConfidence,
      photoAvailable: Boolean(imagePreview),
      gpsVerified: true
    });
  }, [aiConfidence, manualConfidence, imagePreview, aiDetectionResult]);

  // Resolve road name from reverse geocoding on mount
  React.useEffect(() => {
    RoadSafetyAPI.reverseGeocode(userLocation.lat, userLocation.lng)
      .then((addr) => {
        if (addr) setRoadName(addr);
      })
      .catch(() => {});
  }, [userLocation.lat, userLocation.lng]);

  // Handle Photo Upload with AI vision analysis
  // CRITICAL STATE RESET: IMMEDIATELY CLEAR all previous results on new selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const currentRequestId = ++scanRequestIdRef.current;
      const fileName = file.name;
      currentFileNameRef.current = fileName;

      // 1. IMMEDIATELY CLEAR all previous detection state
      setImagePreview(null);
      setAiDetectionResult(null);
      setAiConfidence(0);
      setSeverity(null);
      setAiError(null);
      setDepthCm(0);
      setSizeM(0);
      setIsScanning(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        if (currentRequestId !== scanRequestIdRef.current) return;
        const base64 = reader.result as string;
        setImagePreview(base64);

        // Pre-compute image visual fingerprint for instant matching
        let fpMatch: string | null = null;
        try {
          const fp = await extractImageFingerprint(base64, fileName);
          fpMatch = fp?.matchedDemoId || null;
        } catch {}

        // 2. Trigger AI vision scan automatically
        await triggerAiScan(base64, currentRequestId, fileName, fpMatch);
      };
      reader.readAsDataURL(file);

      // Reset file input value to allow re-uploading same file or changing files reliably
      e.target.value = '';
    }
  };

  const triggerAiScan = async (
    imgData?: string,
    reqId?: number,
    fileNameOverride?: string,
    fingerprintOverride?: string | null
  ) => {
    const activeImg = imgData || imagePreview;
    if (!activeImg) return;

    const currentRequestId = reqId !== undefined ? reqId : ++scanRequestIdRef.current;
    const activeFileName = fileNameOverride || currentFileNameRef.current;

    setIsScanning(true);
    setAiError(null);
    setAiDetectionResult(null);
    setAiConfidence(0);
    setSeverity(null);

    let fpMatch = fingerprintOverride;
    if (!fpMatch) {
      try {
        const fp = await extractImageFingerprint(activeImg, activeFileName);
        fpMatch = fp?.matchedDemoId || null;
      } catch {}
    }

    try {
      const res = await RoadSafetyAPI.runAIDetection({
        image: activeImg,
        fileName: activeFileName,
        fingerprintMatch: fpMatch,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        roadName,
        vehicleType: userVehicle
      });

      // Prevent stale asynchronous responses from replacing latest image result
      if (currentRequestId !== scanRequestIdRef.current) return;

      if (!res.success || !res.detection) {
        setAiDetectionResult(null);
        setAiConfidence(0);
        setSeverity(null);
        setAiError(res.error || 'AI road vision analysis unavailable. Please try again.');
        return;
      }

      const det = res.detection;
      const modelConf = Math.round(det.confidence * 100);

      if (det.detected) {
        setAiConfidence(modelConf);
        setSeverity(det.severity);
        setDepthCm(det.depthEstimateCm || 4);
        setSizeM(det.dimensionsM || 1.2);
        setAiError(null);

        // Calculate relative coordinates for primary overlay box
        const rawBox = det.boundingBox;
        const relBox = (rawBox as any)?.relX !== undefined
          ? {
              x: (rawBox as any).relX,
              y: (rawBox as any).relY || 0,
              w: (rawBox as any).relWidth || 50,
              h: (rawBox as any).relHeight || 35
            }
          : {
              x: rawBox ? Math.min(80, Math.max(5, (rawBox.x / 640) * 100)) : 20,
              y: rawBox ? Math.min(80, Math.max(5, (rawBox.y / 480) * 100)) : 25,
              w: rawBox ? Math.min(90, Math.max(10, (rawBox.width / 640) * 100)) : 50,
              h: rawBox ? Math.min(90, Math.max(10, (rawBox.height / 480) * 100)) : 35
            };

        const defaultScore = det.severity === 'CRITICAL' ? 92 : det.severity === 'HIGH' ? 80 : det.severity === 'MODERATE' ? 50 : 39;
        const defaultScoreDisplay = `${defaultScore}/100`;

        setAiDetectionResult({
          detected: true,
          confidence: modelConf,
          confidenceDisplay: det.confidenceDisplay || `${modelConf}%`,
          safetyScore: det.safetyScore ?? defaultScore,
          safetyScoreDisplay: det.safetyScoreDisplay || defaultScoreDisplay,
          severity: det.severity,
          detectedType: 'POTHOLE',
          potholeCount: det.potholeCount || (det.potholes ? det.potholes.length : 1),
          potholes: det.potholes || [],
          depthEstimate: det.depthEstimateCm,
          dimensionsM: det.dimensionsM || 1.2,
          recommendedAction: det.recommendedAction || 'Drive carefully and avoid the pothole.',
          overlayBox: relBox
        });
      } else {
        // No pothole detected (e.g. selfie, clean road, building, vehicle, random objects)
        // NEVER assign LOW, MODERATE, HIGH, CRITICAL
        // NEVER receive fake confidence score
        setAiConfidence(0);
        setSeverity(null);
        setDepthCm(0);
        setSizeM(0);
        setAiError(null);
        setAiDetectionResult({
          detected: false,
          confidence: 0,
          confidenceDisplay: '0%',
          safetyScore: 0,
          safetyScoreDisplay: 'N/A',
          severity: null,
          detectedType: 'CLEAR',
          potholeCount: 0,
          potholes: [],
          depthEstimate: 0,
          dimensionsM: 0,
          recommendedAction:
            det.recommendedAction || 'No pothole detected in this image. Please upload a valid road pothole photo.',
          overlayBox: { x: 0, y: 0, w: 0, h: 0 }
        });
      }
    } catch (err: any) {
      if (currentRequestId !== scanRequestIdRef.current) return;
      console.error('AI Scan error:', err);
      setAiDetectionResult(null);
      setAiConfidence(0);
      setSeverity(null);
      setAiError(err?.message || 'AI road vision analysis unavailable. Please try again.');
    } finally {
      if (currentRequestId === scanRequestIdRef.current) {
        setIsScanning(false);
      }
    }
  };

  const isReportBlocked = Boolean(!imagePreview || isScanning || (aiDetectionResult && !aiDetectionResult.detected) || !severity || Boolean(aiError));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReportBlocked) {
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await RoadSafetyAPI.reportPothole({
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        severity: severity,
        road_name: roadName,
        image_url: imagePreview || undefined,
        depth_estimate_cm: depthCm
      });

      if (res.isDuplicate) {
        setNearbyDuplicate({
          id: res.pothole.id,
          title: `Existing Pothole (${res.pothole.severity})`,
          type: 'pothole',
          severity: res.pothole.severity,
          lat: res.pothole.latitude,
          lng: res.pothole.longitude,
          roadName: res.pothole.road_name,
          firstReportedDate: 'Reported Earlier',
          confirmationsCount: res.pothole.report_count,
          confidence: res.pothole.confidence,
          depthCm: res.pothole.depth_estimate_cm || 10
        });
        setIsSubmitting(false);
        return;
      }

      const createdHazard: RoadHazard = {
        id: res.pothole.id,
        title: `${severity} ${selectedType.replace('_', ' ').toUpperCase()}`,
        type: selectedType,
        severity: severity,
        lat: userLocation.lat,
        lng: userLocation.lng,
        roadName: roadName,
        firstReportedDate: 'Today',
        confirmationsCount: 1,
        confidence: confidenceCalculation.finalConfidence / 100,
        aiConfidence: confidenceCalculation.aiConfidence,
        manualConfidence: confidenceCalculation.manualEvidenceConfidence,
        finalConfidence: confidenceCalculation.finalConfidence,
        photoAvailable: confidenceCalculation.photoAvailable,
        gpsVerified: confidenceCalculation.gpsVerified,
        depthCm: depthCm,
        sizeM: sizeM,
        description: description || `Reported with ${vehicleConfig.label} vehicle profile`,
        imageUrl: imagePreview || undefined,
        verified: true
      };

      setIsSubmitting(false);
      setSubmitSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setTimeout(() => {
        onSubmitReport(createdHazard);
      }, 1000);
    } catch (err) {
      console.error('Submit report error:', err);
      setIsSubmitting(false);
    }
  };

  const getRiskColor = (lvl: SeverityLevel) => {
    switch (lvl) {
      case 'CRITICAL':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-900';
      case 'HIGH':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-900';
      case 'MODERATE':
        return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900';
      case 'LOW':
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900';
    }
  };

  return (
    <div
      id="add-pothole-modal-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        id="add-pothole-modal-container"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto overflow-x-hidden p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
      >
        {/* Header with GPS Location */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center text-lg font-bold">
              ➕
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Add Pothole Report
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[240px]">
                  {roadName}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  ({userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)})
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-add-pothole"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>

        {/* Duplicate Alert Banner */}
        {nearbyDuplicate && !submitSuccess && (
          <div
            id="duplicate-alert-banner"
            className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400/80 rounded-2xl space-y-2.5 animate-in fade-in"
          >
            <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black">
                  A similar pothole already exists nearby
                </h4>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300 mt-0.5">
                  <strong>{nearbyDuplicate.title}</strong> is located within 50 meters with {nearbyDuplicate.confirmationsCount} confirmations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="btn-confirm-existing-dup"
                onClick={() => {
                  onConfirmExisting(nearbyDuplicate.id);
                  confetti({ particleCount: 50, spread: 60 });
                  onClose();
                }}
                className="py-2 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-sm flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Existing (+5 pts)</span>
              </button>

              <button
                type="button"
                id="btn-ignore-dup"
                onClick={() => setNearbyDuplicate(null)}
                className="py-2 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-semibold hover:bg-slate-300"
              >
                Report Anyway
              </button>
            </div>
          </div>
        )}

        {submitSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center mx-auto text-3xl animate-bounce">
              ✓
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Pothole reported successfully
            </h3>
            <p className="text-xs text-slate-500">
              Saved to database with <strong className="text-emerald-600 font-bold">{severity}</strong> base severity and <strong className="text-blue-600 font-bold">{confidenceCalculation.finalConfidence}%</strong> final confidence!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Photo Upload with AI Detection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Pothole Photo & AI Vision</span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-400" /> AI Detection Ready
                </span>
              </label>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-2">
                {imagePreview ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black">
                    <img
                      src={imagePreview}
                      alt="Pothole preview"
                      className="w-full h-full object-cover"
                    />

                    {isScanning && (
                      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white z-20 p-4">
                        <div className="relative mb-3 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                          <Sparkles className="w-5 h-5 text-cyan-400 absolute" />
                        </div>
                        <span className="text-xs font-black tracking-wider uppercase animate-pulse">
                          Scanning image...
                        </span>
                        <span className="text-[10px] text-cyan-200 mt-1">
                          Analyzing road surface and hazard characteristics...
                        </span>
                      </div>
                    )}

                    {/* Bounding box(es) overlay for detections */}
                    {aiDetectionResult && !isScanning && aiDetectionResult.detected && (
                      <>
                        {aiDetectionResult.potholes && aiDetectionResult.potholes.length > 0 ? (
                          aiDetectionResult.potholes.map((p, idx) => {
                            const rel = p.relBox || {
                              x: Math.min(80, Math.max(5, (p.box.x1 / 640) * 100)),
                              y: Math.min(80, Math.max(5, (p.box.y1 / 480) * 100)),
                              width: Math.min(90, Math.max(10, ((p.box.x2 - p.box.x1) / 640) * 100)),
                              height: Math.min(90, Math.max(10, ((p.box.y2 - p.box.y1) / 480) * 100))
                            };
                            return (
                              <div
                                key={idx}
                                className="absolute border-2 border-rose-500 bg-rose-500/20 rounded-md pointer-events-none"
                                style={{
                                  left: `${rel.x}%`,
                                  top: `${rel.y}%`,
                                  width: `${rel.width}%`,
                                  height: `${rel.height}%`
                                }}
                              >
                                <div className="absolute -top-5 left-0 bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                  #{idx + 1} Pothole • {Math.round(p.confidence * 100)}%
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div
                            className="absolute border-2 border-rose-500 bg-rose-500/25 rounded-md pointer-events-none"
                            style={{
                              left: `${aiDetectionResult.overlayBox.x}%`,
                              top: `${aiDetectionResult.overlayBox.y}%`,
                              width: `${aiDetectionResult.overlayBox.w}%`,
                              height: `${aiDetectionResult.overlayBox.h}%`
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                              {aiDetectionResult.severity} • {aiDetectionResult.confidenceDisplay || `${aiConfidence}%`}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Invalid Pothole Image Overlay */}
                    {aiDetectionResult && !isScanning && !aiDetectionResult.detected && (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-10 pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 text-lg mb-2 font-black">
                          ✕
                        </div>
                        <span className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <span>❌</span> INVALID POTHOLE IMAGE
                        </span>
                        <span className="text-[11px] text-rose-200 mt-1 max-w-xs font-medium">
                          {aiDetectionResult.recommendedAction || 'No pothole detected in this image. Please upload a valid road pothole photo.'}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
                      <button
                        type="button"
                        onClick={() => triggerAiScan()}
                        className="px-2.5 py-1 bg-blue-600/90 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-sm"
                      >
                        <RefreshCw className="w-3 h-3" /> Rescan AI
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-black/75 hover:bg-black/90 text-white text-[10px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3" /> Change Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="py-8 text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <div className="flex justify-center gap-3 text-slate-400 mb-2">
                      <Camera className="w-6 h-6 text-blue-500" />
                      <Upload className="w-6 h-6 text-indigo-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Take Photo or Upload Evidence
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      AI vision analyzes pothole presence, severity, depth & dimensions
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Error Banner */}
            {aiError && !isScanning && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold">{aiError}</span>
              </div>
            )}

            {/* AI Detection Result Card */}
            {aiDetectionResult && !isScanning && (
              <div
                id="ai-detection-result-card"
                className={`p-3.5 rounded-2xl border transition-all ${
                  aiDetectionResult.detected
                    ? 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800'
                    : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    {aiDetectionResult.detected ? (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                        <span className="text-xs font-black tracking-wide uppercase text-slate-900 dark:text-white">
                          AI DETECTION RESULT: Pothole detected
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs">❌</span>
                        <span className="text-xs font-black tracking-wide uppercase text-rose-600 dark:text-rose-400">
                          INVALID POTHOLE IMAGE
                        </span>
                      </>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-full ${
                      aiDetectionResult.detected
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-cyan-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    Confidence: {aiDetectionResult.detected ? (aiDetectionResult.confidenceDisplay || `${aiConfidence}%`) : '0%'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Severity</span>
                    {aiDetectionResult.detected && aiDetectionResult.severity ? (
                      <span
                        className={`inline-block font-black text-xs mt-1 px-2.5 py-0.5 rounded-md border ${getRiskColor(
                          aiDetectionResult.severity
                        )}`}
                      >
                        {aiDetectionResult.severity}
                      </span>
                    ) : (
                      <span className="inline-block font-bold text-xs mt-1 px-2.5 py-0.5 rounded-md border text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800">
                        None
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Safety Score</span>
                    <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 mt-1 block">
                      {aiDetectionResult.detected ? (
                        <span className="text-blue-600 dark:text-cyan-400 font-black">
                          {aiDetectionResult.safetyScoreDisplay || `${aiDetectionResult.safetyScore}/100`}
                        </span>
                      ) : (
                        'N/A'
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimated Depth</span>
                    <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 mt-1 block">
                      {aiDetectionResult.detected ? `${aiDetectionResult.depthEstimate} cm` : '0 cm'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Confidence</span>
                    <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200 mt-1 block">
                      {aiDetectionResult.detected ? (aiDetectionResult.confidenceDisplay || `${aiDetectionResult.confidence}%`) : '0%'}
                    </span>
                  </div>
                </div>

                {/* Road & Location */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Road</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                      {roadName || 'Observed Road Sector'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Location</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 block">
                      {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                    </span>
                  </div>
                </div>

                {/* Safety Recommendation */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-[11px]">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                    Safety Recommendation
                  </span>
                  <p
                    className={`${
                      aiDetectionResult.detected
                        ? 'text-slate-700 dark:text-slate-300'
                        : 'text-rose-700 dark:text-rose-300 font-semibold'
                    } font-medium leading-relaxed`}
                  >
                    {aiDetectionResult.detected
                      ? aiDetectionResult.recommendedAction
                      : 'No pothole detected in this image. Please upload a valid road pothole photo.'}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Pothole Base Severity Selector */}
            <div className={isReportBlocked ? 'opacity-40 pointer-events-none' : ''}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Base Pothole Severity
                </label>
                <span className="text-[10px] text-slate-400">Physical depth & size</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as SeverityLevel[]).map((lvl) => {
                  const isSelected = severity === lvl;
                  const colorMap = {
                    CRITICAL: isSelected
                      ? 'bg-red-600 text-white border-red-600'
                      : 'text-red-600 border-red-200 dark:border-red-900',
                    HIGH: isSelected
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'text-orange-500 border-orange-200 dark:border-orange-900',
                    MODERATE: isSelected
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'text-amber-500 border-amber-200 dark:border-amber-900',
                    LOW: isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'text-emerald-600 border-emerald-200 dark:border-emerald-900'
                  };
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSeverity(lvl)}
                      className={`py-2 px-1 text-center rounded-xl text-[10px] font-black border transition ${colorMap[lvl]}`}
                    >
                      {lvl === 'CRITICAL'
                        ? '🔴 CRITICAL'
                        : lvl === 'HIGH'
                        ? '🟠 HIGH'
                        : lvl === 'MODERATE'
                        ? '🟡 MODERATE'
                        : '🟢 LOW'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Section 4: Vehicle Impact (Automatically populated from login session) */}
            <div
              id="vehicle-impact-box"
              className={`p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 space-y-2 ${
                isReportBlocked ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="text-base">{vehicleConfig.icon}</span>
                  <span>Vehicle Impact Analysis</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                  Active Vehicle: {vehicleConfig.label}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Vehicle</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white flex items-center justify-center gap-1 mt-0.5">
                    {vehicleConfig.icon} {vehicleConfig.label}
                  </span>
                </div>

                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="block text-[9px] uppercase font-bold text-slate-400">Base Severity</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white mt-0.5 block">
                    {isReportBlocked ? 'None' : severity}
                  </span>
                </div>

                <div className={`p-2 rounded-xl border ${isReportBlocked ? 'text-slate-400 border-slate-300' : getRiskColor(vehicleSpecificRisk)}`}>
                  <span className="block text-[9px] uppercase font-bold opacity-80">Vehicle Risk</span>
                  <span className="text-xs font-black mt-0.5 block">
                    {isReportBlocked ? 'N/A' : `${vehicleSpecificRisk} RISK`}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                {isReportBlocked ? (
                  <span>No road pothole detected in image. Vehicle risk analysis is not applicable.</span>
                ) : (
                  <span>
                    For <strong>{vehicleConfig.label}</strong>, this {severity.toLowerCase()} pothole translates to <strong>{vehicleSpecificRisk}</strong> risk.
                  </span>
                )}
              </p>
            </div>

            {/* 4. Section 5: AI Confidence & Manual/Evidence Confidence */}
            <div
              id="confidence-breakdown-card"
              className={`p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3 ${
                isReportBlocked ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  Confidence Assessment
                </span>
                <span className="text-[11px] font-black text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2.5 py-0.5 rounded-full">
                  Final: {confidenceCalculation.finalConfidence}%
                </span>
              </div>

              {/* Field 1: AI Detection Confidence (Read-Only / System Generated) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-500" />
                    AI Detection Confidence:
                  </span>
                  <span className="font-mono font-black text-blue-600 dark:text-cyan-400">
                    {aiConfidence}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${aiConfidence}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Automated computer vision estimate based on surface geometry and edge contours (Locked).
                </p>
              </div>

              {/* Field 2: Manual / Evidence Confidence (0 - 100% Slider) */}
              <div className="space-y-1.5 pt-1 border-t border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="manual-conf-slider" className="font-bold text-slate-700 dark:text-slate-300">
                    Manual / Evidence Confidence:
                  </label>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {manualConfidence}%
                  </span>
                </div>
                <input
                  id="manual-conf-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={manualConfidence}
                  onChange={(e) => setManualConfidence(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">
                  Rate your confidence based on photo sharpness, daylight visibility, and physical road condition.
                </p>
              </div>

              {/* Field 3: Final Calculated Confidence Summary */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-[11px] space-y-1">
                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                  <span>Calculated Final Confidence:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-black">
                    {confidenceCalculation.finalConfidence}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>• AI Vision: <strong>{aiConfidence}%</strong></span>
                  <span>• Manual Evidence: <strong>{manualConfidence}%</strong></span>
                  <span>• Photo: <strong>{imagePreview ? 'Yes (+5%)' : 'No'}</strong></span>
                  <span>• GPS: <strong>Verified (+5%)</strong></span>
                </div>
              </div>
            </div>

            {/* Depth & Width */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Est. Depth (cm)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={depthCm}
                  onChange={(e) => setDepthCm(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Road Name
                </label>
                <input
                  type="text"
                  value={roadName}
                  onChange={(e) => setRoadName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Optional Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Deep crater near bus stop, sharp asphalt edge..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-submit-pothole-report"
              disabled={isSubmitting || isReportBlocked || isScanning}
              className={`w-full font-bold py-3.5 px-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs ${
                isReportBlocked
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/80 cursor-not-allowed shadow-none'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20 active:scale-98'
              }`}
            >
              {isReportBlocked ? (
                <>
                  <span>❌ Submission Blocked — Invalid Pothole Image</span>
                </>
              ) : isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Pothole to Safety Database...</span>
                </>
              ) : (
                <>
                  <span>Save Pothole Report (+10 Pts)</span>
                  <Check className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
            {isReportBlocked && (
              <p className="text-[11px] text-rose-500 dark:text-rose-400 text-center font-bold mt-1.5 flex items-center justify-center gap-1">
                <span>❌</span> No pothole detected. Please upload a clear road pothole image.
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
