import React, { useState, useEffect, useRef } from 'react';
import { 
  WeatherData, 
  fetchLiveGpsWeather, 
  DEFAULT_PUNILLA_WEATHER_LOCATION, 
  CIUDADES_ARGENTINA, 
  ArgentineCity 
} from '../utils/weather';
import { 
  MessageCircle, 
  AlertTriangle, 
  Droplets, 
  CheckCircle2, 
  MapPin, 
  ChevronDown, 
  RefreshCw, 
  Navigation, 
  X,
  Zap,
  CloudRain,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';

interface WeatherAlertWidgetProps {
  lat?: number;
  lng?: number;
  locationLabel?: string;
  onOpenChat?: () => void;
  className?: string;
  compact?: boolean;
  onSelectLocation?: (lat: number, lng: number, label: string) => void;
}

export const WeatherAlertWidget: React.FC<WeatherAlertWidgetProps> = ({
  lat,
  lng,
  locationLabel,
  onOpenChat,
  className = '',
  compact = false,
  onSelectLocation
}) => {
  const [selectedCity, setSelectedCity] = useState<ArgentineCity | null>(null);
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState<boolean>(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSimulatedStormActive, setIsSimulatedStormActive] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Coordenadas activas: de la ciudad seleccionada manualmente, o del GPS / mapa recibido
  const activeLat = selectedCity ? selectedCity.lat : lat;
  const activeLng = selectedCity ? selectedCity.lng : lng;

  const loadWeather = (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else if (!weather) setIsLoading(true);

    fetchLiveGpsWeather(activeLat, activeLng, isManualRefresh)
      .then((data) => {
        setWeather(data);
        setIsLoading(false);
        setIsRefreshing(false);
      })
      .catch(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
  };

  useEffect(() => {
    loadWeather();

    // Actualización automática cada 10 minutos para mantener datos en vivo
    const intervalId = setInterval(() => loadWeather(false), 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [activeLat, activeLng]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCitySelectorOpen(false);
      }
    };
    if (isCitySelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCitySelectorOpen]);

  const handleSelectCity = (city: ArgentineCity) => {
    setSelectedCity(city);
    setIsSimulatedStormActive(false);
    setIsCitySelectorOpen(false);
    if (onSelectLocation) {
      onSelectLocation(city.lat, city.lng, `${city.name}, ${city.province}`);
    }
  };

  const handleResetToGps = () => {
    setSelectedCity(null);
    setIsSimulatedStormActive(false);
    setIsCitySelectorOpen(false);
    if (onSelectLocation && lat && lng) {
      onSelectLocation(lat, lng, locationLabel || 'Ubicación GPS');
    }
  };

  if (isLoading && !weather) {
    return (
      <div className={`w-full p-2.5 sm:p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs animate-pulse select-none ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-base select-none">⏳</span>
          <span className="text-slate-600 font-medium text-xs">Consultando clima en tiempo real con WeatherAPI...</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  // Si el usuario activa la simulación para verificar visualmente el aviso de reprogramación
  const effectiveWeather: WeatherData = isSimulatedStormActive
    ? {
        ...weather,
        condition: 'Tormenta eléctrica y lluvia fuerte',
        precipitation: 12.4,
        rainProbability: 95,
        isAlert: true,
        isThunderstorm: true,
        isHeavyRain: true,
        alertReason: 'Tormenta eléctrica y lluvia fuerte',
        alertTitle: '⚡ Alerta Crítica: Tormenta Eléctrica y Lluvia Fuerte',
        alertMessage: `⚠️ Alerta Meteorológica: Reprogramación automática de paseos activa en ${weather.locationName} por tormenta eléctrica`,
        statusBadgeText: 'Reprogramación por Tormenta Eléctrica',
        statusBadgeType: 'alerta'
      }
    : weather;

  // Lógica de alerta: activa solo si hay lluvia fuerte o tormenta eléctrica puntual en esa zona
  const isAlertState = Boolean(effectiveWeather.isAlert);

  // Etiqueta legible de la ubicación: devuelve el nombre devuelto por WeatherAPI
  const displayLocation = selectedCity
    ? `${selectedCity.name}, ${selectedCity.province}`
    : (effectiveWeather.locationName
        ? `${effectiveWeather.locationName}${effectiveWeather.regionName ? `, ${effectiveWeather.regionName}` : ''}`
        : (locationLabel || DEFAULT_PUNILLA_WEATHER_LOCATION.label));

  return (
    <div
      id="walkie-weather-alert-widget"
      className={`w-full relative flex flex-col gap-2.5 rounded-2xl p-3 sm:p-3.5 transition-all select-none ${
        isAlertState
          ? 'bg-amber-50/95 border-2 border-amber-400 shadow-md ring-2 ring-amber-300/40'
          : 'bg-emerald-50/70 border border-emerald-200/80 shadow-2xs'
      } ${className}`}
    >
      {/* ========================================================================= */}
      {/* 1. CABECERA: LOCALIDAD DEVUELTA POR WEATHERAPI Y SELECTOR DE ZONA         */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            id="btn-cambiar-ciudad-clima"
            onClick={() => setIsCitySelectorOpen(!isCitySelectorOpen)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-emerald-700 bg-white/95 hover:bg-white px-2.5 py-1 rounded-xl border border-slate-200/90 shadow-2xs transition-colors cursor-pointer active:scale-98"
            title="Cambiar zona o consultar otra localidad en Argentina"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="max-w-[200px] sm:max-w-[280px] truncate">{displayLocation}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>

          {/* Menú Desplegable con Zonas de Argentina y Test de Alerta */}
          {isCitySelectorOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-84 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Zonas Activas WALKIE
                </span>
                <button
                  type="button"
                  onClick={() => setIsCitySelectorOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Botón para volver al GPS detectado */}
              <button
                type="button"
                onClick={handleResetToGps}
                className="w-full mt-1.5 px-3 py-2 rounded-xl text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-emerald-600" />
                <span>Usar mi GPS exacto en tiempo real</span>
              </button>

              {/* Selector de Ciudades */}
              <div className="max-h-52 overflow-y-auto mt-1 space-y-0.5 divide-y divide-slate-50">
                {CIUDADES_ARGENTINA.map((c, cIdx) => {
                  const isCurrent = selectedCity?.id === c.id;
                  return (
                    <button
                      key={`city-${c.id || cIdx}`}
                      type="button"
                      onClick={() => handleSelectCity(c)}
                      className={`w-full px-3 py-2 text-left text-xs rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-100/80 text-emerald-950 font-bold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.province}</div>
                      </div>
                      {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Toggle de simulación de prueba de tormenta para validación inmediata */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsSimulatedStormActive(!isSimulatedStormActive);
                    setIsCitySelectorOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-[11px] font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isSimulatedStormActive
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isSimulatedStormActive ? 'Desactivar simulación de tormenta' : 'Probar aviso de tormenta eléctrica'}</span>
                  </span>
                  <span className="text-[10px] uppercase font-black bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {isSimulatedStormActive ? 'Activo' : 'Test'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botón de refresco manual con WeatherAPI */}
          <button
            type="button"
            onClick={() => loadWeather(true)}
            disabled={isRefreshing}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white text-slate-500 hover:text-slate-800 border border-slate-200/80 transition-all cursor-pointer active:scale-95 shadow-2xs"
            title="Actualizar datos con WeatherAPI"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>

          {/* Indicador de estado en la cabecera */}
          {!isAlertState ? (
            <div
              id="badge-clima-despejado"
              className="px-2.5 py-1 rounded-xl bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] sm:text-xs">Clima Apto</span>
            </div>
          ) : (
            <div
              id="badge-alerta-clima-resumen"
              className="px-2.5 py-1 rounded-xl bg-amber-500 text-white border border-amber-600 text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs animate-pulse"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] sm:text-xs">Reprogramación Activa</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DATOS DEVUELTOS POR WEATHERAPI:                                        */}
      {/*    - location.name (Nombre de localidad puntual)                          */}
      {/*    - current.temp_c (Temperatura puntual)                                 */}
      {/*    - current.condition.text (Estado del tiempo en español)                */}
      {/*    - Probabilidad y milímetros de lluvia (precip_mm)                      */}
      {/* ========================================================================= */}
      <div className="w-full flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Icono oficial WeatherAPI con fallback a emoji */}
          {effectiveWeather.iconUrl ? (
            <img
              src={effectiveWeather.iconUrl}
              alt={effectiveWeather.condition}
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 drop-shadow-xs"
              loading="lazy"
            />
          ) : (
            <div className="text-2xl shrink-0 select-none">
              {effectiveWeather.icon}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Temperatura devuelta por la API (current.temp_c) y Estado del tiempo (current.condition.text) */}
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                <span className="tabular-nums font-black text-sm sm:text-base">{effectiveWeather.temperature}</span>°C — {effectiveWeather.condition}
              </span>

              {/* Milímetros de lluvia (precip_mm) y probabilidad */}
              <span
                id="badge-milimetros-lluvia"
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${
                  isAlertState
                    ? 'bg-amber-100 text-amber-950 border-amber-300'
                    : 'bg-white/95 text-slate-700 border-slate-200/80 shadow-2xs'
                }`}
                title="Precipitaciones acumuladas y probabilidad de lluvia"
              >
                <Droplets className={`w-3 h-3 ${isAlertState ? 'text-amber-700' : 'text-sky-500'}`} />
                <span>
                  Lluvia: <span className="tabular-nums">{effectiveWeather.rainProbability}</span>%
                  {' • '}
                  <span className="tabular-nums">{effectiveWeather.precipitation}</span> mm
                </span>
              </span>
            </div>

            {/* Localidad puntual detectada por coordenadas en WeatherAPI */}
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate mt-0.5">
              <span className="font-semibold text-slate-700">Zona puntual:</span>
              <span className="text-emerald-800 font-bold bg-white/70 px-1.5 py-0.2 rounded border border-slate-200/60 truncate">
                {effectiveWeather.locationName}
              </span>
              <span>• WeatherAPI en vivo: <span className="tabular-nums">{effectiveWeather.lastUpdated}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. AVISO AUTOMÁTICO DE REPROGRAMACIÓN DE PASEOS (SOLO PARA ESTA ZONA)     */}
      {/*    Se activa cuando la condición indica lluvia fuerte o tormenta          */}
      {/* ========================================================================= */}
      {isAlertState && (
        <div
          id="bloque-aviso-reprogramacion-zona"
          className="w-full relative mt-0.5 rounded-xl bg-amber-500 text-white p-3 shadow-sm border border-amber-600 animate-in fade-in duration-200"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
              {effectiveWeather.isThunderstorm ? (
                <Zap className="w-4 h-4 text-amber-100 animate-pulse" />
              ) : (
                <CloudRain className="w-4 h-4 text-amber-100" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm tracking-tight text-white">
                <span>{effectiveWeather.alertTitle}</span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100/95 leading-snug mt-0.5">
                Aviso de reprogramación de paseos activo exclusivamente para la zona de{' '}
                <strong className="text-white underline decoration-amber-300 font-bold">{effectiveWeather.locationName}</strong> debido a{' '}
                {effectiveWeather.alertReason.toLowerCase()} ({effectiveWeather.precipitation} mm registrados). Por seguridad de los perritos y del paseador, podés coordinar un nuevo horario sin costo ni penalización.
              </p>

              {/* Botones de acción para reprogramar o coordinar vía Chat Temporal */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {onOpenChat && (
                  <button
                    type="button"
                    id="btn-reprogramar-chat-alerta"
                    onClick={onOpenChat}
                    className="px-3 py-1.5 rounded-lg bg-white text-amber-950 hover:bg-amber-50 active:scale-98 text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Coordinar Reprogramación por Chat</span>
                  </button>
                )}

                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-100 bg-amber-600/70 px-2 py-1 rounded-lg border border-amber-400/40">
                  <ShieldAlert className="w-3 h-3 text-amber-200" />
                  <span>Garantía de Cuidado WALKIE Activa</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
