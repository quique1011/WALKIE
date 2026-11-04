import React from 'react';
import { PlanType } from '../types';
import { PLANES_PASEO } from '../data/initialData';
import { formatPesos } from '../utils/geo';
import { Check, Sparkles, Camera, MapPin, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface PlanSelectionCardsProps {
  selectedPlan: PlanType | null;
  onSelectPlan: (plan: PlanType) => void;
  weeksCount?: number;
  onSelectWeeks?: (w: number) => void;
}

export const PlanSelectionCards: React.FC<PlanSelectionCardsProps> = ({
  selectedPlan,
  onSelectPlan
}) => {
  return (
    <section id="section-planes-tarifas" className="space-y-4">
      {/* Global Inclusions Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" /> Beneficios Incluidos
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white">
              Cada paseo en Walkie cuenta con cobertura completa
            </h4>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>45 Minutos Activos</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Monitoreo GPS en Vivo</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700/80">
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Fotos del Recorrido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 4 tarjetas siempre fijas en fila horizontal (1x4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {PLANES_PASEO.map((plan) => {
          const isSelected = selectedPlan === plan.tipo;
          const isPopular = plan.destacado === 'popular';
          const isValue = plan.destacado === 'valor';

          return (
            <motion.div
              key={plan.tipo}
              whileHover={{ y: -2 }}
              onClick={() => onSelectPlan(plan.tipo)}
              id={`card-plan-${plan.tipo.toLowerCase()}`}
              className={`relative rounded-2xl p-4 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between border-2 ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50/30 shadow-lg ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              {/* Badges superiores */}
              {isPopular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                  ★ MÁS POPULAR
                </div>
              )}

              {isValue && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-linear-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-xs">
                  👑 MEJOR VALOR
                </div>
              )}

              <div>
                {/* Header */}
                <div className="flex justify-between items-start pt-0.5">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {plan.subtitulo}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                      {plan.nombre}
                    </h3>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </div>
                </div>

                {/* Price block */}
                <div className="mt-3 pb-3 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">
                      {formatPesos(plan.precio)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/sem</span>
                  </div>
                  <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                    {plan.frecuencia}
                  </div>
                  <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                    {formatPesos(plan.precioUnitario)} cada paseo
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                  {plan.descripcion}
                </p>

                {/* Benefits List */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {plan.beneficios.map((ben, i) => (
                    <div key={`ben-${plan.tipo}-${i}`} className="flex items-start gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2 h-2 stroke-[3]" />
                      </div>
                      <span className="leading-snug">{ben}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPlan(plan.tipo);
                  }}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {isSelected ? '✓ Seleccionado' : 'Seleccionar Plan'}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
