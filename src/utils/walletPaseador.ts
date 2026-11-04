export interface RetiroRecord {
  id: string;
  fecha: string;
  hora: string;
  monto: number;
  metodo: 'alias' | 'cbu';
  destino: string;
  estado: 'completado';
}

export interface CompensacionRecord {
  id: string;
  fecha: string;
  hora: string;
  monto: number;
  motivo: string;
  solicitudId: string;
  nombrePerro?: string;
  nombreCliente?: string;
  fechaPaseoStr?: string;
}

export interface PenalizacionRecord {
  id: string;
  fecha: string;
  hora: string;
  motivo: string;
  porcentaje: number; // Ej: 50%
  montoDescontado?: number;
  solicitudCanceladaId?: string;
  nombrePerro?: string;
  aplicada: boolean;
  fechaAplicacion?: string;
}

export interface PaseadorWallet {
  saldoDisponible: number;
  totalHistoricoGanado: number;
  totalRetirado: number;
  historialRetiros: RetiroRecord[];
  paseosAcreditadosIds: string[];
  penalizacionesPendientes: PenalizacionRecord[];
  historialPenalizaciones: PenalizacionRecord[];
  compensacionesCancelacion?: CompensacionRecord[];
}

const WALLET_KEY = 'walkie_paseador_wallet';

export function getPaseadorWallet(): PaseadorWallet {
  try {
    const raw = localStorage.getItem(WALLET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        saldoDisponible: typeof parsed.saldoDisponible === 'number' ? Math.max(0, parsed.saldoDisponible) : 0,
        totalHistoricoGanado: typeof parsed.totalHistoricoGanado === 'number' ? parsed.totalHistoricoGanado : 0,
        totalRetirado: typeof parsed.totalRetirado === 'number' ? parsed.totalRetirado : 0,
        historialRetiros: Array.isArray(parsed.historialRetiros) ? parsed.historialRetiros : [],
        paseosAcreditadosIds: Array.isArray(parsed.paseosAcreditadosIds) ? parsed.paseosAcreditadosIds : [],
        penalizacionesPendientes: Array.isArray(parsed.penalizacionesPendientes) ? parsed.penalizacionesPendientes : [],
        historialPenalizaciones: Array.isArray(parsed.historialPenalizaciones) ? parsed.historialPenalizaciones : [],
        compensacionesCancelacion: Array.isArray(parsed.compensacionesCancelacion) ? parsed.compensacionesCancelacion : []
      };
    }
  } catch (e) {
    console.error('Error reading wallet:', e);
  }
  return {
    saldoDisponible: 0,
    totalHistoricoGanado: 0,
    totalRetirado: 0,
    historialRetiros: [],
    paseosAcreditadosIds: [],
    penalizacionesPendientes: [],
    historialPenalizaciones: [],
    compensacionesCancelacion: []
  };
}

export function savePaseadorWallet(wallet: PaseadorWallet): void {
  try {
    localStorage.setItem(WALLET_KEY, JSON.stringify(wallet));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('walkie_wallet_change', { detail: wallet }));
    }
  } catch (e) {
    console.error('Error saving wallet:', e);
  }
}

/**
 * Registra una cancelación iniciada por el paseador desde su calendario
 * - Con 5 días o más de anticipación: Sin penalización ($0 multa).
 * - A falta de 1 día (o menos de 24 horas): 50% de penalización en la ganancia del próximo paseo.
 */
export function registrarCancelacionPaseador(
  solicitudId: string,
  fechaProgramada: string = '2026-09-30',
  nombrePerro: string = 'Mascota'
): {
  penalizacionAplicada: boolean;
  porcentaje: number;
  diasDiferencia: number;
  motivo: string;
  wallet: PaseadorWallet;
} {
  const wallet = getPaseadorWallet();
  const hoy = new Date();
  
  // Parse fechaProgramada (YYYY-MM-DD)
  const [year, month, day] = fechaProgramada.split('-').map(Number);
  const fechaPaseo = new Date(year, (month || 1) - 1, day || 1);
  
  const diffTime = fechaPaseo.getTime() - hoy.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let porcentaje = 0;
  let motivo = '';
  let penalizacionAplicada = false;

  if (diffDays >= 5) {
    motivo = `Cancelación con ${diffDays} días de anticipación. Sin penalización ($0 multa).`;
  } else if (diffDays <= 1) {
    porcentaje = 50;
    penalizacionAplicada = true;
    motivo = `Cancelación tardía a falta de ${diffDays <= 0 ? 'menos de 24 hs' : '1 día'}. Penalización del 50% aplicada al próximo paseo.`;
  } else {
    // Entre 2 y 4 días
    motivo = `Cancelación con ${diffDays} días de anticipación (Aviso moderado sin multa económica).`;
  }

  if (penalizacionAplicada) {
    const record: PenalizacionRecord = {
      id: `pen-${Date.now()}`,
      fecha: hoy.toLocaleDateString('es-AR'),
      hora: hoy.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      motivo,
      porcentaje: 50,
      solicitudCanceladaId: solicitudId,
      nombrePerro,
      aplicada: false
    };
    wallet.penalizacionesPendientes = [...wallet.penalizacionesPendientes, record];
    savePaseadorWallet(wallet);
  }

  return {
    penalizacionAplicada,
    porcentaje,
    diasDiferencia: diffDays,
    motivo,
    wallet
  };
}

export function creditPaseadorWalk(
  solicitudId: string,
  amountNeto: number
): {
  wallet: PaseadorWallet;
  credited: boolean;
  penalizacionDescontada?: number;
  montoAcreditadoFinal: number;
} {
  const wallet = getPaseadorWallet();
  if (wallet.paseosAcreditadosIds.includes(solicitudId)) {
    return { wallet, credited: false, montoAcreditadoFinal: 0 };
  }
  const validAmount = amountNeto > 0 ? amountNeto : 0;
  
  let penalizacionDescontada = 0;
  let montoAcreditadoFinal = validAmount;

  // Si hay penalizaciones pendientes del 50%, aplicar al primer cobro
  if (wallet.penalizacionesPendientes.length > 0) {
    const pen = wallet.penalizacionesPendientes[0];
    penalizacionDescontada = Math.round(validAmount * (pen.porcentaje / 100));
    montoAcreditadoFinal = Math.max(0, validAmount - penalizacionDescontada);

    // Mover penalización a aplicada
    pen.aplicada = true;
    pen.montoDescontado = penalizacionDescontada;
    pen.fechaAplicacion = new Date().toLocaleDateString('es-AR') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    wallet.penalizacionesPendientes = wallet.penalizacionesPendientes.slice(1);
    wallet.historialPenalizaciones = [pen, ...wallet.historialPenalizaciones];
  }

  wallet.saldoDisponible += montoAcreditadoFinal;
  wallet.totalHistoricoGanado += montoAcreditadoFinal;
  wallet.paseosAcreditadosIds.push(solicitudId);
  savePaseadorWallet(wallet);

  return {
    wallet,
    credited: true,
    penalizacionDescontada: penalizacionDescontada > 0 ? penalizacionDescontada : undefined,
    montoAcreditadoFinal
  };
}

export function creditCompensacionCancelacion(
  solicitudId: string,
  monto: number = 2000,
  motivo: string = 'Compensación por cancelación tardía del cliente (< 48 hs)',
  nombrePerro: string = 'Mascota',
  nombreCliente: string = 'Cliente Walkie',
  fechaPaseoStr?: string
): { wallet: PaseadorWallet; compensacion: CompensacionRecord } {
  const wallet = getPaseadorWallet();
  const now = new Date();
  
  const compensacion: CompensacionRecord = {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    fecha: now.toLocaleDateString('es-AR'),
    hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    monto: monto > 0 ? monto : 2000,
    motivo,
    solicitudId,
    nombrePerro,
    nombreCliente,
    fechaPaseoStr
  };

  wallet.saldoDisponible += compensacion.monto;
  wallet.totalHistoricoGanado += compensacion.monto;
  wallet.compensacionesCancelacion = [compensacion, ...(wallet.compensacionesCancelacion || [])];

  savePaseadorWallet(wallet);

  return { wallet, compensacion };
}

export function withdrawPaseadorBalance(amount: number, metodo: 'alias' | 'cbu', destino: string): PaseadorWallet {
  const wallet = getPaseadorWallet();
  const withdrawAmount = Math.min(wallet.saldoDisponible, Math.max(0, amount));
  if (withdrawAmount <= 0) return wallet;

  wallet.saldoDisponible = Math.max(0, wallet.saldoDisponible - withdrawAmount);
  wallet.totalRetirado += withdrawAmount;
  
  const now = new Date();
  const record: RetiroRecord = {
    id: `ret-${Date.now()}`,
    fecha: now.toLocaleDateString('es-AR'),
    hora: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    monto: withdrawAmount,
    metodo,
    destino,
    estado: 'completado'
  };

  wallet.historialRetiros = [record, ...wallet.historialRetiros];
  savePaseadorWallet(wallet);
  return wallet;
}
