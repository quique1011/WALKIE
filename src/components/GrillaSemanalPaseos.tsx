import React, { useState, useEffect, useMemo } from 'react';
import { SolicitudPaseo } from '../types';
import { formatPesos, formatWhatsAppLink, getCleanVeterinariaInfo } from '../utils/geo';
import { 
  getSolicitudPricingDetails, 
  checkPickupWindow, 
  getAllSolicitudDates,
  getOrBuildSolicitudDiasDesglose
} from '../utils/planCalculations';
import { getDogSubscription } from '../utils/dogSubscriptions';
import { DesgloseFechasPaseos } from './DesgloseFechasPaseos';
import { 
  Calendar, Clock, MapPin, User, Phone, Play, Check, 
  CheckCircle2, Navigation, Lock, FastForward, AlertCircle, 
  Dog, ChevronDown, ChevronUp, Eye, Sparkles, Activity, Key,
  AlertTriangle, HeartPulse, ShieldAlert,
  CheckSquare, ShoppingBag, Droplets, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface GrillaSemanalPaseosProps {
  solicitudes: SolicitudPaseo[];
  user?: any;
  currentPaseadorId?: string;
  onUpdateSolicitud: (updated: SolicitudPaseo) => void;
  activeTimers: Record<string, number>;
  onStartTransit: (sol: SolicitudPaseo) => void;
  onDirectStartWalk?: (sol: SolicitudPaseo) => void;
  onArriveAtDoor: (sol: SolicitudPaseo) => void;
  onValidatePin1: (sol: SolicitudPaseo) => void;
  onArriveAtReturnDoor: (sol: SolicitudPaseo) => void;
  onOpenModalPin2: (sol: SolicitudPaseo) => void;
  onFastForwardTimer: (sol: SolicitudPaseo) => void;
  pin1Inputs: Record<string, string>;
  onPin1InputChange: (solId: string, val: string) => void;
  codeError: string | null;
  onOpenEmergencyModal?: (sol: SolicitudPaseo) => void;
}

export interface DayScheduleInfo {
  dateKey: string;           // '2026-09-28'
  dayName: string;          // 'Lunes'
  shortName: string;        // 'Lun'
  dayNumber: number;        // 28
  formattedDate: string;    // '28/09'
  isToday: boolean;
  isPast: boolean;
  paseos: SolicitudPaseo[];
  paseosCompletados: SolicitudPaseo[];
}

export const GrillaSemanalPaseos: React.FC<GrillaSemanalPaseosProps> = ({
  solicitudes,
  user,
  currentPaseadorId,
  onUpdateSolicitud,
  activeTimers,
  onStartTransit,
  onDirectStartWalk,
  onArriveAtDoor,
  onValidatePin1,
  onArriveAtReturnDoor,
  onOpenModalPin2,
  onFastForwardTimer,
  pin1Inputs,
  onPin1InputChange,
  codeError,
  onOpenEmergencyModal
}) => {
  // Estado para acordeón desplegable (abierto por defecto para visualización clara)
  const [isGridOpen, setIsGridOpen] = useState<boolean>(true);
  // Estado de navegación entre semanas (0 = semana actual, -1 = semana anterior, +1 = semana siguiente)
  const [weekOffset, setWeekOffset] = useState<number>(0);
  // Estado para desplegar el historial de paseos finalizados
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  // Estado para forzar actualización al cambiar de semana o pasar de día
  const [currentDateTick, setCurrentDateTick] = useState<Date>(() => new Date());
  // Estado para expandir detalles de un paseo en particular
  const [expandedWalkId, setExpandedWalkId] = useState<string | null>(null);

  // Checklist de elementos esenciales para iniciar paseo (Bolsas, Agua, Correa) por ID de solicitud
  // Todos los elementos inician DESSELECCIONADOS por defecto (checked = false)
  const [checklistBySolId, setChecklistBySolId] = useState<Record<string, { bolsas: boolean; agua: boolean; correa: boolean }>>({});
  // Alerta de tooltip cuando se intenta presionar el botón sin completar los elementos
  const [checklistAlertSolId, setChecklistAlertSolId] = useState<string | null>(null);

  const toggleChecklistItem = (solId: string, itemKey: 'bolsas' | 'agua' | 'correa') => {
    setChecklistBySolId(prev => {
      const current = prev[solId] || { bolsas: false, agua: false, correa: false };
      return {
        ...prev,
        [solId]: {
          ...current,
          [itemKey]: !current[itemKey]
        }
      };
    });
    setChecklistAlertSolId(null);
  };

  const activeWalkerId = currentPaseadorId || user?.id;

  // Auto-refresh timer: Chequea periódicamente para sincronizar la fecha real y semana actual
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTick(new Date());
    }, 60000); // cada 1 minuto
    return () => clearInterval(timer);
  }, []);

  // Formato de fecha 'YYYY-MM-DD'
  const formatDateKey = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Cálculo de la semana en curso dinámica (Lunes 00:00 hs a Domingo 23:59 hs con offset de navegación)
  const { weekDays, weekRangeLabel, totalSemanaPaseos } = useMemo(() => {
    const now = new Date(currentDateTick);
    // getDay(): 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const dayOfWeek = (now.getDay() + 6) % 7; // 0 = Lunes, 6 = Domingo
    
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);

    const todayDateKey = formatDateKey(now);

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const shortNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    const days: DayScheduleInfo[] = [];
    let countTotal = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);

      const dateKey = formatDateKey(dayDate);
      const dayNum = dayDate.getDate();
      const monthNum = String(dayDate.getMonth() + 1).padStart(2, '0');
      const formattedDate = `${String(dayNum).padStart(2, '0')}/${monthNum}`;
      const isToday = dateKey === todayDateKey;
      const isPast = dateKey < todayDateKey;
      const isFuture = dateKey > todayDateKey;
      const dayName = dayNames[i];

      // Filtrar paseos asignados que correspondan a este día específico con AISLAMIENTO POR FECHA
      const paseosDelDia: SolicitudPaseo[] = [];
      const paseosCompletadosDelDia: SolicitudPaseo[] = [];

      solicitudes.forEach((sol) => {
        if (sol.estado === 'cancelada' || sol.estado === 'rechazada' || sol.estado === 'sin_solicitud') return;

        // Si se especificó el ID del paseador actual, excluir solicitudes asignadas a otro paseador distinto
        if (activeWalkerId && sol.paseadorId && sol.paseadorId !== activeWalkerId && sol.paseador_id && sol.paseador_id !== activeWalkerId) {
          return;
        }

        const dias = getOrBuildSolicitudDiasDesglose(sol);
        const diaItem = dias.find(d => d.fechaStr === dateKey || d.diaNombre === dayName);

        const isDateBelonging = Boolean(
          diaItem ||
          getAllSolicitudDates(sol).includes(dateKey) ||
          sol.fechaProgramada === dateKey ||
          (sol.diasSeleccionados && sol.diasSeleccionados.includes(dayName)) ||
          (isToday && (
            sol.estado === 'en_curso' || 
            sol.estado === 'en_camino' || 
            sol.estado === 'en_emergencia' || 
            (sol.estado === 'aceptada' && (!sol.fechaProgramada || sol.fechaProgramada <= dateKey))
          ))
        );

        if (!isDateBelonging) return;

        // Verificar si este día individual ya fue cancelado o aún no ha sido tomado (disponible)
        if (diaItem) {
          if (diaItem.estado === 'cancelado' || diaItem.estado === 'disponible') return;
        } else if (sol.estado === 'pendiente') {
          return;
        }

        // Verificar si este día individual ya fue completado
        const isDayCompleted = diaItem?.estado === 'completado' || (sol.estado === 'completada' && !isFuture);

        // Objeto de paseo aislado para esta fecha específica
        const individualWalk: SolicitudPaseo = {
          ...sol,
          id: sol.id,
          fechaProgramada: dateKey,
          horarioPaseo: diaItem?.horario || sol.horarioPaseo,
          montoNetoPaseador: diaItem?.montoNeto || sol.montoNetoPaseador,
          // AISLAMIENTO DE ESTADO ESTRICTO:
          // 1. Fechas futuras (> HOY): SIEMPRE permanecen en 'aceptada' (NUNCA 'completada', 'en_camino' o 'en_curso')
          // 2. Fecha de Hoy: refleja el estado de la acción en curso si no fue completada en esta fecha
          // 3. Paseo completado en esta fecha: se marca como completada
          estado: isDayCompleted
            ? 'completada'
            : isFuture
            ? 'aceptada'
            : (sol.estado === 'en_emergencia' ? 'en_emergencia' : sol.estado === 'en_curso' ? 'en_curso' : sol.estado === 'en_camino' ? 'en_camino' : 'aceptada'),
          etapaSeguimiento: isFuture ? 'esperando' : sol.etapaSeguimiento,
          enEmergencia: isFuture ? false : sol.enEmergencia,
          temporizadorFinalizado: isFuture ? false : isDayCompleted ? true : sol.temporizadorFinalizado
        };

        if (isDayCompleted) {
          paseosCompletadosDelDia.push(individualWalk);
        } else {
          paseosDelDia.push(individualWalk);
        }
      });

      countTotal += paseosDelDia.length;

      days.push({
        dateKey,
        dayName,
        shortName: shortNames[i],
        dayNumber: dayNum,
        formattedDate,
        isToday,
        isPast,
        paseos: paseosDelDia,
        paseosCompletados: paseosCompletadosDelDia
      });
    }

    const firstDay = days[0];
    const lastDay = days[6];
    const rangeLabel = `${firstDay.shortName} ${firstDay.formattedDate} al ${lastDay.shortName} ${lastDay.formattedDate}`;

    return {
      weekDays: days,
      weekRangeLabel: rangeLabel,
      totalSemanaPaseos: countTotal
    };
  }, [solicitudes, currentDateTick, weekOffset, activeWalkerId]);

  // Todos los paseos completados para el historial colapsable
  const allPaseosCompletados = useMemo(() => {
    const list: SolicitudPaseo[] = [];
    solicitudes.forEach(s => {
      const dias = getOrBuildSolicitudDiasDesglose(s);
      const completedDays = dias.filter(d => d.estado === 'completado');
      if (completedDays.length > 0) {
        completedDays.forEach(cd => {
          list.push({
            ...s,
            id: `${s.id}_${cd.fechaStr || cd.id}`,
            fechaProgramada: cd.fechaStr || s.fechaProgramada,
            horarioPaseo: cd.horario || s.horarioPaseo,
            montoNetoPaseador: cd.montoNeto || s.montoNetoPaseador,
            estado: 'completada'
          });
        });
      } else if (s.estado === 'completada') {
        list.push(s);
      }
    });
    return list;
  }, [solicitudes]);

  // Formato para temporizador activo (mm:ss)
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Paseos activos de hoy que requieren interacción inmediata del paseador
  const paseosHoyActivos = useMemo(() => {
    const today = weekDays.find(d => d.isToday);
    if (!today) return [];
    return today.paseos.filter(s => s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'aceptada');
  }, [weekDays]);

  return (
    <div id="seccion-grilla-semanal-paseos" className="space-y-2.5">
      {/* 📅 BARRA: AGENDA SEMANAL CON CONTROLES DE NAVEGACIÓN */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs transition-all hover:border-emerald-300 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Agenda Semanal de Paseos
                </h3>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {totalSemanaPaseos} {totalSemanaPaseos === 1 ? 'paseo asignado' : 'paseos asignados'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rango: <strong className="text-slate-800">{weekRangeLabel}</strong>
              </p>
            </div>
          </div>

          {/* Botones de Navegación entre Semanas */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                id="btn-agenda-semana-anterior"
                onClick={() => setWeekOffset(prev => prev - 1)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                title="Ver semana anterior"
              >
                <span>← Anterior</span>
              </button>

              {weekOffset !== 0 ? (
                <button
                  type="button"
                  id="btn-agenda-semana-actual"
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Volver a la semana en curso"
                >
                  <span>Semana Actual</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 text-emerald-800 font-bold text-xs">
                  Semana Actual
                </span>
              )}

              <button
                type="button"
                id="btn-agenda-semana-siguiente"
                onClick={() => setWeekOffset(prev => prev + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
                title="Ver semana siguiente"
              >
                <span>Siguiente →</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-toggle-grilla-semanal"
              onClick={() => setIsGridOpen(!isGridOpen)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98 select-none whitespace-nowrap ${
                isGridOpen
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              <span>{isGridOpen ? 'Ocultar calendario ▲' : 'Ver calendario completo ▼'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO DESPLEGABLE CON ANIMACIÓN */}
      <AnimatePresence>
        {isGridOpen && (
          <motion.div
            key="grilla-semanal-motion-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden space-y-4 pt-1"
          >
            {/* CONTROLADOR DE ACCIÓN EN VIVO PARA PASEO ACTIVO DE HOY (SI APLICA) */}
            {paseosHoyActivos.length > 0 && (
              <div className="space-y-3">
                {paseosHoyActivos.map((sol, solIdx) => {
                  const pricing = getSolicitudPricingDetails(sol);
                  const isExpanded = expandedWalkId === sol.id;

                  return (
                    <div 
                      key={`live-ctrl-${sol.id}-${solIdx}`}
                      className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-emerald-400 shadow-sm space-y-3 relative overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={sol.perro.photoUrl}
                            alt={sol.perro.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-500 shadow-2xs shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                <Activity className="w-2.5 h-2.5" /> En Vivo Hoy
                              </span>
                              <h4 className="text-base font-black text-slate-900">{sol.perro.name}</h4>
                              <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                                {pricing.labelPlanPaseos}
                              </span>
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                {sol.horarioPaseo || (sol.turno === 'mañana' ? '09:00 hs' : '17:00 hs')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                              <span>Dueño: <strong>{sol.clienteNombre}</strong></span>
                              {sol.clienteTelefono && (
                                <button
                                  type="button"
                                  onClick={() => window.open(formatWhatsAppLink(sol.clienteTelefono, `Hola ${sol.clienteNombre}, te contacto por el paseo de ${sol.perro.name}.`), '_blank')}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{sol.clienteTelefono} (WhatsApp)</span>
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 font-medium mt-0.5">
                              📍 Retiro: {sol.ubicacion.direccion}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="bg-slate-900 text-white px-3 py-1.5 rounded-xl text-right shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">COBRO POR PASEO</span>
                            <span className="text-base font-black text-emerald-400 font-mono">
                              {formatPesos(pricing.netoPorPaseo)}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setExpandedWalkId(isExpanded ? null : sol.id)}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center gap-1 cursor-pointer transition-all"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            <span className="hidden sm:inline">{isExpanded ? 'Menos' : 'Fechas'}</span>
                          </button>
                        </div>
                      </div>

                      {/* DESGLOSE DESPLEGABLE DE FECHAS */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            key={`grilla-desglose-${sol.id}`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                              <DesgloseFechasPaseos
                                planType={pricing.tipoPlan}
                                totalPaseos={pricing.totalPaseos}
                                completedCount={(() => {
                                  const sub = getDogSubscription(sol.perro.id, sol.perro, [sol]);
                                  return sub.completedWalks || (sol.estado === 'completada' ? pricing.totalPaseos : 0);
                                })()}
                                solicitud={sol}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* NOTIFICACIÓN DE CANCELACIÓN SI CORRESPONDE */}
                      {sol.notificacionesCancelacion && sol.notificacionesCancelacion.length > 0 && (
                        <div className="space-y-2">
                          {sol.notificacionesCancelacion.map((notif, notifIdx) => (
                            <div key={`grilla-canc-notif-${notif.id || 'notif'}-${notifIdx}`} className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-950 space-y-1.5 shadow-2xs">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-black text-rose-700 text-xs">
                                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                  <span>PASEO CANCELADO POR EL CLIENTE</span>
                                </div>
                                <span className="text-[10px] text-rose-500 font-mono">
                                  {notif.canceladoEn ? new Date(notif.canceladoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-rose-900">
                                {sol.clienteNombre} canceló el turno de <strong>{sol.perro.name}</strong> ({notif.diaNombre}).
                              </p>
                              {notif.compensacion > 0 ? (
                                <div className="p-2 rounded-lg bg-white border border-rose-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5 shadow-2xs">
                                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Recibirás la compensación de $2.000 ARS por cancelación tardía.</span>
                                </div>
                              ) : (
                                <p className="text-[11px] text-rose-700">
                                  Cancelación realizada con más de 48 hs de anticipación (sin penalidad).
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* BOTONES DE ETAPA EN VIVO & MODO DEMO */}
                      {sol.estado === 'aceptada' && (
                        <div className="bg-emerald-50/80 p-3.5 sm:p-4 rounded-xl border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5">
                            <Navigation className="w-5 h-5 text-emerald-600 shrink-0" />
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                                Iniciar Paseo para {sol.perro.name}
                              </h4>
                              <p className="text-[11px] text-emerald-800">
                                Agendado: {sol.fechaProgramada || 'Próximo turno'} • {sol.horarioPaseo || '18:00 hs'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {/* UN SOLO BOTÓN ÚNICO Y CLARO DE AVANCE DEL PASEO */}
                            <button
                              type="button"
                              id={`btn-yendo-a-retirar-${sol.id}`}
                              onClick={() => onStartTransit(sol)}
                              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-black text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                            >
                              <Play className="w-4 h-4 text-emerald-200 fill-emerald-200" />
                              <span>Empezar paseo</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {sol.estado === 'en_camino' && sol.etapaSeguimiento === 'yendo_a_retirar' && (() => {
                        const checklist = checklistBySolId[sol.id] || { bolsas: false, agua: false, correa: false };
                        const todosLosElementosConfirmados = Boolean(checklist.bolsas && checklist.agua && checklist.correa);
                        const confirmedCount = (checklist.bolsas ? 1 : 0) + (checklist.agua ? 1 : 0) + (checklist.correa ? 1 : 0);
                        const isAlertActive = checklistAlertSolId === sol.id;

                        return (
                          <div id={`checklist-esenciales-${sol.id}`} className="space-y-3">
                            {/* 🌟 RECORDATORIO DE ELEMENTOS ESENCIALES (CHECKLIST OBLIGATORIO) 🌟 */}
                            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-1.5">
                                  <CheckSquare className="w-4 h-4 text-emerald-700" />
                                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                    Recordatorio de Elementos Esenciales
                                  </span>
                                </div>
                                <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-md border shadow-2xs transition-all ${
                                  todosLosElementosConfirmados 
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}>
                                  {todosLosElementosConfirmados ? '✓ 3/3 Todo Listo' : `${confirmedCount}/3 Obligatorios`}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-600 font-medium">
                                Confirmá que tenés cada elemento antes de pedir el PIN 1 en la puerta del cliente:
                              </p>

                              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                                {/* 1. Bolsas de Residuos */}
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checklist.bolsas}
                                  id={`checklist-item-bolsas-${sol.id}`}
                                  onClick={() => toggleChecklistItem(sol.id, 'bolsas')}
                                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 select-none ${
                                    checklist.bolsas
                                      ? 'bg-emerald-50/80 border-emerald-500 shadow-2xs ring-1 ring-emerald-400'
                                      : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/60 shadow-2xs'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative transition-colors ${
                                    checklist.bolsas
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}>
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                      checklist.bolsas 
                                        ? 'bg-emerald-600 text-white shadow-xs' 
                                        : 'bg-slate-200 text-slate-400 border border-white'
                                    }`}>
                                      {checklist.bolsas ? '✓' : '○'}
                                    </span>
                                  </div>
                                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">Bolsas de</span>
                                  <span className="text-[9px] font-bold text-slate-500 leading-tight">Residuos</span>
                                  <span className={`text-[8.5px] font-bold mt-1 px-1.5 py-0.2 rounded ${
                                    checklist.bolsas ? 'bg-emerald-200/80 text-emerald-900' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {checklist.bolsas ? '✓ Listo' : 'Tocar p/ marcar'}
                                  </span>
                                </button>

                                {/* 2. Agua Fresca */}
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checklist.agua}
                                  id={`checklist-item-agua-${sol.id}`}
                                  onClick={() => toggleChecklistItem(sol.id, 'agua')}
                                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 select-none ${
                                    checklist.agua
                                      ? 'bg-sky-50/80 border-sky-500 shadow-2xs ring-1 ring-sky-400'
                                      : 'bg-white border-slate-200/90 hover:border-sky-300 hover:bg-slate-50/60 shadow-2xs'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative transition-colors ${
                                    checklist.agua
                                      ? 'bg-sky-600 text-white'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}>
                                    <Droplets className="w-3.5 h-3.5" />
                                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                      checklist.agua 
                                        ? 'bg-sky-600 text-white shadow-xs' 
                                        : 'bg-slate-200 text-slate-400 border border-white'
                                    }`}>
                                      {checklist.agua ? '✓' : '○'}
                                    </span>
                                  </div>
                                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">Agua /</span>
                                  <span className="text-[9px] font-bold text-slate-500 leading-tight">Hidratación</span>
                                  <span className={`text-[8.5px] font-bold mt-1 px-1.5 py-0.2 rounded ${
                                    checklist.agua ? 'bg-sky-200/80 text-sky-900' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {checklist.agua ? '✓ Listo' : 'Tocar p/ marcar'}
                                  </span>
                                </button>

                                {/* 3. Correa y Collar */}
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={checklist.correa}
                                  id={`checklist-item-correa-${sol.id}`}
                                  onClick={() => toggleChecklistItem(sol.id, 'correa')}
                                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center transition-all cursor-pointer active:scale-95 select-none ${
                                    checklist.correa
                                      ? 'bg-amber-50/80 border-amber-500 shadow-2xs ring-1 ring-amber-400'
                                      : 'bg-white border-slate-200/90 hover:border-amber-300 hover:bg-slate-50/60 shadow-2xs'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold mb-1 shadow-2xs relative transition-colors ${
                                    checklist.correa
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                                  }`}>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black ${
                                      checklist.correa 
                                        ? 'bg-amber-600 text-white shadow-xs' 
                                        : 'bg-slate-200 text-slate-400 border border-white'
                                    }`}>
                                      {checklist.correa ? '✓' : '○'}
                                    </span>
                                  </div>
                                  <span className="text-[10.5px] font-black text-slate-900 leading-tight">Correa /</span>
                                  <span className="text-[9px] font-bold text-slate-500 leading-tight">Seguridad</span>
                                  <span className={`text-[8.5px] font-bold mt-1 px-1.5 py-0.2 rounded ${
                                    checklist.correa ? 'bg-amber-200/80 text-amber-900' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                    {checklist.correa ? '✓ Listo' : 'Tocar p/ marcar'}
                                  </span>
                                </button>
                              </div>
                            </div>

                            {/* BANNER DE TRÁNSITO Y BOTÓN DE LLEGADA CON VALIDACIÓN OBLIGATORIA */}
                            <div className="bg-amber-50/70 p-3.5 sm:p-4 rounded-xl border border-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 relative">
                              <div className="flex items-center gap-2.5">
                                <MapPin className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                                    En camino al domicilio de retiro
                                  </h4>
                                  <p className="text-[11px] text-amber-800">
                                    Tu GPS está transmitiendo en tiempo real al cliente. Cuando toques timbre, presioná el botón.
                                  </p>
                                </div>
                              </div>

                              {/* CONTENEDOR DEL BOTÓN CON TOOLTIP EMERGENTE */}
                              <div className="relative w-full sm:w-auto shrink-0 flex flex-col items-end">
                                <AnimatePresence>
                                  {isAlertActive && !todosLosElementosConfirmados && (
                                    <motion.div
                                      key={`grilla-alert-tooltip-${sol.id}`}
                                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                                      className="absolute -top-11 right-0 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 z-30 bg-slate-950 text-white text-[10.5px] font-bold py-1.5 px-3 rounded-xl shadow-xl border border-amber-400 flex items-center gap-1.5 whitespace-nowrap animate-in fade-in duration-150"
                                    >
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>Debés confirmar que tenés todos los elementos esenciales para habilitar esta opción.</span>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                <div
                                  className="w-full sm:w-auto"
                                  onClick={() => {
                                    if (!todosLosElementosConfirmados) {
                                      setChecklistAlertSolId(sol.id);
                                      setTimeout(() => {
                                        setChecklistAlertSolId(prev => prev === sol.id ? null : prev);
                                      }, 4000);
                                    }
                                  }}
                                >
                                  <button
                                    type="button"
                                    id={`btn-llegue-domicilio-pin1-${sol.id}`}
                                    disabled={!todosLosElementosConfirmados}
                                    onClick={() => {
                                      if (!todosLosElementosConfirmados) {
                                        setChecklistAlertSolId(sol.id);
                                        return;
                                      }
                                      onArriveAtDoor(sol);
                                    }}
                                    title={
                                      !todosLosElementosConfirmados
                                        ? "Debés confirmar que tenés todos los elementos esenciales para habilitar esta opción."
                                        : "Notificar al cliente e ingresar PIN 1"
                                    }
                                    className={`w-full sm:w-auto py-2.5 px-4 rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all ${
                                      todosLosElementosConfirmados
                                        ? 'bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 cursor-pointer shadow-md ring-2 ring-amber-400/40'
                                        : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60 pointer-events-none'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Llegué al Domicilio (Pedir PIN 1)</span>
                                  </button>
                                </div>

                                {!todosLosElementosConfirmados && (
                                  <p className="text-[10px] text-amber-900 font-semibold flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Marcá los {3 - confirmedCount} elemento(s) faltante(s)</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {sol.estado === 'en_camino' && sol.etapaSeguimiento === 'en_domicilio' && (
                        <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-300 space-y-2.5">
                          <div className="flex items-center gap-2.5">
                            <Key className="w-4 h-4 text-amber-600 shrink-0" />
                            <div>
                              <h4 className="text-xs sm:text-sm font-bold text-amber-950">
                                Validar Código 1 de Inicio para {sol.perro.name}
                              </h4>
                              <p className="text-[11px] text-amber-800">
                                Pedile al dueño el PIN de 4 dígitos para autorizar el retiro y activar los 45 minutos.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Ej: 4821"
                              value={pin1Inputs[sol.id] || ''}
                              onChange={(e) => onPin1InputChange(sol.id, e.target.value)}
                              className="w-full sm:w-36 text-center text-lg font-mono font-bold tracking-widest px-3 py-2 rounded-lg border border-amber-400 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />

                            <button
                              type="button"
                              onClick={() => onValidatePin1(sol)}
                              className="w-full sm:w-auto py-2 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Validar PIN e Iniciar Paseo</span>
                            </button>
                          </div>

                          {codeError && (
                            <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> {codeError}
                            </p>
                          )}
                        </div>
                      )}

                      {(sol.estado === 'en_curso' || sol.estado === 'en_emergencia') && (
                        <div className="space-y-3">
                          {/* Banner Destacado si está en Estado de Emergencia */}
                          {(sol.enEmergencia || sol.estado === 'en_emergencia') && (
                            <div className="bg-red-600 text-white p-3.5 sm:p-4 rounded-2xl border-2 border-red-400 shadow-md space-y-2 animate-pulse">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <AlertTriangle className="w-6 h-6 text-amber-200 shrink-0" />
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-red-100 block">
                                      🚨 PASEO EN ESTADO DE EMERGENCIA
                                    </span>
                                    <h4 className="text-sm font-black text-white">
                                      {sol.motivoEmergencia || 'Imprevisto en curso con el canino'}
                                    </h4>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  id={`btn-ver-protocolo-emergencia-${sol.id}`}
                                  onClick={() => onOpenEmergencyModal?.(sol)}
                                  className="py-1.5 px-3 rounded-xl bg-white text-red-700 hover:bg-red-50 font-black text-xs cursor-pointer shadow-sm shrink-0"
                                >
                                  Ver Veterinaria / Llamar →
                                </button>
                              </div>
                              {(() => {
                                const vetClean = getCleanVeterinariaInfo(sol.datosEmergencia?.veterinariaNombre || sol.perro.trustedVet);
                                return (
                                  <div className="bg-black/20 p-2 rounded-xl text-xs flex items-center justify-between text-red-100">
                                    <span className="truncate">🏥 Ir a: <strong>{vetClean.nombre}</strong> ({vetClean.direccion})</span>
                                    <span className="font-mono text-amber-200 font-bold shrink-0 ml-2">~1.2 km</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 border border-slate-800">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shadow-2xs ${
                                sol.enEmergencia || sol.estado === 'en_emergencia' ? 'bg-red-600 text-white animate-bounce' : 'bg-emerald-600 text-white'
                              }`}>
                                <Clock className="w-5 h-5 animate-spin" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-400">
                                  Paseo Activo
                                </span>
                                <h4 className="text-sm font-bold">
                                  45 Minutos Recreativos en Curso
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  Transmitiendo ruta GPS y fotos en vivo a {sol.clienteNombre}.
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="bg-black/60 px-4 py-2 rounded-xl border border-white/10 text-center">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">TIEMPO RESTANTE</span>
                                <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
                                  {formatTimer(activeTimers[sol.id] !== undefined ? activeTimers[sol.id] : (sol.tiempoRestanteSegundos ?? 2700))}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => onFastForwardTimer(sol)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
                                title="Simular fin de tiempo"
                              >
                                <FastForward className="w-3 h-3" />
                                <span className="hidden sm:inline">Simular Fin</span>
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2.5">
                            {/* 🚨 BOTÓN DE EMERGENCIA / IMPREVISTO (ROJO DESTACADO) */}
                            <button
                              type="button"
                              id={`btn-emergencia-paseo-${sol.id}`}
                              onClick={() => onOpenEmergencyModal?.(sol)}
                              className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-98 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all border border-red-500"
                              title="Activar protocolo de emergencia médica / imprevisto"
                            >
                              <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
                              <span>Emergencia / Imprevisto</span>
                            </button>

                            <button
                              type="button"
                              id={`btn-llegue-retorno-${sol.id}`}
                              onClick={() => onArriveAtReturnDoor(sol)}
                              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-900" />
                              <span>Llegué al Domicilio de Retorno</span>
                            </button>

                            {sol.temporizadorFinalizado || (activeTimers[sol.id] === 0) ? (
                              <button
                                type="button"
                                onClick={() => onOpenModalPin2(sol)}
                                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-98"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Finalizar Paseo (Pedir PIN 2)</span>
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* GRILLA SEMANAL DE 7 DÍAS ESTRICTAMENTE EN 1 SOLA FILA (CON SCROLL HORIZONTAL SUAVE EN MÓVIL) */}
            <div className="w-full overflow-x-auto pb-3 pt-1 scrollbar-thin">
              <div className="grid grid-cols-7 gap-2.5 min-w-[780px] lg:min-w-0 w-full">
                {weekDays.map((day) => {
                  const isToday = day.isToday;
                  const totalDayWalks = day.paseos.length + (day.paseosCompletados?.length || 0);
                  const completedDayWalks = day.paseosCompletados?.length || 0;
                  const pendingDayWalks = day.paseos.length;
                  const isAllDayCompleted = totalDayWalks > 0 && pendingDayWalks === 0;
                  const hasWalks = pendingDayWalks > 0;
                  const hasCompleted = completedDayWalks > 0;
                  // Si no tiene paseos asignados pendientes ni completados
                  const isNoWalksDay = totalDayWalks === 0;

                  // Definición y normalización de franjas horarias del día (17:00, 18:00, 19:00, 20:00 hs + cualquier turno especial)
                  const normalizeSlotHour = (timeStr?: string): string => {
                    if (!timeStr) return '17:00 hs';
                    const clean = timeStr.trim();
                    if (clean.includes('09:00') || clean.includes('9:00')) return '09:00 hs';
                    if (clean.includes('10:00')) return '10:00 hs';
                    if (clean.includes('11:00')) return '11:00 hs';
                    if (clean.includes('17:00')) return '17:00 hs';
                    if (clean.includes('18:00')) return '18:00 hs';
                    if (clean.includes('19:00')) return '19:00 hs';
                    if (clean.includes('20:00')) return '20:00 hs';
                    if (clean.includes('21:00')) return '21:00 hs';
                    const m = clean.match(/(\d{1,2}):(\d{2})/);
                    if (m) return `${m[1].padStart(2, '0')}:${m[2]} hs`;
                    return clean;
                  };

                  const baseSlots = ['17:00 hs', '18:00 hs', '19:00 hs', '20:00 hs'];
                  const allDayHours = Array.from(new Set([
                    ...baseSlots,
                    ...day.paseos.map(s => normalizeSlotHour(s.horarioPaseo)),
                    ...(day.paseosCompletados || []).map(s => normalizeSlotHour(s.horarioPaseo))
                  ])).sort((a, b) => {
                    const nA = parseInt(a.replace(/\D/g, '') || '0', 10);
                    const nB = parseInt(b.replace(/\D/g, '') || '0', 10);
                    return nA - nB;
                  });

                  return (
                    <div
                      key={day.dateKey}
                      className={`rounded-2xl flex flex-col transition-all duration-200 overflow-hidden border ${
                        isToday
                          ? 'bg-gradient-to-b from-emerald-50/90 to-white border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                          : isNoWalksDay
                          ? 'bg-slate-800/95 border-slate-700 text-slate-300 shadow-xs'
                          : isAllDayCompleted
                          ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs hover:border-emerald-400'
                          : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                      }`}
                    >
                      {/* ENCABEZADO DEL DÍA */}
                      <div className={`p-2.5 border-b flex items-center justify-between ${
                        isToday 
                          ? 'bg-emerald-100/70 border-emerald-200 text-emerald-950' 
                          : isNoWalksDay
                          ? 'bg-slate-900 border-slate-700/80 text-slate-300'
                          : isAllDayCompleted
                          ? 'bg-emerald-100/60 border-emerald-200 text-emerald-900'
                          : day.isPast
                          ? 'bg-slate-50/60 border-slate-100 text-slate-500'
                          : 'bg-slate-50/80 border-slate-100 text-slate-800'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-black uppercase tracking-wider ${
                            isToday ? 'text-emerald-900' : isNoWalksDay ? 'text-slate-200' : isAllDayCompleted ? 'text-emerald-900' : day.isPast ? 'text-slate-500' : 'text-slate-800'
                          }`}>
                            {day.shortName}
                          </span>
                          <span className={`text-[11px] font-semibold ${
                            isToday ? 'text-emerald-700' : isNoWalksDay ? 'text-slate-400' : isAllDayCompleted ? 'text-emerald-700' : day.isPast ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            {day.formattedDate}
                          </span>
                        </div>

                        {/* BADGE DE ESTADO DEL DÍA (INDICADOR DINÁMICO) */}
                        {isToday ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black tracking-wide uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                            Hoy
                          </span>
                        ) : isAllDayCompleted ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            ✓ Realizados
                          </span>
                        ) : hasCompleted && hasWalks ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            {completedDayWalks}/{totalDayWalks}
                          </span>
                        ) : isNoWalksDay ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-950/60 text-slate-400 border border-slate-700">
                            0
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-slate-200 text-slate-700">
                            {pendingDayWalks}
                          </span>
                        )}
                      </div>

                      {/* CUERPO DEL DÍA: DESGLOSADO POR FRANJAS HORARIAS */}
                      <div className={`p-2 flex-1 flex flex-col justify-between space-y-2 min-h-[140px] ${
                        isNoWalksDay ? 'bg-slate-850' : ''
                      }`}>
                        {/* Indicador superior si todos los paseos del día están completados */}
                        {isAllDayCompleted && (
                          <div className="p-2 rounded-xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-center shadow-2xs">
                            <div className="flex items-center justify-center gap-1 text-[11px] font-black text-emerald-900">
                              <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" />
                              <span>Paseos del día realizados</span>
                            </div>
                            <p className="text-[10px] text-emerald-800 font-medium mt-0.5">
                              {completedDayWalks} {completedDayWalks === 1 ? 'paseo completado' : 'paseos completados con éxito'}
                            </p>
                          </div>
                        )}

                        {/* LISTADO DE FILAS POR FRANJAS HORARIAS (17:00, 18:00, 19:00, 20:00 hs) */}
                        <div className="space-y-1.5 flex-1">
                          {allDayHours.map((slot) => {
                            const pendingInSlot = day.paseos.filter(s => normalizeSlotHour(s.horarioPaseo) === slot);
                            const doneInSlot = (day.paseosCompletados || []).filter(s => normalizeSlotHour(s.horarioPaseo) === slot);

                            // CASO A: Sin paseos asignados en esa hora -> CELDA EN GRIS
                            if (pendingInSlot.length === 0 && doneInSlot.length === 0) {
                              return (
                                <div
                                  key={`slot-${day.dateKey}-${slot}`}
                                  className={`p-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                                    isNoWalksDay
                                      ? 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                                      : 'bg-slate-100/80 border-slate-200/70 text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-mono font-bold text-[10.5px] text-slate-400">{slot}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium">Sin paseos</span>
                                </div>
                              );
                            }

                            // CASO B: Todos los paseos de esa hora están completados -> INDICA "Paseos realizados"
                            if (pendingInSlot.length === 0 && doneInSlot.length > 0) {
                              return (
                                <div
                                  key={`slot-${day.dateKey}-${slot}`}
                                  className="p-2 rounded-xl bg-emerald-50/90 border border-emerald-300 text-emerald-950 text-xs shadow-2xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[9px] shadow-2xs shrink-0">
                                        ✓
                                      </div>
                                      <span className="font-mono font-bold text-[10.5px] text-emerald-950">{slot}</span>
                                    </div>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md border border-emerald-200">
                                      ✓ Paseos realizados
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-800 truncate pl-5">
                                    {doneInSlot.map(s => s.perro?.name).join(', ')} ({doneInSlot.length} completado{doneInSlot.length > 1 ? 's' : ''})
                                  </p>
                                </div>
                              );
                            }

                            // CASO C: Paseos pendientes en esta franja horaria -> MOSTRARLOS CLARAMENTE
                            return (
                              <div
                                key={`slot-${day.dateKey}-${slot}`}
                                className="p-2 rounded-xl bg-emerald-50/30 border border-emerald-300 shadow-2xs space-y-2"
                              >
                                <div className="flex items-center justify-between text-[11px] border-b border-emerald-200/60 pb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="font-mono font-black text-slate-900">{slot}</span>
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {pendingInSlot.length} {pendingInSlot.length === 1 ? 'pendiente' : 'pendientes'}
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {pendingInSlot.map((sol, walkIdx) => {
                                    const pricing = getSolicitudPricingDetails(sol);
                                    const isWalkToday = isToday;

                                    return (
                                      <div
                                        key={`walk-${day.dateKey}-${sol.id}-${walkIdx}`}
                                        className={`p-2.5 rounded-xl border text-xs transition-all space-y-2 ${
                                          sol.estado === 'completada'
                                            ? 'bg-slate-50 border-slate-200 opacity-80'
                                            : sol.estado === 'en_curso'
                                            ? 'bg-emerald-50/90 border-emerald-400 shadow-2xs ring-1 ring-emerald-300'
                                            : sol.estado === 'en_camino'
                                            ? 'bg-amber-50/90 border-amber-400 shadow-2xs ring-1 ring-amber-300'
                                            : isWalkToday
                                            ? 'bg-white border-emerald-300 shadow-2xs hover:border-emerald-400'
                                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                                        }`}
                                      >
                                        {/* Info Mascota y Monto Neto */}
                                        <div className="flex items-start gap-2">
                                          <img
                                            src={sol.perro.photoUrl}
                                            alt={sol.perro.name}
                                            referrerPolicy="no-referrer"
                                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                                          />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                              <h5 className="font-bold text-slate-900 truncate text-xs">
                                                {sol.perro.name}
                                              </h5>
                                              <span className="font-black text-emerald-700 text-[10px] font-mono shrink-0">
                                                +{formatPesos(pricing.netoPorPaseo)}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 truncate">
                                              Dueño: <strong className="text-slate-700">{sol.clienteNombre || 'Dueño'}</strong>
                                            </p>
                                          </div>
                                        </div>

                                        {/* Dirección de Retiro */}
                                        <div className="flex items-start gap-1 text-[10px] text-slate-600 bg-slate-50/60 px-1.5 py-1 rounded-md border border-slate-100">
                                          <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                                          <span className="truncate leading-tight" title={sol.ubicacion.direccion}>
                                            {sol.ubicacion.direccion}
                                          </span>
                                        </div>

                                        {/* Estado y Botón de Acción Directo */}
                                        <div className="space-y-1.5 pt-0.5">
                                          <div className="flex items-center justify-between">
                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                              sol.estado === 'completada'
                                                ? 'bg-slate-200 text-slate-700'
                                                : sol.estado === 'en_curso'
                                                ? 'bg-emerald-600 text-white animate-pulse'
                                                : sol.estado === 'en_camino'
                                                ? 'bg-amber-500 text-slate-950 font-black animate-pulse'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                              {sol.estado === 'completada' 
                                                ? '✓ Realizado' 
                                                : sol.estado === 'en_curso' 
                                                ? '🐾 En curso' 
                                                : sol.estado === 'en_camino'
                                                ? '🚶 En camino'
                                                : '• Aceptado'}
                                            </span>

                                            <span className="text-[9px] text-slate-500 font-medium">
                                              Plan {sol.tipoPlan || 'Bronce'}
                                            </span>
                                          </div>

                                          {/* BOTÓN DE ACCIÓN: Empezar Paseo / Llegué a Domicilio / Paseo Activo */}
                                          {sol.estado !== 'completada' && (
                                            <button
                                              type="button"
                                              id={`btn-grilla-iniciar-${day.dateKey}-${sol.id}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (sol.estado === 'en_camino') {
                                                  const chk = checklistBySolId[sol.id] || { bolsas: false, agua: false, correa: false };
                                                  const allReady = chk.bolsas && chk.agua && chk.correa;
                                                  if (!allReady) {
                                                    setChecklistAlertSolId(sol.id);
                                                    const el = document.getElementById(`checklist-esenciales-${sol.id}`);
                                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    return;
                                                  }
                                                  onArriveAtDoor(sol);
                                                } else if (sol.estado === 'en_curso') {
                                                  onArriveAtReturnDoor(sol);
                                                } else {
                                                  onStartTransit(sol);
                                                }
                                              }}
                                              className={`w-full py-1.5 px-2 rounded-lg font-black text-[10px] shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                                                sol.estado === 'en_curso'
                                                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                                  : sol.estado === 'en_camino'
                                                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                              }`}
                                            >
                                              <Play className="w-3 h-3 shrink-0" />
                                              <span className="truncate">
                                                {sol.estado === 'en_curso'
                                                  ? 'Paseo Activo'
                                                  : sol.estado === 'en_camino'
                                                  ? 'Llegué a Domicilio'
                                                  : 'Empezar paseo'}
                                              </span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECCIÓN SECUNDARIA / HISTORIAL COLAPSABLE DE PASEOS FINALIZADOS */}
            {allPaseosCompletados.length > 0 && (
              <div id="seccion-historial-paseos-finalizados" className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  id="btn-toggle-historial-finalizados"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Historial de paseos finalizados ({allPaseosCompletados.length})</span>
                  </div>
                  <span className="text-slate-400 text-[11px] font-mono">
                    {isHistoryOpen ? '▲ Ocultar' : '▼ Ver historial'}
                  </span>
                </button>

                <AnimatePresence>
                  {isHistoryOpen && (
                    <motion.div
                      key="grilla-history-motion-container"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                        {allPaseosCompletados.map((sol, compIdx) => {
                          const pricing = getSolicitudPricingDetails(sol);
                          return (
                            <div
                              key={`hist-${sol.id}-${compIdx}`}
                              className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 flex flex-col justify-between"
                            >
                              <div className="flex items-start gap-2.5">
                                <img
                                  src={sol.perro.photoUrl}
                                  alt={sol.perro.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="font-black text-slate-900 text-xs truncate">{sol.perro.name}</h5>
                                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                      +{formatPesos(pricing.netoPorPaseo)}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    Dueño: {sol.clienteNombre || 'Cliente'}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    📍 {sol.ubicacion.direccion}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                                <span className="text-slate-500 font-medium">
                                  {sol.fechaProgramada || 'Paseo'} • {sol.horaFin ? `Fin: ${sol.horaFin}` : 'Completado'}
                                </span>
                                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  ✓ Completado
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
