import React, { useState } from 'react';
import { ChevronDown, Heart, ShieldCheck, Camera, MapPin, Sparkles, Award, ArrowLeft, X } from 'lucide-react';
import { FAQ_ITEMS, TEXTO_TERMINOS_CLIENTE, TEXTO_TERMINOS_PASEADOR } from '../data/initialData';
import { formatPesos } from '../utils/geo';
import { motion, AnimatePresence } from 'motion/react';

interface NosotrosFaqSectionProps {
  solidarityAmount?: number;
  onOpenSolidarityTab?: () => void;
  onClose?: () => void;
  returnButtonLabel?: string;
}

export const NosotrosFaqSection: React.FC<NosotrosFaqSectionProps> = ({
  solidarityAmount = 240000,
  onOpenSolidarityTab,
  onClose,
  returnButtonLabel
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [showTermsModal, setShowTermsModal] = useState<'cliente' | 'paseador' | null>(null);

  const goalAmount = 1000000;
  const progressPercent = Math.min(100, Math.round((solidarityAmount / goalAmount) * 100));

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div id="section-nosotros-faq" className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-8 relative">
      {/* Botón de retorno claro y barra superior para navegación dentro del Panel */}
      {onClose && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-14 sm:top-16 z-20">
          <button
            type="button"
            id="btn-volver-panel-nosotros"
            onClick={onClose}
            className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-2xs group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600 group-hover:-translate-x-1 transition-transform" />
            <span>{returnButtonLabel || '← Volver al Panel'}</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenSolidarityTab && (
              <button
                type="button"
                id="btn-switch-metas-from-nosotros"
                onClick={onOpenSolidarityTab}
                className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl border border-rose-200/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>Ver Meta Solidaria</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer border border-slate-200/80"
              title="Cerrar y volver al panel"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Compromiso & Seguridad Walkie
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Nosotros y Preguntas Frecuentes
        </h1>
        <p className="text-slate-600 text-sm sm:text-base mt-2">
          Conocé cómo cuidamos a tu mascota en cada rincón serrano y resolvemos tus dudas.
        </p>
      </div>

      {/* BLOQUE A: NOSOTROS Y NUESTRA MISIÓN */}
      <section id="bloque-mision" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              Nuestra Misión
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Revolucionando el paseo canino con tecnología y empatía
            </h2>
            <p className="text-slate-700 text-base leading-relaxed">
              En <span className="font-bold text-emerald-700">Walkie</span> transformamos la forma en que las mascotas conectan con sus paseadores. Nacimos para brindar confianza, seguridad en tiempo real y tranquilidad a cada hogar, garantizando paseos activos, monitoreados por GPS y con reportes fotográficos en cada recorrido.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <div className="text-xl font-black text-slate-900">45 min</div>
                <div className="text-[11px] font-semibold text-slate-500">Paseo activo fijo</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <div className="text-xl font-black text-emerald-600">100%</div>
                <div className="text-[11px] font-semibold text-slate-500">Monitoreo GPS</div>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                <div className="text-xl font-black text-amber-600">4 Dígitos</div>
                <div className="text-[11px] font-semibold text-slate-500">PIN de entrega</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 flex justify-center">
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80"
                alt="Perro feliz en paseo"
                className="w-full max-w-sm rounded-3xl shadow-lg object-cover h-64 border-4 border-white"
              />
              <div className="absolute -bottom-3 -left-3 bg-white px-4 py-2 rounded-2xl shadow-md border border-slate-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Fotos en vivo en cada paseo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOQUE B: META SOLIDARIA */}
      <section id="bloque-meta-solidaria-preview" className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                <Heart className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                Causa Social & Rescate
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                Nuestra Meta Solidaria 🐾
              </h2>
            </div>
            {onOpenSolidarityTab && (
              <button
                id="btn-ver-detalle-solidario"
                onClick={onOpenSolidarityTab}
                className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 backdrop-blur transition-all cursor-pointer"
              >
                Ver Detalle Completo & Donaciones →
              </button>
            )}
          </div>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            Destinamos un porcentaje de cada paseo a colaborar con refugios locales, alimento balanceado y atención médica para perros rescatados de la calle. ¡Caminamos juntos por una causa más grande!
          </p>

          {/* Progress Bar */}
          <div className="space-y-2.5 bg-white/5 p-5 rounded-2xl border border-white/10">
            <div className="flex justify-between items-end text-sm">
              <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                <Award className="w-4 h-4" />
                Recaudado actualmente:
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-white">{formatPesos(solidarityAmount)}</span>
                <span className="text-slate-400 font-medium text-xs ml-1.5">/ {formatPesos(goalAmount)}</span>
              </div>
            </div>

            <div className="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full shadow-inner"
              />
            </div>

            <div className="flex justify-between text-xs text-slate-400 pt-1">
              <span>$0</span>
              <span className="font-bold text-emerald-400">{progressPercent}% alcanzado</span>
              <span>Objetivo: 1 Millón de Pesos</span>
            </div>
          </div>
        </div>
      </section>

      {/* BLOQUE C: PREGUNTAS FRECUENTES (FAQ) */}
      <section id="bloque-faq" className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-slate-600 text-xs sm:text-sm mt-1">
            Todo lo que necesitás saber antes de reservar o sumarte a nuestro equipo.
          </p>
        </div>

        <div className="space-y-3 max-w-3xl mx-auto">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                id={`faq-item-${index}`}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <span className="text-base sm:text-lg flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                      {index + 1}
                    </span>
                    {item.pregunta}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`faq-ans-${index}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="px-5 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100 bg-slate-50/50">
                        {item.respuesta}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Legal terms quick view buttons */}
        <div className="flex flex-wrap justify-center gap-3 pt-6 text-xs text-slate-500">
          <button
            id="btn-ver-terminos-cliente"
            onClick={() => setShowTermsModal('cliente')}
            className="hover:text-emerald-700 underline font-medium cursor-pointer"
          >
            Términos y Condiciones para Contratantes (Dueños)
          </button>
          <span>•</span>
          <button
            id="btn-ver-terminos-paseador"
            onClick={() => setShowTermsModal('paseador')}
            className="hover:text-emerald-700 underline font-medium cursor-pointer"
          >
            Términos y Condiciones para Trabajadores (Paseadores)
          </button>
        </div>
      </section>

      {/* Modal de Términos Legales de consulta */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {showTermsModal === 'cliente' ? 'Términos para Contratantes (Dueños)' : 'Términos para Trabajadores (Paseadores)'}
            </h3>
            <div className="max-h-72 overflow-y-auto p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed space-y-2 mb-4">
              <p>{showTermsModal === 'cliente' ? TEXTO_TERMINOS_CLIENTE : TEXTO_TERMINOS_PASEADOR}</p>
            </div>
            <button
              onClick={() => setShowTermsModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
