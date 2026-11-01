import React, { useState } from 'react';
import { RouteOption, VehicleType } from '../types';
import { VEHICLE_CONFIGS } from '../data/mockData';
import { Shield, Zap, ChevronRight, Navigation, Terminal, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface RouteCompareSheetProps {
  routes: RouteOption[];
  activeRouteId: string;
  onSelectRoute: (routeId: string) => void;
  onStartNavigation: () => void;
  onClose: () => void;
  userVehicle: VehicleType;
  destinationName: string;
  totalFirebaseChecked?: number;
}

export const RouteCompareSheet: React.FC<RouteCompareSheetProps> = ({
  routes,
  activeRouteId,
  onSelectRoute,
  onStartNavigation,
  onClose,
  userVehicle,
  destinationName,
  totalFirebaseChecked = 10
}) => {
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const vehicleConfig = VEHICLE_CONFIGS[userVehicle] || VEHICLE_CONFIGS.car;

  if (!routes || routes.length === 0) return null;

  const hasMultipleRoutes = routes.length > 1;

  // Primary / Normal route is the first route returned or route-fastest
  const fastestRoute = routes.find((r) => r.id === 'route-fastest') || routes[0];

  // Safer route is the route with higher safety score or marked recommended
  let saferRoute = routes.find(
    (r) => r.id !== fastestRoute.id && (r.isRecommended || r.safetyScore > fastestRoute.safetyScore)
  ) || routes.find((r) => r.id !== fastestRoute.id) || fastestRoute;

  // Compute breakdown for both routes
  const getBreakdown = (route: RouteOption) => {
    const critical = route.criticalCount ?? route.hazards.filter((h) => h.severity === 'CRITICAL').length;
    const high = route.highCount ?? route.hazards.filter((h) => h.severity === 'HIGH').length;
    const moderate = route.moderateCount ?? route.hazards.filter((h) => h.severity === 'MODERATE').length;
    const low = route.lowCount ?? route.hazards.filter((h) => h.severity === 'LOW').length;
    return { critical, high, moderate, low, total: route.hazardCount };
  };

  const saferBreakdown = getBreakdown(saferRoute);
  const fastestBreakdown = getBreakdown(fastestRoute);

  const timeDiff = Math.max(0, saferRoute.durationMinutes - fastestRoute.durationMinutes);
  const scoreDiff = saferRoute.safetyScore - fastestRoute.safetyScore;

  return (
    <div className="absolute bottom-16 left-0 right-0 z-30 px-3 pb-2 pointer-events-none">
      <div className="max-w-lg mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 pointer-events-auto space-y-3.5 transition-all max-h-[85vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              <Shield className="w-3.5 h-3.5" />
              <span>AI Safe Route Comparison</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500 dark:text-slate-400">{vehicleConfig.icon} {vehicleConfig.label}</span>
            </div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate">
              Destination: {destinationName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Banner */}
        {hasMultipleRoutes ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-base">
              🛡️
            </div>
            <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">Safe Route Recommendation: </span>
              {scoreDiff > 0 ? (
                <>
                  +{scoreDiff} pts higher safety score ({saferRoute.safetyScore}/100 vs {fastestRoute.safetyScore}/100) with only {timeDiff} min difference!
                </>
              ) : (
                <>Both routes follow verified road corridors with matching safety profile.</>
              )}
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-500/25 rounded-2xl p-2.5 flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
              <span className="font-extrabold text-amber-700 dark:text-amber-400">Single Route Corridor: </span>
              The routing engine returned 1 genuine road corridor for this trip. Safe Route equals Normal Route.
            </p>
          </div>
        )}

        {/* Route Comparison Side-by-side (or Single Route view) */}
        {hasMultipleRoutes ? (
          <div className="grid grid-cols-2 gap-2.5">
            {/* Safe Route Card */}
            <div
              id="card-route-safer"
              onClick={() => onSelectRoute(saferRoute.id)}
              className={`cursor-pointer rounded-2xl p-3 border-2 transition-all relative ${
                activeRouteId === saferRoute.id
                  ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
              }`}
            >
              <span className="absolute -top-2.5 left-3 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <span>🛡️</span> {saferRoute.safetyScore >= fastestRoute.safetyScore ? 'RECOMMENDED' : 'ALTERNATIVE'}
              </span>

              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate pr-1">
                  Safe Route
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 shrink-0">
                  {saferRoute.safetyScore}/100
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {saferRoute.durationMinutes}
                </span>
                <span className="text-xs text-slate-500 font-semibold">min</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {saferRoute.distanceKm} km
                </span>
              </div>

              {/* Severity Breakdown */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold">
                  <span>Potholes (&le;30m):</span>
                  <span className="text-emerald-600 font-black">{saferBreakdown.total}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🔴 Critical:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{saferBreakdown.critical}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟠 High:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{saferBreakdown.high}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟡 Moderate:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{saferBreakdown.moderate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟢 Low:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{saferBreakdown.low}</span>
                </div>
              </div>
            </div>

            {/* Normal / Fastest Route Card */}
            <div
              id="card-route-fastest"
              onClick={() => onSelectRoute(fastestRoute.id)}
              className={`cursor-pointer rounded-2xl p-3 border-2 transition-all relative ${
                activeRouteId === fastestRoute.id
                  ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 shadow-md ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate pr-1">
                  <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                  Normal Route
                </span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 shrink-0">
                  {fastestRoute.safetyScore}/100
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {fastestRoute.durationMinutes}
                </span>
                <span className="text-xs text-slate-500 font-semibold">min</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  {fastestRoute.distanceKm} km
                </span>
              </div>

              {/* Severity Breakdown */}
              <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[10px]">
                <div className="flex justify-between text-slate-700 dark:text-slate-300 font-bold">
                  <span>Potholes (&le;30m):</span>
                  <span className="text-rose-600 font-black">{fastestBreakdown.total}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🔴 Critical:</span>
                  <span className="font-bold text-red-600">{fastestBreakdown.critical}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟠 High:</span>
                  <span className="font-bold text-orange-600">{fastestBreakdown.high}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟡 Moderate:</span>
                  <span className="font-bold text-amber-600">{fastestBreakdown.moderate}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>🟢 Low:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{fastestBreakdown.low}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Single Route Card */
          <div
            id="card-route-single"
            className="rounded-2xl p-3 border-2 border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                {fastestRoute.name}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                {fastestRoute.safetyScore}/100 Score
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {fastestRoute.durationMinutes} min
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {fastestRoute.distanceKm} km
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {fastestBreakdown.total} potholes (&le;30m)
              </span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {hasMultipleRoutes ? (
            <button
              type="button"
              id="btn-switch-safer-route"
              onClick={() => {
                onSelectRoute(saferRoute.id);
                onStartNavigation();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 text-xs active:scale-98"
            >
              <Shield className="w-4 h-4" />
              <span>Use Safe Route</span>
            </button>
          ) : (
            <button
              type="button"
              id="btn-select-single-route"
              onClick={() => {
                onSelectRoute(fastestRoute.id);
                onStartNavigation();
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 text-xs active:scale-98"
            >
              <Shield className="w-4 h-4" />
              <span>Start Navigation</span>
            </button>
          )}

          <button
            type="button"
            id="btn-start-nav-direct"
            onClick={onStartNavigation}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-1.5 text-xs active:scale-98"
          >
            <Navigation className="w-4 h-4" />
            <span>Start Active Nav</span>
          </button>
        </div>

        {/* STEP 11: Route Safety Audit Debug Panel Toggle */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 transition"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Route Safety Audit Debug Panel (30m Corridor)</span>
            </span>
            {showDebugPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDebugPanel && (
            <div className="mt-2 p-3 bg-slate-950 text-slate-100 rounded-2xl text-[10px] font-mono space-y-3 max-h-72 overflow-y-auto border border-slate-800 shadow-inner">
              <div className="text-emerald-400 font-bold border-b border-slate-800 pb-1 flex justify-between">
                <span>[AUDIT DATA: 30m ROUTE PROJECTION]</span>
                <span className="text-slate-400">Total Checked: {totalFirebaseChecked}</span>
              </div>

              {/* Normal Route Audit */}
              <div className="space-y-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                <div className="text-blue-400 font-bold">NORMAL ROUTE ({fastestRoute.name}):</div>
                <div>• route points: {fastestRoute.waypoints.length}</div>
                <div>• potholes checked: {totalFirebaseChecked}</div>
                <div>• potholes within 30m: {fastestBreakdown.total}</div>
                <div>• critical: {fastestBreakdown.critical} (-{fastestBreakdown.critical * 40} pts)</div>
                <div>• high: {fastestBreakdown.high} (-{fastestBreakdown.high * 25} pts)</div>
                <div>• moderate: {fastestBreakdown.moderate} (-{fastestBreakdown.moderate * 10} pts)</div>
                <div>• low: {fastestBreakdown.low} (-{fastestBreakdown.low * 5} pts)</div>
                <div className="text-amber-300 font-bold">• safety score: {fastestRoute.safetyScore}/100</div>

                {fastestRoute.hazards.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-slate-800 space-y-1">
                    <div className="text-slate-400 text-[9px] uppercase">Matched Potholes on Normal Route:</div>
                    {fastestRoute.hazards.map((h) => (
                      <div key={h.id} className="text-[9px] text-slate-300 bg-slate-800/60 p-1.5 rounded">
                        <div>ID: #{h.id} ({h.severity}) - {h.roadName}</div>
                        <div>Firebase: [{h.lat}, {h.lng}]</div>
                        {h.nearestRoutePoint && <div>Nearest Route Pt: [{h.nearestRoutePoint[0]}, {h.nearestRoutePoint[1]}]</div>}
                        <div>Distance: {h.distanceFromRoute ?? 0}m (&le;30m threshold)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Safe / Alternative Route Audit */}
              {hasMultipleRoutes && (
                <div className="space-y-1 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                  <div className="text-emerald-400 font-bold">SAFE/ALTERNATIVE ROUTE ({saferRoute.name}):</div>
                  <div>• route points: {saferRoute.waypoints.length}</div>
                  <div>• potholes checked: {totalFirebaseChecked}</div>
                  <div>• potholes within 30m: {saferBreakdown.total}</div>
                  <div>• critical: {saferBreakdown.critical} (-{saferBreakdown.critical * 40} pts)</div>
                  <div>• high: {saferBreakdown.high} (-{saferBreakdown.high * 25} pts)</div>
                  <div>• moderate: {saferBreakdown.moderate} (-{saferBreakdown.moderate * 10} pts)</div>
                  <div>• low: {saferBreakdown.low} (-{saferBreakdown.low * 5} pts)</div>
                  <div className="text-emerald-300 font-bold">• safety score: {saferRoute.safetyScore}/100</div>

                  {saferRoute.hazards.length > 0 && (
                    <div className="mt-1 pt-1 border-t border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[9px] uppercase">Matched Potholes on Safe Route:</div>
                      {saferRoute.hazards.map((h) => (
                        <div key={h.id} className="text-[9px] text-slate-300 bg-slate-800/60 p-1.5 rounded">
                          <div>ID: #{h.id} ({h.severity}) - {h.roadName}</div>
                          <div>Firebase: [{h.lat}, {h.lng}]</div>
                          {h.nearestRoutePoint && <div>Nearest Route Pt: [{h.nearestRoutePoint[0]}, {h.nearestRoutePoint[1]}]</div>}
                          <div>Distance: {h.distanceFromRoute ?? 0}m (&le;30m threshold)</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
