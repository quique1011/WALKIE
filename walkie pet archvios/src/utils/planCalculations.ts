import { PlanType, SolicitudPaseo, SolicitudDiaItem } from '../types';
import { PLANES_PASEO } from '../data/initialData';
import { formatPesos } from './geo';

// Constante oficial de ganancia base del paseador por paseo finalizado ($2.400)
export const GANANCIA_BASE_PASEADOR_POR_PASEO = 2400;

export interface PlanPricingDetails {
  tipoPlan: PlanType;
  totalPaseos: number;
  nombrePlan: string;
  labelPlanPaseos: string; // ej: "Plan de 3 paseos"
  
  // Desglose por paseo individual
  tarifaBasePaseo: number;         // $3.000
  comisionPlataformaBase: number;  // $600 (20%)
  netoBasePaseador: number;        // $2.400 (80%)
  
  // Correa oficial Walkie
  isCorreaWalkie: boolean;
  recargoCorreaPaseo: number;      // $1.000 si aplica, $0 si propia
  netoCorreaPaseador: number;      // $500 si aplica (50%)
  comisionCorreaPlataforma: number;// $500 si aplica (50%)

  // Minutos extra si aplica
  minutosExtra: number;
  recargoExtraPaseo: number;

  // Totales por paseo
  precioPorPaseo: number;          // Total cobrado al cliente por 1 paseo
  netoPorPaseo: number;            // Total ganado neto por el paseador por 1 paseo (ej: $2.900 si tiene correa)

  // Totales de todo el plan acumulado
  montoTotalPlan: number;
  montoNetoTotalPlan: number;
  comisionPlataformaTotal: number;

  labelCobroIndividual: string;    // ej: "$2.900 por paseo completado"
  labelTarifaCliente: string;      // ej: "$4.000 por paseo"
  scheduleSummaryText: string;     // ej: "Días solicitados: Lunes 21/09, Miércoles 23/09, Viernes 25/09 - 18:00 hs"
  allScheduledDates: string[];     // Array de fechas exactas 'YYYY-MM-DD'
}

// Helper para obtener el número de paseos según el plan
export function getPlanWalksCount(tipoPlan?: PlanType | null, semanasCantidad: number = 1): number {
  if (!tipoPlan) return 3 * Math.max(1, semanasCantidad);
  const found = PLANES_PASEO.find(p => p.tipo === tipoPlan);
  const baseWalks = found ? found.paseosPorSemana : 3;
  return baseWalks * Math.max(1, semanasCantidad);
}

// Helper para formatear los días solicitados con fechas y horario de forma legible
export function formatSolicitudScheduleSummary(sol: Partial<SolicitudPaseo>): string {
  const preferredTime = sol.horarioPaseo || sol.semanas?.[0]?.preferredTime || '18:00 hs';
  
  // Si tenemos semanas configuradas con días
  if (sol.semanas && sol.semanas.length > 0) {
    const formattedDays: string[] = [];
    sol.semanas.forEach((w, wIdx) => {
      if (w.selectedDays && w.selectedDays.length > 0) {
        w.selectedDays.forEach((dayName) => {
          // Si tiene selectedDatesList mapeada
          const dayShort = dayName.slice(0, 3);
          // Buscar fecha si existe
          let datePart = '';
          if (w.selectedDatesList && w.selectedDatesList.length > 0) {
            // Intentar encontrar la fecha asociada
            const matchingIso = w.selectedDatesList.find(d => {
              const [y, m, dayNum] = d.split('-');
              return !!dayNum;
            });
            if (matchingIso) {
              const [, m, d] = matchingIso.split('-');
              datePart = ` ${d}/${m}`;
            }
          }
          if (!datePart) {
            // Fechas estándar semana en curso septiembre/octubre 2026 de referencia para visualización limpia
            const dayMap: Record<string, string> = {
              'Lunes': '28/09',
              'Martes': '29/09',
              'Miércoles': '30/09',
              'Jueves': '01/10',
              'Viernes': '02/10',
              'Sábado': '03/10',
              'Domingo': '04/10'
            };
            datePart = ` ${dayMap[dayName] || ''}`;
          }
          formattedDays.push(`${dayName}${datePart}`);
        });
      }
    });

    if (formattedDays.length > 0) {
      // Eliminar duplicados si los hay en la misma semana
      const uniqueDays = Array.from(new Set(formattedDays));
      return `Días solicitados: ${uniqueDays.join(', ')} - ${preferredTime}`;
    }
  }

  // Fallback con díasSeleccionados
  if (sol.diasSeleccionados && sol.diasSeleccionados.length > 0) {
    const dayMap: Record<string, string> = {
      'Lunes': '28/09',
      'Martes': '29/09',
      'Miércoles': '30/09',
      'Jueves': '01/10',
      'Viernes': '02/10',
      'Sábado': '03/10',
      'Domingo': '04/10'
    };
    const formatted = sol.diasSeleccionados.map(d => `${d} ${dayMap[d] || ''}`);
    return `Días solicitados: ${formatted.join(', ')} - ${preferredTime}`;
  }

  return `Días solicitados: Lunes 28/09, Miércoles 30/09, Viernes 02/10 - ${preferredTime}`;
}

// Helper para extraer todas las fechas 'YYYY-MM-DD' de una solicitud
export function getAllSolicitudDates(sol: Partial<SolicitudPaseo>): string[] {
  const dates: string[] = [];

  if (sol.fechasProgramadas && sol.fechasProgramadas.length > 0) {
    dates.push(...sol.fechasProgramadas);
  } else if (sol.fechaProgramada) {
    dates.push(sol.fechaProgramada);
  }

  if (sol.semanas && Array.isArray(sol.semanas)) {
    sol.semanas.forEach(w => {
      if (w.selectedDatesList && w.selectedDatesList.length > 0) {
        dates.push(...w.selectedDatesList);
      }
    });
  }

  // Si aún está vacío, mapear días estándar de la semana en curso
  if (dates.length === 0 && sol.diasSeleccionados) {
    const dayToDate: Record<string, string> = {
      'Lunes': '2026-09-28',
      'Martes': '2026-09-29',
      'Miércoles': '2026-09-30',
      'Jueves': '2026-10-01',
      'Viernes': '2026-10-02',
      'Sábado': '2026-10-03',
      'Domingo': '2026-10-04'
    };
    sol.diasSeleccionados.forEach(d => {
      if (dayToDate[d]) dates.push(dayToDate[d]);
    });
  }

  if (dates.length === 0) {
    dates.push('2026-09-28');
  }

  return Array.from(new Set(dates));
}

// Cálculo central y transparente de ganancias y comisiones
export function getSolicitudPricingDetails(sol: Partial<SolicitudPaseo>): PlanPricingDetails {
  const tipoPlan: PlanType = (sol.tipoPlan as PlanType) || 'Bronce';
  const found = PLANES_PASEO.find(p => p.tipo === tipoPlan) || PLANES_PASEO[1];
  const semanasCantidad = Math.max(1, sol.semanasCantidad || 1);
  const walksPerWeek = found.paseosPorSemana || 3;
  const totalPaseos = Math.max(1, walksPerWeek * semanasCantidad);

  // 1. Tarifa base estándar por paseo según el plan contratado
  const tarifaBasePaseo = found.precioUnitario;
  const comisionPlataformaBase = Math.round(tarifaBasePaseo * 0.20); // 20% comisión
  const netoBasePaseador = tarifaBasePaseo - comisionPlataformaBase;  // 80% neto paseador

  // 2. Lógica Correa Oficial Walkie ($1.000 / 50% split)
  const isCorreaWalkie = sol.tipoCorrea === 'walkie' || (sol.recargoCorrea !== undefined && sol.recargoCorrea > 0);
  const recargoCorreaPaseo = isCorreaWalkie ? 1000 : 0;
  const netoCorreaPaseador = isCorreaWalkie ? 500 : 0;
  const comisionCorreaPlataforma = isCorreaWalkie ? 500 : 0;

  // 3. Minutos extra si aplica
  const minutosExtra = sol.duracionMinutos && sol.duracionMinutos > 45 ? sol.duracionMinutos - 45 : 0;
  const recargoExtraPaseo = sol.recargoTiempoExtra && totalPaseos > 0 
    ? Math.round(sol.recargoTiempoExtra / totalPaseos) 
    : (minutosExtra > 0 ? (minutosExtra === 15 ? 1300 : minutosExtra === 30 ? 2600 : 3900) : 0);

  // Totales por paseo individual
  const precioPorPaseo = tarifaBasePaseo + recargoCorreaPaseo + recargoExtraPaseo;
  const netoPorPaseo = netoBasePaseador + netoCorreaPaseador + recargoExtraPaseo;

  // Totales acumulados estrictos (neto por paseo * cantidad exacta de paseos del plan)
  // Tarifa base $3.000 ($2.400 neto) x 5 paseos = $12.000 neto exactos
  const montoTotalPlan = precioPorPaseo * totalPaseos;
  const montoNetoTotalPlan = netoPorPaseo * totalPaseos;
  const comisionPlataformaTotal = montoTotalPlan - montoNetoTotalPlan;

  const scheduleSummaryText = formatSolicitudScheduleSummary(sol);
  const allScheduledDates = getAllSolicitudDates(sol);

  return {
    tipoPlan,
    totalPaseos,
    nombrePlan: found.nombre,
    labelPlanPaseos: `Plan de ${totalPaseos} ${totalPaseos === 1 ? 'paseo' : 'paseos'}`,
    tarifaBasePaseo,
    comisionPlataformaBase,
    netoBasePaseador,
    isCorreaWalkie,
    recargoCorreaPaseo,
    netoCorreaPaseador,
    comisionCorreaPlataforma,
    recargoExtraPaseo,
    minutosExtra,
    precioPorPaseo,
    netoPorPaseo,
    montoTotalPlan,
    montoNetoTotalPlan,
    comisionPlataformaTotal,
    labelCobroIndividual: `${formatPesos(netoPorPaseo)} por paseo completado`,
    labelTarifaCliente: `${formatPesos(precioPorPaseo)} por paseo`,
    scheduleSummaryText,
    allScheduledDates
  };
}

export function getPlanPricingDetails(
  tipoPlan: PlanType = 'Bronce',
  montoTotal?: number,
  montoNetoPaseador?: number,
  semanasCantidad: number = 1
): PlanPricingDetails {
  return getSolicitudPricingDetails({
    tipoPlan,
    montoTotal,
    montoNetoPaseador,
    semanasCantidad
  });
}

export interface PickupWindowInfo {
  isAllowed: boolean;
  unlockTimeStr: string;
  displayScheduledDate: string;
  displayScheduledTime: string;
  statusMessage: string;
  minutesRemaining?: number;
}

/**
 * Valida si el paseador se encuentra dentro de la ventana habilitada para retiro:
 * Máximo 10 minutos antes de la hora exacta pactada en la fecha programada.
 */
export function checkPickupWindow(
  scheduledDateStr?: string,
  scheduledTimeStr?: string,
  currentDateObj: Date = new Date()
): PickupWindowInfo {
  const dateStr = scheduledDateStr || currentDateObj.toISOString().split('T')[0];
  const rawTime = (scheduledTimeStr || '18:00').replace(/hs|hrs|horas/gi, '').trim();
  const [hourStr = '18', minStr = '00'] = rawTime.split(':');
  const targetHour = parseInt(hourStr, 10) || 18;
  const targetMin = parseInt(minStr, 10) || 0;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const y = parseInt(yearStr, 10) || currentDateObj.getFullYear();
  const m = parseInt(monthStr, 10) ? parseInt(monthStr, 10) - 1 : currentDateObj.getMonth();
  const d = parseInt(dayStr, 10) || currentDateObj.getDate();

  const scheduledDateTime = new Date(y, m, d, targetHour, targetMin, 0, 0);

  // Exact 10 minutes before
  const unlockTimestamp = scheduledDateTime.getTime() - (10 * 60 * 1000);
  const currentTimestamp = currentDateObj.getTime();

  // Format unlock time (HH:MM hs)
  const unlockDate = new Date(unlockTimestamp);
  const unlockHour = unlockDate.getHours().toString().padStart(2, '0');
  const unlockMinute = unlockDate.getMinutes().toString().padStart(2, '0');
  const unlockTimeStr = `${unlockHour}:${unlockMinute} hs`;

  const padDay = dayStr ? dayStr.padStart(2, '0') : d.toString().padStart(2, '0');
  const padMonth = monthStr ? monthStr.padStart(2, '0') : (m + 1).toString().padStart(2, '0');
  const displayScheduledDate = `${padDay}/${padMonth}`;
  const displayScheduledTime = `${targetHour.toString().padStart(2, '0')}:${targetMin.toString().padStart(2, '0')} hs`;

  const isAllowed = currentTimestamp >= unlockTimestamp;
  const diffMs = unlockTimestamp - currentTimestamp;
  const minutesRemaining = diffMs > 0 ? Math.ceil(diffMs / (60 * 1000)) : 0;

  const isSameDay = scheduledDateTime.toDateString() === currentDateObj.toDateString();

  let statusMessage = '';
  if (isAllowed) {
    statusMessage = 'Habilitado para retiro';
  } else if (isSameDay) {
    statusMessage = `Disponible a las ${unlockTimeStr}`;
  } else {
    statusMessage = `Disponible el ${displayScheduledDate} a las ${unlockTimeStr}`;
  }

  return {
    isAllowed,
    unlockTimeStr,
    displayScheduledDate,
    displayScheduledTime,
    statusMessage,
    minutesRemaining
  };
}

/**
 * Obtiene o genera el desglose de días individuales para una solicitud de paseo.
 * Cada día cuenta con su fecha, hora, monto neto para el paseador y estado (disponible / asignado).
 */
export function getOrBuildSolicitudDiasDesglose(sol: Partial<SolicitudPaseo>): SolicitudDiaItem[] {
  if (sol.diasDesglose && Array.isArray(sol.diasDesglose) && sol.diasDesglose.length > 0) {
    return sol.diasDesglose;
  }

  const pricing = getSolicitudPricingDetails(sol);
  const preferredTime = sol.horarioPaseo || sol.semanas?.[0]?.preferredTime || '17:00 hs';
  const solId = sol.id || `sol-${Date.now()}`;
  const items: SolicitudDiaItem[] = [];

  const defaultDayToDate: Record<string, { iso: string; corta: string; short: string }> = {
    'Lunes': { iso: '2026-09-28', corta: '28/09', short: 'Lun' },
    'Martes': { iso: '2026-09-29', corta: '29/09', short: 'Mar' },
    'Miércoles': { iso: '2026-09-30', corta: '30/09', short: 'Mié' },
    'Jueves': { iso: '2026-10-01', corta: '01/10', short: 'Jue' },
    'Viernes': { iso: '2026-10-02', corta: '02/10', short: 'Vie' },
    'Sábado': { iso: '2026-10-03', corta: '03/10', short: 'Sáb' },
    'Domingo': { iso: '2026-10-04', corta: '04/10', short: 'Dom' }
  };

  if (sol.semanas && Array.isArray(sol.semanas) && sol.semanas.length > 0) {
    let globalIndex = 0;
    sol.semanas.forEach((w, wIdx) => {
      const days = w.selectedDays || ['Lunes', 'Miércoles', 'Viernes'];
      const weekTime = w.preferredTime || preferredTime;
      days.forEach((dayName, dIdx) => {
        const def = defaultDayToDate[dayName] || { iso: `2026-09-${28 + dIdx}`, corta: `${28 + dIdx}/09`, short: dayName.slice(0, 3) };
        let dateIso = def.iso;
        let dateCorta = def.corta;

        if (w.selectedDatesList && w.selectedDatesList[dIdx]) {
          dateIso = w.selectedDatesList[dIdx];
          const [, m, d] = dateIso.split('-');
          if (m && d) dateCorta = `${d}/${m}`;
        }

        const isOverallAssigned = sol.estado === 'aceptada' || sol.estado === 'en_camino' || sol.estado === 'en_curso' || sol.estado === 'completada';

        const weekCorrea = w.tipoCorrea || sol.tipoCorrea || 'propia';
        const isWeekCorreaWalkie = weekCorrea === 'walkie';
        const weekCorreaRecargo = isWeekCorreaWalkie ? 1000 : 0;
        const weekCorreaNeto = isWeekCorreaWalkie ? 500 : 0;

        const weekExtraMin = w.extraTimeMinutes || 0;
        const weekExtraRecargo = Math.round((weekExtraMin / 15) * 1300);

        const dayPrecioTotal = pricing.tarifaBasePaseo + weekCorreaRecargo + weekExtraRecargo;
        const dayMontoNeto = pricing.netoBasePaseador + weekCorreaNeto + weekExtraRecargo;

        items.push({
          id: `${solId}-w${wIdx}-d${dIdx}`,
          solicitudId: solId,
          diaNombre: dayName,
          diaCorto: def.short,
          fechaStr: dateIso,
          fechaCorta: dateCorta,
          horario: weekTime,
          montoNeto: dayMontoNeto,
          montoTotalCliente: dayPrecioTotal,
          estado: isOverallAssigned ? 'asignado' : 'disponible',
          semanaNumero: wIdx + 1,
          tipoCorrea: weekCorrea as any,
          isCorreaWalkie: isWeekCorreaWalkie,
          paseadorId: isOverallAssigned ? (sol.paseadorId || sol.paseador_id) : undefined,
          paseador_id: isOverallAssigned ? (sol.paseador_id || sol.paseadorId) : undefined,
          paseadorNombre: isOverallAssigned ? sol.paseadorNombre : undefined,
          paseadorFoto: isOverallAssigned ? sol.paseadorFoto : undefined,
          paseadorTelefono: isOverallAssigned ? sol.paseadorTelefono : undefined
        });
        globalIndex++;
      });
    });
  } else if (sol.diasSeleccionados && sol.diasSeleccionados.length > 0) {
    const walksPerWeek = getPlanWalksCount(sol.tipoPlan, 1);
    sol.diasSeleccionados.forEach((dayName, idx) => {
      const def = defaultDayToDate[dayName] || { iso: `2026-09-${28 + idx}`, corta: `${28 + idx}/09`, short: dayName.slice(0, 3) };
      const isOverallAssigned = sol.estado === 'aceptada' || sol.estado === 'en_camino' || sol.estado === 'en_curso' || sol.estado === 'completada';
      const semNum = Math.floor(idx / Math.max(1, walksPerWeek)) + 1;

      items.push({
        id: `${solId}-d${idx}`,
        solicitudId: solId,
        diaNombre: dayName,
        diaCorto: def.short,
        fechaStr: def.iso,
        fechaCorta: def.corta,
        horario: preferredTime,
        montoNeto: pricing.netoPorPaseo,
        montoTotalCliente: pricing.precioPorPaseo,
        estado: isOverallAssigned ? 'asignado' : 'disponible',
        semanaNumero: semNum,
        tipoCorrea: sol.tipoCorrea || 'propia',
        isCorreaWalkie: sol.tipoCorrea === 'walkie',
        paseadorId: isOverallAssigned ? (sol.paseadorId || sol.paseador_id) : undefined,
        paseador_id: isOverallAssigned ? (sol.paseador_id || sol.paseadorId) : undefined,
        paseadorNombre: isOverallAssigned ? sol.paseadorNombre : undefined,
        paseadorFoto: isOverallAssigned ? sol.paseadorFoto : undefined,
        paseadorTelefono: isOverallAssigned ? sol.paseadorTelefono : undefined
      });
    });
  } else {
    // Generar según el plan (ej: Común = 1 día, Bronce = 3 días, Plata = 5 días, Oro = 7 días)
    const planDefaults: Record<PlanType, string[]> = {
      'Común': ['Lunes'],
      'Bronce': ['Lunes', 'Miércoles', 'Viernes'],
      'Plata': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
      'Oro': ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    };
    const daysList = planDefaults[sol.tipoPlan || 'Bronce'] || ['Lunes', 'Miércoles', 'Viernes'];
    const isOverallAssigned = sol.estado === 'aceptada' || sol.estado === 'en_camino' || sol.estado === 'en_curso' || sol.estado === 'completada';

    daysList.forEach((dayName, idx) => {
      const def = defaultDayToDate[dayName] || { iso: `2026-09-${28 + idx}`, corta: `${28 + idx}/09`, short: dayName.slice(0, 3) };
      items.push({
        id: `${solId}-d${idx}`,
        solicitudId: solId,
        diaNombre: dayName,
        diaCorto: def.short,
        fechaStr: def.iso,
        fechaCorta: def.corta,
        horario: preferredTime,
        montoNeto: pricing.netoPorPaseo,
        montoTotalCliente: pricing.precioPorPaseo,
        estado: isOverallAssigned ? 'asignado' : 'disponible',
        semanaNumero: 1,
        tipoCorrea: sol.tipoCorrea || 'propia',
        isCorreaWalkie: sol.tipoCorrea === 'walkie',
        paseadorId: isOverallAssigned ? (sol.paseadorId || sol.paseador_id) : undefined,
        paseador_id: isOverallAssigned ? (sol.paseador_id || sol.paseadorId) : undefined,
        paseadorNombre: isOverallAssigned ? sol.paseadorNombre : undefined,
        paseadorFoto: isOverallAssigned ? sol.paseadorFoto : undefined,
        paseadorTelefono: isOverallAssigned ? sol.paseadorTelefono : undefined
      });
    });
  }

  return items;
}

/**
 * Cuenta la cantidad de días disponibles (aún no tomados) de una solicitud
 */
export function getAvailableDaysCount(sol: Partial<SolicitudPaseo>): number {
  if (sol.estado !== 'pendiente') return 0;
  const days = getOrBuildSolicitudDiasDesglose(sol);
  return days.filter(d => d.estado === 'disponible').length;
}

/**
 * Determina si una solicitud de paseo aún tiene ofertas de días disponibles para mostrar en lista o mapa
 */
export function hasAvailableDaysOffer(sol: Partial<SolicitudPaseo>): boolean {
  if (!sol || sol.estado !== 'pendiente') return false;
  if ((sol.montoTotal || 0) <= 0) return false;
  return getAvailableDaysCount(sol) > 0;
}


