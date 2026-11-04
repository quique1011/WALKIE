import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LOCALIDADES_PUNILLA, LocalidadPunilla } from '../data/initialData';
import { reverseGeocode, searchAddress } from '../utils/geo';
import { getAccurateCurrentPosition, DEFAULT_FALLBACK_LOCATION } from '../utils/geolocation';
import { MapPin, Navigation, Search, Check, ChevronDown, X, Loader2, Compass, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LocationReferenceBarProps {
  currentLat: number;
  currentLng: number;
  currentAddress: string;
  onSelectLocation: (lat: number, lng: number, address: string, locationType: 'actual' | 'fija') => void;
  activeLocationType: 'actual' | 'fija' | string;
  onToast?: (message: string) => void;
}

export const LocationReferenceBar: React.FC<LocationReferenceBarProps> = ({
  currentLat,
  currentLng,
  currentAddress,
  onSelectLocation,
  activeLocationType,
  onToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ text: string; place_name: string; center: [number, number] }>>([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isLiveGps = activeLocationType === 'actual' || activeLocationType === 'gps';

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery('');
      setSearchResults([]);
      setGpsError(null);
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Llamada DIRECTA a la API nativa de geolocalización del navegador:
  // navigator.geolocation.getCurrentPosition(successCallback, errorCallback)
  // Sin modal personalizado ni pasos intermedios.
  const handleUseGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const msg = 'Tu navegador no soporta geolocalización. Ingresa tu dirección manualmente en el buscador.';
      setGpsError(msg);
      onToast?.(msg);
      return;
    }

    setGpsError(null);
    setIsGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsGpsLoading(false);
        setIsOpen(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let address = '';
        try {
          address = await reverseGeocode(lng, lat);
        } catch {
          address = `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }
        if (!address) {
          address = `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        }

        onSelectLocation(lat, lng, address, 'actual');
        const successMsg = `📍 Ubicación actualizada: ${address.split(',')[0]} (Radio de 10 km activo)`;
        setGpsError(null);
        onToast?.(successMsg);
      },
      (err) => {
        setIsGpsLoading(false);
        let errorMsg = 'No pudimos obtener tu señal GPS. Puedes ingresar tu dirección manualmente en el buscador.';
        if (err.code === 1) { // PERMISSION_DENIED: El usuario seleccionó 'Bloquear' en Chrome
          errorMsg = 'Permiso de ubicación denegado. Puedes ingresar tu dirección manualmente en el buscador.';
        } else if (err.code === 2) { // POSITION_UNAVAILABLE
          errorMsg = 'Señal de ubicación no disponible. Puedes ingresar tu dirección manualmente en el buscador.';
        } else if (err.code === 3) { // TIMEOUT
          errorMsg = 'Tiempo de espera de GPS agotado. Puedes ingresar tu dirección manualmente en el buscador.';
        }
        setGpsError(errorMsg);
        onToast?.(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [onSelectLocation, onToast]);

  // Handle preset town selection
  const handleSelectTown = (town: LocalidadPunilla) => {
    const address = `${town.nombre}, ${town.departamento}, Córdoba`;
    onSelectLocation(town.lat, town.lng, address, 'fija');
    setIsOpen(false);
  };

  // Handle address search debounced
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddress(query, currentLng, currentLat);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching address:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  };

  const handleSelectSearchResult = (result: { text: string; place_name: string; center: [number, number] }) => {
    onSelectLocation(result.center[1], result.center[0], result.place_name, 'fija');
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
  };

  // Clean toggle handler for the outer bar
  const handleBarClick = () => {
    setIsOpen(prev => !prev);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${isOpen ? 'z-50' : 'z-20'} w-full select-none pointer-events-auto`}
    >
      {/* 📍 BARRA COMPACTA DE UBICACIÓN INICIAL */}
      <div
        id="barra-ubicacion-referencia"
        role="button"
        tabIndex={0}
        aria-label="Configurar ubicación de referencia"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={handleBarClick}
        onKeyDown={handleKeyDown}
        className={`w-full bg-white hover:bg-slate-50 rounded-2xl border ${
          isOpen ? 'border-emerald-500 shadow-md ring-2 ring-emerald-500/20' : 'border-emerald-500/30 hover:border-emerald-500/60 shadow-xs'
        } py-2 px-3 sm:py-2.5 sm:px-4 flex items-center justify-between gap-2.5 transition-all duration-150 cursor-pointer pointer-events-auto`}
      >
        {/* Left: Icon and Location text */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs transition-colors ${
              isLiveGps
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {isLiveGps ? (
              <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Ubicación:
              </span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[9px] sm:text-[10px] font-black tracking-tight ${
                  isLiveGps
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                }`}
              >
                {isLiveGps ? '📡 GPS en Vivo' : '📍 Fija'}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold hidden md:inline">
                • Radio 10 km
              </span>
            </div>

            <p
              className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-tight mt-0.5"
              title={currentAddress}
            >
              {currentAddress || 'Valle de Punilla, Córdoba'}
            </p>
          </div>
        </div>

        {/* Right: Quick actions (GPS button + Search/Change trigger) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick GPS Direct Click Button */}
          <button
            type="button"
            id="btn-quick-gps"
            title="Detectar mi ubicación GPS actual"
            onClick={(e) => {
              e.stopPropagation();
              handleUseGps();
            }}
            disabled={isGpsLoading}
            className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isLiveGps
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
            } active:scale-95`}
          >
            {isGpsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
            ) : (
              <Navigation className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline text-[11px]">GPS</span>
          </button>

          {/* Search / Dropdown Toggle Button */}
          <div
            id="btn-abrir-config-ubicacion"
            className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-2xs transition-all active:scale-95"
          >
            <Search className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">Cambiar</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </div>

      {/* 📋 DESPLEGABLE DE DIRECCIONES & SELECTOR DE UBICACIÓN */}
      <AnimatePresence>
        {isOpen && (
          <div key="location-dropdown-wrapper">
            {/* Backdrop click dismisser */}
            <div
              className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 sm:p-4 space-y-3 pointer-events-auto max-h-[85vh] overflow-y-auto"
            >
              {/* Header and Close */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">
                      Seleccionar Ubicación de Referencia
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
                      Calculamos los paseadores disponibles en tu radio de 10 km
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 🔍 Search Input Field */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 block">
                  Buscar calle, barrio o punto de interés:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Ej: Av. San Martín 450, Carlos Paz..."
                    className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium text-slate-900 transition-colors"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : isSearching ? (
                    <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin absolute right-3 top-3 pointer-events-none" />
                  ) : null}
                </div>

                {/* Search suggestions dropdown list */}
                {searchResults.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-md divide-y divide-slate-100 max-h-48 overflow-y-auto mt-1">
                    {searchResults.map((res, i) => (
                      <button
                        key={`search-loc-${res.id || i}`}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50/70 flex items-start gap-2.5 transition-colors cursor-pointer group"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                        <span className="text-slate-800 font-medium line-clamp-2">
                          {res.place_name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 📡 Instant GPS Button */}
              <div>
                <button
                  type="button"
                  id="btn-modal-use-gps"
                  onClick={handleUseGps}
                  disabled={isGpsLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-between transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
                >
                  <div className="flex items-center gap-2">
                    {isGpsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Navigation className="w-4 h-4 text-white" />
                    )}
                    <span>
                      {isGpsLoading ? 'Detectando señal GPS...' : 'Usar mi ubicación GPS actual (en vivo)'}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium bg-white/20 px-2 py-0.5 rounded-md">
                    Detección automática
                  </span>
                </button>
              </div>

              {/* 🏘️ Quick Localidades Pills */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    O elegí una localidad en Punilla:
                  </span>
                  <span className="text-[10px] text-slate-400">1 toque</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {LOCALIDADES_PUNILLA.map((town) => {
                    const isSelected =
                      !isLiveGps &&
                      currentAddress.toLowerCase().includes(town.nombre.toLowerCase());

                    return (
                      <button
                        key={town.id}
                        type="button"
                        onClick={() => handleSelectTown(town)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                        <span>{town.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
