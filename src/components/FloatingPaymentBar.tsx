import React, { useState, useEffect } from 'react';
import { PlanType, DogProfile, WeekBooking, PaseadorPublico } from '../types';
import { formatPesos } from '../utils/geo';
import { ShieldCheck, ArrowRight, AlertCircle, CreditCard, Check, PawPrint, Lock } from 'lucide-react';
import { getDogSubscription, DogSubscriptionState } from '../utils/dogSubscriptions';

interface FloatingPaymentBarProps {
  planType: PlanType | null;
  basePrice: number;
  weeksCount?: number;
  discountPercent?: number;
  totalCalculated: number;
  dogProfile: DogProfile | null;
  weeksData: WeekBooking[];
  walksPerWeek: number;
  selectionMode: 'automatico' | 'manual';
  selectedPaseador: PaseadorPublico | null;
  isWeekConfirmed?: boolean;
  onAttemptPayment: () => void;
  onShowWarning?: (msg: string) => void;
}

export const FloatingPaymentBar: React.FC<FloatingPaymentBarProps> = ({
  planType,
  basePrice,
  weeksCount = 1,
  totalCalculated,
  dogProfile,
  weeksData = [],
  walksPerWeek = 3,
  selectionMode = 'automatico',
  selectedPaseador = null,
  isWeekConfirmed = false,
  onAttemptPayment,
  onShowWarning
}) => {
  const [subState, setSubState] = useState<DogSubscriptionState | null>(() => {
    return dogProfile ? getDogSubscription(dogProfile.id, dogProfile) : null;
  });
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dogProfile) {
      const nextSub = getDogSubscription(dogProfile.id, dogProfile);
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
    } else {
      setSubState(null);
    }
  }, [dogProfile?.id, dogProfile?.planActivo]);

  useEffect(() => {
    const handleSubChange = (e: CustomEvent<DogSubscriptionState>) => {
      if (dogProfile && e.detail && e.detail.dogId === dogProfile.id) {
        setSubState(e.detail);
      }
    };
    window.addEventListener('walkie_dog_subscription_change', handleSubChange as EventListener);
    return () => {
      window.removeEventListener('walkie_dog_subscription_change', handleSubChange as EventListener);
    };
  }, [dogProfile?.id]);

  if (!planType) return null;

  // Lógica de suscripción semanal y bloqueo de pago
  const isDogPaidForWeek = !!(subState && subState.isPaid && !subState.isCycleCompleted);
  const isDogCycleDone = !!(subState && subState.isCycleCompleted);

  // Ocultar por completo la opción/barra de pago si la semana ya fue abonada y el ciclo está en curso
  if (isDogPaidForWeek) {
    return null;
  }

  // Check completion
  const isDogComplete = !!dogProfile && !!dogProfile.name && !!dogProfile.breed && !!dogProfile.pickupLocation;
  const safeWeeks = Array.isArray(weeksData) ? weeksData : [];
  const areDaysComplete = safeWeeks.slice(0, weeksCount).every(w => (w?.selectedDays?.length ?? 0) === walksPerWeek);
  const isWalkerValid = selectionMode === 'automatico' || (selectionMode === 'manual' && !!selectedPaseador);

  // El botón de pago se habilita cuando los días requeridos están seleccionados y confirmados
  const canProceedToPayment = Boolean(
    planType &&
    areDaysComplete &&
    isWeekConfirmed &&
    isDogComplete &&
    isWalkerValid &&
    !isDogPaidForWeek
  );

  const handleDisabledClick = () => {
    const msg = `Por favor, seleccioná los ${walksPerWeek} días de la semana y confirmá la selección antes de proceder al pago.`;
    setWarningMessage(msg);
    if (onShowWarning) {
      onShowWarning(msg);
    }
    setTimeout(() => {
      setWarningMessage(null);
    }, 4000);
  };

  // Calculate missing reason
  const getMissingReason = () => {
    if (isDogPaidForWeek) return `Pago semanal cubierto (${subState?.completedWalks}/${subState?.totalWeeklyWalks} completados).`;
    if (!isDogComplete) return 'Falta completar ficha del perro';
    if (!areDaysComplete || !isWeekConfirmed) return `Debes seleccionar los ${walksPerWeek} días y confirmar la semana.`;
    if (!isWalkerValid) return 'Seleccioná un paseador en el mapa';
    return null;
  };

  const missingReason = getMissingReason();

  return (
    <div
      id="floating-payment-widget"
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 text-white py-3.5 px-4 shadow-2xl transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Summary overview */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
              <PawPrint className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base text-white">
                  Plan {planType}
                </span>
                <span className="text-xs text-emerald-400 font-semibold">
                  ({walksPerWeek} {walksPerWeek === 1 ? 'paseo/sem' : 'paseos/sem'})
                </span>
                {isDogPaidForWeek && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-900/80 border border-emerald-500/60 text-emerald-300 text-[10px] font-black">
                    PAGO AL DÍA
                  </span>
                )}
                {isDogCycleDone && (
                  <span className="px-2 py-0.5 rounded-md bg-teal-800 border border-teal-400 text-teal-200 text-[10px] font-black">
                    CICLO COMPLETADO
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                <span>Perro: <strong className="text-slate-200">{dogProfile?.name || 'Por definir'}</strong></span>
                <span>•</span>
                <span>Modo: <strong className="text-slate-200">{selectionMode === 'automatico' ? 'Radar 10 km' : selectedPaseador?.nombre || 'Manual'}</strong></span>
                <span>•</span>
                <span>45 min c/u</span>
              </div>
            </div>
          </div>

          {/* Price display */}
          <div className="text-right pl-3 border-l border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {isDogPaidForWeek ? 'Abonado' : 'Total Semanal'}
            </span>
            <div className={`text-xl sm:text-2xl font-black ${isDogPaidForWeek ? 'text-slate-400 line-through' : 'text-emerald-400'}`}>
              {formatPesos(totalCalculated)}
            </div>
          </div>
        </div>

        {/* Right: Smart Button or Paid Disabled State */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3 justify-end relative">
          {warningMessage && (
            <div className="w-full sm:w-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-amber-500/70 bg-amber-950 text-amber-300 animate-pulse shadow-md">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{warningMessage}</span>
            </div>
          )}

          {!warningMessage && missingReason && (
            <div className={`hidden lg:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border max-w-sm ${
              isDogPaidForWeek 
                ? 'text-emerald-300 bg-emerald-950/70 border-emerald-800/80' 
                : 'text-amber-400 bg-amber-950/60 border-amber-800/80'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{missingReason}</span>
            </div>
          )}

          {isDogPaidForWeek ? (
            <button
              id="btn-pago-inhabilitado-semana"
              disabled={true}
              className="w-full md:w-auto py-3.5 px-6 rounded-2xl font-black text-xs sm:text-sm bg-slate-900 border-2 border-emerald-500/40 text-emerald-300/80 flex items-center justify-center gap-2.5 cursor-not-allowed opacity-90 shadow-inner"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>PAGO SEMANAL AL DÍA ({subState?.completedWalks}/{subState?.totalWeeklyWalks})</span>
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            </button>
          ) : (
            <div 
              onClick={!canProceedToPayment ? handleDisabledClick : undefined}
              className="w-full md:w-auto"
            >
              <button
                id="btn-pagar-inteligente"
                type="button"
                disabled={!canProceedToPayment}
                onClick={(e) => {
                  if (!canProceedToPayment) {
                    e.preventDefault();
                    handleDisabledClick();
                  } else {
                    onAttemptPayment();
                  }
                }}
                className={`w-full md:w-auto py-3 px-6 sm:px-8 rounded-2xl font-black text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2.5 shadow-xl ${
                  canProceedToPayment
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/30 scale-102 ring-4 ring-emerald-400/40 cursor-pointer active:scale-95'
                    : 'bg-slate-800/90 text-slate-400 border border-slate-700 cursor-not-allowed opacity-75'
                }`}
                title={!canProceedToPayment ? `Por favor seleccioná los ${walksPerWeek} días de la semana y confirmá antes de abonar.` : "Proceder al pago"}
              >
                <CreditCard className={`w-4 h-4 shrink-0 ${canProceedToPayment ? 'text-slate-950' : 'text-slate-500'}`} />
                <div className="flex items-center gap-2">
                  <span>Pagar con Mercado Pago</span>
                  <span className={`px-2 py-0.5 rounded-lg font-black text-xs ${
                    canProceedToPayment ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-900 text-slate-400'
                  }`}>
                    {formatPesos(totalCalculated)}
                  </span>
                </div>
                {canProceedToPayment ? (
                  <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
