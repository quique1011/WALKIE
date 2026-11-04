import React, { useState } from 'react';
import { DogProfile, SolicitudPaseo } from '../types';
import { 
  PawPrint, Plus, Check, Pencil, Trash2, Dog, UserCheck, User, 
  Search, Clock, AlertTriangle, Calendar, X, CheckCircle, Phone, 
  MapPin, ChevronRight, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DogWeeklyWalksProgressBar } from './DogWeeklyWalksProgressBar';
import { getDogSubscription } from '../utils/dogSubscriptions';
import { getOrBuildSolicitudDiasDesglose } from '../utils/planCalculations';
import { formatWhatsAppLink } from '../utils/geo';

interface DogProfilesManagerProps {
  dogs: DogProfile[];
  selectedDogId: string | null;
  solicitudes?: SolicitudPaseo[];
  onSelectDog: (dogId: string) => void;
  onAddNewDog: () => void;
  onEditDog: (dog: DogProfile) => void;
  onDeleteDog?: (dogId: string) => void;
  onUpdatePlan?: (dog: DogProfile) => void;
}

export const DogProfilesManager: React.FC<DogProfilesManagerProps> = ({
  dogs,
  selectedDogId,
  solicitudes = [],
  onSelectDog,
  onAddNewDog,
  onEditDog,
  onDeleteDog,
  onUpdatePlan
}) => {
  const [dogToDelete, setDogToDelete] = useState<DogProfile | null>(null);
  const [infoModalDogId, setInfoModalDogId] = useState<string | null>(null);

  // Estado vacío: Sin perros registrados
  if (dogs.length === 0) {
    return (
      <div 
        id="contenedor-sin-perros"
        className="bg-white rounded-2xl p-5 sm:p-6 border border-dashed border-slate-300 shadow-2xs text-center space-y-3 hover:border-emerald-400 transition-all group"
      >
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mx-auto group-hover:scale-105 transition-transform shadow-2xs">
          🐶
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-semibold text-slate-900">
            Aún no tenés ningún perfil de mascota
          </h3>
          <p className="text-xs text-slate-500">
            Creá la ficha de tu mascota para que los paseadores conozcan sus cuidados, edad y temperamento.
          </p>
        </div>

        <button
          type="button"
          id="btn-crear-primer-perfil-perro"
          onClick={() => {
            if (typeof window !== 'undefined') window.scrollTo(0, 0);
            onAddNewDog();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Crear Perfil de Mascota</span>
        </button>
      </div>
    );
  }

  // Active dog for the open Info Modal
  const modalDog = dogs.find(d => d.id === infoModalDogId);
  const modalSol = solicitudes.find(
    s => s.perro?.id === modalDog?.id &&
    (s.estado === 'pendiente' || s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia')
  ) || (modalDog ? solicitudes.find(s => s.perro?.id === modalDog.id) : undefined);

  // 1 o más mascotas registradas
  return (
    <div id="contenedor-perfiles-perros" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium tracking-wide mb-0.5 border border-emerald-100">
            <PawPrint className="w-3 h-3 text-emerald-600" /> Mascotas Registradas
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Perfiles de Perros ({dogs.length})
          </h3>
          <p className="text-xs text-slate-500 font-normal">
            Fichas médicas y estado del plan de paseo de tus mascotas en Walkie.
          </p>
        </div>

        <button
          type="button"
          id="btn-agregar-otro-perfil-perro"
          onClick={() => {
            if (typeof window !== 'undefined') window.scrollTo(0, 0);
            onAddNewDog();
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          title="Crear un nuevo perfil de mascota"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Agregar Mascota</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Perros + Tarjeta Agregar Mascota */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 items-stretch pt-0.5">
        {dogs.map((dog, dogIdx) => {
          const isSelected = selectedDogId === dog.id;
          const activeSol = solicitudes.find(
            s => s.perro?.id === dog.id &&
            (s.estado === 'pendiente' || s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'en_emergencia')
          ) || solicitudes.find(s => s.perro?.id === dog.id);

          const dogSub = getDogSubscription(dog.id, dog);
          const diasDesglose = activeSol ? getOrBuildSolicitudDiasDesglose(activeSol) : [];
          const totalPlanWalks = activeSol ? (
            activeSol.tipoPlan === 'Oro' ? 7 :
            activeSol.tipoPlan === 'Plata' ? 5 :
            activeSol.tipoPlan === 'Bronce' ? 3 :
            activeSol.tipoPlan === 'Express' ? 1 : (diasDesglose.length || 3)
          ) : (dogSub.totalWeeklyWalks || 0);

          const completedWalksCount = diasDesglose.filter(d => d.estado === 'completado').length;
          const allWalksCompleted = (totalPlanWalks > 0 && completedWalksCount >= totalPlanWalks) || (dogSub.hasActivePlan && dogSub.isCycleCompleted);
          
          // La oferta/plan activo existe mientras no todos los paseos estén completados/finalizados
          const hasActiveOffer = Boolean(
            activeSol && 
            !allWalksCompleted && 
            activeSol.estado !== 'completada' && 
            activeSol.estado !== 'cancelada'
          );

          // Cálculo de turnos aceptados vs pendientes en el desglose
          const totalPlanCount = (diasDesglose.length > 0) ? diasDesglose.length : totalPlanWalks;
          const acceptedTurns = diasDesglose.filter(d => d.estado === 'asignado' || d.estado === 'en_camino' || d.estado === 'en_curso');
          const completedTurns = diasDesglose.filter(d => d.estado === 'completado');
          const pendingTurns = diasDesglose.filter(d => d.estado === 'disponible' || (!d.estado && d.estado !== 'cancelado'));
          
          const pendingCount = (diasDesglose.length > 0) 
            ? pendingTurns.length 
            : Math.max(0, totalPlanCount - acceptedTurns.length - completedTurns.length);

          // Nombres de todos los paseadores que han aceptado turnos (sin duplicados)
          const distinctWalkers = Array.from(new Set(
            acceptedTurns
              .map(d => d.paseadorNombre || activeSol?.paseadorNombre)
              .filter(Boolean) as string[]
          ));
          if (distinctWalkers.length === 0 && activeSol?.paseadorNombre && activeSol.estado === 'aceptada') {
            distinctWalkers.push(activeSol.paseadorNombre);
          }

          const hasSomeAccepted = distinctWalkers.length > 0;
          const isFullyAssigned = hasSomeAccepted && pendingCount === 0;

          return (
            <motion.div
              key={dog.id ? `dog-${dog.id}-${dogIdx}` : `dog-${dogIdx}`}
              layout
              onClick={() => onSelectDog(dog.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between h-full ${
                isSelected
                  ? 'border-emerald-600/70 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-500/20'
                  : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
              }`}
            >
              {/* Indicador sutil de Mascota Activa */}
              {isSelected && (
                <div className="absolute top-3 right-3 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                  <Check className="w-2.5 h-2.5 stroke-[2.5]" /> Activo
                </div>
              )}

              <div>
                {/* Cabecera del perro */}
                <div className="flex items-start gap-2.5 pr-14">
                  {dog.photoUrl ? (
                    <img
                      src={dog.photoUrl}
                      alt={dog.name}
                      className={`w-10 h-10 rounded-full object-cover shrink-0 border-2 transition-all shadow-2xs ${
                        isSelected 
                          ? 'border-emerald-600 ring-2 ring-emerald-400/50' 
                          : 'border-slate-200'
                      }`}
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
                      isSelected 
                        ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      <Dog className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-slate-900 text-sm truncate">
                      {dog.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate font-normal">
                      {dog.breed || 'Mestizo'} {dog.age ? `• ${dog.age}` : ''}
                    </p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {dog.weightCategory}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {dog.temperament}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de Progreso y Estado del Plan */}
                <DogWeeklyWalksProgressBar 
                  dog={dog} 
                  solicitud={activeSol}
                  onUpdatePlan={() => onUpdatePlan?.(dog)}
                />
              </div>

              {/* Sección Inferior: Botón Información de Paseos, Asignación y Pie de Tarjeta */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                {/* 📋 BOTÓN EXCLUSIVO: INFORMACIÓN DE PASEOS (Visible solo con oferta/plan activo no completado) */}
                {hasActiveOffer && (
                  <button
                    type="button"
                    id={`btn-info-paseos-${dog.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoModalDogId(dog.id);
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>📋 Información de paseos</span>
                  </button>
                )}

                {/* Etiqueta dinámica de asignación del paseador y conteo de pendientes */}
                <div className="w-full">
                  {hasActiveOffer ? (
                    isFullyAssigned ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/90 text-xs shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-[11px] truncate">
                          Paseos tomados por: <strong className="text-emerald-950 font-bold">{distinctWalkers.join(', ')}</strong>
                        </span>
                      </div>
                    ) : pendingCount > 0 ? (
                      <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 text-xs shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                          <span className="font-semibold text-[11px] truncate">
                            {hasSomeAccepted 
                              ? `Paseador: ${distinctWalkers.join(', ')}`
                              : 'Buscando paseador...'}
                          </span>
                        </div>
                        <span className="text-[10px] bg-amber-200/90 text-amber-950 font-extrabold px-2 py-0.5 rounded-md shrink-0 uppercase tracking-wide">
                          {pendingCount}/{totalPlanCount} pendientes
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200/90 text-xs shadow-2xs">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-semibold text-[11px] truncate">
                          {distinctWalkers.length > 0 ? `Paseos tomados por: ${distinctWalkers.join(', ')}` : 'Plan confirmado'}
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 text-slate-400 text-[10px]">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">Sin paseador asignado</span>
                    </div>
                  )}
                </div>

                {/* Ubicación y Botones de Edición / Eliminación */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[11px] text-slate-400 font-normal truncate max-w-[130px]" title={dog.pickupLocation}>
                    📍 {dog.pickupLocation || 'Valle de Punilla'}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditDog(dog);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Editar ficha médica"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteDog && (
                      <button
                        type="button"
                        id={`btn-eliminar-perro-${dog.id}`}
                        disabled={hasActiveOffer}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasActiveOffer) return;
                          setDogToDelete(dog);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          hasActiveOffer
                            ? 'text-slate-300 bg-slate-50 cursor-not-allowed opacity-50'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                        }`}
                        title={
                          hasActiveOffer
                            ? 'No es posible eliminar el perfil mientras tenga un plan de paseos activo o en curso.'
                            : 'Eliminar perfil de mascota'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Tarjeta Armónica "+ Agregar Mascota" (misma altura y proporciones) */}
        <motion.button
          type="button"
          id="card-btn-agregar-mascota-plus"
          layout
          onClick={() => {
            if (typeof window !== 'undefined') window.scrollTo(0, 0);
            onAddNewDog();
          }}
          className="p-4 rounded-2xl border border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center text-center gap-2.5 h-full min-h-[220px] cursor-pointer group shadow-2xs"
          title="Agregar nueva mascota"
        >
          <div className="w-10 h-10 rounded-full bg-white group-hover:bg-emerald-600 text-slate-400 group-hover:text-white border border-slate-200 group-hover:border-emerald-600 flex items-center justify-center transition-all shadow-2xs">
            <Plus className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-900 block">
              + Agregar Mascota
            </span>
            <span className="text-[11px] text-slate-400 font-normal block">
              Añadir otro perfil
            </span>
          </div>
        </motion.button>
      </div>

      {/* 📋 MODAL DESPLEGABLE CON INFORMACIÓN DE LA OFERTA / PLAN DE PASEOS */}
      <AnimatePresence>
        {infoModalDogId && modalDog && modalSol && (() => {
          const modalDias = getOrBuildSolicitudDiasDesglose(modalSol);
          const acceptedDays = modalDias.filter(d => d.estado !== 'disponible' && d.estado !== 'cancelado');
          const hasAnyAccepted = acceptedDays.length > 0;
          const totalPlanWalks = modalSol.tipoPlan === 'Oro' ? 7 :
                                modalSol.tipoPlan === 'Plata' ? 5 :
                                modalSol.tipoPlan === 'Bronce' ? 3 :
                                modalSol.tipoPlan === 'Express' ? 1 : (modalDias.length || 3);
          const allAccepted = acceptedDays.length >= totalPlanWalks;
          const primaryWalker = modalSol.paseadorNombre || acceptedDays[0]?.paseadorNombre || 'Paseador Oficial';
          const primaryWalkerPhoto = modalSol.paseadorFoto || acceptedDays[0]?.paseadorFoto;
          const primaryWalkerPhone = modalSol.paseadorTelefono || acceptedDays[0]?.paseadorTelefono;

          return (
            <div
              key="modal-info-paseos-overlay"
              id="modal-info-paseos-overlay"
              className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
              onClick={() => setInfoModalDogId(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto text-left relative"
              >
                {/* Header con botón de cierre ✕ destacado */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Plan {modalSol.tipoPlan}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        {acceptedDays.length}/{totalPlanWalks} confirmados
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      Información de Paseos • {modalDog.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {allAccepted 
                        ? '¡Todos los turnos de tu plan han sido confirmados!' 
                        : `${acceptedDays.length} de ${totalPlanWalks} paseos confirmados • Notificando en radio de 10 km.`}
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-cerrar-info-paseos-modal"
                    onClick={() => setInfoModalDogId(null)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
                    title="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Desglose Detallado de los Turnos */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span>Desglose individual por día del plan</span>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono">
                      {acceptedDays.length}/{totalPlanWalks} turnos
                    </span>
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {modalDias.map((dia, diaIdx) => {
                      const isDiaCompleted = dia.estado === 'completado';
                      const isDiaAccepted = dia.estado === 'asignado' || dia.estado === 'en_camino' || dia.estado === 'en_curso' || isDiaCompleted;
                      // Comportamiento asimétrico: Para el cliente, si el turno fue rechazado por un paseador,
                      // no se muestra como "Rechazado" ni genera alarmas; se muestra como "En Proceso" / "Buscando paseador..."
                      const isDiaRejected = false;
                      const walkerName = dia.paseadorNombre || modalSol.paseadorNombre || 'Paseador Certificado';

                      return (
                        <div
                          key={`dpm-dia-${dia.id || 'd'}-${diaIdx}`}
                          className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isDiaAccepted
                              ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isDiaAccepted 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}>
                              {isDiaAccepted ? '✓' : '⏳'}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                Paseo del <strong className={isDiaAccepted ? 'text-emerald-800' : 'text-amber-800'}>{dia.diaNombre}</strong> {dia.fechaCorta ? `(${dia.fechaCorta})` : ''}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {isDiaCompleted
                                  ? `Paseo realizado con éxito por ${walkerName}`
                                  : isDiaAccepted 
                                  ? `Aceptado por ${walkerName}` 
                                  : 'En búsqueda de paseador...'}
                              </p>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ⏰ {dia.horario} • 45 min activos
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                            {isDiaCompleted ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                <span>✓ Paseo Finalizado</span>
                              </span>
                            ) : isDiaAccepted ? (
                              <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 text-emerald-600 stroke-[2.5]" />
                                <span>Aceptado</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                                <span>En Proceso</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tarjetas de Contacto de Paseadores Asignados (Soporta múltiples paseadores por turno) */}
                {hasAnyAccepted && (() => {
                  // Agrupar paseadores únicos que aceptaron turnos de este plan
                  interface WalkerInfo {
                    nombre: string;
                    foto?: string;
                    telefono?: string;
                    dias: string[];
                  }
                  const walkerMap: Record<string, WalkerInfo> = {};

                  acceptedDays.forEach(d => {
                    const name = d.paseadorNombre || modalSol.paseadorNombre || 'Paseador Oficial';
                    const photo = d.paseadorFoto || modalSol.paseadorFoto;
                    const phone = d.paseadorTelefono || modalSol.paseadorTelefono;
                    if (!walkerMap[name]) {
                      walkerMap[name] = { nombre: name, foto: photo, telefono: phone, dias: [] };
                    }
                    if (d.diaNombre) {
                      walkerMap[name].dias.push(d.diaNombre);
                    }
                  });

                  const uniqueWalkers = Object.values(walkerMap);

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                          {uniqueWalkers.length > 1 ? 'Paseadores Asignados a tu Plan' : 'Paseador Asignado'}
                        </span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-bold">
                          {uniqueWalkers.length} {uniqueWalkers.length === 1 ? 'paseador' : 'paseadores'}
                        </span>
                      </div>

                      {uniqueWalkers.map((walker, wIdx) => (
                        <div key={`modal-walker-${wIdx}`} className="bg-slate-900 text-white rounded-2xl p-4 border border-emerald-500/40 space-y-3">
                          <div className="flex items-center gap-3">
                            {walker.foto ? (
                              <img
                                src={walker.foto}
                                alt={walker.nombre}
                                className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 flex items-center justify-center font-bold text-lg shrink-0">
                                🚶
                              </div>
                            )}
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-sm font-black text-white truncate">
                                  {walker.nombre}
                                </h4>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-emerald-500/30">
                                  ⭐ Paseador Certificado
                                </span>
                              </div>
                              <p className="text-[11px] text-emerald-300 font-medium truncate">
                                Turnos a cargo: {walker.dias.join(', ')}
                              </p>
                              <p className="text-[10.5px] text-slate-400 truncate">
                                Punto de retiro: {modalSol.ubicacion?.direccion || modalDog.pickupLocation}
                              </p>
                            </div>
                          </div>

                          {/* Botones de Contacto WhatsApp / Mapa */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                            {walker.telefono && (
                              <button
                                type="button"
                                id={`btn-modal-whatsapp-paseador-${wIdx}`}
                                onClick={() => {
                                  const url = formatWhatsAppLink(
                                    walker.telefono!,
                                    `Hola ${walker.nombre}, soy el dueño de ${modalDog.name}. Te contacto por el paseo agendado en Walkie (${walker.dias.join(', ')}).`
                                  );
                                  window.open(url, '_blank');
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Contactar a {walker.nombre.split(' ')[0]} (WhatsApp)</span>
                              </button>
                            )}

                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(modalSol.ubicacion?.direccion || modalDog.pickupLocation || 'La Cumbre, Cordoba')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs shadow flex items-center gap-1.5 transition-all shrink-0"
                            >
                              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Ver Mapa</span>
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Botón de Cierre en Pie */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setInfoModalDogId(null)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* DIÁLOGO / MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE PERRO */}
      <AnimatePresence>
        {dogToDelete && (
          <div
            key="modal-confirmar-eliminar-perro"
            id="modal-confirmar-eliminar-perro"
            className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setDogToDelete(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center mx-auto shadow-2xs">
                <Trash2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  ¿Estás seguro de eliminar el perfil de {dogToDelete.name}?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Esta acción borrará permanentemente la ficha médica, cuidados y configuraciones de esta mascota.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  id="btn-cancelar-eliminar-perro-modal"
                  onClick={() => setDogToDelete(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  No
                </button>
                <button
                  type="button"
                  id="btn-confirmar-eliminar-perro-modal"
                  onClick={() => {
                    if (onDeleteDog && dogToDelete) {
                      onDeleteDog(dogToDelete.id);
                    }
                    setDogToDelete(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  Sí
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
