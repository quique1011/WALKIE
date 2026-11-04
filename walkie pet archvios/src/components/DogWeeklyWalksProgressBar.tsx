import React, { useState, useEffect } from 'react';
import { DogProfile, PlanType, SolicitudPaseo } from '../types';
import { 
  DogSubscriptionState, 
  getDogSubscription, 
  resetDogCycle, 
  completeDogCycle, 
  getWalksCountForPlan 
} from '../utils/dogSubscriptions';
import { PawPrint, Check, RefreshCw, ArrowRight } from 'lucide-react';
import { DesgloseFechasPaseos } from './DesgloseFechasPaseos';

interface DogWeeklyWalksProgressBarProps {
  dog: DogProfile;
  currentSelectedPlan?: PlanType | null;
  solicitud?: Partial<SolicitudPaseo> | null;
  compact?: boolean;
  onCycleCompleted?: () => void;
  onUpdatePlan?: () => void;
}

export const DogWeeklyWalksProgressBar: React.FC<DogWeeklyWalksProgressBarProps> = ({
  dog,
  currentSelectedPlan,
  solicitud,
  compact = false,
  onCycleCompleted,
  onUpdatePlan
}) => {
  const [subState, setSubState] = useState<DogSubscriptionState>(() => {
    return getDogSubscription(dog.id, dog);
  });

  // Escuchar cambios reactivos de suscripción
  useEffect(() => {
    const handleSubChange = (e: CustomEvent<DogSubscriptionState>) => {
      if (e.detail && e.detail.dogId === dog.id) {
        setSubState(e.detail);
        if (e.detail.isCycleCompleted && onCycleCompleted) {
          onCycleCompleted();
        }
      }
    };

    window.addEventListener('walkie_dog_subscription_change', handleSubChange as EventListener);
    return () => {
      window.removeEventListener('walkie_dog_subscription_change', handleSubChange as EventListener);
    };
  }, [dog.id, onCycleCompleted]);

  // Sincronizar si cambia el perro o su plan
  useEffect(() => {
    const nextSub = getDogSubscription(dog.id, dog);
    setSubState(prev => {
      if (
        prev &&
        prev.dogId === nextSub.dogId &&
        prev.planType === nextSub.planType &&
        prev.totalWeeklyWalks === nextSub.totalWeeklyWalks &&
        prev.completedWalks === nextSub.completedWalks &&
        prev.isPaid === nextSub.isPaid &&
        prev.isCycleCompleted === nextSub.isCycleCompleted
      ) {
        return prev;
      }
      return nextSub;
    });
  }, [dog.id, dog.planActivo]);

  const hasActivePlan = Boolean(
    (subState && subState.hasActivePlan && subState.planType) || 
    (solicitud && solicitud.tipoPlan) || 
    dog.planActivo
  );

  // Cálculo dinámico robusto del total de paseos contratados:
  // 1. Si la solicitud trae desglose de días generados, el total exacto es la cantidad de días del plan (ej. 12, 16, 20 paseos)
  // 2. Si no, calcular semanas * paseosPorSemana o recurrir al valor de subState / catálogo
  const total = Math.max(
    1,
    (solicitud && solicitud.diasDesglose && solicitud.diasDesglose.length > 0)
      ? solicitud.diasDesglose.length
      : (solicitud && solicitud.totalPaseosCalculados && solicitud.totalPaseosCalculados > 0)
      ? solicitud.totalPaseosCalculados
      : subState.totalWeeklyWalks || getWalksCountForPlan(subState.planType || currentSelectedPlan || dog.planActivo || 'Bronce') || 3
  );

  // Cantidad de paseos ya completados:
  // Se toma de los días con estado 'completado' de la solicitud si está disponible, o del estado subState
  const rawCompletedFromSol = solicitud && solicitud.diasDesglose 
    ? solicitud.diasDesglose.filter(d => d.estado === 'completado').length 
    : subState.completedWalks;

  // Determinación de si el ciclo está completado
  const isDone = Boolean(
    hasActivePlan && (
      subState.isCycleCompleted || 
      rawCompletedFromSol >= total ||
      (solicitud && solicitud.estado === 'completada')
    )
  );

  // Cuando está completado, completedWalks es SIEMPRE igual al total; de lo contrario, los completados reales
  const completed = isDone ? total : Math.min(Math.max(0, rawCompletedFromSol), total);

  // Cuando está completado, el porcentaje de la barra es SIEMPRE 100%
  const percent = isDone ? 100 : Math.min(100, Math.round((completed / total) * 100));

  // Manejo de prueba/alternancia de estado
  const handleToggleState = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasActivePlan) return;
    if (isDone) {
      const reset = resetDogCycle(dog.id, subState.planType || currentSelectedPlan || 'Bronce');
      setSubState(reset);
    } else {
      const finished = completeDogCycle(dog.id);
      setSubState(finished);
    }
  };

  const handleUpdatePlanClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdatePlan) {
      onUpdatePlan();
    } else {
      const el = document.getElementById('seccion-planes-paseo');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // CASO 1: Mascota sin plan contratado/activo
  if (!hasActivePlan) {
    if (compact) {
      return (
        <div className="w-full bg-slate-50 rounded-xl p-2.5 border border-dashed border-slate-300 text-left space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-500 flex items-center gap-1.5">
              <PawPrint className="w-3.5 h-3.5 text-slate-400" />
              <span>Sin plan activo</span>
            </span>
          </div>
          <button
            type="button"
            id={`btn-contratar-plan-compact-${dog.id}`}
            onClick={handleUpdatePlanClick}
            className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Contratar Plan de Paseos</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      );
    }

    return (
      <div 
        id={`progreso-semanal-${dog.id}`}
        className="w-full bg-slate-50/90 rounded-xl p-3 border border-dashed border-slate-300 text-left space-y-2 mt-2.5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <PawPrint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 truncate">
              Sin plan activo
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium px-2 py-0.5 rounded-full bg-slate-200/70">
            Sin suscripción
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-tight">
          Elegí un plan semanal y completá el pago para habilitar los paseos de tu mascota.
        </p>
        <button
          type="button"
          id={`btn-contratar-plan-${dog.id}`}
          onClick={handleUpdatePlanClick}
          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Contratar Plan de Paseos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // CASO 2: Mascota con Plan Activo y Pago Confirmado
  // Modo Compacto
  if (compact) {
    return (
      <div className="w-full bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/80 text-left space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700 flex items-center gap-1.5">
            <PawPrint className="w-3.5 h-3.5 text-emerald-600" />
            <span>Plan {subState.planType || 'Bronce'}</span>
          </span>
          <span className="text-xs font-medium text-slate-600">
            {completed}/{total} paseos
          </span>
        </div>

        {/* Barra 100% verde al completarse */}
        <div className="w-full h-1.5 rounded-full bg-slate-200/70 overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        {isDone && (
          <button
            type="button"
            id={`btn-actualizar-plan-compact-${dog.id}`}
            onClick={handleUpdatePlanClick}
            className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-2xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Actualizar Plan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  // Vista Principal de la Tarjeta del Perfil
  return (
    <div 
      id={`progreso-semanal-${dog.id}`}
      className="w-full bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 text-left space-y-2.5 mt-2.5"
    >
      {/* Cabecera Unificada: Plan y Contador Numérico Claro */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <PawPrint className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-xs font-medium text-slate-700 truncate">
            Plan {subState.planType || 'Bronce'} {!isDone && <span className="text-[10px] text-emerald-700 font-semibold">• Activo</span>}
          </span>
        </div>

        {/* Único contador numérico no duplicado */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-700">
            {completed}/{total} paseos
          </span>
          {isDone ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>Completado</span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
              ({total - completed} {total - completed === 1 ? 'restante' : 'restantes'})
            </span>
          )}
        </div>
      </div>

      {/* Barra de Progreso: 100% verde cuando el ciclo está completado */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${isDone ? 'bg-emerald-600' : 'bg-emerald-500'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Paseos individuales en círculos sutiles */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: total }).map((_, idx) => {
            const isCompleted = idx < completed;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-medium transition-colors ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-400 border border-slate-200'
                }`}
                title={`Paseo ${idx + 1}: ${isCompleted ? 'Completado' : 'Pendiente'}`}
              >
                {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[2.5]" /> : idx + 1}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleToggleState}
          className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          title={isDone ? "Reiniciar ciclo a 0 paseos" : "Simular ciclo 100% completado"}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Desglose desplegable de días y fechas numéricas */}
      {hasActivePlan && (
        <div className="pt-1.5 border-t border-slate-200/60">
          <DesgloseFechasPaseos
            planType={(subState.planType || currentSelectedPlan || 'Bronce') as PlanType}
            totalPaseos={total}
            completedCount={completed}
            solicitud={solicitud}
          />
        </div>
      )}

      {/* Botón Integrado Renovar Plan */}
      {isDone && (
        <button
          type="button"
          id={`btn-actualizar-plan-${dog.id}`}
          onClick={handleUpdatePlanClick}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Renovar Plan</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
