import { PlanType, DogProfile, SolicitudPaseo } from '../types';
import { PLANES_PASEO } from '../data/initialData';

export interface DogSubscriptionState {
  dogId: string;
  dogName: string;
  planType: PlanType | null;
  totalWeeklyWalks: number;
  completedWalks: number;
  isPaid: boolean;
  isCycleCompleted: boolean;
  lastPaymentDate?: string;
  hasActivePlan: boolean;
}

const STORAGE_KEY = 'walkie_dog_subscriptions';

export const getWalksCountForPlan = (planType?: PlanType | null): number => {
  if (!planType) return 0;
  const found = PLANES_PASEO.find(p => p.tipo === planType);
  return found ? found.paseosPorSemana : 0;
};

export const getAllDogSubscriptions = (): Record<string, DogSubscriptionState> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const getDogSubscription = (
  dogId: string,
  fallbackDog?: DogProfile | null,
  solicitudes?: SolicitudPaseo[]
): DogSubscriptionState => {
  const all = getAllDogSubscriptions();
  if (all[dogId]) {
    const state = { ...all[dogId] };
    // Normalizar consistencia: si el ciclo está marcado como completado, completedWalks debe igualar al total
    if (state.isCycleCompleted && state.totalWeeklyWalks > 0 && state.completedWalks < state.totalWeeklyWalks) {
      state.completedWalks = state.totalWeeklyWalks;
      saveDogSubscription(state);
    }
    return state;
  }

  // Si no está registrado en el almacenamiento, buscar en solicitudes históricas reales pagadas
  const dogSolicitudes = solicitudes?.filter(
    s => s.perro?.id === dogId &&
    (s.estado === 'pendiente' || s.estado === 'aceptada' || s.estado === 'en_camino' || s.estado === 'en_curso' || s.estado === 'completada') &&
    (s.montoTotal || 0) > 0
  ) || [];

  if (dogSolicitudes.length > 0) {
    const completedCount = dogSolicitudes.filter(s => s.estado === 'completada').length;
    const lastSol = dogSolicitudes[0];
    const plan: PlanType = (lastSol?.tipoPlan || fallbackDog?.planActivo || 'Bronce') as PlanType;
    const totalWalks = getWalksCountForPlan(plan);
    const isCycleDone = completedCount >= totalWalks && totalWalks > 0;

    const initialState: DogSubscriptionState = {
      dogId,
      dogName: fallbackDog?.name || 'Mascota',
      planType: plan,
      totalWeeklyWalks: totalWalks,
      completedWalks: isCycleDone ? totalWalks : Math.min(completedCount, totalWalks),
      isPaid: !isCycleDone,
      isCycleCompleted: isCycleDone,
      lastPaymentDate: lastSol?.fechaCreacion,
      hasActivePlan: true
    };
    return initialState;
  }

  // Si tiene un planActivo explícito en el perfil
  if (fallbackDog?.planActivo) {
    const plan = fallbackDog.planActivo;
    const totalWalks = getWalksCountForPlan(plan);
    const initialState: DogSubscriptionState = {
      dogId,
      dogName: fallbackDog.name || 'Mascota',
      planType: plan,
      totalWeeklyWalks: totalWalks,
      completedWalks: 0,
      isPaid: true,
      isCycleCompleted: false,
      hasActivePlan: true
    };
    return initialState;
  }

  // Estado inicial estricto de mascota recién registrada: SIN PLAN ACTIVO
  const initialState: DogSubscriptionState = {
    dogId,
    dogName: fallbackDog?.name || 'Mascota',
    planType: null,
    totalWeeklyWalks: 0,
    completedWalks: 0,
    isPaid: false,
    isCycleCompleted: false,
    hasActivePlan: false
  };

  return initialState;
};

export const saveDogSubscription = (state: DogSubscriptionState) => {
  if (typeof window === 'undefined') return;
  try {
    const all = getAllDogSubscriptions();
    all[state.dogId] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(
      new CustomEvent('walkie_dog_subscription_change', { detail: state })
    );
  } catch (err) {
    console.error('Error al guardar suscripción de perro:', err);
  }
};

/**
 * Registra el pago del plan semanal para un perro:
 * - Activa el plan semanal de la mascota
 * - Inhabilita volver a pagar mientras el ciclo esté en curso.
 * - Inicia el progreso del ciclo para la nueva semana (0 de totalWalks).
 */
export const recordDogPayment = (
  dogId: string,
  dogName: string,
  planType: PlanType,
  totalWeeklyWalks?: number
): DogSubscriptionState => {
  const total = totalWeeklyWalks || getWalksCountForPlan(planType);
  const newState: DogSubscriptionState = {
    dogId,
    dogName,
    planType,
    totalWeeklyWalks: total,
    completedWalks: 0,
    isPaid: true,
    isCycleCompleted: false,
    lastPaymentDate: new Date().toISOString(),
    hasActivePlan: true
  };

  saveDogSubscription(newState);
  return newState;
};

/**
 * Avanza 1 paseo completado en el ciclo semanal del perro.
 * Cuando completedWalks alcanza totalWeeklyWalks, isCycleCompleted pasa a true
 * y el botón de pago se reactiva automáticamente.
 */
export const advanceDogWalk = (dogId: string): DogSubscriptionState => {
  const current = getDogSubscription(dogId);
  if (!current.hasActivePlan || !current.planType || current.totalWeeklyWalks <= 0) {
    return current;
  }
  const nextCompleted = current.completedWalks + 1;
  const isFinished = nextCompleted >= current.totalWeeklyWalks;

  const updated: DogSubscriptionState = {
    ...current,
    completedWalks: Math.min(nextCompleted, current.totalWeeklyWalks),
    isCycleCompleted: isFinished,
    // Al finalizar el ciclo semanal, el estado de pago se reactiva para la siguiente semana
    isPaid: !isFinished
  };

  saveDogSubscription(updated);
  return updated;
};

/**
 * Resetea o reinicia el ciclo del perro a 0 paseos
 */
export const resetDogCycle = (dogId: string, planType: PlanType = 'Bronce'): DogSubscriptionState => {
  const total = getWalksCountForPlan(planType);
  const prev = getDogSubscription(dogId);
  const updated: DogSubscriptionState = {
    dogId,
    dogName: prev.dogName || 'Mascota',
    planType,
    totalWeeklyWalks: total,
    completedWalks: 0,
    isPaid: true,
    isCycleCompleted: false,
    hasActivePlan: true
  };

  saveDogSubscription(updated);
  return updated;
};

export const clearUserDogSubscriptions = (userId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (userId) {
      localStorage.removeItem(`${STORAGE_KEY}_${userId}`);
    }
  } catch (err) {
    console.error(err);
  }
};

/**
 * Marca el ciclo semanal como 100% completado (total/total)
 */
export const completeDogCycle = (dogId: string): DogSubscriptionState => {
  const prev = getDogSubscription(dogId);
  if (!prev.hasActivePlan || !prev.planType) {
    return prev;
  }
  const total = prev.totalWeeklyWalks || getWalksCountForPlan(prev.planType) || 3;
  const updated: DogSubscriptionState = {
    ...prev,
    completedWalks: total,
    isCycleCompleted: true,
    isPaid: false
  };

  saveDogSubscription(updated);
  return updated;
};
