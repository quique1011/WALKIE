import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, ShieldCheck, Compass } from 'lucide-react';
import { getAccurateCurrentPosition, DEFAULT_FALLBACK_LOCATION } from '../utils/geolocation';
import { reverseGeocode } from '../utils/geo';

interface GpsBlockerModalProps {
  hasPermission: boolean;
  onPermissionGranted: (lat: number, lng: number, address: string) => void;
  onSimulateDefaultLocation: () => void;
  onClose: () => void;
}

export const GpsBlockerModal: React.FC<GpsBlockerModalProps> = ({
  hasPermission,
  onPermissionGranted,
  onSimulateDefaultLocation,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (hasPermission) return null;

  const handleRequestGps = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const pos = await getAccurateCurrentPosition();
      let addr = 'Ubicación en Valle de Punilla';
      try {
        addr = await reverseGeocode(pos.lat, pos.lng);
      } catch {}
      onPermissionGranted(pos.lat, pos.lng, addr);
    } catch {
      setErrorMsg('No se pudo acceder al sensor GPS. Podés continuar con la ubicación central de Valle de Punilla.');
      setLoading(false);
    }
  };

  const handleUseDefault = () => {
    onPermissionGranted(
      DEFAULT_FALLBACK_LOCATION.lat,
      DEFAULT_FALLBACK_LOCATION.lng,
      DEFAULT_FALLBACK_LOCATION.address
    );
    onSimulateDefaultLocation();
  };

  return (
    <div
      id="modal-gps-blocker-backdrop"
      className="fixed inset-0 z-[1000] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl shadow-sm">
          <Navigation className="w-7 h-7 text-emerald-600 animate-pulse" />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Geolocalización en Tiempo Real
          </span>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
            Activá tu Ubicación GPS
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Para coordinar paseos, monitorear el radar en vivo y calcular distancias seguras en Valle de Punilla, WALKIE requiere acceso a tu ubicación.
          </p>
        </div>

        {errorMsg && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 text-xs text-amber-900 flex items-start gap-2 text-left">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            id="btn-permitir-gps-modal"
            onClick={handleRequestGps}
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? (
              <>
                <Compass className="w-4 h-4 animate-spin" />
                <span>Detectando satélites GPS...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Permitir Acceso a GPS</span>
              </>
            )}
          </button>

          <button
            type="button"
            id="btn-simular-ubicacion-punilla"
            onClick={handleUseDefault}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
            <span>Usar Ubicación Central Punilla (Carlos Paz)</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tus datos de geolocalización están protegidos</span>
        </div>
      </motion.div>
    </div>
  );
};
