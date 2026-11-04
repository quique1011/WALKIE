import React, { useState } from 'react';
import { PlanType, SolicitudPaseo, WeekBooking } from '../types';
import { 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Clock, 
  Check, 
  X,
  XCircle,
  Sparkles,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getOrBuildSolicitudDiasDesglose } from '../utils/planCalculations';

export interface DesgloseDayItem {
  index: number;
  diaNombre: string; // ej: 'Lunes'
  diaCorto: string;  // ej: 'Lun'
  fechaCorta: string;// ej: '21/09'
  fechaCompleta: string; // ej: '2026-09-21'
  horario?: string;
  estado: 'realizado' | 'en_curso' | 'aceptado' | 'rechazado' | 'pendiente';
  paseadorNombre?: string;
  paseadorFoto?: string;
  paseadorTelefono?: string;
}

export interface DesgloseFechasPaseosProps {
  planType: PlanType;
  totalPaseos?: number;
  completedCount: number;
  solicitud?: Partial<SolicitudPaseo> | null;
  defaultExpanded?: boolean;
  className?: string;
  theme?: 'light' | 'dark' | 'emerald';
}

// Fechas y días por defecto de referencia para septiembre 2026
const DEFAULT_DAYS_FOR_PLAN: Record<PlanType, Array<{ dia: string; corto: string; fecha: string; iso: string }>> = {
  'Común': [
    { dia: 'Lunes', corto: 'Lun', fecha: '21/09', iso: '2026-09-21' }
  ],
  'Bronce': [
    { dia: 'Lunes', corto: 'Lun', fecha: '21/09', iso: '2026-09-21' },
    { dia: 'Miércoles', corto: 'Mié', fecha: '23/09', iso: '2026-09-23' },
    { dia: 'Viernes', corto: 'Vie', fecha: '25/09', iso: '2026-09-25' }
  ],
  'Plata': [
    { dia: 'Lunes', corto: 'Lun', fecha: '21/09', iso: '2026-09-21' },
    { dia: 'Martes', corto: 'Mar', fecha: '22/09', iso: '2026-09-22' },
    { dia: 'Miércoles', corto: 'Mié', fecha: '23/09', iso: '2026-09-23' },
    { dia: 'Jueves', corto: 'Jue', fecha: '24/09', iso: '2026-09-24' },
    { dia: 'Viernes', corto: 'Vie', fecha: '25/09', iso: '2026-09-25' }
  ],
  'Oro': [
    { dia: 'Lunes', corto: 'Lun', fecha: '21/09', iso: '2026-09-21' },
    { dia: 'Martes', corto: 'Mar', fecha: '22/09', iso: '2026-09-22' },
    { dia: 'Miércoles', corto: 'Mié', fecha: '23/09', iso: '2026-09-23' },
    { dia: 'Jueves', corto: 'Jue', fecha: '24/09', iso: '2026-09-24' },
    { dia: 'Viernes', corto: 'Vie', fecha: '25/09', iso: '2026-09-25' },
    { dia: 'Sábado', corto: 'Sáb', fecha: '26/09', iso: '2026-09-26' },
    { dia: 'Domingo', corto: 'Dom', fecha: '27/09', iso: '2026-09-27' }
  ]
};

export function buildDesgloseDays(
  planType: PlanType,
  completedCount: number,
  solicitud?: Partial<SolicitudPaseo> | null
): DesgloseDayItem[] {
  const defaults = DEFAULT_DAYS_FOR_PLAN[planType] || DEFAULT_DAYS_FOR_PLAN['Bronce'];
  const items: DesgloseDayItem[] = [];

  const rawDias = solicitud ? getOrBuildSolicitudDiasDesglose(solicitud) : [];

  if (rawDias.length > 0) {
    rawDias.forEach((d, idx) => {
      let estado: 'realizado' | 'en_curso' | 'aceptado' | 'rechazado' | 'pendiente' = 'pendiente';

      if (idx < completedCount || d.estado === 'completado') {
        estado = 'realizado';
      } else if (
        d.estado === 'en_curso' || 
        d.estado === 'en_camino' || 
        (idx === completedCount && (solicitud?.estado === 'en_curso' || solicitud?.estado === 'en_camino'))
      ) {
        estado = 'en_curso';
      } else if (d.estado === 'asignado' || (solicitud?.estado === 'aceptada' && d.estado !== 'cancelado' && d.estado !== 'disponible')) {
        estado = 'aceptado';
      } else {
        // En la vista del cliente: si el paseador rechazó el turno o aún no se asignó ('disponible'),
        // se mantiene en 'pendiente' con reloj de arena para mantener la expectativa
        // sin generar alarmas negativas bruscas en el perfil del cliente.
        estado = 'pendiente';
      }

      // Nombre y datos del paseador específico de este turno (o del asignado global si aplica)
      const paseadorNombre = d.paseadorNombre || (estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorNombre : undefined);
      const paseadorFoto = d.paseadorFoto || (estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorFoto : undefined);
      const paseadorTelefono = d.paseadorTelefono || (estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorTelefono : undefined);

      items.push({
        index: idx,
        diaNombre: d.diaNombre,
        diaCorto: d.diaCorto,
        fechaCorta: d.fechaCorta,
        fechaCompleta: d.fechaStr,
        horario: d.horario,
        estado,
        paseadorNombre,
        paseadorFoto,
        paseadorTelefono
      });
    });
  } else {
    // Usar defaults del plan
    defaults.forEach((def, idx) => {
      let estado: 'realizado' | 'en_curso' | 'aceptado' | 'rechazado' | 'pendiente' = 'pendiente';
      if (idx < completedCount) {
        estado = 'realizado';
      } else if (idx === completedCount && (solicitud?.estado === 'en_curso' || solicitud?.estado === 'en_camino')) {
        estado = 'en_curso';
      } else if (solicitud?.estado === 'aceptada') {
        estado = 'aceptado';
      } else {
        estado = 'pendiente';
      }

      const paseadorNombre = estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorNombre : undefined;
      const paseadorFoto = estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorFoto : undefined;
      const paseadorTelefono = estado === 'aceptado' || estado === 'en_curso' || estado === 'realizado' ? solicitud?.paseadorTelefono : undefined;

      items.push({
        index: idx,
        diaNombre: def.dia,
        diaCorto: def.corto,
        fechaCorta: def.fecha,
        fechaCompleta: def.iso,
        estado,
        paseadorNombre,
        paseadorFoto,
        paseadorTelefono
      });
    });
  }

  return items;
}

export const DesgloseFechasPaseos: React.FC<DesgloseFechasPaseosProps> = ({
  planType,
  totalPaseos,
  completedCount,
  solicitud,
  defaultExpanded = false,
  className = '',
  theme = 'light'
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);

  const daysList = buildDesgloseDays(planType, completedCount, solicitud);
  const total = totalPaseos || daysList.length || 3;
  const safeCompleted = Math.min(completedCount, total);
  const remainingCount = Math.max(0, total - safeCompleted);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Botón de control: Agrandar / Ver desglose de fechas */}
      <div className="flex items-center justify-between gap-2">
        {/* Contador claro de paseos realizados vs restantes */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
          <span className="font-bold text-slate-800">
            {safeCompleted}/{total} completados
          </span>
          <span className="text-slate-400">•</span>
          <span className={remainingCount === 0 ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'}>
            {remainingCount === 0 ? '0 restantes' : `Quedan ${remainingCount}`}
          </span>
        </div>

        {/* Botón Agrandar / Desplegar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none ${
            isExpanded
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs hover:border-slate-300'
          }`}
          title={isExpanded ? 'Ocultar desglose de fechas' : 'Agrandar y ver desglose de fechas'}
        >
          <Calendar className="w-2.5 h-2.5 text-emerald-600" />
          <span>{isExpanded ? 'Ocultar fechas' : 'Ver desglose de fechas'}</span>
          {isExpanded ? (
            <ChevronUp className="w-2.5 h-2.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5" />
          )}
        </button>
      </div>

      {/* Desglose Expandible */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="desglose-cronograma-motion"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-xl p-2 sm:p-2.5 space-y-1.5 shadow-2xs mt-1">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 pb-1 border-b border-slate-200/60">
                <span>Cronograma del Plan</span>
                <span>{daysList.length} paseos programados</span>
              </div>

              <div className="space-y-1">
                {daysList.map((item, idx) => {
                  const isDone = item.estado === 'realizado';
                  const isInProgress = item.estado === 'en_curso';
                  const isAccepted = item.estado === 'aceptado';
                  const isRejected = item.estado === 'rechazado';

                  return (
                    <div
                      key={`cronograma-${item.index}-${idx}`}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 font-medium'
                          : isInProgress
                          ? 'bg-amber-50 text-amber-950 border border-amber-300 font-semibold animate-pulse'
                          : isAccepted
                          ? 'bg-emerald-50/80 text-emerald-950 border border-emerald-300 font-medium shadow-2xs'
                          : isRejected
                          ? 'bg-rose-50/80 text-rose-950 border border-rose-300 font-medium shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200/80 font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          </div>
                        ) : isInProgress ? (
                          <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
                            <Clock className="w-2.5 h-2.5" />
                          </div>
                        ) : isAccepted ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                          </div>
                        ) : isRejected ? (
                          <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <X className="w-2.5 h-2.5 stroke-[2.5]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-100 border border-slate-300 text-slate-500 flex items-center justify-center shrink-0 text-[9px] font-bold">
                            {item.index + 1}
                          </div>
                        )}

                        <span className="text-[11px] font-semibold text-slate-800">
                          {item.diaCorto} {item.fechaCorta}
                        </span>
                        {item.horario && (
                          <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                            • {item.horario}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded-md">
                            ✓ Paseo Finalizado
                          </span>
                        ) : isInProgress ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                            🐾 En curso {item.paseadorNombre ? `• ${item.paseadorNombre}` : ''}
                          </span>
                        ) : isAccepted ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md shadow-2xs">
                            <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                            <span>Aceptado{item.paseadorNombre ? ` por ${item.paseadorNombre}` : ''}</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-md shadow-2xs">
                            <X className="w-3 h-3 text-rose-600 stroke-[2.5]" />
                            <span>Rechazado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            ⏳ Pendiente
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
