import React, { useState } from 'react';
import { Heart, Award, Shield, Sparkles, PlusCircle, CheckCircle2, Home, Utensils, Stethoscope, Instagram, ExternalLink, BriefcaseMedical, ArrowLeft, X } from 'lucide-react';
import { formatPesos } from '../utils/geo';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { RescueStoryCard } from './RescueStoryCard';
import { FoodDonationSelector } from './FoodDonationSelector';

interface MetaSolidariaSectionProps {
  solidarityAmount: number;
  onContribute?: (amount: number) => void;
  onClose?: () => void;
  onOpenNosotrosTab?: () => void;
  returnButtonLabel?: string;
}

export const MetaSolidariaSection: React.FC<MetaSolidariaSectionProps> = ({
  solidarityAmount,
  onContribute,
  onClose,
  onOpenNosotrosTab,
  returnButtonLabel
}) => {
  const [lastDonation, setLastDonation] = useState<{ amount: number; title: string } | null>(null);
  const goalAmount = 1000000;
  const progressPercent = Math.min(100, Math.round((solidarityAmount / goalAmount) * 100));

  const handleSimulateDonation = (amount: number, title: string) => {
    if (onContribute) {
      onContribute(amount);
      setLastDonation({ amount, title });
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => setLastDonation(null), 4500);
    }
  };

  const refugios = [
    {
      nombre: 'Alma Animal Punilla',
      instagramHandle: '@almaanimal.punilla',
      instagramUrl: 'https://www.instagram.com/almaanimal.punilla/',
      zona: 'Valle Hermoso / Valle de Punilla',
      perrosRescatados: 38,
      necesidad: 'Rescate, atención veterinaria y rehabilitación de animales en situación de calle.'
    },
    {
      nombre: 'Fundación Garra',
      instagramHandle: '@fundaciongarra',
      instagramUrl: 'https://www.instagram.com/fundaciongarra/',
      zona: 'Villa Carlos Paz & Sierras',
      perrosRescatados: 45,
      necesidad: 'Castraciones masivas, campañas sanitarias y adopciones responsables en las Sierras.'
    },
    {
      nombre: 'Patitas de Perros',
      instagramHandle: '@patittasdeperrosoficial',
      instagramUrl: 'https://www.instagram.com/patittasdeperrosoficial/',
      zona: 'Valle de Punilla / Córdoba',
      perrosRescatados: 32,
      necesidad: 'Hogar de tránsito, cirugías de rescate y alimentación comunitaria permanente.'
    }
  ];

  return (
    <div id="section-meta-solidaria" className="max-w-5xl mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-8 relative">
      {/* Botón de retorno claro y barra superior para navegación dentro del Panel */}
      {onClose && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3 sticky top-14 sm:top-16 z-20">
          <button
            type="button"
            id="btn-volver-panel-metas"
            onClick={onClose}
            className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 hover:border-rose-300 transition-all cursor-pointer shadow-2xs group active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-rose-600 group-hover:-translate-x-1 transition-transform" />
            <span>{returnButtonLabel || '← Volver al Panel'}</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenNosotrosTab && (
              <button
                type="button"
                id="btn-switch-nosotros-from-metas"
                onClick={onOpenNosotrosTab}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl border border-emerald-200/80 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <span>Ver Nosotros & FAQ</span>
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

      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <Heart className="w-4 h-4 fill-emerald-400 text-emerald-400 animate-pulse" />
            Impacto Social Permanente
          </div>

          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Nuestra Meta Solidaria 🐾
            </h1>
            <p className="text-slate-200 text-base sm:text-lg leading-relaxed">
              Destinamos un porcentaje de cada paseo a colaborar con refugios locales, alimento balanceado y atención médica para perros rescatados de la calle. ¡Caminamos juntos por una causa más grande!
            </p>
          </div>

          {/* Big Progress Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/15 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-2">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">Fondo Solidario Acumulado</span>
                <div className="text-3xl sm:text-4xl font-black text-white mt-0.5">
                  {formatPesos(solidarityAmount)}
                  <span className="text-sm sm:text-base font-normal text-slate-300 ml-2">
                    de {formatPesos(goalAmount)} Meta Oficial
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="inline-block px-3 py-1 bg-emerald-400/20 border border-emerald-400/40 rounded-full text-emerald-300 text-sm font-black">
                  {progressPercent}% Completado
                </span>
              </div>
            </div>

            <div className="w-full h-5 bg-slate-900/60 rounded-full overflow-hidden p-1 border border-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 rounded-full shadow-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-400" />
                <span>+850 kg de Alimento Donado</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-400" />
                <span>65 Atenciones Veterinarias</span>
              </div>
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-amber-400" />
                <span>3 Refugios Serranos Aliados</span>
              </div>
            </div>
          </div>

          {/* Link / CTA to donation cards */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Conocé los casos de animales necesitados y el selector de bolsas de alimento mayorista</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="#seccion-casos-necesitados"
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1 transition-all"
              >
                <span>Casos Necesitados</span>
                <span className="text-xs">↓</span>
              </a>
              <a
                href="#selector-donacion-alimento"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1 shadow transition-all cursor-pointer"
              >
                <span>Donar Alimento</span>
                <span className="text-xs">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Global Recent Donation Feedback Banner */}
      {lastDonation && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              ¡Muchas gracias! Se procesó tu aporte de <strong>{formatPesos(lastDonation.amount)}</strong> para <strong>{lastDonation.title}</strong>.
            </span>
          </div>
        </motion.div>
      )}

      {/* Módulo 1: Historia de Rescate con Barra de Meta y Transparencia (Suma única y exclusivamente a la meta del animal) */}
      <RescueStoryCard
        onEmergencyContribution={({ caseItem, amount }) => {
          setLastDonation({
            amount,
            title: `Caso de Rescate de ${caseItem.name} (Meta individual actualizada)`
          });
          confetti({
            particleCount: 85,
            spread: 70,
            origin: { y: 0.6 }
          });
          setTimeout(() => setLastDonation(null), 4500);
        }}
      />

      {/* Módulo 2: Selector de Donación de Alimento (Kilos + Precio + Botón de Pago - Suma exclusivamente a la meta de alimentos) */}
      <FoodDonationSelector onContribute={(amt, note) => handleSimulateDonation(amt, note)} />

      {/* Refugios Beneficiados */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Refugios y Hogares Beneficiados</h2>
            <p className="text-slate-600 text-sm">Tu paseo diario financia el cuidado de estos espacios protegidos.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
            <Shield className="w-4 h-4" /> 100% Auditado
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
          {refugios.map((ref, idx) => (
            <a
              key={`refugio-${ref.nombre}-${idx}`}
              id={`card-refugio-instagram-${idx}`}
              href={ref.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-emerald-400 hover:shadow-xs transition-all duration-200 flex flex-col items-center justify-between text-center group cursor-pointer relative shadow-2xs"
              title={`Abrir perfil de Instagram de ${ref.nombre}`}
            >
              <div className="flex flex-col items-center w-full">
                {/* Ícono de Instagram centrado en la parte superior */}
                <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 border border-slate-200/80 group-hover:border-emerald-200 flex items-center justify-center mb-3.5 transition-colors shadow-2xs">
                  <Instagram className="w-5 h-5 stroke-[1.8]" />
                </div>

                {/* Nombre de la Organización */}
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 group-hover:text-emerald-950 transition-colors">
                  {ref.nombre}
                </h3>

                {/* Usuario de Instagram con @ en tono verde/gris sutil */}
                <span className="text-xs sm:text-sm font-medium text-emerald-700/90 group-hover:text-emerald-700 mt-1 transition-colors">
                  {ref.instagramHandle}
                </span>

                {/* Breve descripción y zona */}
                <p className="text-xs text-slate-500 font-normal mt-2.5 leading-relaxed">
                  {ref.necesidad}
                </p>
              </div>

              {/* Pie de tarjeta con enlace directo */}
              <div className="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-emerald-700 transition-colors">
                <span>Ver en Instagram</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Transparencia Box */}
      <div className="bg-slate-100 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed flex items-start gap-3 border border-slate-200">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold text-slate-900">Transparencia Walkie:</strong> Por cada paseo realizado en cualquiera de los planes (Común, Bronce, Plata u Oro), se destina automáticamente un fondo solidario para la compra de alimento y atención veterinaria con comprobantes públicos en nuestras redes.
        </div>
      </div>
    </div>
  );
};
