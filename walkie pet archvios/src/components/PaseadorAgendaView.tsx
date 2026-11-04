import React, { useState } from 'react';
import { SolicitudPaseo } from '../types';
import { formatPesos } from '../utils/geo';
import { registrarCancelacionPaseador, getPaseadorWallet } from '../utils/walletPaseador';
import { getDogSubscription } from '../utils/dogSubscriptions';
import { 
  getSolicitudPricingDetails, 
  getAllSolicitudDates, 
  formatSolicitudScheduleSummary,
  getOrBuildSolicitudDiasDesglose
} from '../utils/planCalculations';
import { DesgloseFechasPaseos } from './DesgloseFechasPaseos';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, 
  MapPin, CheckCircle2, AlertCircle, Sparkles, Filter, 
  Dog, User, Phone, Check, AlertTriangle, ShieldAlert,
  X, Lock, Zap, FileText, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GrillaSemanalPaseos } from './GrillaSemanalPaseos';

interface PaseadorAgendaViewProps {
  solicitudes: SolicitudPaseo[];
  user?: any;
  currentPaseadorId?: string;
  onSelectSolicitud?: (solicitud: SolicitudPaseo) => void;
  onUpdateSolicitud?: (solicitud: SolicitudPaseo) => void;
  onDirectStartWalk?: (solicitud: SolicitudPaseo) => void;
  onStartTransit?: (solicitud: SolicitudPaseo) => void;
  activeTimers?: Record<string, number>;
  onArriveAtDoor?: (sol: SolicitudPaseo) => void;
  onValidatePin1?: (sol: SolicitudPaseo) => void;
  onArriveAtReturnDoor?: (sol: SolicitudPaseo) => void;
  onOpenModalPin2?: (sol: SolicitudPaseo) => void;
  onFastForwardTimer?: (sol: SolicitudPaseo) => void;
  pin1Inputs?: Record<string, string>;
  onPin1InputChange?: (solId: string, val: string) => void;
  codeError?: string | null;
  onOpenEmergencyModal?: (sol: SolicitudPaseo) => void;
}

export const PaseadorAgendaView: React.FC<PaseadorAgendaViewProps> = ({
  solicitudes,
  user,
  currentPaseadorId,
  onSelectSolicitud,
  onUpdateSolicitud,
  onDirectStartWalk,
  onStartTransit,
  activeTimers = {},
  onArriveAtDoor,
  onValidatePin1,
  onArriveAtReturnDoor,
  onOpenModalPin2,
  onFastForwardTimer,
  pin1Inputs = {},
  onPin1InputChange,
  codeError = null,
  onOpenEmergencyModal
}) => {
  // Calendar state: Defaults to current month & year
  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Cancel Walk Modal state
  const [walkToCancel, setWalkToCancel] = useState<SolicitudPaseo | null>(null);
  const [toastAlert, setToastAlert] = useState<string | null>(null);

  const activeWalkerId = currentPaseadorId || user?.id;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Days in month calculation
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday is 0 (Sunday is 6)
  const startingDay = (firstDayIndex + 6) % 7;
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  // Helper to format date key YYYY-MM-DD
  const formatDateKey = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const actualTodayDateStr = new Date().toISOString().split('T')[0];

  // Group solicitudes by date — MAPS ALL DATES WITH ISOLATED STATUS PER DATE
  const solicitudesPorFecha: Record<string, SolicitudPaseo[]> = {};
  solicitudes.forEach((sol) => {
    if (sol.estado === 'cancelada' || sol.estado === 'rechazada') return;

    // Si se especificó el ID del paseador actual, filtrar para mostrar los de este paseador
    if (activeWalkerId && sol.paseadorId && sol.paseadorId !== activeWalkerId && sol.paseador_id && sol.paseador_id !== activeWalkerId) {
      return;
    }
    
    const dias = getOrBuildSolicitudDiasDesglose(sol);
    dias.forEach((diaItem) => {
      const dateKey = diaItem.fechaStr;
      if (!dateKey) return;

      // PROHIBIDO ingresar solicitudes no aceptadas al calendario:
      if (diaItem.estado === 'disponible' || diaItem.estado === 'cancelado') return;

      if (!solicitudesPorFecha[dateKey]) {
        solicitudesPorFecha[dateKey] = [];
      }

      const isPastDate = dateKey < actualTodayDateStr;
      const isFutureDate = dateKey > actualTodayDateStr;

      let dateSpecificState: SolicitudPaseo['estado'] = 'aceptada';
      if (diaItem.estado === 'completado' || isPastDate) {
        dateSpecificState = 'completada';
      } else if (isFutureDate) {
        // Fechas futuras: NUNCA completadas o en camino de forma anticipada
        dateSpecificState = 'aceptada';
      } else {
        // Hoy
        dateSpecificState = sol.estado === 'en_emergencia' ? 'en_emergencia' : (sol.estado === 'en_curso' || sol.estado === 'en_camino' ? sol.estado : 'aceptada');
      }

      const dateWalk: SolicitudPaseo = {
        ...sol,
        id: `${sol.id}_${dateKey}`,
        fechaProgramada: dateKey,
        horarioPaseo: diaItem.horario || sol.horarioPaseo,
        montoNetoPaseador: diaItem.montoNeto || sol.montoNetoPaseador,
        estado: dateSpecificState,
        etapaSeguimiento: isFutureDate ? 'esperando' : sol.etapaSeguimiento
      };

      if (!solicitudesPorFecha[dateKey].some(s => s.id === dateWalk.id)) {
        solicitudesPorFecha[dateKey].push(dateWalk);
      }
    });
  });

  // Helper to calculate urgency badge
  const getUrgencyBadge = (fechaPaseoStr?: string) => {
    if (!fechaPaseoStr) return null;
    const [y, m, d] = fechaPaseoStr.split('-').map(Number);
    const targetDate = new Date(y, (m || 1) - 1, d || 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      return {
        label: 'Hoy / Mañana (Alta Prioridad)',
        color: 'bg-rose-100 text-rose-800 border-rose-300',
        dot: 'bg-rose-500'
      };
    } else if (diffDays < 5) {
      return {
        label: `Urgencia Moderada (${diffDays} días)`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        dot: 'bg-amber-500'
      };
    } else {
      return {
        label: `Prioridad Estándar (+${diffDays} días)`,
        color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500'
      };
    }
  };

  // Execute Cancellation Handler
  const handleConfirmCancellation = () => {
    if (!walkToCancel) return;
    const result = registrarCancelacionPaseador(
      walkToCancel.id,
      walkToCancel.fechaProgramada || '2026-09-30',
      walkToCancel.perro.name
    );

    const updated: SolicitudPaseo = {
      ...walkToCancel,
      estado: 'cancelada'
    };

    if (onUpdateSolicitud) {
      onUpdateSolicitud(updated);
    }

    if (result.penalizacionAplicada) {
      setToastAlert(`⚠️ Cancelación realizada a falta de ${result.diasDiferencia} día(s). Se aplicará una penalización del 50% en tu próximo paseo.`);
    } else {
      setToastAlert(`✓ Paseo de ${walkToCancel.perro.name} cancelado sin penalización ($0 multa). Se notificó al cliente.`);
    }

    setWalkToCancel(null);
  };

  return (
    <div id="agenda-mensual-paseador" className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header Banner Simplificado */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-slate-950 text-white rounded-3xl p-5 sm:p-7 md:p-8 shadow-md border border-emerald-800/40 relative overflow-hidden w-full">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
              <CalendarIcon className="w-3.5 h-3.5 shrink-0" /> Calendario de Paseos
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight break-words">
              Calendario de Paseos
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
              Navegá por fechas, consultá los turnos programados de Mañana y Tarde, y organizá tus salidas en Carlos Paz y Punilla.
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              onClick={() => {
                const now = new Date();
                setCurrentYear(now.getFullYear());
                setCurrentMonth(now.getMonth());
                setSelectedDateStr(now.toISOString().split('T')[0]);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow cursor-pointer transition-all text-center whitespace-nowrap active:scale-95"
            >
              Ir al Día de Hoy
            </button>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastAlert && (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-emerald-500 flex items-center justify-between gap-3 text-xs">
          <span>{toastAlert}</span>
          <button
            onClick={() => setToastAlert(null)}
            className="p-1 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 📅 AGENDA SEMANAL DE PASEOS (7 DÍAS DE LUN A DOM)        */}
      {/* REQUERIMIENTO: Ubicado EXACTAMENTE ARRIBA del calendario */}
      {/* ======================================================== */}
      <div id="contenedor-agenda-semanal-en-calendario" className="w-full">
        <GrillaSemanalPaseos
          solicitudes={solicitudes}
          user={user}
          currentPaseadorId={currentPaseadorId || user?.id}
          onUpdateSolicitud={onUpdateSolicitud || (() => {})}
          activeTimers={activeTimers}
          onStartTransit={onStartTransit || (() => {})}
          onDirectStartWalk={onDirectStartWalk}
          onArriveAtDoor={onArriveAtDoor || (() => {})}
          onValidatePin1={onValidatePin1 || (() => {})}
          onArriveAtReturnDoor={onArriveAtReturnDoor || (() => {})}
          onOpenModalPin2={onOpenModalPin2 || (() => {})}
          onFastForwardTimer={onFastForwardTimer || (() => {})}
          pin1Inputs={pin1Inputs}
          onPin1InputChange={onPin1InputChange || (() => {})}
          codeError={codeError}
          onOpenEmergencyModal={onOpenEmergencyModal}
        />
      </div>

      {/* Matriz del Calendario mensual a Ancho Completo (w-full) - Ahora ubicado DEBAJO de la Agenda Semanal */}
      <div className="w-full bg-white rounded-3xl p-5 sm:p-7 md:p-8 border border-slate-200 shadow-sm space-y-6">
        {/* Month & Year Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg sm:text-xl font-black text-slate-900">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
              {solicitudes.filter(s => s.estado !== 'cancelada').length} paseos registrados
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-all"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer transition-all"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center font-bold text-xs sm:text-sm text-slate-400 pb-2 border-b border-slate-100">
          {daysOfWeek.map((day, i) => (
            <div key={i} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5 text-center">
          {/* Previous month empty/padded days */}
          {Array.from({ length: startingDay }).map((_, i) => {
            const dayNum = daysInPrevMonth - startingDay + i + 1;
            return (
              <div
                key={`prev-${i}`}
                className="p-2 sm:p-3 rounded-2xl text-slate-600 bg-slate-900/40 text-xs sm:text-sm font-semibold select-none flex items-center justify-center min-h-[58px] sm:min-h-[68px]"
              >
                {dayNum}
              </div>
            );
          })}

          {/* Current month days */}
          {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateKey = formatDateKey(currentYear, currentMonth, dayNum);
            const isSelected = selectedDateStr === dateKey;
            const walksCount = (solicitudesPorFecha[dateKey] || []).length;
            const isToday = dateKey === actualTodayDateStr;
            const isPast = dateKey < actualTodayDateStr;

            return (
              <button
                key={`cur-${dayNum}`}
                type="button"
                onClick={() => setSelectedDateStr(dateKey)}
                className={`p-2 sm:p-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all relative flex flex-col items-center justify-center min-h-[58px] sm:min-h-[68px] cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 ring-offset-2'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-950 border-2 border-emerald-500 shadow-2xs hover:bg-emerald-100'
                    : isPast
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750 opacity-90'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs'
                }`}
              >
                <span>{dayNum}</span>

                {/* Walks Indicator Dots / Badges */}
                {walksCount > 0 ? (
                  <div className="mt-1 flex items-center gap-0.5">
                    <span
                      className={`text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-white text-emerald-800'
                          : walksCount >= 4
                          ? 'bg-indigo-700 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {walksCount} {walksCount === 1 ? 'paseo' : 'paseos'}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-slate-500 mt-0.5 block">
                    Libre
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Calendar Footnote Legend */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100 gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              Paseo Aceptado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block border border-slate-600"></span>
              Sin paseos (Gris oscuro)
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Zona: Villa Carlos Paz y Punilla
          </span>
        </div>
      </div>

      {/* MODAL DE POLÍTICA DE CANCELACIÓN Y MULTAS */}
      <AnimatePresence>
        {walkToCancel && (() => {
          const [y, m, d] = (walkToCancel.fechaProgramada || '2026-09-30').split('-').map(Number);
          const fechaPaseo = new Date(y, (m || 1) - 1, d || 1);
          const hoy = new Date(2026, 8, 17);
          const diffDays = Math.ceil((fechaPaseo.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
          const hasPenalty = diffDays <= 1;

          return (
            <div
              key="modal-politica-cancelacion-paseador"
              className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto"
              onClick={() => setWalkToCancel(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 relative text-slate-900"
              >
                <button
                  type="button"
                  onClick={() => setWalkToCancel(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-xs ${
                    hasPenalty ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {hasPenalty ? <ShieldAlert className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Cancelar Paseo de {walkToCancel.perro.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Fecha programada: <strong>{walkToCancel.fechaProgramada || '2026-09-30'}</strong> (Faltan {diffDays} días)
                    </p>
                  </div>
                </div>

                {/* Policy evaluation box */}
                {hasPenalty ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                      <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>Penalización por Cancelación Tardía (50%)</span>
                    </div>
                    <p className="text-xs text-rose-700 leading-relaxed">
                      Al cancelar a menos de 24 horas del paseo agendado, se aplicará automáticamente una <strong>multa del 50%</strong> en la ganancia neta de tu <strong>próximo paseo completado</strong>.
                    </p>
                  </div>
                ) : diffDays >= 5 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Cancelación Sin Penalización ($0 Multa)</span>
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Estás cancelando con <strong>{diffDays} días de anticipación</strong> (más de 5 días de margen). No se aplicará ningún descuento ni multa económica.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Aviso con {diffDays} días de anticipación</span>
                    </div>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      El cliente será notificado de inmediato para poder reprogramar o elegir otro paseador en la zona.
                    </p>
                  </div>
                )}

                <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1 text-slate-600">
                  <div className="font-semibold text-slate-800">📋 Resumen del Servicio a Cancelar:</div>
                  <div>• Mascota: {walkToCancel.perro.name} ({walkToCancel.perro.breed})</div>
                  <div>• Cliente: {walkToCancel.clienteNombre} ({walkToCancel.clienteTelefono})</div>
                  <div>• Dirección: {walkToCancel.ubicacion.direccion}</div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setWalkToCancel(null)}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    No, Conservar Paseo
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancellation}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-xs cursor-pointer ${
                      hasPenalty ? 'bg-rose-600 hover:bg-rose-500' : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    Confirmar Cancelación
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
