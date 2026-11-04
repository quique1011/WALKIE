import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Heart } from 'lucide-react';
import { NosotrosFaqSection } from './NosotrosFaqSection';
import { MetaSolidariaSection } from './MetaSolidariaSection';

interface NosotrosMetasModalProps {
  isOpen: boolean;
  activeModal: 'nosotros' | 'metas' | null;
  onClose: () => void;
  onSwitchModal: (modal: 'nosotros' | 'metas') => void;
  solidarityAmount: number;
  onContributeSolidarity: (amount: number) => void;
}

export const NosotrosMetasModal: React.FC<NosotrosMetasModalProps> = ({
  isOpen,
  activeModal,
  onClose,
  onSwitchModal,
  solidarityAmount,
  onContributeSolidarity
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !activeModal) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          key="modal-backdrop-nosotros-metas"
          id="modal-backdrop-nosotros-metas"
          className="fixed inset-0 z-[9995] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            id="modal-content-nosotros-metas"
            className="relative w-full max-w-5xl bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Bar with Switcher & Close "X" Button */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
              {/* Left: Quick Switcher between Nosotros and Metas */}
              <div className="flex items-center gap-1 sm:gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  id="btn-modal-tab-nosotros"
                  type="button"
                  onClick={() => onSwitchModal('nosotros')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeModal === 'nosotros'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Nosotros & FAQ</span>
                </button>

                <button
                  id="btn-modal-tab-metas"
                  type="button"
                  onClick={() => onSwitchModal('metas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeModal === 'metas'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                  <span>Meta Solidaria</span>
                </button>
              </div>

              {/* Right: Close "X" Button to return cleanly to previous screen */}
              <button
                id={activeModal === 'nosotros' ? 'btn-cerrar-modal-nosotros' : 'btn-cerrar-modal-metas'}
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80 hover:border-rose-200 shadow-2xs group"
                title="Cerrar y volver a la pantalla principal"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Modal Body Container with Scroll */}
            <div className="overflow-y-auto px-2 sm:px-4 py-4 flex-1">
              {activeModal === 'nosotros' ? (
                <NosotrosFaqSection
                  solidarityAmount={solidarityAmount}
                  onOpenSolidarityTab={() => onSwitchModal('metas')}
                />
              ) : (
                <MetaSolidariaSection
                  solidarityAmount={solidarityAmount}
                  onContribute={onContributeSolidarity}
                  onOpenNosotrosTab={() => onSwitchModal('nosotros')}
                />
              )}
            </div>

            {/* Modal Bottom Footer with Close Action */}
            <div className="bg-white px-4 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="hidden sm:inline">
                🐾 Walkie — Valle de Punilla (Paseos monitoreados y compromiso comunitario)
              </span>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer transition-all shadow-2xs"
              >
                Cerrar y Volver
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
