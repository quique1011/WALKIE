import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Users, Check, Sparkles, MapPin, X, ArrowRight, Compass } from 'lucide-react';

interface SearchModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: 'automatico' | 'manual';
  onSelectMode: (mode: 'automatico' | 'manual') => void;
  walkersCount10Km: number;
  dogName?: string;
}

export const SearchModeSelectionModal: React.FC<SearchModeSelectionModalProps> = ({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  walkersCount10Km,
  dogName = 'tu mascota'
}) => {
  const [selectedMode, setSelectedMode] = useState<'automatico' | 'manual'>(currentMode);

  useEffect(() => {
    setSelectedMode(currentMode);
  }, [currentMode, isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelectMode(selectedMode);
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        key="modal-search-mode-backdrop"
        id="modal-search-mode-backdrop"
        className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-5 text-left relative overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            id="btn-close-search-mode-modal"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="space-y-1.5 pr-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Plan Activo Confirmado
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              ¿Cómo querés buscar paseador para {dogName}?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Elegí el método de asignación para los paseos de esta semana en el Valle de Punilla.
            </p>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 gap-3.5 pt-1">
            {/* Option 1: Búsqueda Automática */}
            <button
              type="button"
              id="btn-opcion-busqueda-automatica"
              onClick={() => setSelectedMode('automatico')}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer group ${
                selectedMode === 'automatico'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/30'
                  : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors ${
                  selectedMode === 'automatico'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200'
                }`}>
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-950 flex items-center gap-1.5">
                      <span>Búsqueda Automática</span>
                      <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                        Recomendado
                      </span>
                    </h4>
                    {selectedMode === 'automatico' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Envía la solicitud de paseo a <strong>todos los paseadores activos</strong> en tu radio de <strong>10 km</strong>. El primer paseador disponible tomará el turno.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{walkersCount10Km} {walkersCount10Km === 1 ? 'paseador activo' : 'paseadores activos'} en tu radar de 10 km</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Option 2: Búsqueda Manual */}
            <button
              type="button"
              id="btn-opcion-busqueda-manual"
              onClick={() => setSelectedMode('manual')}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative cursor-pointer group ${
                selectedMode === 'manual'
                  ? 'border-emerald-500 bg-emerald-50/70 shadow-md ring-2 ring-emerald-400/30'
                  : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/80'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl font-bold transition-colors ${
                  selectedMode === 'manual'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                }`}>
                  <Users className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 group-hover:text-emerald-950">
                      Búsqueda Manual
                    </h4>
                    {selectedMode === 'manual' && (
                      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Muestra la lista de paseadores de la zona en el mapa para que elijas directamente a cuáles enviarles la oferta.
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-blue-800 font-bold">
                    <span>Elegí por perfil, calificaciones y cercanía</span>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Footer note & Primary Action Button */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 text-center sm:text-left">
              Podés cambiar este método cuando quieras desde tu panel.
            </span>
            <button
              type="button"
              id="btn-realizar-busqueda"
              onClick={handleConfirm}
              className="w-full sm:w-auto py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Realizar búsqueda</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
