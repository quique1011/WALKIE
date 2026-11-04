import React from 'react';
import { Droplets, Sparkles, ShieldCheck, Heart, Dog, CheckCircle2 } from 'lucide-react';

interface GarantiaCuidadoCardProps {
  variant?: 'default' | 'compact' | 'modal';
  className?: string;
  dogName?: string;
}

export const GarantiaCuidadoCard: React.FC<GarantiaCuidadoCardProps> = ({
  variant = 'default',
  className = '',
  dogName
}) => {
  if (variant === 'modal' || variant === 'compact') {
    return (
      <div
        id="tarjeta-garantia-cuidado-walkie-compact"
        className={`bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-blue-50/80 rounded-2xl p-3 border border-emerald-200/90 shadow-2xs space-y-2 ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Garantía de Cuidado Walkie • Equipamiento Incluido</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
            Estándar 100% Certificado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          {/* 💧 Agua e Hidratación */}
          <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100/90 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-[11px]">
              <Droplets className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Agua e Hidratación</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Botella de agua fresca e hidratador portátil durante toda la caminata de {dogName || 'tu mascota'}.
            </p>
          </div>

          {/* 🧹 Higiene y Limpieza */}
          <div className="bg-white/90 p-2.5 rounded-xl border border-teal-100/90 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-teal-900 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Higiene y Limpieza</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Bolsas higiénicas para recolección de heces y cuidado responsable de la vía pública.
            </p>
          </div>

          {/* 🦮 Seguridad en el Paseo */}
          <div className="bg-white/90 p-2.5 rounded-xl border border-blue-100/90 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Seguridad Integral</span>
            </div>
            <p className="text-[10px] text-slate-600 leading-tight">
              Paseo controlado individual o máx 2 perros, ajustado al ritmo y cuidados de {dogName || 'tu mascota'}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id="tarjeta-garantia-cuidado-walkie"
      className={`bg-gradient-to-r from-emerald-50/95 via-teal-50/60 to-blue-50/80 rounded-2xl p-4 sm:p-5 border border-emerald-200/90 shadow-2xs space-y-3.5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
              Garantía de Cuidado Walkie • Equipamiento Incluido
            </h4>
            <p className="text-[11px] text-emerald-800">
              Todos los paseadores certificados operan bajo el protocolo de bienestar animal de Punilla.
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Incluido en todos los planes
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Agua fresca e hidratación */}
        <div className="bg-white/90 p-3.5 rounded-xl border border-emerald-100 shadow-2xs space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs mb-1">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Droplets className="w-3.5 h-3.5" />
              </div>
              <span>Agua fresca e hidratación</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              El paseador cuenta siempre con una <strong>botella de agua e hidratador</strong> para tu mascota durante toda la caminata recreativa.
            </p>
          </div>
          <div className="pt-1.5 border-t border-slate-100 text-[10px] text-blue-700 font-medium">
            💧 Hidratación continua garantizada
          </div>
        </div>

        {/* 2. Higiene y limpieza */}
        <div className="bg-white/90 p-3.5 rounded-xl border border-teal-100 shadow-2xs space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-950 font-bold text-xs mb-1">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span>Higiene y limpieza</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Incluye <strong>bolsas para la recolección de heces</strong> y mantención limpia y responsable de la vía pública en cada parada.
            </p>
          </div>
          <div className="pt-1.5 border-t border-slate-100 text-[10px] text-teal-700 font-medium">
            🧹 Paseo limpio y ecológico
          </div>
        </div>

        {/* 3. Seguridad en el paseo */}
        <div className="bg-white/90 p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-950 font-bold text-xs mb-1">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Dog className="w-3.5 h-3.5" />
              </div>
              <span>Seguridad en el paseo</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              <strong>Identificación y paseo seguro</strong> ajustado a las necesidades de tu perro, con límite estricto de máx. 2 mascotas por turno.
            </p>
          </div>
          <div className="pt-1.5 border-t border-slate-100 text-[10px] text-emerald-700 font-medium">
            🦮 Radar GPS y atención dedicada
          </div>
        </div>
      </div>
    </div>
  );
};
