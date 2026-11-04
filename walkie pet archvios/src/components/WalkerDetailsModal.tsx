import React from 'react';
import { PaseadorPublico } from '../types';
import { REVIEWS_PASEADOR_SAMPLE } from '../data/initialData';
import { Star, ShieldCheck, MapPin, Phone, MessageSquare, Check, X, Award, Dog } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GarantiaCuidadoCard } from './GarantiaCuidadoCard';

interface WalkerDetailsModalProps {
  walker: PaseadorPublico | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectWalker?: (walker: PaseadorPublico) => void;
  isSelected?: boolean;
}

export const WalkerDetailsModal: React.FC<WalkerDetailsModalProps> = ({
  walker,
  isOpen,
  onClose,
  onSelectWalker,
  isSelected = false
}) => {
  if (!isOpen || !walker) return null;

  // Filter reviews matching this walker ID from sample and localStorage
  const storedReviews: any[] = (() => {
    try {
      return JSON.parse(localStorage.getItem('walkie_reviews_list') || '[]');
    } catch {
      return [];
    }
  })();

  const matchingStored = storedReviews.filter(r => !r.paseadorId || r.paseadorId === walker.id);
  const reviewsToShow = [...matchingStored, ...REVIEWS_PASEADOR_SAMPLE.filter(r => r.paseadorId === walker.id)];

  const displayRating = reviewsToShow.length > 0
    ? (reviewsToShow.reduce((acc, r) => acc + (r.calificacion || 5), 0) / reviewsToShow.length).toFixed(1)
    : (walker.calificacion?.toFixed(1) || '5.0');

  return (
    <AnimatePresence>
      <div key="walker-details-backdrop" className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 relative my-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 z-10 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors text-sm font-bold"
          >
            ✕
          </button>

          {/* Header Profile */}
          <div className="flex items-start gap-4 pr-8">
            <div className="relative">
              <img
                src={walker.fotoPerfil}
                alt={walker.nombre}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
              />
              <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-600 text-white p-1 rounded-lg shadow" title="DNI y Antecedentes Verificados">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">
                  {walker.nombre} {walker.apellido}
                </h3>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                @{walker.nombreUsuario} • Paseador Certificado Walkie
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="flex items-center gap-1 text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  {displayRating} / 5.0
                </span>
                <span className="text-xs font-bold text-slate-500">
                  ({(walker.totalPaseos || 0) + matchingStored.length} paseos completados)
                </span>
              </div>
            </div>
          </div>

          {/* Quick Details Chips */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">Valle de Punilla (10 km)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{walker.telefono}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>DNI Verificado</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <span className={`w-2.5 h-2.5 rounded-full ${walker.disponible !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="font-bold text-emerald-800">
                {walker.disponible !== false ? 'En Servicio' : 'En Pausa'}
              </span>
            </div>
          </div>

          {/* Biografía */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Acerca del Paseador:
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/60">
              {walker.biografia}
            </p>
          </div>

          {/* Garantía y Equipamiento del Paseador */}
          <GarantiaCuidadoCard variant="compact" />

          {/* Reseñas y Calificaciones de Clientes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Reseñas de Clientes ({reviewsToShow.length})
              </h4>
              <span className="text-[11px] font-bold text-emerald-700">
                100% Calificaciones Reales
              </span>
            </div>

            {reviewsToShow.length > 0 ? (
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {reviewsToShow.map((rev, revIdx) => (
                  <div
                    key={`walker-rev-${rev.id || 'r'}-${revIdx}`}
                    className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={rev.clienteFoto}
                          alt={rev.clienteNombre}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                        <strong className="text-slate-900 font-bold">{rev.clienteNombre}</strong>
                        <span className="text-[10px] text-slate-400 font-medium">({rev.perroNombre} - {rev.perroRaza})</span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500 text-[11px]">
                        {Array.from({ length: rev.calificacion }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed italic">
                      "{rev.comentario}"
                    </p>
                    <div className="text-[10px] text-slate-400 flex justify-between">
                      <span>Plan {rev.paseoPlan}</span>
                      <span>{rev.fecha}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Paseador registrado con perfil verificado. Aún no cuenta con reseñas públicas en la plataforma.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
            {onSelectWalker && (
              <button
                type="button"
                id="btn-seleccionar-contratar-paseador-modal"
                onClick={() => {
                  onSelectWalker(walker);
                  onClose();
                }}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                  isSelected
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{isSelected ? 'Paseador Seleccionado ✓' : 'Contratar / Pedir Paseo'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
