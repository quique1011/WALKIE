import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Key, 
  ShieldAlert, 
  CheckCircle2, 
  Compass, 
  Phone,
  HelpCircle
} from 'lucide-react';

interface PaseadorTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaseadorTutorialModal: React.FC<PaseadorTutorialModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      number: 1,
      title: 'Llegada y Código PIN #1 (Retiro)',
      desc: 'Dirígete al domicilio del perro siguiendo el mapa GPS. Al recibir la mascota, solicita al dueño su Código PIN #1 de 4 dígitos para iniciar oficialmente el paseo.',
      icon: <Key className="w-5 h-5" />,
      iconBg: 'bg-emerald-100 text-emerald-800'
    },
    {
      number: 2,
      title: 'Paseo Activo y Monitoreo GPS',
      desc: 'El trayecto se registra en tiempo real para el cliente. Controla el temporizador, el clima en vivo y mantén siempre agua fresca y bolsa recolectora.',
      icon: <Compass className="w-5 h-5" />,
      iconBg: 'bg-blue-100 text-blue-800'
    },
    {
      number: 3,
      title: 'Protocolo de Emergencia',
      desc: 'Ante cualquier imprevisto de salud o accidente, presiona el botón rojo "Emergencia". Se activará la ruta GPS a la veterinaria asignada y se alertará al dueño al instante.',
      icon: <ShieldAlert className="w-5 h-5" />,
      iconBg: 'bg-red-100 text-red-800'
    },
    {
      number: 4,
      title: 'Devolución y Código PIN #2 (Cobro)',
      desc: 'Al regresar al domicilio, el dueño confirmará la entrega en su app y te dará el Código PIN #2. Al ingresarlo, el paseo se completa y tus ganancias se acreditan.',
      icon: <CheckCircle2 className="w-5 h-5" />,
      iconBg: 'bg-amber-100 text-amber-900'
    }
  ];

  return (
    <AnimatePresence>
      <div
        key="modal-tutorial-paseador-backdrop"
        id="modal-tutorial-paseador-backdrop"
        className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="modal-tutorial-paseador-panel"
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 my-auto"
        >
          {/* Botón de cierre 'X' */}
          <button
            type="button"
            id="btn-cerrar-tutorial-paseador"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar tutorial"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Encabezado */}
          <div className="mb-5 sm:mb-6 pr-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800">
                <HelpCircle className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                Guía Rápida para el Paseador
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              Tutorial: Cómo gestionar tu paseo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-relaxed">
              Instrucciones clave para brindar un servicio seguro y profesional.
            </p>
          </div>

          {/* Pasos */}
          <div className="space-y-3 mb-6 max-h-[55vh] overflow-y-auto pr-1">
            {steps.map((st) => (
              <div
                key={st.number}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-start gap-3.5"
              >
                <div className={`w-9 h-9 rounded-xl ${st.iconBg} flex items-center justify-center shrink-0 shadow-2xs font-bold`}>
                  {st.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Paso {st.number}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                    {st.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Botón inferior verde */}
          <button
            type="button"
            id="btn-entendido-tutorial-paseador"
            onClick={onClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#00A86B] hover:bg-[#008f5b] active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-[#00A86B]/25 hover:shadow-[#00A86B]/35 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>✓ Entendido</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
