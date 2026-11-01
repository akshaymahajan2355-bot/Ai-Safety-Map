import React, { useState } from 'react';
import { RoadHazard, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { calculateHazardRiskForVehicle } from '../utils/safetyRisk';
import {
  Shield,
  Check,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Sliders,
  MapPin,
  Clock,
  User,
  Info,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface HazardDetailModalProps {
  hazard: RoadHazard;
  userVehicle: VehicleType;
  onClose: () => void;
  onConfirmHazard?: (hazardId: string | number) => void;
  onReportFixed?: (hazard: RoadHazard) => void;
  isGuest?: boolean;
  onRequestLogin?: (action: 'confirm_hazard' | 'remove_pothole') => void;
}

export const HazardDetailModal: React.FC<HazardDetailModalProps> = ({
  hazard,
  userVehicle,
  onClose,
  onConfirmHazard,
  onReportFixed,
  isGuest,
  onRequestLogin
}) => {
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [showImageFull, setShowImageFull] = useState(false);

  const calculatedRisk = calculateHazardRiskForVehicle(hazard, userVehicle);
  const vehicleConfig = VEHICLE_CONFIGS[userVehicle] || VEHICLE_CONFIGS.car;

  // Confidence values
  const aiConf =
    hazard.aiConfidence !== undefined
      ? hazard.aiConfidence
      : Math.round(hazard.confidence > 1 ? hazard.confidence : hazard.confidence * 100);

  const manualConf =
    hazard.manualConfidence !== undefined
      ? hazard.manualConfidence
      : hazard.verified
      ? 90
      : 80;

  const finalConf =
    hazard.finalConfidence !== undefined
      ? hazard.finalConfidence
      : Math.min(100, Math.round(aiConf * 0.55 + manualConf * 0.35 + 10));

  const handleConfirm = () => {
    if (isGuest) {
      if (onRequestLogin) onRequestLogin('confirm_hazard');
      return;
    }
    if (onConfirmHazard) onConfirmHazard(hazard.id);
    setJustConfirmed(true);
    confetti({
      particleCount: 35,
      spread: 55,
      origin: { y: 0.7 }
    });
  };

  const getSeverityBadge = () => {
    switch (hazard.severity) {
      case 'CRITICAL':
        return (
          <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/40 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            🚨 BASE: CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            ⚠️ BASE: HIGH
          </span>
        );
      case 'MODERATE':
        return (
          <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 BASE: MODERATE
          </span>
        );
      case 'LOW':
        return (
          <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            🟢 BASE: LOW
          </span>
        );
    }
  };

  return (
    <div
      id="hazard-detail-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        id="hazard-detail-container"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto overflow-x-hidden p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {getSeverityBadge()}
              <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                Final Confidence: {finalConf}%
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
              {hazard.title || `${hazard.severity} Pothole`}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{hazard.roadName}</span>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-hazard-detail"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Pothole Photo */}
        {hazard.imageUrl && (
          <div className="space-y-1.5">
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-950">
              <img
                src={hazard.imageUrl}
                alt={hazard.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1 border border-white/20">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>AI Detected: {hazard.severity} (~{hazard.depthCm || 12} cm depth)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImageFull(!showImageFull)}
                className="absolute bottom-2 right-2 bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                <span>{showImageFull ? 'Collapse' : 'View Full Image'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Vehicle-Specific Risk Banner per Section 3 & 6 */}
        <div
          id="vehicle-specific-risk-card"
          className={`rounded-2xl p-3.5 border ${calculatedRisk.badgeBg} space-y-2`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{vehicleConfig.icon}</span>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-75 block">
                  Vehicle-Specific Risk Level
                </span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {vehicleConfig.label} ({vehicleConfig.sublabel})
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${calculatedRisk.badgeBg}`}>
                {calculatedRisk.level} RISK
              </span>
            </div>
          </div>

          <div className="pt-1 text-xs leading-relaxed border-t border-black/10 dark:border-white/10">
            <div className="flex items-start gap-1.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
              <div>
                <strong className="font-bold">Why this risk level was assigned: </strong>
                <span>{calculatedRisk.reason}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 Confidence Details Matrix */}
        <div
          id="confidence-breakdown-panel"
          className="rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              Confidence System Breakdown
            </span>
            <span className="text-[11px] font-bold text-slate-500">
              Verified Evidence
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* 1. AI Confidence */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-bold text-cyan-600 dark:text-cyan-400">
                AI Vision
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {aiConf}%
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Automated</span>
            </div>

            {/* 2. Manual / Evidence Confidence */}
            <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <span className="block text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                Manual Evidence
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white mt-0.5 block">
                {manualConf}%
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">Reporter Input</span>
            </div>

            {/* 3. Final Confidence */}
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900">
              <span className="block text-[9px] uppercase font-bold text-blue-600 dark:text-blue-300">
                Final Score
              </span>
              <span className="text-sm font-black text-blue-700 dark:text-blue-300 mt-0.5 block">
                {finalConf}%
              </span>
              <span className="text-[9px] text-blue-500 dark:text-blue-400 block mt-0.5">Calculated</span>
            </div>
          </div>
        </div>

        {/* Pothole Details Grid */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3 text-left">
          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase">Base Severity</span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {hazard.severity}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase">Selected Vehicle</span>
            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
              <span>{vehicleConfig.icon}</span>
              <span>{vehicleConfig.label}</span>
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> Coordinates
            </span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Reported / Timestamp
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {hazard.firstReportedDate || 'Today, 14:20 PM'}
            </span>
          </div>

          <div>
            <span className="block text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
              <User className="w-2.5 h-2.5" /> Reported By
            </span>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              Verified Driver ({hazard.confirmationsCount || 1} Confirmations)
            </span>
          </div>

          {hazard.depthCm ? (
            <div>
              <span className="block text-[10px] text-slate-500 font-bold uppercase">Estimated Depth</span>
              <span className="text-xs font-black text-slate-900 dark:text-white">
                ~{hazard.depthCm} cm
              </span>
            </div>
          ) : null}
        </div>

        {/* Report Fixed / Request Removal action */}
        <div>
          <button
            type="button"
            id="btn-modal-report-fixed"
            onClick={() => {
              if (isGuest) {
                if (onRequestLogin) onRequestLogin('remove_pothole');
                return;
              }
              onClose();
              if (onReportFixed) onReportFixed(hazard);
            }}
            className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
          >
            {isGuest ? (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Report Pothole Repaired (Login Required)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Report Pothole Repaired / Request Removal</span>
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            id="btn-modal-confirm-hazard"
            onClick={handleConfirm}
            disabled={justConfirmed}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
              justConfirmed
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-400'
                : isGuest
                ? 'bg-blue-600/90 hover:bg-blue-700 text-white shadow-md active:scale-95'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95'
            }`}
          >
            {isGuest ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Confirm Hazard (Login Required)</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{justConfirmed ? 'Confirmed (+5 Safety Pts)' : 'Confirm Pothole Still Present'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-modal-close-hazard"
            onClick={onClose}
            className="py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
