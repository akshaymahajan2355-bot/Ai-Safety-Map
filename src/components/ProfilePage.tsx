import React, { useState, useEffect } from 'react';
import { UserProfile, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { RoadSafetyAPI } from '../utils/api';
import {
  Shield,
  Award,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  Edit3,
  Sparkles,
  ShieldCheck,
  Clock,
  MapPin,
  Lock,
  LogIn
} from 'lucide-react';

interface ProfilePageProps {
  profile: UserProfile;
  onChangeVehicle: (newVehicle: VehicleType) => void;
  themeMode: 'light' | 'dark' | 'auto';
  onChangeThemeMode: (mode: 'light' | 'dark' | 'auto') => void;
  onReauthenticate?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onChangeVehicle,
  themeMode,
  onChangeThemeMode,
  onReauthenticate
}) => {
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [removalHistory, setRemovalHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const currentVehicleConfig = VEHICLE_CONFIGS[profile.vehicle];

  useEffect(() => {
    if (showHistory) {
      setIsLoadingHistory(true);
      RoadSafetyAPI.getPotholeRemovalHistory()
        .then((res) => {
          if (res.success && res.history) {
            setRemovalHistory(res.history);
          }
        })
        .catch((err) => console.warn('Failed to load removal history:', err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [showHistory]);

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-24 p-4 space-y-4 max-w-md mx-auto w-full">
      {/* User Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
        <div className="relative">
          <img
            src={
              profile.isGuest
                ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                : profile.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'
            }
            alt={profile.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-blue-500 shadow-md"
          />
          <span className="absolute -bottom-1 -right-1 text-xl bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs">
            {currentVehicleConfig.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-slate-900 dark:text-white truncate">
              {profile.name}
            </h2>
            {profile.isGuest && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Guest
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">{profile.email}</p>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
              <span>{currentVehicleConfig.icon}</span>
              <span>{currentVehicleConfig.label}</span>
            </span>
            {profile.isGuest && (
              <span className="text-[10px] text-slate-400 font-medium">
                (Read-Only Access)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Guest Mode Restriction Banner */}
      {profile.isGuest && (
        <div
          id="profile-guest-mode-banner"
          className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-300/80 dark:border-amber-800 rounded-3xl p-4.5 space-y-2.5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 dark:text-white">
                  Guest User Restrictions Active
                </h3>
                <p className="text-[11px] text-slate-500">
                  Map view is open; reporting & data editing are restricted.
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            As a guest, you can explore the live road map, search places, and view hazard risks. Log in to report new potholes, remove repaired hazards, and earn contributor badges.
          </p>

          {onReauthenticate && (
            <button
              type="button"
              id="btn-profile-guest-login"
              onClick={onReauthenticate}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-98"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Sign Up for Full Access</span>
            </button>
          )}
        </div>
      )}

      {/* Activity Statistics (Section 14) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            My Safety Activity & Impact
          </h3>
          {profile.isGuest && (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Login to track
            </span>
          )}
        </div>

        {profile.isGuest ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Activity statistics are tracked for registered users.
            </p>
            {onReauthenticate && (
              <button
                type="button"
                onClick={onReauthenticate}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Log in to sync your contributions →
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-900/40">
              <span className="block text-2xl font-black text-red-600 dark:text-red-400">
                {profile.reportsCount}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Reports
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <span className="block text-2xl font-black text-blue-600 dark:text-blue-400">
                {profile.confirmedCount}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Confirmed
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40">
              <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {profile.resolvedCount}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Resolved
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
              <span className="block text-2xl font-black text-amber-600 dark:text-amber-400">
                {profile.contributionPoints}
              </span>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Points
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Change Vehicle (Section 14) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              My Active Vehicle
            </h3>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
              {currentVehicleConfig.icon} {currentVehicleConfig.label}
            </p>
          </div>

          <button
            type="button"
            id="btn-open-change-vehicle"
            onClick={() => setShowVehiclePicker(!showVehiclePicker)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Change Vehicle</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          {currentVehicleConfig.description}
        </p>

        {/* Vehicle Selection Drawer */}
        {showVehiclePicker && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-in fade-in">
            {(['car', 'bike', 'cycle', 'other'] as const).map((vKey) => {
              const item = VEHICLE_CONFIGS[vKey];
              const isCurrent = profile.vehicle === vKey;

              return (
                <div
                  key={vKey}
                  id={`profile-vehicle-option-${vKey}`}
                  onClick={() => {
                    onChangeVehicle(vKey);
                    setShowVehiclePicker(false);
                  }}
                  className={`cursor-pointer p-3 rounded-2xl border transition flex items-center justify-between ${
                    isCurrent
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {item.label}
                      </span>
                      <span className="text-[11px] text-slate-500">{item.sublabel}</span>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      Selected ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {onReauthenticate && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              id="btn-reopen-auth-flow"
              onClick={onReauthenticate}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                profile.isGuest
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {profile.isGuest ? (
                <>
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Login / Sign Up to Unlock Features</span>
                </>
              ) : (
                <span>Switch Account / Change Login</span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Badges & Recognition (Section 15) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Earned Community Badges</span>
        </h3>

        <div className="grid grid-cols-2 gap-2.5">
          {profile.badges.map((b) => (
            <div
              key={b.id}
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-2.5"
            >
              <span className="text-2xl">{b.icon}</span>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white">
                  {b.title}
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                  {b.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pothole Removal & Repair Audit History */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Pothole Removal & Repair Audits</span>
          </h3>
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showHistory ? 'Hide History' : 'View History'}
          </button>
        </div>

        {showHistory && (
          <div className="space-y-2.5 pt-1">
            {isLoadingHistory ? (
              <p className="text-xs text-slate-400 text-center py-4">Loading verification audit logs...</p>
            ) : removalHistory.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500">
                No removal verifications submitted yet. Use the “Remove Pothole” button on the map to verify repaired road sections.
              </div>
            ) : (
              removalHistory.map((item, i) => (
                <div
                  key={item.id || i}
                  className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      {item.status === 'approved' ? '✓ Repaired / Removed' : '✕ Rejected'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Pothole #{item.potholeId}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      GPS Distance: {item.gpsDistanceMeters}m
                    </span>
                  </div>

                  {item.aiReason && (
                    <p className="text-[11px] text-slate-500 italic bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                      “{item.aiReason}”
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Map Appearance Mode (Section 20) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Day / Night Navigation Theme
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChangeThemeMode('light')}
            className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
              themeMode === 'light'
                ? 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>🌞 Day Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeThemeMode('dark')}
            className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
              themeMode === 'dark'
                ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Moon className="w-4 h-4" />
            <span>🌙 Night Mode</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeThemeMode('auto')}
            className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
              themeMode === 'auto'
                ? 'bg-indigo-500/15 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>⚡ Auto Mode</span>
          </button>
        </div>
      </div>
    </div>
  );
};
