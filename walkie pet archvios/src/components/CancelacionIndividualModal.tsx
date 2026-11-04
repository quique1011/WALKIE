import React, { useState } from 'react';
import { SolicitudPaseo, SolicitudDiaItem, SolicitudCancelacionNotif } from '../types';
import { getOrBuildSolicitudDiasDesglose } from '../utils/planCalculations';
import { creditCompensacionCancelacion } from '../utils/walletPaseador';
import { formatPesos } from '../utils/geo';
import { 
  Calendar, Clock, AlertTriangle, CheckCircle2, 
  RotateCcw, X, ShieldAlert, AlertCircle, Info, Sparkles, User, Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CancelacionIndividualModalProps {
  solicitud: SolicitudPaseo;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSolicitud: (updated: SolicitudPaseo) => void;
  onShowToast: (message: string) => void;
}

export const CancelacionIndividualModal: React.FC<CancelacionIndividualModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  onUpdateSolicitud,
  onShowToast
}) => {
  // Confirm step for penalty
  const [dayToCancelWithPenalty, setDayToCancelWithPenalty] = useState<SolicitudDiaItem | null>(null);

  if (!isOpen) return null;

  const dias = getOrBuildSolicitudDiasDesglose(solicitud);

  // Helper para calcular la anticipación en días y horas
  const calculateAnticipation = (dateStr: string, hourStr: string = '18:00 hs') => {
    // Current simulated date: 22 Sept 2026 or real Date
    const now = new Date();
    // Parse dateStr (YYYY-MM-DD)
    const [y = 2026, m = 9, d = 21] = dateStr.split('-').map(Number);
    const rawTime = hourStr.replace(/hs|hrs|horas/gi, '').trim();
    const parts = rawTime.split(':').map(Number);
    const h = Number.isFinite(parts[0]) ? parts[0] : 18;
    const min = Number.isFinite(parts[1]) ? parts[1] : 0;
    
    // Target date
    const targetDate = new Date(y, (m || 1) - 1, d || 1, h, min, 0);
    
    const diffMs = targetDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Regla de negocio:
    // >= 3 días (>= 72 hs): Sin cargo ($0)
    // < 2 días (<= 48 hs): Penalidad $2.000 ARS
    const hasPenalty = diffHours <= 48 || diffDays < 2;
    const isFree = diffDays >= 3;

    return {
      diffDays,
      diffHours: Math.max(0, Math.round(diffHours)),
      hasPenalty,
      isFree
    };
  };

  // Acción: Cancelar día individual
  const handlePerformDayCancellation = (day: SolicitudDiaItem, applyPenalty: boolean) => {
    const updatedDias = dias.map(d => {
      if (d.id === day.id) {
        return {
          ...d,
          estado: 'cancelado' as const,
          canceladoPor: 'cliente' as const,
          fechaCancelacion: new Date().toISOString(),
          penalidadAplicada: applyPenalty ? 2000 : 0,
          compensacionPaseador: applyPenalty ? 2000 : 0,
          motivoCancelacion: applyPenalty 
            ? 'Cancelado por el cliente con menos de 48 hs de anticipación ($2.000 penalidad)'
            : 'Cancelado por el cliente con anticipación (sin cargo)'
        };
      }
      return d;
    });

    const targetPaseadorId = day.paseadorId || solicitud.paseadorId;
    const targetPaseadorNombre = day.paseadorNombre || solicitud.paseadorNombre;

    // Crear notificación para el paseador
    const notif: SolicitudCancelacionNotif = {
      id: `notif-canc-${Date.now()}`,
      diaId: day.id,
      solicitudId: solicitud.id,
      fechaStr: day.fechaStr,
      diaNombre: `${day.diaNombre} (${day.fechaCorta})`,
      perroNombre: solicitud.perro.name,
      clienteNombre: solicitud.clienteNombre,
      paseadorId: targetPaseadorId,
      compensacion: applyPenalty ? 2000 : 0,
      motivo: applyPenalty
        ? 'Cancelación tardía por parte del cliente (< 48 hs)'
        : 'Cancelación con más de 48 hs de anticipación',
      canceladoEn: new Date().toISOString(),
      leido: false
    };

    // Si había paseador asignado y se aplicó penalidad por <48hs, compensarlo en su billetera
    if (applyPenalty && targetPaseadorId) {
      creditCompensacionCancelacion(
        solicitud.id,
        2000,
        `Compensación por cancelación de turno (${day.diaNombre} ${day.fechaCorta}) para ${solicitud.perro.name}`,
        solicitud.perro.name,
        solicitud.clienteNombre,
        day.fechaStr
      );
    }

    const updatedSolicitud: SolicitudPaseo = {
      ...solicitud,
      diasDesglose: updatedDias,
      notificacionesCancelacion: [notif, ...(solicitud.notificacionesCancelacion || [])]
    };

    onUpdateSolicitud(updatedSolicitud);
    setDayToCancelWithPenalty(null);

    if (applyPenalty) {
      onShowToast(`⚠️ Paseo del ${day.diaNombre} ${day.fechaCorta} cancelado. Se aplicó la penalidad de $2.000 ARS por aviso tardío (< 48 hs).`);
    } else {
      onShowToast(`✅ Paseo del ${day.diaNombre} ${day.fechaCorta} cancelado sin cargo.`);
    }
  };

  // Acción: Reactivar día cancelado
  const handleReactivateDay = (day: SolicitudDiaItem) => {
    const updatedDias = dias.map(d => {
      if (d.id === day.id) {
        return {
          ...d,
          estado: 'disponible' as const,
          canceladoPor: undefined,
          fechaCancelacion: undefined,
          penalidadAplicada: undefined,
          compensacionPaseador: undefined,
          motivoCancelacion: undefined,
          paseadorId: undefined,
          paseadorNombre: undefined,
          paseadorFoto: undefined,
          paseadorTelefono: undefined
        };
      }
      return d;
    });

    const updatedSolicitud: SolicitudPaseo = {
      ...solicitud,
      diasDesglose: updatedDias,
      estado: 'pendiente' // Vuelve a estar en búsqueda
    };

    onUpdateSolicitud(updatedSolicitud);
    onShowToast(`✨ ¡Paseo del ${day.diaNombre} ${day.fechaCorta} reactivado! Publicado nuevamente en el radar de paseadores.`);
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 relative text-slate-900 my-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                Gestión de Turnos y Cancelaciones
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                Cancelar o Reactivar Paseos de {solicitud.perro.name}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Políticas de Cancelación resumen */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>Política Oficial de Cancelación Walkie:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
            <li><strong>3 o más días de anticipación:</strong> Cancelación 100% gratuita y sin recargos.</li>
            <li><strong>Menos de 2 días (&le; 48 hs):</strong> Se aplica penalidad de <strong>$2.000 ARS</strong> para compensar la reserva del paseador.</li>
            <li><strong>Cancelación individual:</strong> Solo se modifica el día seleccionado; el resto de tu plan continúa activo.</li>
          </ul>
        </div>

        {/* Listado de Días del Plan */}
        <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Seleccioná el día que deseás gestionar:
          </span>

          {dias.map((dia, idx) => {
            const antic = calculateAnticipation(dia.fechaStr, dia.horario);
            const isCancelled = dia.estado === 'cancelado';
            const isCompleted = dia.estado === 'completado';
            const isLive = dia.estado === 'en_curso' || dia.estado === 'en_camino';

            return (
              <div
                key={`canc-dia-${dia.id || 'd'}-${idx}`}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isCancelled
                    ? 'bg-rose-50/50 border-rose-200 text-slate-600'
                    : isCompleted
                    ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                    : 'bg-white border-slate-200 hover:border-amber-400 shadow-2xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {dia.diaNombre} {dia.fechaCorta}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({dia.horario})
                      </span>
                      {isCancelled && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                          Cancelado
                        </span>
                      )}
                      {isCompleted && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          ✓ Paseo Finalizado
                        </span>
                      )}
                      {isLive && (
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200 animate-pulse">
                          En Marcha
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Tarifa: {formatPesos(dia.montoTotalCliente || 3000)}</span>
                      {dia.paseadorNombre && !isCancelled && (
                        <span>• Paseador: <strong>{dia.paseadorNombre}</strong></span>
                      )}
                    </div>

                    {!isCancelled && !isCompleted && !isLive && (
                      <div className="pt-0.5">
                        {antic.isFree ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Sin penalidad (quedan {antic.diffDays} días)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Aplica recargo de $2.000 ARS (&le; 48 hs)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {isCancelled ? (
                      <button
                        type="button"
                        onClick={() => handleReactivateDay(dia)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reactivar Paseo / Buscar Paseador</span>
                      </button>
                    ) : isCompleted || isLive ? (
                      <span className="text-xs text-slate-400 font-medium">No cancelable</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (antic.hasPenalty) {
                            setDayToCancelWithPenalty(dia);
                          } else {
                            handlePerformDayCancellation(dia, false);
                          }
                        }}
                        className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-600" />
                        <span>Cancelar este día</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal de Confirmación de Penalidad */}
        <AnimatePresence>
          {dayToCancelWithPenalty && (
            <div key="modal-penalty-warning-backdrop" className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-rose-200 space-y-4 text-slate-900"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">
                      Advertencia de Penalidad ($2.000 ARS)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Cancelación para el <strong>{dayToCancelWithPenalty.diaNombre} {dayToCancelWithPenalty.fechaCorta}</strong>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
                  <p className="font-semibold leading-relaxed">
                    Estás cancelando este turno con <strong>menos de 48 horas de anticipación</strong>.
                  </p>
                  <p className="text-[11px] text-rose-800">
                    Se aplicará una penalidad de <strong>$2.000 ARS</strong> que será transferida como compensación al paseador asignado por la reserva de su horario.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setDayToCancelWithPenalty(null)}
                    className="py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    No cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePerformDayCancellation(dayToCancelWithPenalty, true)}
                    className="py-2 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow cursor-pointer transition-all"
                  >
                    Confirmar Cancelación (-$2.000 ARS)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <p className="text-[10px] text-slate-400">
            Podés reactivar paseos cancelados en cualquier momento antes del horario del turno.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-xs"
          >
            Listo / Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};
