import { formatPesos } from '../utils/geo';

/**
 * =========================================================================
 * 💳 PAYMENT SERVICE CENTRALIZADO - PASARELA DE COBRO WALKIE
 * =========================================================================
 * Controlador único y pasarela centralizada para:
 * 1. Donación de Alimentos a Refugios
 * 2. Aportes a Casos de Emergencia Veterinaria y Rescate
 * 
 * -------------------------------------------------------------------------
 * 📌 INSTRUCCIÓN DE CAMBIO A PRODUCCIÓN (LÍNEA 25):
 * 1. En la LÍNEA 25 debajo, cambia el valor del flag de simulación:
 *        export const IS_PAYMENT_SIMULATED: boolean = false;
 * 2. En tu archivo de variables de entorno (.env), ingresa tu API Key o
 *    Access Token real de Mercado Pago / Stripe:
 *        PAYMENT_GATEWAY_API_KEY="APP_USR-tu_access_token_real_aqui"
 *        (o VITE_PAYMENT_GATEWAY_API_KEY="APP_USR-...")
 * Con solo esos dos pasos, automáticamente ambos módulos (Alimentos y
 * Emergencias Médicas) pasarán a procesar cobros reales sin modificar 
 * ninguna línea de código en las interfaces de usuario.
 * =========================================================================
 */
// LÍNEA 25: FLAG DE CONTROL DE ENTORNO (PRODUCCIÓN / SANDBOX EN VIVO)
export const IS_PAYMENT_SIMULATED: boolean = false; // Activado para pruebas con Mercado Pago Sandbox

// Clave de prueba por defecto
export const DEFAULT_SANDBOX_ACCESS_TOKEN = 'APP_USR-8947506784539424-102623-b918d07dcadc6455b1edc154cabd8e91-3796774466';
export const DUMMY_PAYMENT_API_KEY = 'TEST-0000000000000000-0000000000000000-000000';

/**
 * Obtiene la API Key unificada configurada desde las variables de entorno.
 * Soporta prioritariamente PAYMENT_GATEWAY_API_KEY y compatibilidad con MERCADOPAGO_ACCESS_TOKEN / MP_ACCESS_TOKEN.
 */
export function getPaymentGatewayApiKey(): string {
  const envKey = 
    (import.meta as any)?.env?.MP_ACCESS_TOKEN ||
    (import.meta as any)?.env?.VITE_MP_ACCESS_TOKEN ||
    (import.meta as any)?.env?.VITE_PAYMENT_GATEWAY_API_KEY ||
    (import.meta as any)?.env?.PAYMENT_GATEWAY_API_KEY ||
    (import.meta as any)?.env?.VITE_MERCADOPAGO_ACCESS_TOKEN ||
    (import.meta as any)?.env?.MERCADOPAGO_ACCESS_TOKEN;

  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return envKey.trim();
  }
  return DEFAULT_SANDBOX_ACCESS_TOKEN;
}

export type PaymentCategory = 'food_donation' | 'emergency_case';

export interface CardPaymentDetails {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  installments?: number;
}

export interface UnifiedPaymentRequest {
  category: PaymentCategory;
  amount: number;
  title: string;
  description?: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  paymentMethod: 'card' | 'mercadopago' | 'transfer';
  cardDetails?: CardPaymentDetails;
  destinationName: string;
  targetId?: string;
  metadata?: Record<string, any>;

  // Campos específicos de compatibilidad (Alimento)
  kg?: number;
  foodOptionLabel?: string;
  shelterDestination?: string;

  // Campos específicos de compatibilidad (Casos de Emergencia)
  patientName?: string;
  veterinarianName?: string;
  diagnosis?: string;
}

export interface UnifiedPaymentReceipt {
  receiptId: string;
  authorizationCode: string;
  orderNumber: string;
  timestamp: string;
  amount: number;
  currency: string;
  category: PaymentCategory;
  categoryLabel: string;
  title: string;
  description?: string;
  donorName: string;
  donorEmail: string;
  paymentMethodTitle: string;
  maskedCard?: string;
  destinationName: string;
  status: 'approved' | 'rejected' | 'in_process';
  isSimulated: boolean;
  initPointUrl?: string;
  detailsNote?: string;

  // Aliases de compatibilidad con pantallas existentes
  kg?: number;
  foodLabel?: string;
  shelterDestination?: string;
  patientName?: string;
}

// Aliases de compatibilidad
export type DonationReceipt = UnifiedPaymentReceipt;
export type FoodDonationPaymentRequest = UnifiedPaymentRequest;
export type EmergencyPaymentRequest = UnifiedPaymentRequest;

/**
 * Controlador de Pago Unificado Centralizado (Alimentos y Emergencias).
 * Ejecuta el cobro simulado con tarjeta bancaria o conecta con la pasarela real (Mercado Pago REST API).
 */
export async function processPayment(
  request: UnifiedPaymentRequest
): Promise<UnifiedPaymentReceipt> {
  const apiKey = getPaymentGatewayApiKey();
  const isSimulationMode = 
    IS_PAYMENT_SIMULATED || 
    apiKey === DUMMY_PAYMENT_API_KEY || 
    apiKey.startsWith('TEST-0000');

  const categoryLabel = request.category === 'food_donation'
    ? 'Donación de Alimento Balanceado'
    : 'Aporte a Caso de Emergencia Veterinaria';

  const prefix = request.category === 'food_donation' ? 'WALKIE-DON' : 'WALKIE-EMERG';

  // =========================================================================
  // MODO 1: SIMULACIÓN DE PAGO (MOCK CON TARJETA O MERCADO PAGO EN DESARROLLO)
  // =========================================================================
  if (isSimulationMode) {
    // Retardo natural de red de procesamiento bancario (800ms)
    await new Promise((resolve) => setTimeout(resolve, 800));

    const cleanCard = request.cardDetails?.cardNumber?.replace(/\D/g, '') || '4509';
    const lastFour = cleanCard.length >= 4 ? cleanCard.slice(-4) : '4509';
    const maskedCard = request.paymentMethod === 'card' ? `•••• •••• •••• ${lastFour}` : undefined;

    const receipt: UnifiedPaymentReceipt = {
      receiptId: `${prefix}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      authorizationCode: `AUT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      orderNumber: `REC-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      amount: request.amount,
      currency: 'ARS',
      category: request.category,
      categoryLabel,
      title: request.title,
      description: request.description || `${categoryLabel} a través de Walkie Solidario`,
      donorName: request.donorName?.trim() || 'Donante Solidario Walkie',
      donorEmail: request.donorEmail?.trim() || 'donante@walkie.app',
      paymentMethodTitle: request.paymentMethod === 'card' 
        ? 'Tarjeta de Crédito / Débito (Modo Prueba)' 
        : request.paymentMethod === 'mercadopago' 
        ? 'Mercado Pago (Saldo en Cuenta)' 
        : 'Transferencia Bancaria Inmediata',
      maskedCard,
      destinationName: request.destinationName,
      status: 'approved',
      isSimulated: true,
      detailsNote: 'Transacción aprobada y validada en el controlador de pago unificado de Walkie.',
      // Compatibilidad
      kg: request.kg,
      foodLabel: request.foodOptionLabel || request.title,
      shelterDestination: request.shelterDestination || request.destinationName,
      patientName: request.patientName
    };

    // Almacenar en historial unificado de transacciones solidarias
    try {
      const historyStr = localStorage.getItem('walkie_payments_history') || '[]';
      const history: UnifiedPaymentReceipt[] = JSON.parse(historyStr);
      localStorage.setItem('walkie_payments_history', JSON.stringify([receipt, ...history]));

      // Guardar también en key retrocompatible de alimentos si aplica
      if (request.category === 'food_donation') {
        const foodHistoryStr = localStorage.getItem('walkie_food_donations_history') || '[]';
        const foodHistory: UnifiedPaymentReceipt[] = JSON.parse(foodHistoryStr);
        localStorage.setItem('walkie_food_donations_history', JSON.stringify([receipt, ...foodHistory]));
      }

      // Despachar eventos del sistema
      window.dispatchEvent(new CustomEvent('walkie_payment_success', { detail: receipt }));
      if (request.category === 'food_donation') {
        window.dispatchEvent(new CustomEvent('walkie_donation_success', { detail: receipt }));
      }
    } catch (e) {
      console.warn('Error al guardar comprobante en historial local:', e);
    }

    return receipt;
  }

  // =========================================================================
  // MODO 2: ARQUITECTURA DE PRODUCCIÓN (MERCADO PAGO REST API CON API KEY REAL)
  // =========================================================================
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://walkie.app';

    const preferencePayload = {
      items: [
        {
          id: `walkie-${request.category}-${request.targetId || Date.now()}`,
          title: `Walkie Solidario - ${request.title}`,
          description: request.description || `${categoryLabel}: ${request.destinationName}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: Math.max(1, Math.round(request.amount))
        }
      ],
      payer: {
        email: request.donorEmail || 'donante@walkie.app',
        name: request.donorName || 'Donante Walkie'
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1
      },
      back_urls: {
        success: `${origin}/?status=approved&cause_type=${encodeURIComponent(request.category)}&target_id=${encodeURIComponent(request.targetId || '')}&amount=${encodeURIComponent(String(request.amount))}`,
        failure: `${origin}/?status=failure&cause_type=${encodeURIComponent(request.category)}&target_id=${encodeURIComponent(request.targetId || '')}`,
        pending: `${origin}/?status=pending&cause_type=${encodeURIComponent(request.category)}&target_id=${encodeURIComponent(request.targetId || '')}`
      },
      auto_return: 'approved',
      external_reference: `${request.category}_${request.targetId || 'general'}_${Date.now()}`,
      metadata: {
        cause_type: request.category,
        categoria: request.category,
        monto: request.amount,
        titulo: request.title,
        destino: request.destinationName,
        target_id: request.targetId,
        animal_id: request.category === 'emergency_case' ? request.targetId : undefined,
        donante_nombre: request.donorName,
        donante_email: request.donorEmail,
        ...request.metadata
      }
    };

    try {
      sessionStorage.setItem('walkie_pending_donation', JSON.stringify({
        category: request.category,
        targetId: request.targetId,
        amount: request.amount,
        timestamp: Date.now()
      }));
    } catch {
      // ignore
    }

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(preferencePayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error en pasarela de pagos (${response.status}): ${errText}`);
    }

    const resJson = await response.json();
    const checkoutUrl = resJson.init_point || resJson.sandbox_init_point;

    const realReceipt: UnifiedPaymentReceipt = {
      receiptId: resJson.id || `MP-${request.category.toUpperCase()}-${Date.now()}`,
      authorizationCode: `MP-${resJson.id?.substring(0, 8) || 'OK'}`,
      orderNumber: `MP-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-AR'),
      amount: request.amount,
      currency: 'ARS',
      category: request.category,
      categoryLabel,
      title: request.title,
      description: request.description,
      donorName: request.donorName || 'Donante Walkie',
      donorEmail: request.donorEmail || 'donante@walkie.app',
      paymentMethodTitle: 'Mercado Pago Checkout',
      destinationName: request.destinationName,
      status: 'approved',
      isSimulated: false,
      initPointUrl: checkoutUrl,
      detailsNote: 'Redirección a pasarela de cobro oficial generada.',
      kg: request.kg,
      foodLabel: request.foodOptionLabel || request.title,
      shelterDestination: request.destinationName,
      patientName: request.patientName
    };

    return realReceipt;
  } catch (err: any) {
    console.error('Error procesando pago real en pasarela unificada:', err);
    throw new Error(err?.message || 'No se pudo conectar con la pasarela de pagos.');
  }
}

/**
 * Wrapper específico para Donación de Alimento (100% retrocompatible).
 */
export async function processFoodDonationPayment(
  request: Partial<UnifiedPaymentRequest> & {
    kg: number;
    amount: number;
    foodOptionLabel: string;
    donorName: string;
    donorEmail: string;
    paymentMethod: 'card' | 'mercadopago' | 'transfer';
    cardDetails?: CardPaymentDetails;
    shelterDestination?: string;
  }
): Promise<UnifiedPaymentReceipt> {
  return processPayment({
    category: 'food_donation',
    amount: request.amount,
    title: request.foodOptionLabel || `${request.kg} kg de alimento balanceado`,
    description: `Donación de ${request.kg} kg de alimento para refugios de Punilla`,
    donorName: request.donorName,
    donorEmail: request.donorEmail,
    donorPhone: request.donorPhone,
    paymentMethod: request.paymentMethod,
    cardDetails: request.cardDetails,
    destinationName: request.shelterDestination || 'Alma Animal Punilla, Garra y Patitas Serranas',
    targetId: `food-${request.kg}kg`,
    kg: request.kg,
    foodOptionLabel: request.foodOptionLabel,
    shelterDestination: request.shelterDestination
  });
}

/**
 * Wrapper específico para Aporte a Casos de Emergencia Veterinaria.
 */
export async function processEmergencyContributionPayment(
  request: {
    caseId: string;
    patientName: string;
    amount: number;
    objective: string;
    veterinarianName: string;
    responsibleName: string;
    donorName: string;
    donorEmail: string;
    donorPhone?: string;
    paymentMethod: 'card' | 'mercadopago' | 'transfer';
    cardDetails?: CardPaymentDetails;
  }
): Promise<UnifiedPaymentReceipt> {
  return processPayment({
    category: 'emergency_case',
    amount: request.amount,
    title: `Aporte para ${request.patientName}`,
    description: `${request.objective} (A cargo de: ${request.veterinarianName})`,
    donorName: request.donorName,
    donorEmail: request.donorEmail,
    donorPhone: request.donorPhone,
    paymentMethod: request.paymentMethod,
    cardDetails: request.cardDetails,
    destinationName: `Caso ${request.patientName} • Responsable: ${request.responsibleName}`,
    targetId: request.caseId,
    patientName: request.patientName,
    veterinarianName: request.veterinarianName
  });
}

/**
 * Servicio Centralizado de Pagos exportado como singleton para uso modular.
 */
export const PaymentService = {
  isSimulated: () => IS_PAYMENT_SIMULATED,
  getApiKey: getPaymentGatewayApiKey,
  processPayment,
  processFoodDonation: processFoodDonationPayment,
  processEmergencyContribution: processEmergencyContributionPayment
};
