import React, { useState } from 'react';
import { DestinationPlace } from '../types';
import { EXPLORE_CATEGORIES, POPULAR_DESTINATIONS } from '../data/mockData';
import { RoadSafetyAPI, LocationSearchResult } from '../utils/api';
import {
  Search,
  MapPin,
  Fuel,
  Cross,
  GraduationCap,
  Shield,
  Wrench,
  ChevronRight,
  Navigation,
  Loader2,
  AlertTriangle,
  AlertCircle,
  WifiOff,
  CornerDownLeft
} from 'lucide-react';

interface ExploreSearchPageProps {
  onSelectDestination: (place: DestinationPlace) => void;
  onBackToMap: () => void;
  userCoords?: { latitude: number; longitude: number };
}

export const ExploreSearchPage: React.FC<ExploreSearchPageProps> = ({
  onSelectDestination,
  onBackToMap,
  userCoords
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicResults, setDynamicResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>('');

  // Submit search only when user triggers it (Enter key, button click, or category select)
  // Per OpenStreetMap Nominatim acceptable use policy
  const handleSearchSubmit = async (overrideQuery?: string) => {
    const queryToUse = (overrideQuery !== undefined ? overrideQuery : searchQuery).trim();

    if (!queryToUse || queryToUse.length < 2) {
      setSearchError('Please enter a valid address or place name to search (e.g. "Dighori, Nagpur").');
      setErrorType('INVALID_SEARCH');
      setDynamicResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setErrorType(null);
    setLastSearchedQuery(queryToUse);

    try {
      const res = await RoadSafetyAPI.searchLocations(queryToUse, userCoords);
      if (res.success && res.results.length > 0) {
        setDynamicResults(res.results);
        setSearchError(null);
        setErrorType(null);
      } else {
        setDynamicResults([]);
        setSearchError(res.error || `Location "${queryToUse}" not found. Try a more specific address or place name.`);
        setErrorType(res.errorType || 'LOCATION_NOT_FOUND');
      }
    } catch (err: any) {
      console.error('ExploreSearchPage geocoding error:', err);
      setDynamicResults([]);
      setSearchError('Network error: Unable to connect to OpenStreetMap Nominatim geocoding service.');
      setErrorType('NETWORK_ERROR');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    const placeName = result.name || result.road || result.display_name.split(',')[0];
    const place: DestinationPlace = {
      id: `place_${result.place_id}`,
      name: placeName,
      address: result.address || result.display_name,
      lat: result.latitude,
      lng: result.longitude,
      category: result.category || 'Location'
    };

    // Save to Firestore collection "locations"
    RoadSafetyAPI.recordLocation(searchQuery || placeName, {
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.display_name
    });

    onSelectDestination(place);
  };

  const handleSelectCategory = (catLabel: string) => {
    setSearchQuery(catLabel);
    handleSearchSubmit(catLabel);
  };

  const getCategoryIcon = (iconId: string) => {
    switch (iconId) {
      case 'Fuel':
        return <Fuel className="w-5 h-5" />;
      case 'Cross':
        return <Cross className="w-5 h-5" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5" />;
      case 'Shield':
        return <Shield className="w-5 h-5" />;
      case 'Wrench':
        return <Wrench className="w-5 h-5" />;
      default:
        return <MapPin className="w-5 h-5" />;
    }
  };

  const renderErrorIcon = () => {
    switch (errorType) {
      case 'INVALID_SEARCH':
        return <AlertCircle className="w-6 h-6 text-amber-500" />;
      case 'NETWORK_ERROR':
        return <WifiOff className="w-6 h-6 text-rose-500" />;
      case 'NOMINATIM_FAILED':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'LOCATION_NOT_FOUND':
      default:
        return <Search className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto pb-20">
      {/* Top Search Bar with Nominatim Geocoder Form */}
      <div className="p-4 sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit();
          }}
          className="relative flex items-center"
        >
          <button
            type="submit"
            disabled={isSearching}
            className="absolute left-3.5 top-3 text-slate-400 hover:text-blue-500 transition disabled:opacity-50"
            title="Search with OpenStreetMap Nominatim"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </button>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (searchError) setSearchError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchSubmit();
              }
            }}
            placeholder="Search address (e.g. Dighori, Nagpur)..."
            autoFocus
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-24 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <div className="absolute right-2 top-2 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDynamicResults([]);
                  setSearchError(null);
                  setErrorType(null);
                  setLastSearchedQuery('');
                }}
                className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center text-xs font-bold"
                title="Clear input"
              >
                ✕
              </button>
            )}

            <button
              type="submit"
              disabled={isSearching}
              className="px-2.5 py-1 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-xs"
            >
              <span>Search</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>
        </form>

        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Powered by OpenStreetMap Nominatim</span>
          <span>Press Enter to search</span>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-md mx-auto w-full">
        {/* Dynamic Search Results & Error Messages */}
        {isSearching && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 text-center border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Searching OpenStreetMap Nominatim...
            </p>
            <p className="text-[11px] text-slate-400">Converting address to geographic coordinates</p>
          </div>
        )}

        {/* Error State Banner */}
        {!isSearching && searchError && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-200 dark:border-rose-900/60 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 shrink-0">
                {renderErrorIcon()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">
                    {errorType === 'LOCATION_NOT_FOUND' && 'Location Not Found'}
                    {errorType === 'INVALID_SEARCH' && 'Invalid Search Query'}
                    {errorType === 'NOMINATIM_FAILED' && 'Nominatim Request Failed'}
                    {errorType === 'NETWORK_ERROR' && 'Network Connection Error'}
                    {!errorType && 'Search Notice'}
                  </h4>
                  {errorType && (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold">
                      {errorType.replace('_', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {searchError}
                </p>
                {lastSearchedQuery && (
                  <p className="text-[11px] text-slate-400 mt-1 italic">
                    Query attempted: &ldquo;{lastSearchedQuery}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Results List */}
        {!isSearching && dynamicResults.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Nominatim Geocoded Places ({dynamicResults.length})</span>
              <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                ✓ Saved to Firestore
              </span>
            </h3>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
              {dynamicResults.map((result) => (
                <div
                  key={`res-${result.place_id}`}
                  onClick={() => handleSelectResult(result)}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold shrink-0">
                      📍
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {result.name || result.road || result.display_name.split(',')[0]}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                        {result.display_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-medium">
                        <span>Lat: {result.latitude.toFixed(4)}</span>
                        <span>Lng: {result.longitude.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 text-xs font-bold shrink-0">
                    <span>Select</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories & Popular Destinations when no search has been performed */}
        {dynamicResults.length === 0 && !isSearching && !searchError && (
          <>
            {/* Quick Categories */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                Categories
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {EXPLORE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.label)}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl border transition hover:scale-102 active:scale-95 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 ${cat.color}`}>
                      {getCategoryIcon(cat.icon)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate w-full text-center">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popular Landmarks */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-500" />
                <span>Popular Destinations</span>
              </h3>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-xs">
                {POPULAR_DESTINATIONS.map((place) => (
                  <div
                    key={place.id}
                    onClick={() => onSelectDestination(place)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        {place.icon || '📍'}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {place.name}
                          </h4>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.2 rounded font-medium">
                            {place.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[210px]">
                          {place.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold shrink-0">
                      <span>Route</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
