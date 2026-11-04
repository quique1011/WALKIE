import React, { useState, useEffect } from 'react';
import { PlanType, WeekBooking, TipoCorrea } from '../types';
import { DESCUENTOS_SEMANAS } from '../data/initialData';
import { 
  Calendar, Clock, CheckCircle2, 
  ChevronDown, ChevronLeft, ChevronRight, Tag, Check, CalendarDays, Timer,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScheduleConfiguratorProps {
  planType: PlanType | null;
  basePrice: number;
  walksPerWeek: number;
  weeksCount: number;
  onWeeksCountChange: (count: number) => void;
  weeksData: WeekBooking[];
  onWeeksDataChange: (data: WeekBooking[]) => void;
  tipoCorrea?: TipoCorrea;
  onTipoCorreaChange?: (tipo: TipoCorrea) => void;
  isWeekConfirmed?: boolean;
  onConfirmSchedule?: () => void;
}

export function getWeekDetails(weekOffset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Dynamic rolling start date starting from today + (weekOffset * 7 days)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + (weekOffset * 7));
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const isWholeWeekPast = endDate.getTime() < today.getTime();

  const spanishDayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const spanishShortDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Window of 7 consecutive days starting from startDate
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + idx);
    d.setHours(0, 0, 0, 0);

    const dayOfWeekIdx = d.getDay(); // 0 is Sunday, 1 is Monday...
    const dayName = spanishDayNames[dayOfWeekIdx];
    const shortDay = spanishShortDays[dayOfWeekIdx];
    
    const dayNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    const isoDate = `${d.getFullYear()}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dateCorta = `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}`;

    // Check if day is strictly in the past (before today 00:00)
    const isPast = d.getTime() < today.getTime();
    const isToday = d.getTime() === today.getTime();

    return {
      name: dayName,
      short: `${shortDay} ${dayNum}`,
      dateCorta,
      dayNum,
      isoDate,
      isPast,
      isToday,
      dateObj: d
    };
  });

  const monthFormatter = new Intl.DateTimeFormat('es-AR', { month: 'long' });
  const startMonth = monthFormatter.format(startDate);
  const endMonth = monthFormatter.format(endDate);
  
  const startDayName = days[0].name;
  const endDayName = days[6].name;

  const startDayStr = `${startDayName} ${startDate.getDate()} de ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)}`;
  const endDayStr = `${endDayName} ${endDate.getDate()} de ${endMonth.charAt(0).toUpperCase() + endMonth.slice(1)} de ${endDate.getFullYear()}`;
  const rangeLabel = `Semana del ${startDayStr} al ${endDayStr}`;
  const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
  const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  return { startDate, endDate, days, rangeLabel, startDateStr, endDateStr, isWholeWeekPast };
}

// Hours strictly starting from 17:00 hs onwards
const STRICT_HOURS = [
  '17:00 hs',
  '18:00 hs',
  '19:00 hs',
  '20:00 hs',
  '21:00 hs'
];

const FRACTIONAL_MINUTES = [
  { value: 0, label: '45 min Estándar', surcharge: 0, desc: 'Sin tiempo extra (+$0)' },
  { value: 15, label: '+15 min extra', surcharge: 1300, desc: 'Tiempo extra (15 min): $1.300 extra' },
  { value: 30, label: '+30 min extra', surcharge: 2600, desc: 'Tiempo extra (30 min): $2.600 extra' },
  { value: 45, label: '+45 min extra', surcharge: 3900, desc: 'Tiempo extra (45 min): $3.900 extra' }
];

export const ScheduleConfigurator: React.FC<ScheduleConfiguratorProps> = ({
  planType,
  walksPerWeek,
  weeksCount = 1,
  onWeeksCountChange,
  weeksData = [],
  onWeeksDataChange,
  tipoCorrea = 'propia',
  onTipoCorreaChange,
  onConfirmSchedule
}) => {
  const [activeWeekIndex, setActiveWeekIndex] = useState<number>(0);
  const [futureWeekOffset, setFutureWeekOffset] = useState<number>(0);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [warningToast, setWarningToast] = useState<string | null>(null);

  // Estado explícito de semanas guardadas individualmente
  const [savedWeeks, setSavedWeeks] = useState<Record<number, boolean>>({});

  // Reset active week to Semana 1 (0) and reset savedWeeks whenever planType changes
  useEffect(() => {
    setActiveWeekIndex(0);
    setSavedWeeks({});
  }, [planType]);

  const safeWeeks = Array.isArray(weeksData) ? weeksData : [];
  const discountPercent = DESCUENTOS_SEMANAS[weeksCount] || 0;

  // Actualizar fechas mapeadas de cada semana cuando cambie el offset de inicio
  useEffect(() => {
    const updated = safeWeeks.map((w, idx) => {
      const weekDetail = getWeekDetails(futureWeekOffset + idx);
      const selectedDates = (w.selectedDays || []).map(dName => {
        const match = weekDetail.days.find(d => d.name === dName);
        return match?.isoDate || '';
      }).filter(Boolean);

      return {
        ...w,
        startDateStr: weekDetail.startDateStr,
        endDateStr: weekDetail.endDateStr,
        selectedDatesList: selectedDates,
        weekLabel: `Semana ${idx + 1} (${weekDetail.startDateStr} al ${weekDetail.endDateStr})`
      };
    });

    const hasChanges = updated.length !== safeWeeks.length || updated.some((uw, idx) => {
      const orig = safeWeeks[idx];
      if (!orig) return true;
      return orig.startDateStr !== uw.startDateStr ||
             orig.endDateStr !== uw.endDateStr ||
             orig.weekLabel !== uw.weekLabel ||
             JSON.stringify(orig.selectedDatesList) !== JSON.stringify(uw.selectedDatesList);
    });

    if (hasChanges) {
      onWeeksDataChange(updated);
    }
  }, [futureWeekOffset, weeksCount]);

  // Toggle Day Selection for a specific week with strict plan limit and past-date blocking
  const handleToggleDay = (weekIdx: number, day: string) => {
    const weekDetail = getWeekDetails(futureWeekOffset + weekIdx);
    const dayObj = weekDetail.days.find(d => d.name === day);
    
    // 🚫 Bloquear selección de días pasados
    if (dayObj?.isPast) {
      setWarningToast(`El día ${day} (${dayObj.dateCorta}) ya transcurrió. Por favor selecciona días de hoy en adelante.`);
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    // Al modificar los días, la semana vuelve a estado "Pendiente" hasta que el usuario presione Guardar
    setSavedWeeks(prev => ({ ...prev, [weekIdx]: false }));

    const updated = weeksData.map((w, idx) => {
      if (idx !== weekIdx) return w;
      let newDays = [...(w.selectedDays || [])];

      if (newDays.includes(day)) {
        // Deseleccionar el día
        newDays = newDays.filter(d => d !== day);
      } else {
        if (walksPerWeek === 1) {
          // Plan Común / Express: permite ÚNICAMENTE 1 día por semana (lo reemplaza)
          newDays = [day];
        } else if (newDays.length < walksPerWeek) {
          newDays.push(day);
        } else {
          // Límite alcanzado para el plan (ej: 7 días para Plan Oro, 5 para Plata, 3 para Bronce)
          setWarningToast(`El Plan ${planType || ''} permite seleccionar hasta ${walksPerWeek} días por semana.`);
          setTimeout(() => setWarningToast(null), 3000);
          return w;
        }
      }

      // Compute exact ISO dates
      const selectedDates = newDays.map(dName => {
        const match = weekDetail.days.find(d => d.name === dName);
        return match?.isoDate || '';
      }).filter(Boolean);

      return { 
        ...w, 
        selectedDays: newDays,
        selectedDatesList: selectedDates,
        startDateStr: weekDetail.startDateStr,
        endDateStr: weekDetail.endDateStr,
        weekLabel: `Semana ${weekIdx + 1} (${weekDetail.startDateStr} al ${weekDetail.endDateStr})`
      };
    });
    onWeeksDataChange(updated);
  };

  // Change Preferred Hour
  const handleHourChange = (weekIdx: number, hour: string) => {
    setSavedWeeks(prev => ({ ...prev, [weekIdx]: false }));
    const updated = weeksData.map((w, idx) => {
      if (idx !== weekIdx) return w;
      return { ...w, preferredTime: hour };
    });
    onWeeksDataChange(updated);
  };

  // Change Fractional Minutes
  const handleFractionalMinutesChange = (weekIdx: number, minutes: number) => {
    setSavedWeeks(prev => ({ ...prev, [weekIdx]: false }));
    const updated = weeksData.map((w, idx) => {
      if (idx !== weekIdx) return w;
      return { ...w, extraTimeMinutes: minutes };
    });
    onWeeksDataChange(updated);
  };

  // Change Leash / Equipment strictly per individual week
  const handleWeekTipoCorreaChange = (weekIdx: number, tipo: TipoCorrea) => {
    setSavedWeeks(prev => ({ ...prev, [weekIdx]: false }));
    const updated = weeksData.map((w, idx) => {
      if (idx !== weekIdx) return w;
      return { ...w, tipoCorrea: tipo };
    });
    onWeeksDataChange(updated);
    if (onTipoCorreaChange && weekIdx === 0) {
      onTipoCorreaChange(tipo);
    }
  };

  // Guardar configuración de una semana individual y avanzar automáticamente
  const handleSaveIndividualWeek = (idx: number) => {
    const currentWeek = safeWeeks[idx];
    const selectedCount = currentWeek?.selectedDays?.length || 0;

    if (!currentWeek || selectedCount < walksPerWeek) {
      setWarningToast(`Por favor, seleccioná los ${walksPerWeek} días requeridos de la Semana ${idx + 1} antes de continuar.`);
      setTimeout(() => setWarningToast(null), 3500);
      return;
    }

    const nextSaved = { ...savedWeeks, [idx]: true };
    setSavedWeeks(nextSaved);

    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);

    const isLastWeek = idx === weeksCount - 1;

    if (!isLastWeek) {
      // Avanzar a la siguiente semana
      setActiveWeekIndex(idx + 1);
    } else {
      // Última semana guardada: colapsar y confirmar
      setActiveWeekIndex(-1);
      if (onConfirmSchedule) {
        onConfirmSchedule();
      }
    }
  };

  return (
    <section id="section-configurador-horarios" className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-6">
      {/* 1. SELECTOR DE CANTIDAD DE SEMANAS (AMPLIO, CÓMODO Y VISUAL) */}
      <div className="flex flex-col items-center justify-center text-center space-y-4 pb-4 border-b border-slate-100">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
          <CalendarDays className="w-3.5 h-3.5" /> Selección de Período y Frecuencia
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            ¿Cuántas Semanas deseas agendar para tu Mascota?
          </h3>
          <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto mt-1 leading-relaxed">
            Elegí la duración del plan con ventana de fechas corridas a partir de hoy. A mayor cantidad de semanas continuas, mayor descuento acumulado.
          </p>
        </div>

        {/* Botones Grandes para 1, 2, 3, 4 Semanas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mx-auto pt-1">
          {[1, 2, 3, 4].map((num) => {
            const isSelected = weeksCount === num;
            const disc = DESCUENTOS_SEMANAS[num];
            return (
              <button
                key={num}
                type="button"
                id={`btn-semanas-${num}`}
                onClick={() => {
                  onWeeksCountChange(num);
                  setSavedWeeks({}); // Reiniciar estados al cambiar cantidad de semanas
                  setActiveWeekIndex(0);
                }}
                className={`py-3.5 sm:py-4 px-3 sm:px-4 rounded-2xl font-black transition-all cursor-pointer flex flex-col items-center justify-center min-h-[64px] active:scale-95 shadow-xs ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400 border-2 border-emerald-600 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-2 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-sm sm:text-base font-extrabold tracking-tight">
                  {num} {num === 1 ? 'Semana' : 'Semanas'}
                </span>
                {disc > 0 ? (
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-1 shadow-2xs ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    -{disc}% OFF
                  </span>
                ) : (
                  <span className="text-[10px] opacity-70 mt-1 font-semibold">Tarifa Base</span>
                )}
              </button>
            );
          })}
        </div>

        {/* SELECTOR Y CONTENEDOR DESTACADO DE FECHA INICIAL */}
        <div className="w-full max-w-2xl mx-auto pt-2">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-emerald-50/70 border-2 border-emerald-200/90 rounded-2xl p-3 sm:p-4 gap-3 shadow-2xs">
            <button
              type="button"
              onClick={() => setFutureWeekOffset(prev => Math.max(0, prev - 1))}
              disabled={futureWeekOffset === 0}
              className={`py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                futureWeekOffset === 0 
                  ? 'text-slate-300 cursor-not-allowed bg-transparent' 
                  : 'text-slate-800 bg-white hover:bg-emerald-100/60 shadow-xs font-black border border-slate-200'
              }`}
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-700" />
              <span className="font-bold">Semana Anterior</span>
            </button>

            <div className="text-center px-2">
              <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-900 block">
                {futureWeekOffset === 0 ? '📅 Iniciar en Fecha Actual (Ventana Móvil)' : `📅 Reservar con +${futureWeekOffset} Semanas de anticipación`}
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900 block mt-0.5">
                {getWeekDetails(futureWeekOffset).rangeLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setFutureWeekOffset(prev => Math.min(8, prev + 1))}
              disabled={futureWeekOffset >= 8}
              className={`py-2 px-3 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                futureWeekOffset >= 8 
                  ? 'text-slate-300 cursor-not-allowed bg-transparent' 
                  : 'text-slate-800 bg-white hover:bg-emerald-100/60 shadow-xs font-black border border-slate-200'
              }`}
              title="Avanzar a semanas futuras"
            >
              <span className="font-bold">Semana Siguiente</span>
              <ChevronRight className="w-4 h-4 text-emerald-700" />
            </button>
          </div>
        </div>

        {/* Loyalty Discount Banner */}
        {discountPercent > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl mx-auto p-2.5 px-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900 shadow-2xs"
          >
            <div className="flex items-center gap-2 text-left">
              <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>¡Descuento por Continuidad Aplicado!</strong> Ahorrás un <strong>{discountPercent}% extra</strong> por contratar {weeksCount} semanas.
              </span>
            </div>
            <span className="font-mono font-black text-emerald-800 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shrink-0 ml-2 text-xs">
              -{discountPercent}% OFF
            </span>
          </motion.div>
        )}
      </div>

      {/* 2. ACORDEONES DETALLADOS POR CADA SEMANA (CON BOTÓN DINÁMICO ÚNICO) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Configuración de Turnos y Días ({walksPerWeek} {walksPerWeek === 1 ? 'paseo por semana' : 'paseos por semana'})
          </h4>
          <span className="text-xs text-slate-500 font-semibold">Turno Tarde (17:00 hs en adelante)</span>
        </div>

        {safeWeeks.slice(0, weeksCount).map((week, idx) => {
          const isExpanded = activeWeekIndex === idx;
          const isComplete = (week.selectedDays?.length || 0) === walksPerWeek;
          const isWeekSaved = savedWeeks[idx] === true && isComplete;
          const weekDetail = getWeekDetails(futureWeekOffset + idx);
          const isLastWeek = idx === weeksCount - 1;

          return (
            <div
              key={idx}
              id={`accordion-semana-${idx}`}
              className={`rounded-2xl border-2 transition-all overflow-hidden bg-white shadow-xs ${
                isExpanded
                  ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                  : isWeekSaved
                  ? 'border-emerald-300 bg-emerald-50/10 hover:border-emerald-400'
                  : 'border-amber-300 bg-amber-50/10 hover:border-amber-400'
              }`}
            >
              {/* Accordion Header */}
              <div
                onClick={() => setActiveWeekIndex(isExpanded ? -1 : idx)}
                className="p-3 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-50/80 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-xs ${
                    isWeekSaved
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-500 text-slate-950 font-black'
                  }`}>
                    S{idx + 1}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                      Semana {idx + 1}: {weekDetail.rangeLabel}
                    </h4>
                    <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={isWeekSaved ? 'text-emerald-700 font-bold' : 'text-slate-700 font-semibold'}>
                        {week.selectedDays && week.selectedDays.length > 0
                          ? week.selectedDays.join(', ')
                          : `Sin días seleccionados (${week.selectedDays?.length || 0}/${walksPerWeek} requeridos)`}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{week.preferredTime || '18:00 hs'}</span>
                      {week.extraTimeMinutes > 0 && (
                        <span className="text-emerald-700 font-bold">+{week.extraTimeMinutes} min</span>
                      )}
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {week.tipoCorrea === 'walkie' ? '🐾 Correa Walkie' : 'Correa propia'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Badge de Estado: "✓ Lista" o "⏳ Pendiente" */}
                  {isWeekSaved ? (
                    <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>✓ Lista</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                      <span>⏳ Pendiente</span>
                      <span className="text-[10px] font-semibold hidden sm:inline">({week.selectedDays?.length || 0}/{walksPerWeek} días)</span>
                    </span>
                  )}

                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Accordion 4-Part Panel */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key={`accordion-panel-week-${idx}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="border-t border-slate-200 p-4 sm:p-5 bg-white space-y-4"
                  >
                    {/* RANGO DE SEMANA SELECCIONADA DESTACADO */}
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-black text-emerald-950">
                          {weekDetail.rangeLabel}
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                        {weekDetail.startDateStr} al {weekDetail.endDateStr}
                      </span>
                    </div>

                    {/* PARTE 1: DÍAS A AGENDAR (VENTANA MÓVIL DISPONIBLE CON BLOQUEO 🚫) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                          Parte 1: Días a agendar ({walksPerWeek} {walksPerWeek === 1 ? 'día' : 'días'}):
                        </label>
                        <span className={`text-xs sm:text-sm font-bold ${
                          isComplete ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {week.selectedDays?.length || 0}/{walksPerWeek} días seleccionados
                        </span>
                      </div>

                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {weekDetail.days.map((dayObj, dIdx) => {
                          const isDaySelected = week.selectedDays?.includes(dayObj.name);
                          const isLimitReached = (week.selectedDays?.length || 0) >= walksPerWeek && !isDaySelected && walksPerWeek > 1;

                          if (dayObj.isPast) {
                            return (
                              <button
                                key={`week-${idx}-day-${dIdx}-${dayObj.isoDate || dayObj.name}`}
                                type="button"
                                disabled
                                className="py-2 px-1.5 rounded-xl text-xs font-bold border-2 text-center flex flex-col items-center justify-center min-h-[62px] bg-slate-100/90 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed select-none relative"
                                title="Fecha pasada no disponible para reserva"
                              >
                                <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-md mb-0.5 bg-slate-200 text-slate-500 line-through">
                                  {dayObj.dateCorta}
                                </span>
                                <span className="block truncate text-xs text-slate-400 font-semibold">{dayObj.name.slice(0, 3)}</span>
                                <span className="text-[11px] leading-none mt-0.5 text-rose-500 font-bold" title="Fecha pasada">🚫</span>
                              </button>
                            );
                          }

                          return (
                            <button
                              key={`week-${idx}-day-${dIdx}-${dayObj.isoDate || dayObj.name}`}
                              type="button"
                              onClick={() => handleToggleDay(idx, dayObj.name)}
                              title={
                                isLimitReached 
                                  ? `Cupo de ${walksPerWeek} días alcanzado. Deseleccioná un día si deseás cambiarlo.`
                                  : isDaySelected 
                                  ? `Día seleccionado (${dayObj.name}). Hacé clic para desmarcar.` 
                                  : `Seleccionar ${dayObj.name} ${dayObj.dateCorta}`
                              }
                              className={`py-2 px-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border-2 text-center flex flex-col items-center justify-center min-h-[62px] relative ${
                                isDaySelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102 ring-1 ring-emerald-400'
                                  : isLimitReached
                                  ? 'bg-slate-50/60 text-slate-400 border-slate-200 hover:border-amber-300 opacity-80'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {dayObj.isToday && (
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded leading-tight mb-0.5 ${
                                  isDaySelected ? 'bg-amber-300 text-amber-950' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  HOY
                                </span>
                              )}
                              {/* Fecha numérica exacta */}
                              <span className={`text-xs font-mono font-black px-1.5 py-0.5 rounded-md mb-0.5 ${
                                isDaySelected ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-800'
                              }`}>
                                {dayObj.dateCorta}
                              </span>
                              <span className="block truncate text-xs font-bold">{dayObj.name.slice(0, 3)}</span>
                              {isDaySelected && <span className="block text-[9px] opacity-90 leading-none mt-0.5">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PARTE 2: HORARIO (DESDE LAS 17:00 HS) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                          Parte 2: Horario (desde las 17:00 hs):
                        </label>
                        <span className="text-xs text-slate-500 font-semibold">Turno Tarde</span>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {STRICT_HOURS.map((hour) => {
                          const isHourSelected = week.preferredTime === hour;
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => handleHourChange(idx, hour)}
                              className={`py-2.5 px-3 rounded-xl border-2 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 min-h-[44px] ${
                                isHourSelected
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-bold'
                              }`}
                            >
                              <Clock className={`w-3.5 h-3.5 ${isHourSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                              <span className="text-xs sm:text-sm font-bold">{hour}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PARTE 3: TIEMPO EXTRA / FRACCIONES */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                          Parte 3: Tiempo Extra / Fracciones:
                        </label>
                        <span className="text-xs font-bold text-emerald-700">
                          {week.extraTimeMinutes > 0 ? `+${week.extraTimeMinutes} min (+$${(week.extraTimeMinutes / 15 * 1300).toLocaleString('es-AR')})` : '45 min Estándar ($0)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {FRACTIONAL_MINUTES.map((frac) => {
                          const isMinSelected = week.extraTimeMinutes === frac.value;
                          return (
                            <button
                              key={frac.value}
                              type="button"
                              onClick={() => handleFractionalMinutesChange(idx, frac.value)}
                              className={`p-2.5 sm:p-3 rounded-xl border-2 transition-all cursor-pointer text-left flex flex-col justify-center min-h-[50px] ${
                                isMinSelected
                                  ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-500/20'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-medium'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="text-xs sm:text-sm font-bold leading-tight">{frac.label}</span>
                                <Timer className={`w-3.5 h-3.5 ${isMinSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                              </div>
                              <span className="text-[10px] text-slate-500 font-medium leading-none mt-1">
                                {frac.value === 0 ? 'Estándar ($0)' : `+$${frac.surcharge.toLocaleString('es-AR')}/paseo`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* PARTE 4: EQUIPAMIENTO Y CORREA (100% INDIVIDUAL POR CADA SEMANA) */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between gap-1">
                        <label className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">4</span>
                          Parte 4: Equipamiento y Correa (Semana {idx + 1}):
                        </label>
                        <span className="text-xs font-bold text-emerald-700">
                          {(week.tipoCorrea || 'propia') === 'walkie' ? 'Correa Walkie (+$1.000/día)' : 'Correa propia ($0)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          id={`btn-correa-propia-semana-${idx}`}
                          onClick={() => handleWeekTipoCorreaChange(idx, 'propia')}
                          className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center gap-3 min-h-[52px] ${
                            (week.tipoCorrea || 'propia') === 'propia'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-semibold'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                            (week.tipoCorrea || 'propia') === 'propia' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            ✓
                          </div>
                          <div className="leading-tight">
                            <div className="text-xs sm:text-sm font-bold text-slate-900">Uso Correa Propia (Semana {idx + 1})</div>
                            <div className="text-xs text-slate-500">$0 recargo adicional</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          id={`btn-correa-walkie-semana-${idx}`}
                          onClick={() => handleWeekTipoCorreaChange(idx, 'walkie')}
                          className={`p-3 sm:p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-left flex items-center gap-3 min-h-[52px] ${
                            week.tipoCorrea === 'walkie'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500/20 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-semibold'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                            week.tipoCorrea === 'walkie' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            🐾
                          </div>
                          <div className="leading-tight">
                            <div className="text-xs sm:text-sm font-bold text-slate-900">Correa Oficial Walkie (Semana {idx + 1})</div>
                            <div className="text-xs text-emerald-800 font-bold">+$1.000 por día</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* BOTÓN DINÁMICO ÚNICO POR SEMANA AL PIE DEL ACORDEÓN */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border">
                      <div className="text-xs text-slate-600">
                        {isComplete ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            Semana {idx + 1} completa con {week.selectedDays.length} de {walksPerWeek} días seleccionados.
                          </span>
                        ) : (
                          <span className="text-amber-700 font-semibold flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                            Seleccioná {walksPerWeek - (week.selectedDays?.length || 0)} {walksPerWeek - (week.selectedDays?.length || 0) === 1 ? 'día más' : 'días más'} para la Semana {idx + 1}.
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`btn-guardar-semana-${idx}`}
                        onClick={() => handleSaveIndividualWeek(idx)}
                        className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                          isLastWeek
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/50'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>
                          {isLastWeek 
                            ? 'Confirmar y Continuar al Pago' 
                            : `Guardar Semana ${idx + 1}`}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Visual confirmation toast */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            key="toast-save-success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 sm:bottom-6 right-6 z-[9990] bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500 flex items-center gap-2.5 text-xs sm:text-sm font-black"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Semana guardada correctamente.</span>
          </motion.div>
        )}
        {warningToast && (
          <motion.div
            key="toast-warning"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 sm:bottom-6 right-6 z-[9990] bg-amber-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-500 flex items-center gap-2.5 text-xs sm:text-sm font-black max-w-md"
          >
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{warningToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
