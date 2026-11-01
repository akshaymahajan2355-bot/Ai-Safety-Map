import React, { useState } from 'react';
import { NavigationStep, RoadHazard, RouteOption, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { calculateHazardRiskForVehicle } from '../utils/safetyRisk';
import { Volume2, VolumeX, ArrowUp, ArrowLeft, ArrowRight, CornerUpLeft, CornerUpRight, AlertTriangle, X, Shield, Sparkles } from 'lucide-react';

export interface ActiveSafetyHazardAlert {
  potholeId: number | string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  roadName: string;
  distanceAheadMeters: number;
  message: string;
  voiceText: string;
  recommendedAction: string;
  timestamp?: string;
}

interface NavigationHUDProps {
  route: RouteOption;
  currentStepIndex: number;
  userVehicle: VehicleType;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  onExitNavigation: () => void;
  speedKmH: number;
  upcomingHazard?: RoadHazard | null;
  activeHazardAlert?: ActiveSafetyHazardAlert | null;
  isOffRoute?: boolean;
  crossTrackDistanceMeters?: number;
  distanceRemainingKm?: number;
  etaMinutes?: number;
  gpsAccuracy?: number;
  onHazardAcknowledged?: () => void;
  onTestVoiceAlert?: () => void;
}

export const NavigationHUD: React.FC<NavigationHUDProps> = ({
  route,
  currentStepIndex,
  userVehicle,
  voiceEnabled,
  onToggleVoice,
  onExitNavigation,
  speedKmH,
  upcomingHazard,
  activeHazardAlert,
  isOffRoute = false,
  crossTrackDistanceMeters,
  distanceRemainingKm,
  etaMinutes,
  gpsAccuracy,
  onHazardAcknowledged,
  onTestVoiceAlert
}) => {
  const currentStep: NavigationStep = route.steps[currentStepIndex] || route.steps[0];
  const nextStep: NavigationStep | undefined = route.steps[currentStepIndex + 1];
  const vehicleConfig = VEHICLE_CONFIGS[userVehicle];

  // Render Maneuver Direction Arrow
  const renderManeuverIcon = (action: NavigationStep['action']) => {
    switch (action) {
      case 'turn-left':
        return <CornerUpLeft className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'turn-right':
        return <CornerUpRight className="w-8 h-8 text-white stroke-[2.5]" />;
      case 'arrive':
        return <span className="text-2xl">🏁</span>;
      default:
        return <ArrowUp className="w-8 h-8 text-white stroke-[2.5]" />;
    }
  };

  const calculatedHazardRisk = upcomingHazard
    ? calculateHazardRiskForVehicle(upcomingHazard, userVehicle)
    : null;

  // Severity color maps for active hazard alert
  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-600',
          border: 'border-red-400',
          badge: 'bg-red-950/80 text-red-200 border border-red-500/50',
          icon: '🚨'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-600',
          border: 'border-orange-400',
          badge: 'bg-orange-950/80 text-orange-200 border border-orange-500/50',
          icon: '⚠️'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-600',
          border: 'border-amber-400',
          badge: 'bg-amber-950/80 text-amber-200 border border-amber-500/50',
          icon: '🟡'
        };
      default:
        return {
          bg: 'bg-emerald-700',
          border: 'border-emerald-500',
          badge: 'bg-emerald-950/80 text-emerald-200 border border-emerald-500/50',
          icon: '🟢'
        };
    }
  };

  return (
    <div className="absolute inset-x-0 top-0 z-40 pointer-events-none flex flex-col justify-between h-full p-3 pb-6">
      {/* Top Turn-by-Turn Card & Safety Alerts */}
      <div className="max-w-md w-full mx-auto pointer-events-auto space-y-2">
        {/* Off-Route Alert Banner */}
        {isOffRoute && (
          <div
            id="banner-off-route"
            className="bg-amber-500 text-slate-950 rounded-2xl shadow-xl px-4 py-3 border-2 border-amber-300 font-bold flex items-center gap-3 animate-pulse"
          >
            <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0" />
            <div className="flex-1 text-xs">
              <span className="font-black uppercase tracking-wider block">Off-Route Detected</span>
              <span>
                {crossTrackDistanceMeters ? `${crossTrackDistanceMeters}m off course.` : ''} Recalculating safest route to destination...
              </span>
            </div>
          </div>
        )}

        <div className="bg-emerald-600 dark:bg-emerald-700 text-white rounded-2xl shadow-2xl p-4 border border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between border-b border-emerald-500/50 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-800/80 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                LIVE NAV ({vehicleConfig.icon})
              </span>
              <span className="text-xs text-emerald-100 font-medium truncate max-w-[150px]">
                {route.name}
              </span>
            </div>

            {/* Voice Assistant Toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-toggle-voice"
                onClick={onToggleVoice}
                title="AI Voice Safety Assistant ON/OFF"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-sm ${
                  voiceEnabled
                    ? 'bg-white text-emerald-800 hover:bg-emerald-50'
                    : 'bg-emerald-800/80 text-emerald-300 hover:bg-emerald-800'
                }`}
              >
                {voiceEnabled ? (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Voice ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Voice OFF</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-exit-nav"
                onClick={onExitNavigation}
                className="w-7 h-7 rounded-full bg-emerald-800/70 hover:bg-emerald-900 text-white flex items-center justify-center transition"
                title="Exit Navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Maneuver details */}
          <div className="flex items-start gap-4">
            <div className="w-13 h-13 rounded-2xl bg-emerald-800/60 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-inner">
              {renderManeuverIcon(currentStep.action)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black tracking-tight leading-none">
                  {currentStep.distanceMeters} m
                </span>
                <span className="text-xs text-emerald-200 font-semibold uppercase">
                  then
                </span>
              </div>
              <p className="text-sm font-bold text-white leading-snug mt-1 truncate">
                {currentStep.instruction}
              </p>
              <p className="text-xs text-emerald-200 truncate mt-0.5">
                onto {currentStep.streetName}
              </p>
            </div>
          </div>

          {/* Sub-step preview */}
          {nextStep && (
            <div className="mt-3 pt-2 border-t border-emerald-500/30 flex items-center justify-between text-xs text-emerald-100">
              <span className="truncate">Next: {nextStep.instruction}</span>
              <span className="font-semibold">{nextStep.distanceMeters}m</span>
            </div>
          )}
        </div>

        {/* Real-time Road Safety Agent Hazard Alert Card */}
        {activeHazardAlert && (
          <div
            id="hazard-realtime-agent-alert"
            className={`${getSeverityStyle(activeHazardAlert.severity).bg} text-white rounded-2xl shadow-2xl p-3.5 border-2 border-white/90 animate-bounce flex items-start gap-3 transition-all pointer-events-auto`}
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              {getSeverityStyle(activeHazardAlert.severity).icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${getSeverityStyle(activeHazardAlert.severity).badge}`}>
                  {activeHazardAlert.severity} POTHOLE
                </span>
                <span className="text-xs font-black bg-black/40 px-2 py-0.5 rounded-full text-white">
                  {activeHazardAlert.distanceAheadMeters}m ahead
                </span>
              </div>
              <p className="text-sm font-black mt-1 leading-tight text-white">
                {activeHazardAlert.roadName}
              </p>
              <p className="text-xs text-white/90 mt-1 leading-snug">
                {activeHazardAlert.recommendedAction}
              </p>
              {voiceEnabled && (
                <p className="text-[11px] text-white/80 mt-1 italic flex items-center gap-1">
                  <Volume2 className="w-3 h-3" /> Voice: &ldquo;{activeHazardAlert.voiceText}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* Legacy Proximity Hazard Alert Card (if activeHazardAlert is not present) */}
        {!activeHazardAlert && upcomingHazard && calculatedHazardRisk && (
          <div
            id="hazard-proximity-alert"
            className="bg-red-600 text-white rounded-2xl shadow-xl p-3.5 border-2 border-white animate-bounce flex items-start gap-3 transition-all pointer-events-auto"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
              🚨
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded-full">
                  {calculatedHazardRisk.label}
                </span>
                <span className="text-[11px] font-bold text-red-100">In 200m</span>
              </div>
              <p className="text-sm font-black mt-1 leading-tight">
                {upcomingHazard.title}
              </p>
              <p className="text-xs text-red-100 mt-0.5 leading-snug">
                🔊 <em>&ldquo;{calculatedHazardRisk.voicePrompt}&rdquo;</em>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Metrics Bar (Speedometer, ETA, Distance, GPS Status, End Nav) */}
      <div className="max-w-md w-full mx-auto pointer-events-auto">
        <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-3xl p-3.5 border border-slate-800 shadow-2xl flex items-center justify-between gap-3">
          {/* Speedometer */}
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <div className="text-center">
              <span className="text-2xl font-black font-mono leading-none text-emerald-400">
                {speedKmH}
              </span>
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                km/h
              </span>
            </div>
          </div>

          {/* Route Info */}
          <div className="flex-1 text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-xl font-black text-white">
                {typeof etaMinutes === 'number'
                  ? Math.max(1, etaMinutes)
                  : Math.max(1, route.durationMinutes - Math.round(currentStepIndex * 3.5))}
              </span>
              <span className="text-xs text-slate-400 font-bold">min remaining</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{typeof distanceRemainingKm === 'number' ? distanceRemainingKm.toFixed(1) : route.distanceKm} km</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                <Shield className="w-3 h-3" /> {route.safetyScore}/100 Safe
              </span>
              {typeof gpsAccuracy === 'number' && gpsAccuracy > 0 && (
                <>
                  <span>•</span>
                  <span className="text-slate-400 text-[10px]">
                    ±{Math.round(gpsAccuracy)}m GPS
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick AI Voice Test & End Button */}
          <div className="flex items-center gap-1.5">
            {onTestVoiceAlert && (
              <button
                type="button"
                id="btn-voice-test-hud"
                onClick={onTestVoiceAlert}
                title="Test Spoken Safety Warning"
                className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 flex items-center justify-center transition text-xs"
              >
                🔊
              </button>
            )}

            <button
              type="button"
              id="btn-end-nav-bottom"
              onClick={onExitNavigation}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm active:scale-95"
            >
              End
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
