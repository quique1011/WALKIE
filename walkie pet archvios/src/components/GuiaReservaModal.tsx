import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  Dog, 
  Calendar, 
  CreditCard, 
  Users, 
  X, 
  ChevronDown,
  Navigation,
  Lock,
  Sparkles
} from 'lucide-react';

interface GuiaReservaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StepItem {
  number: number;
  title: string;
  detail: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  tagColor: string;
}

export const GuiaReservaModal: React.FC<GuiaReservaModalProps> = ({
  isOpen,
  onClose
}) => {
  // Estado para el acordeón interactivo (por defecto el paso 1 expandido para guiar al usuario)
  const [openStep, setOpenStep] = useState<number | null>(1);

  if (!isOpen) return null;

  const steps: StepItem[] = [
    {
      number: 1,
      title: 'Define tu Ubicación',
      detail: "Para recargar tu ubicación presiona el botón 'GPS' o escribe manualmente tu dirección en el buscador superior.",
      icon: <MapPin className="w-5 h-5" />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-[#00A86B]',
      tagColor: 'border-emerald-200'
    },
    {
      number: 2,
      title: 'Crea Perfil a tu Mascota',
      detail: 'Llena el formulario para tu mascota con datos reales: nombre, raza, edad y fotos obligatorias.',
      icon: <Dog className="w-5 h-5" />,
      iconBg: 'bg-amber-100/90',
      iconColor: 'text-amber-800',
      tagColor: 'border-amber-200'
    },
    {
      number: 3,
      title: 'Elige Plan y Días',
      detail: 'Elegí el plan ideal para tu perro (ej. 45 min) y luego selecciona los días específicos de la semana.',
      icon: <Calendar className="w-5 h-5" />,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-amber-600',
      tagColor: 'border-yellow-200'
    },
    {
      number: 4,
      title: 'Finaliza el Pago',
      detail: 'Ingresa tus datos de pago de forma segura para confirmar la reserva de tus paseos.',
      icon: <CreditCard className="w-5 h-5" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      tagColor: 'border-blue-200'
    },
    {
      number: 5,
      title: 'Elige tu Paseador',
      detail: 'Selecciona el Modo Automático o explora los perfiles de los paseadores disponibles en tu radio de 10 km.',
      icon: <Users className="w-5 h-5" />,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      tagColor: 'border-emerald-200'
    }
  ];

  const handleToggle = (stepNumber: number) => {
    setOpenStep(prev => (prev === stepNumber ? null : stepNumber));
  };

  return (
    <AnimatePresence>
      <div
        key="modal-guia-reserva-backdrop"
        id="modal-guia-reserva-backdrop"
        className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          id="modal-guia-reserva-panel"
          initial={{ opacity: 0, scale: 0.95, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 14 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-200 text-slate-900 my-auto"
        >
          {/* Botón de cierre superior con icono 'X' */}
          <button
            type="button"
            id="btn-cerrar-guia-reserva"
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Cerrar guía"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Encabezado: Título y Subtítulo */}
          <div className="mb-5 sm:mb-6 pr-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              Guía de Reserva: Cómo pedir tu paseo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium leading-relaxed">
              Seguí estos 5 simples pasos para programar el mejor paseo para tu perro.
            </p>
          </div>

          {/* Lista interactiva de tarjetas desplegables (Acordeón) */}
          <div className="space-y-2.5 sm:space-y-3 mb-6 max-h-[60vh] overflow-y-auto pr-1">
            {steps.map((step) => {
              const isExpanded = openStep === step.number;

              return (
                <div
                  key={step.number}
                  id={`guia-step-${step.number}`}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isExpanded
                      ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {/* Botón cabecera de la tarjeta para desplegar */}
                  <button
                    type="button"
                    onClick={() => handleToggle(step.number)}
                    className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-3 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icono temático del paso */}
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${step.iconBg} ${step.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
                      >
                        {step.icon}
                      </div>

                      {/* Título y badge numerado */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Paso {step.number}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 truncate">
                          {step.title}
                        </h3>
                      </div>
                    </div>

                    {/* Indicador de apertura (Chevron rotatorio) */}
                    <div
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-transform duration-200 shrink-0 ${
                        isExpanded ? 'rotate-180 text-emerald-600' : ''
                      }`}
                    >
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </button>

                  {/* Detalle desplegable animado */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-3.5 pb-3.5 pt-0 sm:px-4 sm:pb-4">
                          <div className="p-3 rounded-xl bg-white/90 border border-emerald-200/70 text-xs sm:text-sm text-slate-700 leading-relaxed shadow-2xs font-medium">
                            {step.detail}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Botón inferior: Ancho completo, verde WALKIE */}
          <button
            type="button"
            id="btn-entendido-guia-reserva"
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
